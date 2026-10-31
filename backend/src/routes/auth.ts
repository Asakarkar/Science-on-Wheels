import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyPassword, dummyVerifyPassword } from "../lib/password";
import { createSession, deleteSession, refreshSession, SESSION_COOKIE } from "../lib/session";
import { checkLoginRateLimit, recordFailedLogin, resetLoginRateLimit } from "../lib/rateLimiter";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, "Password is required"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10, "Refresh token is required"),
});

function serializeUser(user: any, allSystemPermissions?: string[]) {
  const roleName = user.role?.name ?? user.roleEnum;
  let permissions: string[] =
    user.role?.permissions?.map((item: any) => item.permission?.key || item.permissionKey) ?? [];

  // Super Admin inherently possesses all permissions across the platform
  if (roleName === "SUPER_ADMIN" && allSystemPermissions && allSystemPermissions.length > 0) {
    permissions = Array.from(new Set([...permissions, ...allSystemPermissions]));
  }

  return {
    id: user.id,
    name: user.name || user.fullName || "",
    email: user.email,
    regionId: user.regionId ?? null,
    role: roleName,
    permissions,
  };
}

async function audit(
  actorUserId: string | undefined,
  action: string,
  entity?: string,
  entityId?: string,
  req?: any,
  metadata?: any
) {
  await prisma.auditLog
    .create({
      data: {
        actorUserId,
        action,
        entity,
        entityId,
        ipAddress: req?.ip,
        userAgent: req?.get?.("user-agent"),
        metadata,
      },
    })
    .catch(() => undefined);
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid login data" });
  }

  const clientIp = getClientIp(req);
  const email = parsed.data.email.trim().toLowerCase();

  // 1. Rate Limiting check (by IP and by email)
  const ipLimit = checkLoginRateLimit(`ip:${clientIp}`);
  if (!ipLimit.allowed) {
    await audit(undefined, "LOGIN_RATE_LIMITED", "User", undefined, req, {
      ip: clientIp,
      retryAfterSeconds: ipLimit.retryAfterSeconds,
    });
    return res.status(429).json({
      message: `Too many failed login attempts. Please try again in ${Math.ceil(
        (ipLimit.retryAfterSeconds || 60) / 60
      )} minutes.`,
    });
  }

  const emailLimit = checkLoginRateLimit(`email:${email}`);
  if (!emailLimit.allowed) {
    await audit(undefined, "LOGIN_RATE_LIMITED", "User", undefined, req, {
      email,
      retryAfterSeconds: emailLimit.retryAfterSeconds,
    });
    return res.status(429).json({
      message: `Account temporarily locked due to multiple failed attempts. Please try again in ${Math.ceil(
        (emailLimit.retryAfterSeconds || 60) / 60
      )} minutes.`,
    });
  }

  // 2. Fetch user
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  // 3. User verification with timing-attack prevention
  if (!user) {
    // Run constant-time dummy verification so attacker cannot time email existence
    await dummyVerifyPassword(parsed.data.password);
    recordFailedLogin(`ip:${clientIp}`);
    recordFailedLogin(`email:${email}`);
    await audit(undefined, "LOGIN_FAILED", "User", undefined, req, {
      email,
      reason: "USER_NOT_FOUND",
    });
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (!user.isActive || user.status?.toUpperCase() !== "ACTIVE") {
    await dummyVerifyPassword(parsed.data.password);
    recordFailedLogin(`ip:${clientIp}`);
    recordFailedLogin(`email:${email}`);
    await audit(user.id, "LOGIN_FAILED", "User", user.id, req, {
      email,
      reason: "ACCOUNT_INACTIVE",
    });
    return res.status(401).json({ message: "Account is inactive or suspended" });
  }

  // 4. Password validation
  const valid = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!valid) {
    recordFailedLogin(`ip:${clientIp}`);
    recordFailedLogin(`email:${email}`);
    await audit(user.id, "LOGIN_FAILED", "User", user.id, req, {
      email,
      reason: "INVALID_PASSWORD",
    });
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // 5. Successful login: reset rate limit counters
  resetLoginRateLimit(`ip:${clientIp}`);
  resetLoginRateLimit(`email:${email}`);

  // 6. Create independent user session with JWT access & refresh tokens
  const session = await createSession(
    user.id,
    clientIp,
    req.get("user-agent"),
    user.role?.name || user.roleEnum
  );

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await audit(user.id, "LOGIN_SUCCESS", "User", user.id, req);

  // Set secure HTTP-only session cookie for ambient fallback
  res.cookie(SESSION_COOKIE, session.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: session.expiresAt,
    path: "/",
  });

  // Load all permissions if super admin to guarantee full client capability
  let allPermKeys: string[] | undefined;
  if (user.role?.name === "SUPER_ADMIN" || user.roleEnum === "SUPER_ADMIN") {
    const allPerms = await prisma.permission.findMany({ select: { key: true } });
    allPermKeys = allPerms.map((p) => p.key);
  }

  const serialized = serializeUser(user, allPermKeys);

  return res.json({
    user: serialized,
    token: session.accessToken,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    sessionId: session.sessionId,
  });
});

/**
 * Token Refresh Endpoint
 * Rotates tokens within an isolated user session context.
 */
authRouter.post("/refresh", async (req, res) => {
  const tokenFromHeader = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const tokenFromCustomHeader = req.headers["x-refresh-token"] as string | undefined;
  const tokenFromBody = req.body?.refreshToken;

  const candidateToken = tokenFromBody || tokenFromCustomHeader || tokenFromHeader;

  if (!candidateToken) {
    return res.status(401).json({ message: "Refresh token is required" });
  }

  const result = await refreshSession(candidateToken);
  if (!result) {
    return res.status(401).json({ message: "Invalid or expired session" });
  }

  let allPermKeys: string[] | undefined;
  if (result.user.role?.name === "SUPER_ADMIN" || result.user.roleEnum === "SUPER_ADMIN") {
    const allPerms = await prisma.permission.findMany({ select: { key: true } });
    allPermKeys = allPerms.map((p) => p.key);
  }

  const serialized = serializeUser(result.user, allPermKeys);

  return res.json({
    user: serialized,
    token: result.accessToken,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

/**
 * Logout Endpoint
 * Strictly invalidates ONLY the calling user's individual session.
 */
authRouter.post("/logout", async (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : undefined;

  const token =
    bearerToken ||
    (req.headers["x-session-token"] as string | undefined) ||
    req.body?.refreshToken ||
    req.cookies?.[SESSION_COOKIE];

  if (token) {
    await deleteSession(token);
  }

  if (res.locals.user?.id) {
    await audit(res.locals.user.id, "LOGOUT", "User", res.locals.user.id, req);
  }

  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  res.status(204).send();
});
