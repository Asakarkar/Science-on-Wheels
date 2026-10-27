import crypto from "node:crypto";
import { prisma } from "./prisma";
import { env } from "../config/env";

export const SESSION_COOKIE = "sow_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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
    session.user.status?.toUpperCase() !== "ACTIVE"
  ) {
    return null;
  }

  /*
   * IMPORTANT:
   * Only update activity and expiration if more than 5 minutes have passed
   * since lastActivityAt. This avoids high DB write contention on concurrent requests.
   */
  const now = Date.now();
  const lastActive = session.lastActivityAt ? new Date(session.lastActivityAt).getTime() : 0;
  if (now - lastActive > 5 * 60 * 1000) {
    await prisma.session.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
      },
      data: {
        lastActivityAt: new Date(now),
        expiresAt: new Date(now + SESSION_TTL_MS),
      },
    }).catch(() => undefined);
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