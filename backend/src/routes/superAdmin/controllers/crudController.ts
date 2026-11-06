import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../../lib/prisma";
import { hashPassword } from "../../../lib/password";
import { env } from "../../../config/env";
import { resourceMap, idModels, searchableFields } from "../config/resourceConfig";
import { normalizePayload, newId } from "../utils/normalizer";
import { formatPrismaError } from "../utils/errorFormatter";
import { audit } from "../utils/audit";

export async function listResources(req: Request, res: Response, next: NextFunction): Promise<void> {
  const resource = String(req.params.resource);
  const delegateName = resourceMap[resource];
  if (!delegateName) return next();
  const prismaAny = prisma as any;
  const delegate = prismaAny[delegateName];
  const defaultLimit = ["schoolScheduleEntries", "inventoryInvoiceLines"].includes(resource) ? 500 : 100;
  const take = Math.min(Number(req.query.limit) || defaultLimit, 500);
  const search = String(req.query.search || "").trim();
  const where: any = {};

  if (search) {
    const fields = searchableFields[resource] || [];
    if (fields.length) where.OR = fields.map((field) => ({ [field]: { contains: search, mode: "insensitive" } }));
  }

  if (req.query.status) where.status = String(req.query.status);
  if (req.query.type) where.type = String(req.query.type);
  if (req.query.category) where.category = String(req.query.category);
  if (req.query.roleEnum) where.roleEnum = String(req.query.roleEnum);
  if (req.query.action) where.action = String(req.query.action);

  let rows: any[];
  if (resource === "roles") {
    rows = await prisma.role.findMany({
      where,
      take,
      orderBy: { name: "asc" },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    rows = rows.map((r: any) => ({
      ...r,
      permissionKeys: r.permissions.map((p: any) => p.permission.key),
      userCount: r._count?.users ?? 0,
    }));
  } else if (resource === "users") {
    rows = await prisma.user.findMany({
      where,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        Region: { select: { id: true, name: true } },
        Bus: { select: { id: true, busCode: true, registrationNumber: true } }
      }
    });
    rows = rows.map((u: any) => ({
      ...u,
      regionName: u.Region?.name || (u.roleEnum === "SUPER_ADMIN" ? "All Regions (HQ)" : "—"),
      busName: u.Bus ? `${u.Bus.busCode || u.Bus.registrationNumber} (${u.Bus.registrationNumber})` : "—",
      busId: u.Bus?.id || null,
      passwordHash: undefined
    }));
  } else {
    const orderBy = ["schoolScheduleEntries", "inventoryInvoiceLines"].includes(resource) ? { sourceRow: "asc" } : { createdAt: "desc" };
    rows = await delegate.findMany({ where, take, orderBy }).catch(async () => delegate.findMany({ where, take }));
  }

  const safe = resource === "users" ? rows.map((u: any) => ({ ...u, passwordHash: undefined })) : rows;
  res.json({ rows: safe });
}

export async function getRolePermissions(req: Request, res: Response): Promise<void> {
  const roleId = String(req.params.id);
  const role: any = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });
  if (!role) {
    res.status(404).json({ message: "Role not found" });
    return;
  }

  const allPermissions = await prisma.permission.findMany({
    orderBy: { key: "asc" },
  });

  const assignedKeys = (role.permissions || []).map((p: any) => p.permission.key);

  res.json({
    role: {
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: role._count?.users ?? 0,
    },
    assignedKeys,
    allPermissions,
  });
}

export async function updateRolePermissions(req: Request, res: Response): Promise<void> {
  const roleId = String(req.params.id);
  const { permissionKeys } = req.body;
  if (!Array.isArray(permissionKeys)) {
    res.status(400).json({ message: "permissionKeys must be an array of string keys" });
    return;
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    res.status(404).json({ message: "Role not found" });
    return;
  }

  const matchingPermissions = await prisma.permission.findMany({
    where: { key: { in: permissionKeys } },
  });

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (matchingPermissions.length > 0) {
      await tx.rolePermission.createMany({
        data: matchingPermissions.map((p) => ({
          roleId,
          permissionId: p.id,
        })),
      });
    }
  });

  await audit(req, "PERMISSION_CHANGE", "Role", roleId, {
    roleName: role.name,
    permissionsCount: matchingPermissions.length,
    keys: permissionKeys,
  });

  const updated: any = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });

  res.json({
    message: "Role permissions updated successfully",
    role: {
      ...updated,
      permissionKeys: (updated?.permissions || []).map((p: any) => p.permission.key),
      userCount: updated?._count?.users ?? 0,
    },
  });
}

