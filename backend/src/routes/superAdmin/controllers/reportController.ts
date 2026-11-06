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

