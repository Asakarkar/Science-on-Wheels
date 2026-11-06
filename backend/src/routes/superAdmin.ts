import { Router } from "express";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { requireAuth, requirePermission, requireSuperAdmin } from "../middleware/auth";
import { hashPassword } from "../lib/password";
import { seedInventoryFromCsv } from "../lib/inventoryImporter";
import { seedSchoolsFromCsv } from "../lib/schoolImporter";
import { env } from "../config/env";

export const superAdminRouter = Router();
superAdminRouter.use(requireAuth, requireSuperAdmin);

const resourceMap: Record<string, string> = {
  states: "state",
  regions: "region",
  districts: "district",
  blocks: "block",
  users: "user",
  roles: "role",
  permissions: "permission",
  labs: "bus",
  maintenance: "busMaintenanceRecord",
  schools: "school",
  schoolScheduleEntries: "importedSchoolSchedule",
  inventoryInvoiceLines: "importedInventoryLine",
  registrations: "schoolRegistration",
  experiments: "experiment",
  equipment: "equipment",
  consumables: "consumable",
  events: "event",
  routes: "route",
  trips: "trip",
  procurement: "procurementRequest",
  expenses: "operationalExpense",
  announcements: "announcement",
  students: "student",
  teachers: "teacher",
  gpsDevices: "gpsDevice",
  auditLogs: "auditLog",
  systemConfig: "systemConfig",
  equipmentMasters: "equipmentMaster",
  curriculumNodes: "curriculumNode",
  operationalIssues: "operationalIssue",
  inventoryTransactions: "inventoryTransaction"
};

const idModels = new Set(Object.keys(resourceMap));
const dateFields = new Set([
  "createdAt", "updatedAt", "lastLoginAt", "expiresAt", "lastActivityAt", "timestamp", "eventDate", "invoiceDate",
  "purchaseDate", "serviceDate", "nextDueDate", "expiryDate", "preferredDate", "alternativeDate", "publishedAt", "scheduledDate",
  "startedAt", "completedAt", "assignedAt", "installedAt", "lastSeenAt", "issueDate", "usedAt", "expenseDate", "recordedAt",
  "plannedArrival", "plannedDeparture", "actualArrival", "actualDeparture", "verifiedAt"
]);

function newId() { return crypto.randomUUID(); }
function normalizePayload(input: any) {
  const data = { ...(input || {}) };
  delete data.id;
  for (const key of Object.keys(data)) {
    if (dateFields.has(key) && data[key]) data[key] = new Date(data[key]);
  }
  return data;
}

async function audit(req: any, action: string, entity: string, entityId?: string, metadata?: any) {
  await prisma.auditLog.create({
    data: {
      actorUserId: req.userId,
      action,
      entity,
      entityId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata
    }
  }).catch(() => undefined);
}

// req.userId is populated for audit convenience.
superAdminRouter.use((req, res, next) => {
  req.userId = res.locals.user?.id;
  next();
});

superAdminRouter.get("/overview", requirePermission("dashboard.view"), async (_req, res) => {
  const [regions, labs, fieldStaff, schools, students, completed, pending, consumables, buses] = await Promise.all([
    prisma.region.count(),
    prisma.bus.count({ where: { status: { not: "UNDER_MAINTENANCE" } } }),
    prisma.user.count({ where: { roleEnum: "SCIENCE_COMMUNICATOR", isActive: true } }),
    prisma.school.count(),
    prisma.student.count(),
    prisma.event.count({ where: { status: "COMPLETED" } }),
    prisma.event.count({ where: { status: { in: ["SCHEDULED", "READINESS_VERIFIED", "IN_TRANSIT", "ON_SITE"] } } }),
    prisma.consumable.findMany({ select: { id: true, name: true, currentStock: true, minimumStock: true, unitMetric: true } }),
    prisma.bus.findMany({ select: { id: true, busCode: true, registrationNumber: true, status: true, currentLat: true, currentLng: true, lastGpsUpdate: true, regionId: true } })
  ]);

  const lowStock = consumables.filter((x) => x.currentStock <= x.minimumStock);
  const regionRows = await prisma.region.findMany({ select: { id: true, name: true, stateId: true } });
  const regionName = new Map(regionRows.map((r) => [r.id, r.name]));
  const liveLabs = buses.map((b) => ({ ...b, regionName: regionName.get(b.regionId) ?? "Unassigned" }));

  const alerts = [
    ...lowStock.map((x) => ({ type: "inventory", severity: "warning", title: `Low stock: ${x.name}`, detail: `${x.currentStock} ${x.unitMetric} remaining` })),
    ...buses.filter((b) => !b.lastGpsUpdate || Date.now() - new Date(b.lastGpsUpdate).getTime() > 30 * 60 * 1000).map((b) => ({ type: "gps", severity: "info", title: `${b.busCode || b.registrationNumber} location stale`, detail: "No recent GPS update" }))
  ];

  const recentActivity = await prisma.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 12 });

  res.json({
    kpis: { regions, labs, fieldStaff, schools, students, sessionsCompleted: completed, sessionsPending: pending, inventoryAlerts: lowStock.length },
    liveLabs,
    alerts,
    recentActivity,
    generatedAt: new Date().toISOString()
  });
});