export async function createResource(req: Request, res: Response, next: NextFunction): Promise<void> {
  const resource = String(req.params.resource);
  if (resource === "inventoryInvoiceLines") {
    res.status(405).json({ message: "Imported invoice lines are read-only" });
    return;
  }
  const delegateName = resourceMap[resource];
  if (!delegateName || !idModels.has(resource)) return next();
  const delegate = (prisma as any)[delegateName];
  const data = normalizePayload(req.body);
  if (!data.id) data.id = newId();

  if (resource === "users") {
    if (!data.email || !data.password) {
      res.status(400).json({ message: "User email and password are required" });
      return;
    }
    data.email = String(data.email).toLowerCase();
    data.passwordHash = await hashPassword(String(data.password));
    delete data.password;
    data.roleEnum = data.roleEnum || "SCIENCE_COMMUNICATOR";
    data.status = data.status || "ACTIVE";
    data.isActive = data.isActive !== false;
    const roleRecord = await prisma.role.findUnique({ where: { name: String(data.roleEnum) } });
    if (!roleRecord) {
      res.status(400).json({ message: `Role ${data.roleEnum} is not configured. Run the seed first.` });
      return;
    }
    data.roleId = roleRecord.id;
    if (data.roleEnum === "SUPER_ADMIN") data.regionId = null;
  }
  if (resource === "systemConfig") data.updatedAt = new Date();
  if (resource === "announcements" && !data.targetRoles) data.targetRoles = ["SUPER_ADMIN"];
  if (resource === "roles" && !data.name) {
    res.status(400).json({ message: "Role name is required" });
    return;
  }
  if (resource === "permissions") {
    if (!data.key) {
      res.status(400).json({ message: "Permission key is required" });
      return;
    }
    data.updatedAt = new Date();
  }

  try {
    if (resource === "inventoryTransactions") {
      const deltaByType: Record<string, number> = {
        RECEIPT: 1, RETURN: 1, ISSUE: -1, DAMAGE: -1, LOSS: -1, CONSUMPTION: -1, TRANSFER: 0, ADJUSTMENT: 1
      };
      const row = await prisma.$transaction(async (tx) => {
        const created = await (tx as any).inventoryTransaction.create({ data });
        const delta = (deltaByType[String(data.type)] ?? 0) * Number(data.quantity || 0);
        if (delta !== 0) {
          await (tx as any).consumable.update({ where: { id: data.consumableId }, data: { currentStock: { increment: delta } } });
        }
        return created;
      });
      await audit(req, "CREATE", resource, row.id, { type: data.type, quantity: data.quantity });
      res.status(201).json(row);
      return;
    }

    const row = await delegate.create({ data });

    if (resource === "roles" && Array.isArray(req.body.permissionKeys) && req.body.permissionKeys.length > 0) {
      const matched = await prisma.permission.findMany({ where: { key: { in: req.body.permissionKeys } } });
      if (matched.length > 0) {
        await prisma.rolePermission.createMany({
          data: matched.map((p) => ({ roleId: row.id, permissionId: p.id })),
        });
      }
    }

    await audit(req, "CREATE", resource, row.id, { fields: Object.keys(data).filter((x) => x !== "passwordHash") });

    if (resource === "users" && req.body.busId) {
      await prisma.bus.update({
        where: { id: String(req.body.busId) },
        data: { driverId: row.id }
      }).catch(() => undefined);
    }

    const safe = resource === "users" ? { ...row, passwordHash: undefined } : row;
    res.status(201).json(safe);
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
}

export async function updateResource(req: Request, res: Response, next: NextFunction): Promise<void> {
  const resource = String(req.params.resource);
  const id = String(req.params.id);
  if (resource === "inventoryInvoiceLines") {
    res.status(405).json({ message: "Imported invoice lines are read-only" });
    return;
  }
  const delegateName = resourceMap[resource];
  if (!delegateName) return next();
  const delegate = (prisma as any)[delegateName];
  const data = normalizePayload(req.body);
  delete data.id;
  if (resource === "systemConfig") data.updatedAt = new Date();
  if (resource === "users" && data.password) {
    data.passwordHash = await hashPassword(String(data.password));
    delete data.password;
    // Password management: Revoke active sessions on password reset
    await prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    }).catch(() => undefined);
    await audit(req, "PASSWORD_RESET", "User", id, { initiatedBy: "ADMIN" });
  }
  if (resource === "users" && (data.status === "DEACTIVATED" || data.isActive === false)) {
    // Revoke active sessions for deactivated staff accounts
    await prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    }).catch(() => undefined);
    await audit(req, "DEACTIVATE", "User", id, { status: data.status, isActive: data.isActive });
  }
  if (resource === "users" && req.body.busId !== undefined) {
    const targetBusId = req.body.busId ? String(req.body.busId) : null;
    await prisma.bus.updateMany({
      where: { driverId: id },
      data: { driverId: null },
    }).catch(() => undefined);
    if (targetBusId) {
      await prisma.bus.update({
        where: { id: targetBusId },
        data: { driverId: id },
      }).catch(() => undefined);
    }
  }
  delete data.busId;
  if (resource === "users" && data.roleEnum) {
    const roleRecord = await prisma.role.findUnique({ where: { name: String(data.roleEnum) } });
    if (!roleRecord) {
      res.status(400).json({ message: `Role ${data.roleEnum} is not configured. Run the seed first.` });
      return;
    }
    data.roleId = roleRecord.id;
    if (data.roleEnum === "SUPER_ADMIN") data.regionId = null;
  }
  try {
    const row = await delegate.update({ where: { id }, data });
    await audit(req, "UPDATE", resource, row.id, { fields: Object.keys(data) });
    res.json(resource === "users" ? { ...row, passwordHash: undefined } : row);
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
}

