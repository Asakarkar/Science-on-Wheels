import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";

export async function getOverview(_req: Request, res: Response): Promise<void> {
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
}

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const started = Date.now();
  let database = "healthy";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "degraded";
  }
  res.json({
    api: "healthy",
    database,
    responseMs: Date.now() - started,
    uptimeSeconds: process.uptime(),
    node: process.version
  });
}

