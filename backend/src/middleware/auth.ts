import type { Request, Response, NextFunction } from "express";
import { getSessionUser, SESSION_COOKIE, SESSION_TTL_MS } from "../lib/session";

/**
 * Authentication Middleware
 * 
 * Secure token extraction order:
 * 1. Explicit Authorization header (`Bearer <token>`) - tab/client isolated
 * 2. Explicit custom session header (`x-session-token`)
 * 3. Ambient HttpOnly cookie (`sow_session`) - only as fallback for direct browser requests
 * 
 * Never allow ambient cookies to overwrite or override an explicit Bearer token.
 * This guarantees complete multi-user tab and session isolation.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : undefined;

    const xSessionToken = req.headers["x-session-token"] as string | undefined;

    // Prioritize explicit request tokens over ambient shared cookies
    const token =
      bearerToken ||
      xSessionToken ||
      req.cookies?.[SESSION_COOKIE];

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await getSessionUser(token);
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Refresh ambient session cookie ONLY if the request authenticated via cookie.
    // If the client sent an explicit Bearer token, do NOT inject or overwrite the ambient cookie
    // to prevent cross-session contamination across browser tabs.
    if (!bearerToken && !xSessionToken && req.cookies?.[SESSION_COOKIE]) {
      res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_TTL_MS,
        path: "/",
      });
    }

    res.locals.user = user;
    res.locals.sessionId = (user as any).sessionId;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Authentication required" });
  }
}

/**
 * Permission Authorization Guard
 * Resolves permissions strictly from the authenticated database user identity.
 */
export function requirePermission(permissionKey: string) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const role = user?.role?.name ?? user?.roleEnum;
    // Super Admin inherently holds platform-wide permission
    if (role === "SUPER_ADMIN") {
      return next();
    }

    const allowed =
      user?.role?.permissions?.some(
        (item: any) =>
          item.permission?.key === permissionKey ||
          item.permissionKey === permissionKey
      ) ?? false;

    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}

/**
 * Super Administrator Role Guard
 */
export function requireSuperAdmin(_req: Request, res: Response, next: NextFunction) {
  const user = res.locals.user;
  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const role = user?.role?.name ?? user?.roleEnum;
  if (role !== "SUPER_ADMIN") {
    return res.status(403).json({ message: "Super Admin access required" });
  }

  next();
}

/**
 * Regional Administrator Role & Scope Guard
 */
export async function requireRegionalAdmin(_req: Request, res: Response, next: NextFunction) {
  const user = res.locals.user;
  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const role = user?.role?.name ?? user?.roleEnum;
  if (role !== "REGIONAL_ADMIN") {
    return res.status(403).json({ message: "Regional Admin access required" });
  }

  if (!user?.regionId) {
    return res.status(403).json({ message: "Regional Admin has no assigned region" });
  }

  next();
}