superAdminRouter.get("/health", requirePermission("security.view"), async (_req, res) => {
  const started = Date.now();
  let database = "healthy";
  try { await prisma.$queryRaw`SELECT 1`; } catch { database = "degraded"; }
  res.json({ api: "healthy", database, responseMs: Date.now() - started, uptimeSeconds: process.uptime(), node: process.version });
});

superAdminRouter.get(["/resource/:resource", "/:resource"], async (req, res, next) => {
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
    const searchable: Record<string, string[]> = {
      states: ["name", "code"], regions: ["name"], districts: ["name"], blocks: ["name"],
      users: ["name", "email", "status"], roles: ["name"], permissions: ["key"], labs: ["busCode", "registrationNumber", "status"],
      schools: ["name", "udiseCode", "principalName"], experiments: ["title", "subject", "difficultyLevel"], equipment: ["assetTag", "name", "category"],
      schoolScheduleEntries: ["schoolCollegeName", "district", "regionSection", "dateOrDateRange"],
      inventoryInvoiceLines: ["invoiceNo", "supplierName", "buyerName", "labCategory", "itemName", "hsnCode"],
      consumables: ["name", "category"], events: ["eventCode", "status"], routes: ["routeCode", "routeName", "status"], trips: ["tripCode", "status"],
      procurement: ["itemName", "status"], expenses: ["category", "description"], announcements: ["title"], students: ["name", "gradeClass"], teachers: ["subjectTaught"],
      gpsDevices: ["imeiNumber", "status"], auditLogs: ["action", "entity"], systemConfig: ["key", "description"]
    };
    const fields = searchable[resource] || [];
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
  } else {
    const orderBy = ["schoolScheduleEntries", "inventoryInvoiceLines"].includes(resource) ? { sourceRow: "asc" } : { createdAt: "desc" };
    rows = await delegate.findMany({ where, take, orderBy }).catch(async () => delegate.findMany({ where, take }));
  }

  const safe = resource === "users" ? rows.map((u: any) => ({ ...u, passwordHash: undefined })) : rows;
  res.json({ rows: safe });
});

superAdminRouter.get(["/roles/:id/permissions", "/resource/roles/:id/permissions"], async (req, res) => {
  const roleId = String(req.params.id);
  const role: any = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });
  if (!role) return res.status(404).json({ message: "Role not found" });

  const allPermissions = await prisma.permission.findMany({
    orderBy: { key: "asc" },
  });

  const assignedKeys = (role.permissions || []).map((p: any) => p.permission.key);

  return res.json({
    role: {
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: role._count?.users ?? 0,
    },
    assignedKeys,
    allPermissions,
  });
});

