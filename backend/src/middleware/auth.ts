import type { Request, Response, NextFunction } from "express";
<<<<<<< HEAD
import { getSessionUser, SESSION_COOKIE, SESSION_TTL_MS } from "../lib/session";
=======
import { getSessionUser, SESSION_COOKIE, getSessionCookieOptions } from "../lib/session";
>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    const user = await getSessionUser(token);
    if (!user) return res.status(401).json({ message: "Authentication required" });
<<<<<<< HEAD
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL_MS,
      path: "/",
    });
    res.locals.user = user;
=======
    res.cookie(SESSION_COOKIE, token, getSessionCookieOptions());
    res.locals.user = user;
    (req as any).userId = user.id;
>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5
    next();
  } catch (error) {
    console.error("Authentication error", error);
    return res.status(401).json({ message: "Authentication required" });
  }
}

export function requirePermission(permissionKey: string) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user;
    const allowed = user?.role?.permissions?.some((item: any) => item.permission.key === permissionKey) ?? false;
    if (!allowed) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

export function requireSuperAdmin(_req: Request, res: Response, next: NextFunction) {
  const user = res.locals.user;
  const role = user?.role?.name ?? user?.roleEnum;
  if (role !== "SUPER_ADMIN") return res.status(403).json({ message: "Super Admin access required" });
  next();
}


export function requireRegionalAdmin(_req: Request, res: Response, next: NextFunction) {
  const user = res.locals.user;
  const role = user?.role?.name ?? user?.roleEnum;
  if (role !== "REGIONAL_ADMIN") return res.status(403).json({ message: "Regional Admin access required" });
  if (!user?.regionId) return res.status(403).json({ message: "Regional Admin has no assigned region" });
  next();
}
