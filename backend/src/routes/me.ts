import { Router } from "express";
import { requireAuth } from "../middleware/auth";

export const meRouter = Router();

meRouter.get("/", requireAuth, (_req, res) => {
  const user = res.locals.user;
  res.json({
    id: user.id,
    name: user.name || user.fullName || "",
    email: user.email,
    role: user.role?.name ?? user.roleEnum,
    regionId: user.regionId ?? null,
    permissions: user.role?.permissions?.map((item: any) => item.permission.key) ?? []
  });
});
