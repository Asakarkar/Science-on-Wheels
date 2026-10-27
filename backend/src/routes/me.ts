import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";

export const meRouter = Router();

meRouter.get("/", requireAuth, async (_req, res) => {
  const user = res.locals.user;
  const role = user.role?.name ?? user.roleEnum;
  let permissions: string[] =
    user.role?.permissions?.map((item: any) => item.permission.key) ?? [];

  // Super Admin inherently possesses all permissions
  if (role === "SUPER_ADMIN") {
    const allPerms = await prisma.permission.findMany({ select: { key: true } });
    const allKeys = allPerms.map((p) => p.key);
    permissions = Array.from(new Set([...permissions, ...allKeys]));
  }

  res.json({
    id: user.id,
    name: user.name || user.fullName || "",
    email: user.email,
    role,
    regionId: user.regionId ?? null,
    permissions,
  });
});
