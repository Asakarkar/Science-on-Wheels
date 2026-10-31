import crypto from "node:crypto";
import { prisma } from "./prisma";
import { env } from "../config/env";
import {
  generateTokenPair,
  verifyJwt,
  decodeJwt,
  signJwt,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from "./jwt";

export const SESSION_COOKIE = "sow_session";
export const REFRESH_COOKIE = "sow_refresh_token";
export const SESSION_TTL_MS = REFRESH_TOKEN_TTL_SECONDS * 1000;

function hashToken(token: string): string {
  return crypto
    .createHmac("sha256", env.SESSION_SECRET)
    .update(token)
    .digest("hex");
}

export interface SessionResult {
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  rawToken: string; // Backward compatibility with code referencing rawToken
  expiresAt: Date;
}

export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  role?: string
): Promise<SessionResult> {
  const sessionId = crypto.randomUUID();
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

  const tokens = generateTokenPair(userId, sessionId, role);

  return {
    sessionId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    rawToken: tokens.accessToken,
    expiresAt,
  };
}

export async function getSessionUser(token?: string) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const trimmedToken = token.trim();
  let sessionId: string | null = null;
  let expectedUserId: string | null = null;

  // 1. Check if token is a standard JWT (3 base64url segments separated by dots)
  if (trimmedToken.split(".").length === 3) {
    try {
      const payload = verifyJwt(trimmedToken);
      // Refresh tokens must not be accepted for standard API requests
      if (payload.type === "refresh") {
        return null;
      }
      sessionId = payload.sessionId;
      expectedUserId = payload.userId;
    } catch {
      return null;
    }
  } else {
    // 2. Fallback to legacy HMAC-hashed opaque token for backward compatibility
    sessionId = hashToken(trimmedToken);
  }

  if (!sessionId) {
    return null;
  }

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

  // Reject revoked or expired sessions
  if (session.revokedAt || session.expiresAt <= new Date()) {
    return null;
  }

  // Strict user match if token contained userId
  if (expectedUserId && session.userId !== expectedUserId) {
    return null;
  }

  // Reject inactive/disabled users
  if (!session.user.isActive || session.user.status?.toUpperCase() !== "ACTIVE") {
    return null;
  }

  // Throttled session activity update (once every 5 minutes to prevent DB contention)
  const now = Date.now();
  const lastActive = session.lastActivityAt
    ? new Date(session.lastActivityAt).getTime()
    : 0;

  if (now - lastActive > 5 * 60 * 1000) {
    await prisma.session
      .updateMany({
        where: {
          id: session.id,
          revokedAt: null,
        },
        data: {
          lastActivityAt: new Date(now),
          expiresAt: new Date(now + SESSION_TTL_MS),
        },
      })
      .catch(() => undefined);
  }

  // Attach the active sessionId onto the user object for downstream auditing and isolation
  (session.user as any).sessionId = session.id;

  return session.user;
}

export async function refreshSession(refreshToken?: string) {
  if (!refreshToken || typeof refreshToken !== "string") {
    return null;
  }

  let payload;
  try {
    payload = verifyJwt(refreshToken.trim());
  } catch {
    return null;
  }

  if (payload.type !== "refresh" || !payload.sessionId || !payload.userId) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      id: payload.sessionId,
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

  // Reject revoked or expired sessions
  if (session.revokedAt || session.expiresAt <= new Date()) {
    return null;
  }

  // Reject if session does not belong to the user identified in the token
  if (session.userId !== payload.userId) {
    return null;
  }

  // Reject inactive or disabled users
  if (!session.user.isActive || session.user.status?.toUpperCase() !== "ACTIVE") {
    return null;
  }

  // Rotate tokens: generate fresh token pair for this specific isolated session
  const now = new Date();
  const newExpiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await prisma.session.update({
    where: { id: session.id },
    data: {
      lastActivityAt: now,
      expiresAt: newExpiresAt,
    },
  });

  const tokens = generateTokenPair(session.userId, session.id, session.user.role?.name || session.user.roleEnum);

  (session.user as any).sessionId = session.id;

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: newExpiresAt,
    user: session.user,
  };
}

export async function deleteSession(tokenOrSessionId?: string) {
  if (!tokenOrSessionId || typeof tokenOrSessionId !== "string") {
    return;
  }

  const raw = tokenOrSessionId.trim();
  let sessionId: string | null = null;

  // 1. If it's a JWT, decode it to extract the sessionId even if expired
  if (raw.split(".").length === 3) {
    const payload = decodeJwt(raw);
    if (payload?.sessionId) {
      sessionId = payload.sessionId;
    }
  }

  // 2. If it's a UUID/cuid or not matched yet
  if (!sessionId) {
    // Check if it's already a session ID directly
    if (raw.length > 20 && (raw.includes("-") || raw.startsWith("c"))) {
      sessionId = raw;
    } else {
      // Legacy hashed token lookup
      sessionId = hashToken(raw);
    }
  }

  if (sessionId) {
    await prisma.session
      .deleteMany({
        where: {
          id: sessionId,
        },
      })
      .catch(() => undefined);
  }
}