superAdminRouter.put(["/roles/:id/permissions", "/resource/roles/:id/permissions"], async (req, res) => {
  const roleId = String(req.params.id);
  const { permissionKeys } = req.body;
  if (!Array.isArray(permissionKeys)) {
    return res.status(400).json({ message: "permissionKeys must be an array of string keys" });
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return res.status(404).json({ message: "Role not found" });

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

  return res.json({
    message: "Role permissions updated successfully",
    role: {
      ...updated,
      permissionKeys: (updated?.permissions || []).map((p: any) => p.permission.key),
      userCount: updated?._count?.users ?? 0,
    },
  });
});

superAdminRouter.post(["/resource/:resource", "/:resource"], async (req, res, next) => {
  const resource = String(req.params.resource);
  if (resource === "inventoryInvoiceLines") return res.status(405).json({ message: "Imported invoice lines are read-only" });
  const delegateName = resourceMap[resource];
  if (!delegateName || !idModels.has(resource)) return next();
  const delegate = (prisma as any)[delegateName];
  const data = normalizePayload(req.body);
  if (!data.id) data.id = newId();

  if (resource === "users") {
    if (!data.email || !data.password) return res.status(400).json({ message: "User email and password are required" });
    data.email = String(data.email).toLowerCase();
    data.passwordHash = await hashPassword(String(data.password));
    delete data.password;
    data.roleEnum = data.roleEnum || "SCIENCE_COMMUNICATOR";
    data.status = data.status || "ACTIVE";
    data.isActive = data.isActive !== false;
    const roleRecord = await prisma.role.findUnique({ where: { name: String(data.roleEnum) } });
    if (!roleRecord) return res.status(400).json({ message: `Role ${data.roleEnum} is not configured. Run the seed first.` });
    data.roleId = roleRecord.id;
    if (data.roleEnum === "SUPER_ADMIN") data.regionId = null;
  }
  if (resource === "systemConfig") data.updatedAt = new Date();
  if (resource === "announcements" && !data.targetRoles) data.targetRoles = ["SUPER_ADMIN"];
  if (resource === "roles" && !data.name) return res.status(400).json({ message: "Role name is required" });
  if (resource === "permissions") {
    if (!data.key) return res.status(400).json({ message: "Permission key is required" });
    data.updatedAt = new Date();
  }

  try {
    if (resource === "inventoryTransactions") {
      const deltaByType: Record<string, number> = { RECEIPT: 1, RETURN: 1, ISSUE: -1, DAMAGE: -1, LOSS: -1, CONSUMPTION: -1, TRANSFER: 0, ADJUSTMENT: 1 };
      const row = await prisma.$transaction(async (tx) => {
        const created = await (tx as any).inventoryTransaction.create({ data });
        const delta = (deltaByType[String(data.type)] ?? 0) * Number(data.quantity || 0);
        if (delta !== 0) {
          await (tx as any).consumable.update({ where: { id: data.consumableId }, data: { currentStock: { increment: delta } } });
        }
        return created;
      });
      await audit(req, "CREATE", resource, row.id, { type: data.type, quantity: data.quantity });
      return res.status(201).json(row);
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
    const safe = resource === "users" ? { ...row, passwordHash: undefined } : row;
    res.status(201).json(safe);
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
});

superAdminRouter.patch(["/resource/:resource/:id", "/:resource/:id"], async (req, res, next) => {
  const resource = String(req.params.resource);
  if (resource === "inventoryInvoiceLines") return res.status(405).json({ message: "Imported invoice lines are read-only" });
  const delegateName = resourceMap[resource];
  if (!delegateName) return next();
  const delegate = (prisma as any)[delegateName];
  const data = normalizePayload(req.body);
  delete data.id;
  if (resource === "systemConfig") data.updatedAt = new Date();
  if (resource === "users" && data.password) {
    data.passwordHash = await hashPassword(String(data.password));
    delete data.password;
  }
  if (resource === "users" && data.roleEnum) {
    const roleRecord = await prisma.role.findUnique({ where: { name: String(data.roleEnum) } });
    if (!roleRecord) return res.status(400).json({ message: `Role ${data.roleEnum} is not configured. Run the seed first.` });
    data.roleId = roleRecord.id;
    if (data.roleEnum === "SUPER_ADMIN") data.regionId = null;
  }
  try {
    const row = await delegate.update({ where: { id: req.params.id }, data });
    await audit(req, "UPDATE", resource, row.id, { fields: Object.keys(data) });
    res.json(resource === "users" ? { ...row, passwordHash: undefined } : row);
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
});

function formatPrismaError(error: any): string {
  if (error?.code === "P2003") {
    const constraint = String(error.meta?.field_name || error.meta?.constraint || error.message || "");
    if (constraint.includes("Bus_regionId_fkey")) {
      return "Cannot delete this Region because active Mobile Laboratories (Buses) are assigned to it. Please reassign or delete the associated buses first.";
    }
    if (constraint.includes("District_regionId_fkey")) {
      return "Cannot delete this Region because Districts belong to it. Please remove or reassign the associated districts first.";
    }
    if (constraint.includes("School_regionId_fkey")) {
      return "Cannot delete this Region because Schools are registered under it. Please remove or reassign the associated schools first.";
    }
    if (constraint.includes("User_regionId_fkey")) {
      return "Cannot delete this Region because Staff/User accounts are assigned to it. Please reassign staff to another region first.";
    }
    if (constraint.includes("Route_regionId_fkey")) {
      return "Cannot delete this Region because Routes belong to it.";
    }
    if (constraint.includes("StaffTravelAssignment_regionId_fkey")) {
      return "Cannot delete this Region because Staff Travel Assignments reference it.";
    }
    if (constraint.includes("OperationalIssue_regionId_fkey")) {
      return "Cannot delete this Region because Operational Issues are logged against it.";
    }
    if (constraint.includes("Block_districtId_fkey")) {
      return "Cannot delete this District because Blocks belong to it. Please remove or reassign the blocks first.";
    }
    if (constraint.includes("School_districtId_fkey")) {
      return "Cannot delete this District because Schools belong to it. Please remove or reassign the schools first.";
    }
    if (constraint.includes("School_blockId_fkey")) {
      return "Cannot delete this Block because Schools are assigned to it. Please remove or reassign the schools first.";
    }
    if (constraint.includes("Equipment_busId_fkey")) {
      return "Cannot delete this Mobile Lab because physical Equipment assets are assigned to it. Please transfer equipment to another lab first.";
    }
    if (constraint.includes("Event_busId_fkey")) {
      return "Cannot delete this Mobile Lab because Visit Events are scheduled for it.";
    }
    if (constraint.includes("Trip_busId_fkey")) {
      return "Cannot delete this Mobile Lab because travel Trips reference it.";
    }
    if (constraint.includes("Event_schoolId_fkey")) {
      return "Cannot delete this School because Visit Events are scheduled or completed for it.";
    }
    if (constraint.includes("SchoolRegistration_schoolId_fkey")) {
      return "Cannot delete this School because Registration requests reference it.";
    }
    if (constraint.includes("RouteStop_schoolId_fkey")) {
      return "Cannot delete this School because Route Stops reference it.";
    }
    if (constraint.includes("Student_schoolId_fkey")) {
      return "Cannot delete this School because Student records are associated with it.";
    }
    if (constraint.includes("Teacher_schoolId_fkey")) {
      return "Cannot delete this School because Teacher records are associated with it.";
    }
    if (constraint.includes("User_roleId_fkey")) {
      return "Cannot delete this Role because User accounts currently have this role assigned.";
    }
    if (constraint.includes("Equipment_equipmentMasterId_fkey")) {
      return "Cannot delete this Equipment Master item because physical Equipment assets are linked to it.";
    }
    if (constraint.includes("ConsumableUsage_consumableId_fkey")) {
      return "Cannot delete this Consumable because lab usage records reference it.";
    }
    if (constraint.includes("InventoryTransaction_consumableId_fkey")) {
      return "Cannot delete this Consumable because inventory transactions reference it.";
    }
    const match = constraint.match(/`?([A-Za-z0-9]+)_([A-Za-z0-9]+)_fkey`?/);
    if (match) {
      const [, table, field] = match;
      return `Cannot delete this record because dependent '${table}' records still reference it via '${field}'. Please remove or reassign related records first.`;
    }
    return "Cannot delete this record because other records in the system depend on it. Please remove or reassign dependent records first.";
  }

  if (error?.code === "P2025") {
    return "Record not found or has already been deleted.";
  }

  if (error?.code === "P2002") {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : error.meta?.target || "unique field";
    return `A record with this ${target} already exists.`;
  }

  const raw = String(error?.message || "Operation failed");
  const missingMatch = raw.match(/Argument `([^`]+)` is missing/);
  if (missingMatch) {
    return `Required field '${missingMatch[1]}' is missing.`;
  }

  const clean = raw
    .replace(/Invalid `[^`]+` invocation in [^\n]+\n/g, "")
    .replace(/\n\s*→\s*\d+\s+[^\n]+/g, "")
    .replace(/Foreign key constraint violated on the constraint:\s*`?[A-Za-z0-9_]+`?/g, "A dependent record prevents this deletion.")
    .trim();

  return clean || "Operation failed";
}

superAdminRouter.delete(["/resource/:resource/:id", "/:resource/:id"], async (req, res, next) => {
  const resource = String(req.params.resource);
  const id = String(req.params.id);
  const cascade = req.query.cascade === "true" || req.body?.cascade === true;

  if (resource === "inventoryInvoiceLines") return res.status(405).json({ message: "Imported invoice lines are read-only" });
  const delegateName = resourceMap[resource];
  if (!delegateName) return next();

  // 1. Guard core protected entities
  if (resource === "regions" && id === "region-west-1") {
    return res.status(403).json({
      message: "The core operational region (Western Region) is protected and cannot be deleted because mobile laboratories, districts, and schools depend on it."
    });
  }

  if (resource === "states" && id === "state-mh") {
    return res.status(403).json({
      message: "The core state (Maharashtra) is protected and cannot be deleted."
    });
  }

  if (resource === "roles") {
    const role = await prisma.role.findUnique({ where: { id } });
    if (role && ["SUPER_ADMIN", "REGIONAL_ADMIN", "SCIENCE_COMMUNICATOR"].includes(role.name)) {
      return res.status(403).json({
        message: `Core system role '${role.name}' is protected and cannot be deleted.`
      });
    }
  }

  if (resource === "users") {
    const currentUserId = req.userId || res.locals.user?.id;
    if (currentUserId && currentUserId === id) {
      return res.status(403).json({ message: "You cannot delete your own active administrator account." });
    }
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (targetUser && targetUser.email.toLowerCase() === env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({
        message: "The primary bootstrap Super Administrator account is protected and cannot be deleted."
      });
    }
  }

  try {
    // 2. Resource-specific cascade logic if requested
    if (resource === "regions") {
      const totalRegions = await prisma.region.count();
      if (totalRegions <= 1) {
        return res.status(403).json({
          message: "Cannot delete the only region in the system. The platform requires at least one active region."
        });
      }
      if (cascade) {
        const fallbackRegion = await prisma.region.findFirst({
          where: { id: { not: id } }
        });
        if (!fallbackRegion) {
          return res.status(400).json({ message: "No alternate region available to reassign resources to." });
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
        return res.status(204).send();
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
      return res.status(204).send();
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
      return res.status(204).send();
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
});

superAdminRouter.get("/reports/summary", requirePermission("analytics.view"), async (_req, res) => {
  const [regions, labs, schools, students, events, equipment, consumables, users, issues, curriculumNodes, inventoryTransactions, trips, completedTrips, completedEvents] = await Promise.all([
    prisma.region.count(),
    prisma.bus.count(),
    prisma.school.count(),
    prisma.student.count(),
    prisma.event.count(),
    prisma.equipment.count(),
    prisma.consumable.count(),
    prisma.user.count(),
    (prisma as any).operationalIssue.count(),
    (prisma as any).curriculumNode.count(),
    (prisma as any).inventoryTransaction.count(),
    prisma.trip.count(),
    prisma.trip.count({ where: { status: "COMPLETED" } }),
    prisma.event.count({ where: { status: "COMPLETED" } })
  ]);
  res.json({ regions, labs, schools, students, events, completedEvents, trips, completedTrips, equipment, consumables, users, issues, curriculumNodes, inventoryTransactions });
});

superAdminRouter.get("/reports/:resource.csv", requirePermission("analytics.view"), async (req, res) => {
  const resource = String(req.params.resource);
  const delegateName = resourceMap[resource];
  if (!delegateName) return res.status(404).send("Unknown resource");
  const rows = await (prisma as any)[delegateName].findMany({ take: 1000 });
  const keys: string[] = Array.from(new Set<string>(rows.flatMap((r: any) => Object.keys(r).filter((k: string) => k !== "passwordHash"))));
  const csv = [keys.join(","), ...rows.map((r: any) => keys.map((k: string) => JSON.stringify(r[k] ?? "")).join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=${resource}.csv`);
  res.send(csv);
});

superAdminRouter.post("/inventory/seed-csv", async (_req, res) => {
  try {
    const summary = await seedInventoryFromCsv({ removeDummy: true });
    res.json({ message: "Inventory CSV seeded successfully", summary });
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to seed inventory from CSV" });
  }
});

superAdminRouter.post("/schools/seed-csv", async (_req, res) => {
  try {
    const summary = await seedSchoolsFromCsv({ removeDummy: true });
    res.json({ message: "School CSV seeded successfully", summary });
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to seed schools from CSV" });
  }
});

export default superAdminRouter;