export async function deleteResource(req: Request, res: Response, next: NextFunction): Promise<void> {
  const resource = String(req.params.resource);
  const id = String(req.params.id);
  const cascade = req.query.cascade === "true" || req.body?.cascade === true;

  if (resource === "inventoryInvoiceLines") {
    res.status(405).json({ message: "Imported invoice lines are read-only" });
    return;
  }
  const delegateName = resourceMap[resource];
  if (!delegateName) return next();

  // 1. Guard core protected entities
  if (resource === "regions" && id === "region-west-1") {
    res.status(403).json({
      message: "The core operational region (Western Region) is protected and cannot be deleted because mobile laboratories, districts, and schools depend on it."
    });
    return;
  }

  if (resource === "states" && id === "state-mh") {
    res.status(403).json({
      message: "The core state (Maharashtra) is protected and cannot be deleted."
    });
    return;
  }

  if (resource === "roles") {
    const role = await prisma.role.findUnique({ where: { id } });
    if (role && ["SUPER_ADMIN", "REGIONAL_ADMIN", "SCIENCE_COMMUNICATOR"].includes(role.name)) {
      res.status(403).json({
        message: `Core system role '${role.name}' is protected and cannot be deleted.`
      });
      return;
    }
  }

  if (resource === "users") {
    const currentUserId = (req as any).userId || res.locals.user?.id;
    if (currentUserId && currentUserId === id) {
      res.status(403).json({ message: "You cannot delete your own active administrator account." });
      return;
    }
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (targetUser && targetUser.email.toLowerCase() === env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
      res.status(403).json({
        message: "The primary bootstrap Super Administrator account is protected and cannot be deleted."
      });
      return;
    }
  }

  try {
    // 2. Resource-specific cascade logic if requested
    if (resource === "regions") {
      const totalRegions = await prisma.region.count();
      if (totalRegions <= 1) {
        res.status(403).json({
          message: "Cannot delete the only region in the system. The platform requires at least one active region."
        });
        return;
      }
      if (cascade) {
        const fallbackRegion = await prisma.region.findFirst({
          where: { id: { not: id } }
        });
        if (!fallbackRegion) {
          res.status(400).json({ message: "No alternate region available to reassign resources to." });
          return;
        }
        await prisma.$transaction([
          prisma.user.updateMany({ where: { regionId: id }, data: { regionId: fallbackRegion.id } }),
          prisma.bus.updateMany({ where: { regionId: id }, data: { regionId: fallbackRegion.id } }),
          prisma.district.updateMany({ where: { regionId: id }, data: { regionId: fallbackRegion.id } }),
          prisma.school.updateMany({ where: { regionId: id }, data: { regionId: fallbackRegion.id } }),
          prisma.route.updateMany({ where: { regionId: id }, data: { regionId: fallbackRegion.id } }),
          prisma.staffTravelAssignment.deleteMany({ where: { regionId: id } }),
          prisma.region.delete({ where: { id } })
        ]);
        await audit(req, "DELETE", resource, id, { cascade: true, reallocatedTo: fallbackRegion.id });
        res.status(204).send();
        return;
      }
    }

    if (resource === "schools" && cascade) {
      await prisma.$transaction([
        prisma.schoolRegistration.deleteMany({ where: { schoolId: id } }),
        prisma.routeStop.deleteMany({ where: { schoolId: id } }),
        prisma.student.deleteMany({ where: { schoolId: id } }),
        prisma.teacher.deleteMany({ where: { schoolId: id } }),
        prisma.operationalIssue.deleteMany({ where: { schoolId: id } }),
        prisma.eventAttendance.deleteMany({ where: { Event: { schoolId: id } } }),
        prisma.consumableUsage.deleteMany({ where: { Event: { schoolId: id } } }),
        prisma.experimentSession.deleteMany({ where: { Event: { schoolId: id } } }),
        prisma.eventReadinessCheck.deleteMany({ where: { Event: { schoolId: id } } }),
        prisma.feedbackRecord.deleteMany({ where: { Event: { schoolId: id } } }),
        prisma.event.deleteMany({ where: { schoolId: id } }),
        prisma.school.delete({ where: { id } }),
      ]);
      await audit(req, "DELETE", resource, id, { cascade: true });
      res.status(204).send();
      return;
    }

    if (resource === "districts" && cascade) {
      const schoolsInDistrict = await prisma.school.findMany({ where: { districtId: id }, select: { id: true } });
      const schoolIds = schoolsInDistrict.map((s) => s.id);
      await prisma.$transaction([
        prisma.schoolRegistration.deleteMany({ where: { schoolId: { in: schoolIds } } }),
        prisma.routeStop.deleteMany({ where: { schoolId: { in: schoolIds } } }),
        prisma.event.deleteMany({ where: { schoolId: { in: schoolIds } } }),
        prisma.school.deleteMany({ where: { districtId: id } }),
        prisma.block.deleteMany({ where: { districtId: id } }),
        prisma.user.updateMany({ where: { districtId: id }, data: { districtId: null } }),
        prisma.district.delete({ where: { id } })
      ]);
      await audit(req, "DELETE", resource, id, { cascade: true });
      res.status(204).send();
      return;
    }

    if (resource === "users") {
      await prisma.bus.updateMany({ where: { driverId: id }, data: { driverId: null } });
      await prisma.staffTravelAssignment.deleteMany({ where: { userId: id } });
    }

    const row = await (prisma as any)[delegateName].delete({ where: { id } });
    await audit(req, "DELETE", resource, row.id);
    res.status(204).send();
  } catch (error: any) {
    const formatted = formatPrismaError(error);
    const status = error?.code === "P2003" ? 409 : 400;
    res.status(status).json({ message: formatted });
  }
}

export async function getUserHistory(req: Request, res: Response): Promise<void> {
  const userId = String(req.params.id);
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        roleEnum: true,
        status: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        Region: { select: { id: true, name: true } },
        Bus: { select: { id: true, busCode: true, registrationNumber: true } }
      }
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { actorUserId: userId },
          { entityId: userId }
        ]
      },
      take: 50,
      orderBy: { timestamp: "desc" }
    });
    res.json({
      user: {
        ...user,
        regionName: user.Region?.name || "—",
        busName: user.Bus ? `${user.Bus.busCode || user.Bus.registrationNumber} (${user.Bus.registrationNumber})` : "—"
      },
      logs
    });
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
}


