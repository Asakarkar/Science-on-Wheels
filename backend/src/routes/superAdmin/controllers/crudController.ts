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
  } else if (resource === "regions") {
    const rawRegions = await prisma.region.findMany({
      where,
      take,
      orderBy: { name: "asc" },
      include: {
        State: { select: { id: true, name: true, code: true } },
        _count: { select: { School: true, Bus: true, District: true } },
      },
    });
    const regionalAdmins = await prisma.user.findMany({
      where: { roleEnum: "REGIONAL_ADMIN", status: "ACTIVE" },
      select: { id: true, name: true, email: true, phone: true, regionId: true },
    });
    const adminByRegion = new Map<string, any>();
    for (const a of regionalAdmins) {
      if (a.regionId) adminByRegion.set(a.regionId, a);
    }
    rows = rawRegions.map((r: any) => {
      const admin = adminByRegion.get(r.id);
      return {
        ...r,
        stateName: r.State ? `${r.State.name} (${r.State.code})` : "—",
        schoolCount: r._count?.School ?? 0,
        busCount: r._count?.Bus ?? 0,
        districtCount: r._count?.District ?? 0,
        adminName: admin ? admin.name : "Unassigned",
        adminEmail: admin ? admin.email : null,
        adminId: admin ? admin.id : null,
      };
    });
  } else if (resource === "labs") {
    const rawBuses = await prisma.bus.findMany({
      where,
      take,
      orderBy: { busCode: "asc" },
      include: {
        Region: { select: { id: true, name: true } },
        User: { select: { id: true, name: true, email: true, phone: true } },
        GpsDevice: { select: { id: true, imeiNumber: true, status: true, lastSeenAt: true } },
        _count: { select: { Equipment: true, BusMaintenanceRecord: true, Trip: true } }
      }
    });
    rows = rawBuses.map((b: any) => ({
      ...b,
      regionName: b.Region?.name || "Unassigned",
      staffName: b.User?.name || "Unassigned",
      staffEmail: b.User?.email || null,
      equipmentCount: b._count?.Equipment ?? 0,
      maintenanceCount: b._count?.BusMaintenanceRecord ?? 0,
      tripCount: b._count?.Trip ?? 0,
      gpsStatus: b.GpsDevice?.status || (b.currentLat ? "ACTIVE" : "OFFLINE")
    }));
  } else if (resource === "schools") {
    const rawSchools = await prisma.school.findMany({
      where,
      take,
      orderBy: { name: "asc" },
      include: {
        Region: { select: { id: true, name: true } },
        District: { select: { id: true, name: true } },
        Block: { select: { id: true, name: true } },
        _count: { select: { Student: true, Teacher: true, Event: true } }
      }
    });
    rows = rawSchools.map((s: any) => ({
      ...s,
      regionName: s.Region?.name || "Unassigned",
      districtName: s.District?.name || "—",
      blockName: s.Block?.name || "—",
      studentCount: s._count?.Student ?? s.totalStudents ?? 0,
      teacherCount: s._count?.Teacher ?? 0,
      eventCount: s._count?.Event ?? 0,
      status: s.priorityCategory === "LOW" ? "INACTIVE" : "ACTIVE"
    }));
  } else if (resource === "auditLogs") {
    if (req.query.entity) where.entity = String(req.query.entity);
    if (req.query.actorUserId) where.actorUserId = String(req.query.actorUserId);
    const rawLogs = await prisma.auditLog.findMany({
      where,
      take,
      orderBy: { timestamp: "desc" },
      include: {
        User: { select: { id: true, name: true, email: true, roleEnum: true } }
      }
    });
    rows = rawLogs.map((l: any) => ({
      ...l,
      actorName: l.User?.name || "System Automated",
      actorEmail: l.User?.email || null,
      actorRole: l.User?.roleEnum || "SYSTEM",
      module: l.entity || "System",
      metadataFormatted: typeof l.metadata === "object" ? JSON.stringify(l.metadata, null, 2) : String(l.metadata || "")
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
  if (resource === "auditLogs") {
    res.status(403).json({ message: "Audit logs are strictly append-only and cannot be deleted." });
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
  if (resource === "labs") {
    if (!data.insuranceExpiry) data.insuranceExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    if (!data.fitnessExpiry) data.fitnessExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    if (data.driverId) {
      await prisma.bus.updateMany({
        where: { driverId: String(data.driverId) },
        data: { driverId: null }
      }).catch(() => undefined);
    }
  }
  if (resource === "schools") {
    if (!data.udiseCode) {
      data.udiseCode = `UDISE-${Date.now().toString().slice(-6)}`;
    }
    if (data.totalStudents !== undefined) data.totalStudents = Number(data.totalStudents) || 0;
    if (data.latitude !== undefined) data.latitude = Number(data.latitude) || 19.076;
    if (data.longitude !== undefined) data.longitude = Number(data.longitude) || 72.8777;
    if (data.priorityScore !== undefined) data.priorityScore = Number(data.priorityScore) || 0;
    if (data.hasScienceLab !== undefined) data.hasScienceLab = Boolean(data.hasScienceLab);
    if (data.hasElectricity !== undefined) data.hasElectricity = Boolean(data.hasElectricity);
    if (data.hasInternet !== undefined) data.hasInternet = Boolean(data.hasInternet);
    if (data.locationVerified !== undefined) data.locationVerified = Boolean(data.locationVerified);
    
    if (!data.districtId && data.regionId) {
      const defaultDistrict = await prisma.district.findFirst({ where: { regionId: String(data.regionId) } });
      if (defaultDistrict) data.districtId = defaultDistrict.id;
    }
    if (!data.blockId && data.districtId) {
      const defaultBlock = await prisma.block.findFirst({ where: { districtId: String(data.districtId) } });
      if (defaultBlock) data.blockId = defaultBlock.id;
    }
  }

  delete data.adminUserId;
  delete data.busId;

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

    if (resource === "regions" && req.body.adminUserId) {
      const targetUserId = String(req.body.adminUserId);
      const role = await prisma.role.findUnique({ where: { name: "REGIONAL_ADMIN" } });
      if (role) {
        await prisma.user.update({
          where: { id: targetUserId },
          data: { regionId: row.id, roleEnum: "REGIONAL_ADMIN", roleId: role.id }
        }).catch(() => undefined);
      }
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
  if (resource === "auditLogs") {
    res.status(403).json({ message: "Audit logs are strictly append-only and cannot be deleted." });
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
  if (resource === "regions" && req.body.adminUserId !== undefined) {
    const targetUserId = req.body.adminUserId ? String(req.body.adminUserId) : null;
    const role = await prisma.role.findUnique({ where: { name: "REGIONAL_ADMIN" } });
    if (role) {
      if (targetUserId) {
        await prisma.user.updateMany({
          where: { regionId: id, roleEnum: "REGIONAL_ADMIN", id: { not: targetUserId } },
          data: { regionId: null }
        }).catch(() => undefined);
        await prisma.user.update({
          where: { id: targetUserId },
          data: { regionId: id, roleEnum: "REGIONAL_ADMIN", roleId: role.id }
        }).catch(() => undefined);
      } else {
        await prisma.user.updateMany({
          where: { regionId: id, roleEnum: "REGIONAL_ADMIN" },
          data: { regionId: null }
        }).catch(() => undefined);
      }
    }
  }
  if (resource === "users" && data.roleEnum) {
    const roleRecord = await prisma.role.findUnique({ where: { name: String(data.roleEnum) } });
    if (!roleRecord) {
      res.status(400).json({ message: `Role ${data.roleEnum} is not configured. Run the seed first.` });
      return;
    }
    data.roleId = roleRecord.id;
    if (data.roleEnum === "SUPER_ADMIN") data.regionId = null;
  }
  if (resource === "labs" && data.driverId) {
    await prisma.bus.updateMany({
      where: { driverId: String(data.driverId), id: { not: id } },
      data: { driverId: null }
    }).catch(() => undefined);
  }
  if (resource === "schools") {
    if (data.totalStudents !== undefined) data.totalStudents = Number(data.totalStudents) || 0;
    if (data.latitude !== undefined) data.latitude = Number(data.latitude) || 0;
    if (data.longitude !== undefined) data.longitude = Number(data.longitude) || 0;
    if (data.priorityScore !== undefined) data.priorityScore = Number(data.priorityScore) || 0;
    if (data.hasScienceLab !== undefined) data.hasScienceLab = Boolean(data.hasScienceLab);
    if (data.hasElectricity !== undefined) data.hasElectricity = Boolean(data.hasElectricity);
    if (data.hasInternet !== undefined) data.hasInternet = Boolean(data.hasInternet);
    if (data.locationVerified !== undefined) data.locationVerified = Boolean(data.locationVerified);

    delete data.regionName;
    delete data.districtName;
    delete data.blockName;
    delete data.studentCount;
    delete data.teacherCount;
    delete data.eventCount;
    delete data.status;
    delete data.Region;
    delete data.District;
    delete data.Block;
    delete data._count;
  }
  delete data.adminUserId;
  delete data.busId;

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
  if (resource === "auditLogs") {
    res.status(403).json({ message: "Audit logs are strictly append-only and cannot be deleted." });
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
        prisma.eventsOnCommunicator.deleteMany({ where: { Event: { schoolId: id } } }),
        prisma.event.deleteMany({ where: { schoolId: id } }),
        prisma.school.delete({ where: { id } }),
      ]);
      await audit(req, "DELETE", resource, id, { cascade: true });
      res.status(204).send();
      return;
    }

    if (resource === "events") {
      await prisma.eventsOnCommunicator.deleteMany({ where: { eventId: id } });
      await prisma.eventAttendance.deleteMany({ where: { eventId: id } });
      await prisma.consumableUsage.deleteMany({ where: { eventId: id } });
      await prisma.experimentSession.deleteMany({ where: { eventId: id } });
      await prisma.eventReadinessCheck.deleteMany({ where: { eventId: id } });
      await prisma.feedbackRecord.deleteMany({ where: { eventId: id } });
    }

    if (resource === "districts" && cascade) {
      const schoolsInDistrict = await prisma.school.findMany({ where: { districtId: id }, select: { id: true } });
      const schoolIds = schoolsInDistrict.map((s) => s.id);
      await prisma.$transaction([
        prisma.schoolRegistration.deleteMany({ where: { schoolId: { in: schoolIds } } }),
        prisma.routeStop.deleteMany({ where: { schoolId: { in: schoolIds } } }),
        prisma.eventsOnCommunicator.deleteMany({ where: { Event: { schoolId: { in: schoolIds } } } }),
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
      // 1. Remove communicator assignments to visit events (EventsOnCommunicator)
      await prisma.eventsOnCommunicator.deleteMany({ where: { userId: id } });

      // 2. Remove staff travel assignments
      await prisma.staffTravelAssignment.deleteMany({ where: { userId: id } });

      // 3. Unassign from buses (as primary driver)
      await prisma.bus.updateMany({ where: { driverId: id }, data: { driverId: null } });

      // 4. Remove active login sessions
      await prisma.session.deleteMany({ where: { userId: id } });

      // 5. Remove user feedback records
      await prisma.feedbackRecord.deleteMany({ where: { userId: id } });

      // 6. Clear nullable tracking references in audit logs, inventory transactions, and issues
      await prisma.auditLog.updateMany({ where: { actorUserId: id }, data: { actorUserId: null } });
      await prisma.inventoryTransaction.updateMany({ where: { performedById: id }, data: { performedById: null } });
      await prisma.operationalIssue.updateMany({ where: { assignedResolverId: id }, data: { assignedResolverId: null } });

      // 7. For non-nullable required relationships, reassign to a system admin if possible
      const fallbackAdmin = await prisma.user.findFirst({
        where: { roleEnum: "SUPER_ADMIN", id: { not: id } }
      });
      if (fallbackAdmin) {
        await prisma.operationalIssue.updateMany({ where: { reportedById: id }, data: { reportedById: fallbackAdmin.id } });
        await prisma.trip.updateMany({ where: { driverId: id }, data: { driverId: fallbackAdmin.id } });
        await prisma.routeAssignment.updateMany({ where: { driverId: id }, data: { driverId: fallbackAdmin.id } });
        await prisma.documentVault.updateMany({ where: { uploadedById: id }, data: { uploadedById: fallbackAdmin.id } });
        await prisma.procurementRequest.updateMany({ where: { requestedById: id }, data: { requestedById: fallbackAdmin.id } });
        await prisma.operationalExpense.updateMany({ where: { submittedById: id }, data: { submittedById: fallbackAdmin.id } });
        await prisma.equipmentMovement.updateMany({ where: { movedById: id }, data: { movedById: fallbackAdmin.id } });
      }

      // 8. Disassociate student or teacher links
      await prisma.student.updateMany({ where: { userId: id }, data: { userId: null } });
      await prisma.teacher.deleteMany({ where: { userId: id } });
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

export async function getRegionProfile(req: Request, res: Response): Promise<void> {
  const regionId = String(req.params.id);
  try {
    const region = await prisma.region.findUnique({
      where: { id: regionId },
      include: {
        State: { select: { id: true, name: true, code: true } },
        _count: { select: { School: true, Bus: true, District: true, User: true } }
      }
    });

    if (!region) {
      res.status(404).json({ message: "Region not found" });
      return;
    }

    const [
      regionalAdmins,
      schools,
      buses,
      fieldStaff,
      equipment,
      recentTransactions,
      recentIssues,
      eventStats
    ] = await Promise.all([
      prisma.user.findMany({
        where: { regionId, roleEnum: "REGIONAL_ADMIN" },
        select: { id: true, name: true, email: true, phone: true, status: true, lastLoginAt: true }
      }),
      prisma.school.findMany({
        where: { regionId },
        take: 100,
        orderBy: { name: "asc" },
        select: { id: true, name: true, udiseCode: true, contactPhone: true, totalStudents: true, districtId: true, priorityCategory: true }
      }),
      prisma.bus.findMany({
        where: { regionId },
        take: 50,
        orderBy: { busCode: "asc" },
        include: {
          User: { select: { id: true, name: true, email: true, phone: true } }
        }
      }),
      prisma.user.findMany({
        where: { regionId, roleEnum: "SCIENCE_COMMUNICATOR" },
        take: 50,
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, phone: true, status: true, Bus: { select: { id: true, busCode: true, registrationNumber: true } } }
      }),
      prisma.equipment.findMany({
        where: { Bus: { regionId } },
        take: 100,
        orderBy: { name: "asc" },
        select: { id: true, assetTag: true, name: true, category: true, status: true, busId: true, Bus: { select: { busCode: true, registrationNumber: true } } }
      }),
      prisma.inventoryTransaction.findMany({
        where: { bus: { regionId } },
        take: 25,
        orderBy: { timestamp: "desc" },
        include: {
          consumable: { select: { name: true, unitMetric: true } },
          bus: { select: { busCode: true, registrationNumber: true } }
        }
      }),
      prisma.operationalIssue.findMany({
        where: { regionId },
        take: 20,
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, category: true, priority: true, status: true, createdAt: true }
      }),
      prisma.event.groupBy({
        by: ["status"],
        where: { School: { regionId } },
        _count: { id: true }
      }).catch(() => [])
    ]);

    const totalStudents = schools.reduce((sum, s) => sum + (s.totalStudents || 0), 0);
    const availableBuses = buses.filter((b) => b.status === "AVAILABLE" || b.status === "AT_SCHOOL" || b.status === "ON_ROUTE").length;

    res.json({
      region: {
        ...region,
        stateName: region.State ? `${region.State.name} (${region.State.code})` : "—"
      },
      regionalAdmins,
      schools,
      buses,
      fieldStaff: fieldStaff.map((f: any) => ({
        ...f,
        busName: f.Bus ? `${f.Bus.busCode || f.Bus.registrationNumber} (${f.Bus.registrationNumber})` : "Unassigned"
      })),
      equipment,
      recentTransactions,
      recentIssues,
      performance: {
        totalSchools: schools.length,
        totalStudents,
        totalBuses: buses.length,
        availableBuses,
        totalFieldStaff: fieldStaff.length,
        eventStatusCounts: eventStats,
        openIssuesCount: recentIssues.filter((i) => i.status !== "RESOLVED" && i.status !== "CLOSED").length
      }
    });
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
}

export async function assignRegionalAdmin(req: Request, res: Response): Promise<void> {
  const regionId = String(req.params.id);
  const targetUserId = req.body.userId ? String(req.body.userId) : null;
  const transferPrevious = req.body.transferPrevious !== false;

  try {
    const region = await prisma.region.findUnique({ where: { id: regionId } });
    if (!region) {
      res.status(404).json({ message: "Region not found" });
      return;
    }

    const regionalAdminRole = await prisma.role.findUnique({ where: { name: "REGIONAL_ADMIN" } });
    if (!regionalAdminRole) {
      res.status(400).json({ message: "REGIONAL_ADMIN role is not configured" });
      return;
    }

    let previousAdmin = null;
    if (transferPrevious) {
      previousAdmin = await prisma.user.findFirst({
        where: { regionId, roleEnum: "REGIONAL_ADMIN" }
      });
      if (previousAdmin && previousAdmin.id !== targetUserId) {
        await prisma.user.update({
          where: { id: previousAdmin.id },
          data: { regionId: null }
        }).catch(() => undefined);
      }
    }

    if (!targetUserId) {
      await audit(req, "TRANSFER_REGIONAL_ADMIN", "Region", regionId, {
        previousAdminId: previousAdmin?.id,
        action: "UNASSIGN"
      });
      res.json({ message: "Regional administrator unassigned successfully" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        regionId,
        roleEnum: "REGIONAL_ADMIN",
        roleId: regionalAdminRole.id,
        status: "ACTIVE",
        isActive: true
      },
      select: { id: true, name: true, email: true, roleEnum: true, regionId: true }
    });

    await audit(req, "TRANSFER_REGIONAL_ADMIN", "Region", regionId, {
      previousAdminId: previousAdmin?.id,
      newAdminId: targetUserId,
      newAdminName: updatedUser.name
    });

    res.json({
      message: `Successfully appointed ${updatedUser.name} as Regional Administrator for ${region.name}`,
      user: updatedUser
    });
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
}

export async function getBusProfile(req: Request, res: Response): Promise<void> {
  const busId = String(req.params.id);
  try {
    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      include: {
        Region: {
          select: {
            id: true,
            name: true,
            State: { select: { name: true, code: true } }
          }
        },
        User: { select: { id: true, name: true, email: true, phone: true, status: true } },
        GpsDevice: { select: { id: true, imeiNumber: true, providerName: true, status: true, lastSeenAt: true } },
        _count: { select: { Equipment: true, BusMaintenanceRecord: true, Trip: true } }
      }
    });

    if (!bus) {
      res.status(404).json({ message: "Bus not found" });
      return;
    }

    const [equipment, maintenanceRecords, trips, inventoryTransactions] = await Promise.all([
      prisma.equipment.findMany({
        where: { busId },
        take: 100,
        orderBy: { name: "asc" },
        select: { id: true, assetTag: true, name: true, category: true, status: true, storageUnit: true, purchaseDate: true, cost: true }
      }),
      prisma.busMaintenanceRecord.findMany({
        where: { busId },
        take: 50,
        orderBy: { serviceDate: "desc" }
      }),
      prisma.trip.findMany({
        where: { busId },
        take: 30,
        orderBy: { startedAt: "desc" },
        include: {
          Route: { select: { routeCode: true, routeName: true, startLocation: true, endLocation: true } },
          User: { select: { name: true } }
        }
      }),
      prisma.inventoryTransaction.findMany({
        where: { busId },
        take: 30,
        orderBy: { timestamp: "desc" },
        include: {
          consumable: { select: { name: true, unitMetric: true } }
        }
      })
    ]);

    const totalEquipmentCost = equipment.reduce((sum, e) => sum + (e.cost || 0), 0);
    const totalMaintenanceCost = maintenanceRecords.reduce((sum, m) => sum + (m.costAmount || 0), 0);

    res.json({
      bus: {
        ...bus,
        regionName: bus.Region?.name || "Unassigned",
        stateName: bus.Region?.State ? `${bus.Region.State.name} (${bus.Region.State.code})` : "—",
        staffName: bus.User?.name || "Unassigned"
      },
      equipment,
      maintenanceRecords,
      trips,
      inventoryTransactions,
      stats: {
        totalEquipmentCount: equipment.length,
        totalEquipmentCost,
        totalMaintenanceCount: maintenanceRecords.length,
        totalMaintenanceCost,
        totalTrips: trips.length
      }
    });
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
}

export async function assignBusStaff(req: Request, res: Response): Promise<void> {
  const busId = String(req.params.id);
  const targetStaffId = req.body.staffId ? String(req.body.staffId) : null;

  try {
    const bus = await prisma.bus.findUnique({ where: { id: busId } });
    if (!bus) {
      res.status(404).json({ message: "Bus not found" });
      return;
    }

    if (targetStaffId) {
      await prisma.bus.updateMany({
        where: { driverId: targetStaffId, id: { not: busId } },
        data: { driverId: null }
      });
    }

    const updated = await prisma.bus.update({
      where: { id: busId },
      data: { driverId: targetStaffId },
      include: {
        User: { select: { id: true, name: true, email: true } },
        Region: { select: { id: true, name: true } }
      }
    });

    await audit(req, "ASSIGN_BUS_STAFF", "Bus", busId, {
      staffId: targetStaffId,
      staffName: updated.User?.name || "Unassigned"
    });

    res.json({
      message: targetStaffId
        ? `Field staff ${updated.User?.name} successfully assigned to bus ${bus.busCode || bus.registrationNumber}`
        : `Field staff unassigned from bus ${bus.busCode || bus.registrationNumber}`,
      bus: updated
    });
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
}

export async function assignBusRegion(req: Request, res: Response): Promise<void> {
  const busId = String(req.params.id);
  const targetRegionId = String(req.body.regionId);

  try {
    const region = await prisma.region.findUnique({ where: { id: targetRegionId } });
    if (!region) {
      res.status(404).json({ message: "Region not found" });
      return;
    }

    const updated = await prisma.bus.update({
      where: { id: busId },
      data: { regionId: targetRegionId },
      include: {
        Region: { select: { id: true, name: true } }
      }
    });

    await audit(req, "ASSIGN_BUS_REGION", "Bus", busId, {
      regionId: targetRegionId,
      regionName: region.name
    });

    res.json({
      message: `Bus successfully linked to region "${region.name}"`,
      bus: updated
    });
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
}

export async function addBusMaintenance(req: Request, res: Response): Promise<void> {
  const busId = String(req.params.id);
  const { serviceType, costAmount, serviceDate, nextDueDate, remarks, updateBusStatus } = req.body;

  try {
    const bus = await prisma.bus.findUnique({ where: { id: busId } });
    if (!bus) {
      res.status(404).json({ message: "Bus not found" });
      return;
    }

    const record = await prisma.busMaintenanceRecord.create({
      data: {
        id: newId(),
        busId,
        serviceType: serviceType || "GENERAL_SERVICING",
        costAmount: Number(costAmount) || 0,
        serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        remarks: remarks || null
      }
    });

    if (updateBusStatus) {
      await prisma.bus.update({
        where: { id: busId },
        data: { status: updateBusStatus, serviceDate: record.serviceDate }
      });
    }

    await audit(req, "ADD_MAINTENANCE_RECORD", "Bus", busId, {
      recordId: record.id,
      serviceType: record.serviceType,
      costAmount: record.costAmount
    });

    res.status(201).json({
      message: "Maintenance record recorded successfully",
      record
    });
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
}

export async function getSchoolProfile(req: Request, res: Response): Promise<void> {
  const schoolId = String(req.params.id);

  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        Region: { select: { id: true, name: true } },
        District: { select: { id: true, name: true } },
        Block: { select: { id: true, name: true } },
        SchoolRegistration: true,
        _count: {
          select: {
            Student: true,
            Teacher: true,
            Event: true,
            OperationalIssues: true,
            RouteStop: true,
          }
        }
      }
    });

    if (!school) {
      res.status(404).json({ message: "School not found" });
      return;
    }

    // Fetch enrolled students
    const students = await prisma.student.findMany({
      where: { schoolId },
      take: 50,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        gradeClass: true,
        section: true,
        rollNumber: true,
        totalPoints: true,
        _count: { select: { EventAttendance: true } }
      }
    });

    // Fetch teachers
    const teachers = await prisma.teacher.findMany({
      where: { schoolId },
      select: {
        id: true,
        subjectTaught: true,
        User: { select: { id: true, name: true, email: true, phone: true } }
      }
    });

    // Fetch visits / mobile lab events
    const visits = await prisma.event.findMany({
      where: { schoolId },
      take: 50,
      orderBy: { eventDate: "desc" },
      include: {
        Bus: { select: { id: true, busCode: true, registrationNumber: true } },
        EventsOnCommunicator: {
          include: {
            User: { select: { id: true, name: true, phone: true } }
          }
        },
        ExperimentSession: {
          include: {
            Experiment: { select: { id: true, title: true, subject: true } }
          }
        },
        _count: {
          select: { EventAttendance: true, ConsumableUsage: true }
        }
      }
    });

    // Fetch inventory / consumable allocations for sessions at this school
    const consumableUsage = await prisma.consumableUsage.findMany({
      where: {
        Event: { schoolId }
      },
      take: 50,
      orderBy: { usedAt: "desc" },
      include: {
        Consumable: { select: { id: true, name: true, category: true, unitMetric: true } },
        Event: { select: { id: true, eventCode: true, eventDate: true } }
      }
    });

    // Fetch operational issues
    const issues = await prisma.operationalIssue.findMany({
      where: { schoolId },
      take: 20,
      orderBy: { createdAt: "desc" }
    });

    const totalStudentsEnrolled = school._count.Student;
    const totalTeachers = school._count.Teacher;
    const totalVisits = school._count.Event;
    const totalConsumablesUsed = consumableUsage.reduce((acc, c) => acc + (c.qtyUsed || 0), 0);

    res.json({
      school: {
        ...school,
        regionName: school.Region?.name || "Unassigned",
        districtName: school.District?.name || "—",
        blockName: school.Block?.name || "—",
      },
      students,
      teachers: teachers.map((t: any) => ({
        id: t.id,
        subjectTaught: t.subjectTaught,
        name: t.User?.name || "Teacher",
        email: t.User?.email || null,
        phone: t.User?.phone || null
      })),
      visits: visits.map((v: any) => ({
        id: v.id,
        eventCode: v.eventCode,
        eventDate: v.eventDate,
        startTime: v.startTime,
        endTime: v.endTime,
        status: v.status,
        expectedStudents: v.expectedStudentCount,
        attendanceCount: v._count.EventAttendance,
        readinessPercentage: v.readinessPercentage,
        busName: v.Bus ? `${v.Bus.busCode || v.Bus.registrationNumber} (${v.Bus.registrationNumber})` : "Unassigned",
        busId: v.Bus?.id || null,
        communicators: v.EventsOnCommunicator.map((c: any) => c.User?.name).filter(Boolean),
        experiments: v.ExperimentSession.map((s: any) => s.Experiment?.title).filter(Boolean)
      })),
      inventoryAllocations: consumableUsage.map((c: any) => ({
        id: c.id,
        consumableName: c.Consumable?.name || "Consumable",
        category: c.Consumable?.category || "Standard",
        quantity: c.qtyUsed,
        unit: c.Consumable?.unitMetric || "Units",
        date: c.usedAt,
        eventCode: c.Event?.eventCode || "—"
      })),
      issues,
      stats: {
        totalStudentsEnrolled,
        totalTeachers,
        totalVisits,
        totalConsumablesUsed,
        facilitiesScore: (school.hasScienceLab ? 1 : 0) + (school.hasElectricity ? 1 : 0) + (school.hasInternet ? 1 : 0)
      }
    });
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
}

export async function assignSchoolRegion(req: Request, res: Response): Promise<void> {
  const schoolId = String(req.params.id);
  const targetRegionId = String(req.body.regionId);
  const targetDistrictId = req.body.districtId ? String(req.body.districtId) : undefined;
  const targetBlockId = req.body.blockId ? String(req.body.blockId) : undefined;

  try {
    const region = await prisma.region.findUnique({ where: { id: targetRegionId } });
    if (!region) {
      res.status(404).json({ message: "Region not found" });
      return;
    }

    const updateData: any = { regionId: targetRegionId };

    if (targetDistrictId) {
      updateData.districtId = targetDistrictId;
    } else {
      const existingSchool = await prisma.school.findUnique({ where: { id: schoolId } });
      const currentDistrict = existingSchool?.districtId
        ? await prisma.district.findUnique({ where: { id: existingSchool.districtId } })
        : null;

      if (!currentDistrict || currentDistrict.regionId !== targetRegionId) {
        const fallbackDistrict = await prisma.district.findFirst({ where: { regionId: targetRegionId } });
        if (fallbackDistrict) {
          updateData.districtId = fallbackDistrict.id;
          const fallbackBlock = await prisma.block.findFirst({ where: { districtId: fallbackDistrict.id } });
          if (fallbackBlock) updateData.blockId = fallbackBlock.id;
        }
      }
    }

    if (targetBlockId) {
      updateData.blockId = targetBlockId;
    }

    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: updateData,
      include: {
        Region: { select: { id: true, name: true } },
        District: { select: { id: true, name: true } },
        Block: { select: { id: true, name: true } }
      }
    });

    await audit(req, "ASSIGN_SCHOOL_REGION", "School", schoolId, {
      regionId: targetRegionId,
      regionName: region.name,
      districtId: updated.districtId,
      blockId: updated.blockId
    });

    res.json({
      message: `School successfully mapped to region "${region.name}"`,
      school: updated
    });
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
}




