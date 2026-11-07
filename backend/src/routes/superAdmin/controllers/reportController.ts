import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";
import { resourceMap } from "../config/resourceConfig";

export async function getReportsSummary(_req: Request, res: Response): Promise<void> {
  const [
    regions,
    labs,
    schools,
    students,
    events,
    equipment,
    consumables,
    users,
    issues,
    curriculumNodes,
    inventoryTransactions,
    trips,
    completedTrips,
    completedEvents
  ] = await Promise.all([
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

  res.json({
    regions,
    labs,
    schools,
    students,
    events,
    completedEvents,
    trips,
    completedTrips,
    equipment,
    consumables,
    users,
    issues,
    curriculumNodes,
    inventoryTransactions
  });
}

export async function getAdvancedReports(req: Request, res: Response): Promise<void> {
  const category = String(req.query.category || "regional").toLowerCase();
  const regionId = req.query.regionId ? String(req.query.regionId) : undefined;
  const schoolId = req.query.schoolId ? String(req.query.schoolId) : undefined;

  try {
    const [allRegions, allBuses, allSchools, allEvents, allConsumables, allEquipment, allTransactions] = await Promise.all([
      prisma.region.findMany({
        include: {
          _count: { select: { School: true, Bus: true, District: true } }
        }
      }),
      prisma.bus.findMany({
        where: regionId ? { regionId } : undefined,
        include: {
          Region: { select: { name: true } },
          _count: { select: { Equipment: true, BusMaintenanceRecord: true, Trip: true } }
        }
      }),
      prisma.school.findMany({
        where: {
          ...(regionId ? { regionId } : {}),
          ...(schoolId ? { id: schoolId } : {})
        },
        include: {
          Region: { select: { name: true } },
          District: { select: { name: true } },
          _count: { select: { Student: true, Event: true } }
        }
      }),
      prisma.event.findMany({
        where: {
          ...(schoolId ? { schoolId } : {}),
          ...(regionId ? { School: { regionId } } : {})
        },
        take: 100,
        orderBy: { eventDate: "desc" },
        include: {
          School: { select: { name: true, regionId: true } },
          Bus: { select: { busCode: true, registrationNumber: true } },
          _count: { select: { EventAttendance: true, ConsumableUsage: true } }
        }
      }),
      prisma.consumable.findMany({
        orderBy: { currentStock: "asc" }
      }),
      prisma.equipment.findMany({
        include: {
          Bus: { select: { busCode: true, regionId: true } }
        }
      }),
      (prisma as any).inventoryTransaction.findMany({
        take: 100,
        orderBy: { timestamp: "desc" },
        include: {
          consumable: { select: { name: true, category: true, unitMetric: true } },
          performedBy: { select: { name: true } }
        }
      })
    ]);

    // Regional performance comparative matrix
    const regionalComparison = allRegions.map((r: any) => {
      const regionSchools = allSchools.filter((s: any) => s.regionId === r.id);
      const regionBuses = allBuses.filter((b: any) => b.regionId === r.id);
      const regionEvents = allEvents.filter((e: any) => e.School?.regionId === r.id);
      const totalStudents = regionSchools.reduce((sum: number, s: any) => sum + (s.totalStudents || 0), 0);
      const completedEvents = regionEvents.filter((e: any) => e.status === "COMPLETED").length;

      return {
        id: r.id,
        name: r.name,
        schoolCount: r._count.School,
        busCount: r._count.Bus,
        districtCount: r._count.District,
        totalStudents,
        totalEvents: regionEvents.length,
        completedEvents,
        performanceScore: Math.min(100, Math.round((completedEvents * 15) + (regionSchools.length * 5)))
      };
    });

    // Consumption patterns
    const categoryTotals: Record<string, number> = {};
    for (const c of allConsumables) {
      categoryTotals[c.category] = (categoryTotals[c.category] || 0) + (c.currentStock || 0);
    }

    // Equipment condition breakdown
    const equipmentByStatus: Record<string, number> = {
      AVAILABLE: 0,
      ASSIGNED_TO_BUS: 0,
      IN_MAINTENANCE: 0,
      DAMAGED: 0,
      MISSING: 0
    };
    for (const e of allEquipment) {
      equipmentByStatus[e.status] = (equipmentByStatus[e.status] || 0) + 1;
    }

    // Allocation history
    const allocationRecords = allTransactions.filter((t: any) =>
      typeof t.referenceType === "string" && t.referenceType.startsWith("ALLOCATION")
    ).map((t: any) => {
      let meta: any = {};
      try {
        meta = JSON.parse(t.notes || "{}");
      } catch {
        meta = {};
      }
      return {
        id: t.id,
        allocationNumber: meta.allocationNumber || `ALC-${t.id.slice(0, 8)}`,
        status: t.referenceType.replace("ALLOCATION_", ""),
        itemType: meta.itemType || "CONSUMABLE",
        itemName: meta.itemType === "EQUIPMENT" ? meta.equipmentName : (t.consumable?.name || "Consumable"),
        quantity: t.quantity,
        regionName: meta.regionName || "Region",
        timestamp: t.timestamp
      };
    });

    res.json({
      category,
      filters: { regionId, schoolId },
      metrics: {
        totalRegions: allRegions.length,
        totalSchools: allSchools.length,
        totalBuses: allBuses.length,
        totalEvents: allEvents.length,
        totalStudents: allSchools.reduce((sum, s) => sum + (s.totalStudents || 0), 0),
        totalConsumableStock: allConsumables.reduce((sum, c) => sum + (c.currentStock || 0), 0),
        totalEquipmentCount: allEquipment.length,
        totalEquipmentValuation: allEquipment.reduce((sum, e) => sum + (e.cost || 0), 0),
        lowStockItems: allConsumables.filter((c) => c.currentStock <= c.minimumStock).length
      },
      regionalComparison,
      consumablesBreakdown: allConsumables.slice(0, 50).map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        currentStock: c.currentStock,
        minimumStock: c.minimumStock,
        unit: c.unitMetric,
        status: c.currentStock <= 0 ? "OUT_OF_STOCK" : c.currentStock <= c.minimumStock ? "LOW_STOCK" : "OPTIMAL"
      })),
      equipmentCondition: equipmentByStatus,
      allocationsHistory: allocationRecords,
      schoolsReport: allSchools.slice(0, 50).map((s) => ({
        id: s.id,
        name: s.name,
        udiseCode: s.udiseCode,
        regionName: s.Region?.name || "Unassigned",
        districtName: s.District?.name || "—",
        students: s.totalStudents,
        visitsHosted: s._count.Event,
        hasScienceLab: s.hasScienceLab,
        priority: s.priorityCategory
      })),
      busesReport: allBuses.map((b) => ({
        id: b.id,
        busCode: b.busCode,
        registrationNumber: b.registrationNumber,
        regionName: b.Region?.name || "Unassigned",
        status: b.status,
        equipmentCount: b._count.Equipment,
        maintenanceCount: b._count.BusMaintenanceRecord,
        tripsCount: b._count.Trip
      })),
      eventsReport: allEvents.slice(0, 50).map((e) => ({
        id: e.id,
        eventCode: e.eventCode,
        eventDate: e.eventDate,
        schoolName: e.School?.name || "School",
        busCode: e.Bus?.busCode || "Bus",
        status: e.status,
        attendance: e._count.EventAttendance,
        consumablesUsed: e._count.ConsumableUsage
      })),
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to generate report" });
  }
}

export async function exportResourceCsv(req: Request, res: Response): Promise<void> {
  const resource = String(req.params.resource);
  const delegateName = resourceMap[resource];
  if (!delegateName) {
    res.status(404).send("Unknown resource");
    return;
  }
  const rows = await (prisma as any)[delegateName].findMany({ take: 1000 });
  const keys: string[] = Array.from(
    new Set<string>(rows.flatMap((r: any) => Object.keys(r).filter((k: string) => k !== "passwordHash")))
  );
  const csv = [
    keys.join(","),
    ...rows.map((r: any) => keys.map((k: string) => JSON.stringify(r[k] ?? "")).join(","))
  ].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=${resource}.csv`);
  res.send(csv);
}
