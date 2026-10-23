import crypto from "node:crypto";
import { prisma } from "./prisma";
import { env } from "../config/env";

<<<<<<< HEAD
export const SESSION_COOKIE = "sow_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

=======
import type { CookieOptions } from "express";

export const SESSION_COOKIE = "sow_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function getSessionCookieOptions(expires?: Date): CookieOptions {
  const isProd = env.NODE_ENV === "production";
  const sameSite = (env.COOKIE_SAME_SITE || "lax") as "lax" | "strict" | "none";
  const secure = env.COOKIE_SECURE !== undefined
    ? env.COOKIE_SECURE
    : (isProd || sameSite === "none");

  const options: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
  };

  if (env.COOKIE_DOMAIN) {
    options.domain = env.COOKIE_DOMAIN;
  }

  if (expires) {
    options.expires = expires;
  } else {
    options.maxAge = SESSION_TTL_MS;
  }

  return options;
}

export function getClearSessionCookieOptions(): CookieOptions {
  const isProd = env.NODE_ENV === "production";
  const sameSite = (env.COOKIE_SAME_SITE || "lax") as "lax" | "strict" | "none";
  const secure = env.COOKIE_SECURE !== undefined
    ? env.COOKIE_SECURE
    : (isProd || sameSite === "none");

  const options: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
  };

  if (env.COOKIE_DOMAIN) {
    options.domain = env.COOKIE_DOMAIN;
  }

  return options;
}

>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5
function hashToken(token: string): string {
  return crypto
    .createHmac("sha256", env.SESSION_SECRET)
    .update(token)
    .digest("hex");
}

export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
) {
  const rawToken = crypto.randomBytes(48).toString("base64url");

  // We store only the HMAC-derived value in the database.
  // The raw session token is sent to the browser as the HttpOnly cookie.
  const sessionId = hashToken(rawToken);

  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      expiresAt,
      ipAddress,
      userAgent,
      lastActivityAt: new Date(),
    },
  });

  return {
    rawToken,
    expiresAt,
  };
}

export async function getSessionUser(rawToken?: string) {
  if (!rawToken) {
    return null;
  }

  const sessionId = hashToken(rawToken);

  const session = await prisma.session.findUnique({
    where: {
      id: sessionId,
    },
    include: {
      user: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  // Reject revoked or expired sessions.
  if (
    session.revokedAt ||
    session.expiresAt <= new Date()
  ) {
    return null;
  }

  // Reject inactive/disabled users.
  if (
    !session.user.isActive ||
    session.user.status !== "ACTIVE"
  ) {
    return null;
  }

  /*
   * IMPORTANT:
   *
   * updateMany() is intentionally used instead of update().
   *
   * Multiple frontend requests can arrive at almost the same time.
   * If another request deletes/revokes this session between the
   * findUnique() above and this update, Prisma update() throws P2025.
   *
   * updateMany() simply returns count = 0 in that situation.
   */
  const refreshed = await prisma.session.updateMany({
    where: {
      id: session.id,
      revokedAt: null,
    },
    data: {
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  if (refreshed.count === 0) {
    return null;
  }

  return session.user;
}

export async function deleteSession(rawToken?: string) {
  if (!rawToken) {
    return;
  }

  const sessionId = hashToken(rawToken);

  await prisma.session.deleteMany({
    where: {
      id: sessionId,
    },
  });
}