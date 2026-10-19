import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requirePermission, requireSuperAdmin } from "../middleware/auth";
import { hashPassword } from "../lib/password";

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
  "createdAt", "updatedAt", "lastLoginAt", "expiresAt", "lastActivityAt", "timestamp", "eventDate",
  "purchaseDate", "serviceDate", "nextDueDate", "expiryDate", "preferredDate", "alternativeDate", "publishedAt", "scheduledDate",
  "startedAt", "completedAt", "assignedAt", "installedAt", "lastSeenAt", "issueDate", "usedAt", "expenseDate", "recordedAt",
  "plannedArrival", "plannedDeparture", "actualArrival", "actualDeparture", "verifiedAt"
]);

function newId() { return crypto.randomUUID(); }
function normalizePayload(input: any) {
  const data = { ...(input || {}) };
  delete data.id;
  for (const key of Object.keys(data)) {
    if (data[key] === "") {
      data[key] = null;
    } else if (dateFields.has(key) && data[key]) {
      data[key] = new Date(data[key]);
    }
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
    prisma.user.count({ where: { roleEnum: { in: ["SCIENCE_COMMUNICATOR", "DRIVER"] }, isActive: true } }),
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

superAdminRouter.get("/resource/:resource", async (req, res) => {
  const delegateName = resourceMap[req.params.resource];
  if (!delegateName) return res.status(404).json({ message: "Unknown resource" });
  const prismaAny = prisma as any;
  const delegate = prismaAny[delegateName];
  const take = Math.min(Number(req.query.limit) || 100, 500);
  const search = String(req.query.search || "").trim();
  const where: any = {};

  if (search) {
    const searchable: Record<string, string[]> = {
      states: ["name", "code"], regions: ["name"], districts: ["name"], blocks: ["name"],
      users: ["name", "email", "status"], roles: ["name"], permissions: ["key"], labs: ["busCode", "registrationNumber", "status"],
      schools: ["name", "udiseCode", "principalName"], experiments: ["title", "subject", "difficultyLevel"], equipment: ["assetTag", "name", "category"],
      consumables: ["name", "category"], events: ["eventCode", "status"], routes: ["routeCode", "routeName", "status"], trips: ["tripCode", "status"],
      procurement: ["itemName", "status"], expenses: ["category", "description"], announcements: ["title"], students: ["name", "gradeClass"], teachers: ["subjectTaught"],
      gpsDevices: ["imeiNumber", "status"], auditLogs: ["action", "entity"], systemConfig: ["key", "description"]
    };
    const fields = searchable[req.params.resource] || [];
    if (fields.length) where.OR = fields.map((field) => ({ [field]: { contains: search, mode: "insensitive" } }));
  }

  if (req.query.status) where.status = String(req.query.status);
  if (req.query.type) where.type = String(req.query.type);
  if (req.query.category) where.category = String(req.query.category);
  if (req.query.roleEnum) where.roleEnum = String(req.query.roleEnum);
  if (req.query.action) where.action = String(req.query.action);

  const rows = await delegate.findMany({ where, take, orderBy: { createdAt: "desc" } }).catch(async () => delegate.findMany({ where, take }));
  const safe = req.params.resource === "users" ? rows.map((u: any) => ({ ...u, passwordHash: undefined })) : rows;
  res.json({ rows: safe });
});

superAdminRouter.post("/resource/:resource", async (req, res) => {
  const resource = req.params.resource;
  const delegateName = resourceMap[resource];
  if (!delegateName || !idModels.has(resource)) return res.status(404).json({ message: "Unknown resource" });
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
  if (resource === "permissions" && !data.key) return res.status(400).json({ message: "Permission key is required" });

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
    await audit(req, "CREATE", resource, row.id, { fields: Object.keys(data).filter((x) => x !== "passwordHash") });
    const safe = resource === "users" ? { ...row, passwordHash: undefined } : row;
    res.status(201).json(safe);
  } catch (error: any) {
    res.status(400).json({ message: error?.message || "Unable to create record" });
  }
});

superAdminRouter.patch("/resource/:resource/:id", async (req, res) => {
  const resource = req.params.resource;
  const delegateName = resourceMap[resource];
  if (!delegateName) return res.status(404).json({ message: "Unknown resource" });
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
    res.status(400).json({ message: error?.message || "Unable to update record" });
  }
});

superAdminRouter.delete("/resource/:resource/:id", async (req, res) => {
  const resource = req.params.resource;
  const delegateName = resourceMap[resource];
  if (!delegateName) return res.status(404).json({ message: "Unknown resource" });
  try {
    const row = await (prisma as any)[delegateName].delete({ where: { id: req.params.id } });
    await audit(req, "DELETE", resource, row.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error?.message || "Unable to delete record" });
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

  const escapeCsv = (value: unknown) => {
    if (value === null || value === undefined) return '""';
    const text = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [keys.map(escapeCsv).join(","), ...rows.map((r: any) => keys.map((k: string) => escapeCsv(r[k])).join(","))].join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${resource}.csv"`);
  res.send(csv);
});

export default superAdminRouter;
