import type { Request, Response, NextFunction } from "express";
import { getSessionUser, SESSION_COOKIE, SESSION_TTL_MS } from "../lib/session";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : undefined;

    const token =
      req.cookies?.[SESSION_COOKIE] ||
      bearerToken ||
      (req.headers["x-session-token"] as string | undefined);

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await getSessionUser(token);
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Refresh session cookie on response
    if (req.cookies?.[SESSION_COOKIE]) {
      res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_TTL_MS,
        path: "/",
      });
    }

    res.locals.user = user;
    next();
  } catch (error) {
    console.error("Authentication error", error);
    return res.status(401).json({ message: "Authentication required" });
  }
}

export function requirePermission(permissionKey: string) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const role = user?.role?.name ?? user?.roleEnum;
    // Super Admin has unrestricted platform permissions
    if (role === "SUPER_ADMIN") {
      return next();
    }

    const allowed =
      user?.role?.permissions?.some(
        (item: any) => item.permission.key === permissionKey
      ) ?? false;

    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}

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
