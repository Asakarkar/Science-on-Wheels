import crypto from "node:crypto";
import { env } from "../config/env";

export interface JwtPayload {
  sub: string;
  userId: string;
  sessionId: string;
  type: "access" | "refresh";
  role?: string;
  issuedAt: number;
  expiration: number;
  iat: number;
  exp: number;
  issuer: string;
  audience: string;
  [key: string]: any;
}

const JWT_ISSUER = "science-on-wheels";
const JWT_AUDIENCE = "science-on-wheels-portal";

// Access token lifetime: 15 minutes (in seconds)
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
// Refresh token lifetime: 30 days (in seconds)
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf8").toString("base64url");
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
}

export function signJwt(
  claims: {
    userId: string;
    sessionId: string;
    type: "access" | "refresh";
    role?: string;
    [key: string]: any;
  },
  expiresInSeconds: number = ACCESS_TOKEN_TTL_SECONDS
): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInSeconds;

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const payload: JwtPayload = {
    ...claims,
    sub: claims.userId,
    userId: claims.userId,
    sessionId: claims.sessionId,
    type: claims.type,
    issuedAt: now,
    expiration: exp,
    iat: now,
    exp,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", env.SESSION_SECRET)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

export function verifyJwt(token: string): JwtPayload {
  if (!token || typeof token !== "string") {
    throw new Error("Missing token");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT structure");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac("sha256", env.SESSION_SECRET)
    .update(data)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expectedSigBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedSigBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)
  ) {
    throw new Error("Invalid token signature");
  }

  let payload: JwtPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new Error("Invalid token payload encoding");
  }

  const now = Math.floor(Date.now() / 1000);

  // Allow 10 seconds of clock drift
  if (typeof payload.exp !== "number" || payload.exp < now - 10) {
    throw new Error("Token has expired");
  }

  if (payload.issuer !== JWT_ISSUER) {
    throw new Error("Invalid token issuer");
  }

  if (payload.audience !== JWT_AUDIENCE) {
    throw new Error("Invalid token audience");
  }

  if (!payload.userId || !payload.sessionId) {
    throw new Error("Missing required identity claims in token");
  }

  return payload;
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
}

export function generateTokenPair(
  userId: string,
  sessionId: string,
  role?: string
): {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} {
  const accessToken = signJwt(
    { userId, sessionId, type: "access", role },
    ACCESS_TOKEN_TTL_SECONDS
  );

  const refreshToken = signJwt(
    { userId, sessionId, type: "refresh" },
    REFRESH_TOKEN_TTL_SECONDS
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
}

