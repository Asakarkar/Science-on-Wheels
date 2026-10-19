import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyPassword } from "../lib/password";
import { createSession, deleteSession, SESSION_COOKIE, getSessionCookieOptions, getClearSessionCookieOptions } from "../lib/session";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

function serializeUser(user: any) {
  return {
    id: user.id,
    name: user.name || user.fullName || "",
    email: user.email,
    regionId: user.regionId ?? null,
    role: user.role?.name ?? user.roleEnum,
    permissions: user.role?.permissions?.map((item: any) => item.permission.key) ?? []
  };
}

async function audit(actorUserId: string | undefined, action: string, entity?: string, entityId?: string, req?: any, metadata?: any) {
  await prisma.auditLog.create({
    data: {
      actorUserId,
      action,
      entity,
      entityId,
      ipAddress: req?.ip,
      userAgent: req?.get?.("user-agent"),
      metadata
    }
  }).catch(() => undefined);
}

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid login data" });

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: { include: { permissions: { include: { permission: true } } } } }
  });

  if (!user || !user.isActive || user.status !== "ACTIVE") {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!valid) {
    await audit(user.id, "LOGIN_FAILED", "User", user.id, req);
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const session = await createSession(user.id, req.ip, req.get("user-agent"));
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit(user.id, "LOGIN_SUCCESS", "User", user.id, req);

  res.cookie(SESSION_COOKIE, session.rawToken, getSessionCookieOptions(session.expiresAt));

  return res.json({ user: serializeUser(user) });
});

authRouter.post("/logout", requireAuth, async (req, res) => {
  const user = res.locals.user;
  await deleteSession(req.cookies?.[SESSION_COOKIE]);
  await audit(user.id, "LOGOUT", "User", user.id, req);
  res.clearCookie(SESSION_COOKIE, getClearSessionCookieOptions());
  res.status(204).send();
});
