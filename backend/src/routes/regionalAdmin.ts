import { Router, type Request } from "express";
import type { Prisma } from "@prisma/client";
import crypto from "node:crypto";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { requireAuth, requireRegionalAdmin } from "../middleware/auth";

export const regionalAdminRouter = Router();

regionalAdminRouter.use(requireAuth, requireRegionalAdmin);

type AuthenticatedRequest = Request & {
  userId?: string;
};

const resourceMap: Record<string, string> = {
  districts: "district",
  blocks: "block",
  schools: "school",
  staff: "user",
  labs: "bus",
  maintenance: "busMaintenanceRecord",
  registrations: "schoolRegistration",
  experiments: "experiment",
  equipment: "equipment",
  consumables: "consumable",
  inventory: "inventoryTransaction",
  visits: "event",
  sessions: "experimentSession",
  routes: "route",
  routeStops: "routeStop",
  assignments: "routeAssignment",
  issues: "operationalIssue",
  attendance: "eventAttendance",
  staffTravel: "staffTravelAssignment",
  activity: "auditLog",
  curriculum: "curriculumNode",
  students: "student",
  teachers: "teacher",
};

function getRegionId(res: any): string {
  return res.locals.user.regionId as string;
}

function makeId(): string {
  return crypto.randomUUID();
}

async function writeAudit(
  req: AuthenticatedRequest,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.auditLog
    .create({
      data: {
        actorUserId: req.userId,
        action,
        entity,
        entityId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    })
    .catch(() => undefined);
}

// Attach the authenticated user id after the authentication middleware.
regionalAdminRouter.use((req: AuthenticatedRequest, res, next) => {
  req.userId = res.locals.user?.id;
  next();
});

/**
 * Regional dashboard overview.
 * Every aggregate is scoped to the Regional Admin's assigned region.
 */
regionalAdminRouter.get("/overview", async (_req: AuthenticatedRequest, res, next) => {
  try {
    const regionId = getRegionId(res);
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [
      region,
      districts,
      blocks,
      schools,
      labs,
      staff,
      students,
      todayVisits,
      upcomingVisits,
      completedSessions,
      pendingSessions,
      issues,
      consumables,
      buses,
      recentActivity,
    ] = await Promise.all([
      prisma.region.findUnique({
        where: { id: regionId },
        select: {
          id: true,
          name: true,
          state: { select: { name: true, code: true } },
        },
      }),
      prisma.district.count({ where: { regionId } }),
      prisma.block.count({
        where: {
          District: { regionId },
        },
      }),
      prisma.school.count({ where: { regionId } }),
      prisma.bus.count({ where: { regionId } }),
      prisma.user.count({
        where: {
          regionId,
<<<<<<< HEAD
          roleEnum: "SCIENCE_COMMUNICATOR",
=======
          roleEnum: { in: ["SCIENCE_COMMUNICATOR", "DRIVER"] },
>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5
          isActive: true,
          status: "ACTIVE",
        },
      }),
      prisma.student.count({
        where: {
          School: { regionId },
        },
      }),
      prisma.event.count({
        where: {
          School: { regionId },
          eventDate: { gte: dayStart, lt: dayEnd },
        },
      }),
      prisma.event.count({
        where: {
          School: { regionId },
          eventDate: { gte: now },
        },
      }),
      prisma.event.count({
        where: {
          School: { regionId },
          status: "COMPLETED",
        },
      }),
      prisma.event.count({
        where: {
          School: { regionId },
          status: {
            in: ["SCHEDULED", "READINESS_VERIFIED", "IN_TRANSIT", "ON_SITE"],
          },
        },
      }),
      prisma.operationalIssue.count({
        where: {
          regionId,
          status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] },
        },
      }),
      prisma.consumable
        .findMany({
          where: {
            InventoryTransaction: {
              some: {
                bus: { regionId },
              },
            },
          },
          select: {
            id: true,
            name: true,
            currentStock: true,
            minimumStock: true,
            unitMetric: true,
          },
        })
        .catch(() => []),
      prisma.bus.findMany({
        where: { regionId },
        select: {
          id: true,
          busCode: true,
          registrationNumber: true,
          status: true,
          currentLat: true,
          currentLng: true,
          lastGpsUpdate: true,
        },
      }),
      prisma.auditLog.findMany({
        where: { actorUserId: { not: null } },
        orderBy: { timestamp: "desc" },
        take: 50,
      }),
    ]);

    const lowStock = consumables.filter(
      (item) => item.currentStock <= item.minimumStock,
    );

    const regionalStaffIds = (
      await prisma.user.findMany({
        where: { regionId },
        select: { id: true },
      })
    ).map((user) => user.id);

    const regionalActivity = recentActivity
      .filter((entry) => regionalStaffIds.includes(entry.actorUserId || ""))
      .slice(0, 12);

    const alerts = [
      ...lowStock.map((item) => ({
        severity: "warning",
        type: "inventory",
        title: `Low stock: ${item.name}`,
        detail: `${item.currentStock} ${item.unitMetric} remaining`,
      })),
      ...buses
        .filter(
          (bus) =>
            !bus.lastGpsUpdate ||
            Date.now() - new Date(bus.lastGpsUpdate).getTime() > 30 * 60 * 1000,
        )
        .map((bus) => ({
          severity: "info",
          type: "gps",
          title: `${bus.busCode || bus.registrationNumber} location stale`,
          detail: "No recent GPS update",
        })),
      ...(issues > 0
        ? [
            {
              severity: "warning",
              type: "issue",
              title: `${issues} operational issues require attention`,
              detail: "Open, acknowledged or in-progress issues in this region",
            },
          ]
        : []),
    ];

    res.json({
      region,
      kpis: {
        districts,
        blocks,
        schools,
        activeLabs: labs,
        availableStaff: staff,
        studentsReached: students,
        todayVisits,
        upcomingVisits,
        completedSessions,
        pendingSessions,
        inventoryAlerts: lowStock.length,
        operationalIssues: issues,
      },
      labs: buses,
      alerts,
      recentActivity: regionalActivity,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generic region-scoped resource listing.
 */
<<<<<<< HEAD
regionalAdminRouter.get(["/resource/:resource", "/:resource"], async (req, res, next) => {
=======
regionalAdminRouter.get("/resource/:resource", async (req, res) => {
>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5
  const resource = req.params.resource;
  const delegateName = resourceMap[resource];

  if (!delegateName) {
<<<<<<< HEAD
    return next();
=======
    return res.status(404).json({ message: "Unknown regional resource" });
>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5
  }

  const take = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const search = String(req.query.search || "").trim();
  const regionId = getRegionId(res);
  const delegate = (prisma as any)[delegateName];

  const regionalWhere: Record<string, Record<string, any>> = {
    districts: { regionId },
    blocks: { District: { regionId } },
    schools: { regionId },
    staff: { regionId },
    labs: { regionId },
    maintenance: { Bus: { regionId } },
    registrations: { School: { regionId } },
    experiments: {},
    equipment: { Bus: { regionId } },
    consumables: { InventoryTransaction: { some: { bus: { regionId } } } },
    inventory: { bus: { regionId } },
    visits: { School: { regionId } },
    sessions: { Event: { School: { regionId } } },
    routes: { regionId },
    routeStops: { Route: { regionId } },
    assignments: { Bus: { regionId } },
    issues: { regionId },
    attendance: { Event: { School: { regionId } } },
    staffTravel: { regionId },
    activity: {},
    curriculum: {},
    students: { School: { regionId } },
    teachers: { School: { regionId } },
  };

  const where: Record<string, any> = {
    ...(regionalWhere[resource] || {}),
  };

  const searchableFields: Record<string, string[]> = {
    districts: ["name"],
    blocks: ["name"],
    schools: ["name", "udiseCode", "principalName"],
    staff: ["name", "email", "status"],
    labs: ["busCode", "registrationNumber", "status"],
    maintenance: ["serviceType", "remarks"],
    registrations: ["status", "remarks"],
    experiments: ["title", "subject", "difficultyLevel"],
    equipment: ["assetTag", "name", "category"],
    consumables: ["name", "category"],
    visits: ["eventCode", "status"],
    routes: ["routeCode", "routeName", "status"],
    issues: ["description", "category", "status"],
    students: ["name", "gradeClass"],
    teachers: ["subjectTaught"],
  };

  if (search) {
    const fields = searchableFields[resource] || [];
    if (fields.length > 0) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: fields.map((field) => ({
            [field]: { contains: search, mode: "insensitive" },
          })),
        },
      ];
    }
  }

  if (req.query.status) {
    where.status = String(req.query.status);
  }
  if (req.query.category) {
    where.category = String(req.query.category);
  }
  if (req.query.roleEnum) {
    where.roleEnum = String(req.query.roleEnum);
  }

  try {
    let rows: any[];
    try {
      rows = await delegate.findMany({
        where,
        take,
        orderBy: { createdAt: "desc" },
      });
    } catch {
      rows = await delegate.findMany({ where, take });
    }

    const safeRows =
      resource === "staff"
        ? rows.map((user: any) => ({ ...user, passwordHash: undefined }))
        : rows;

    return res.json({ rows: safeRows, regionId });
  } catch (error: any) {
    return res
      .status(400)
      .json({ message: error?.message || "Unable to load regional resource" });
  }
});

/**
 * Summary report. Relation names match the Prisma schema's capitalized fields.
 */
regionalAdminRouter.get("/reports/summary", async (_req, res, next) => {
  try {
    const regionId = getRegionId(res);

    const [
      schools,
      students,
      labs,
      staff,
      visits,
      completedVisits,
      equipment,
      consumables,
      issues,
      inventoryTransactions,
    ] = await Promise.all([
      prisma.school.count({ where: { regionId } }),
      prisma.student.count({ where: { School: { regionId } } }),
      prisma.bus.count({ where: { regionId } }),
      prisma.user.count({
        where: {
          regionId,
<<<<<<< HEAD
          roleEnum: "SCIENCE_COMMUNICATOR",
=======
          roleEnum: { in: ["SCIENCE_COMMUNICATOR", "DRIVER"] },
>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5
        },
      }),
      prisma.event.count({ where: { School: { regionId } } }),
      prisma.event.count({
        where: { School: { regionId }, status: "COMPLETED" },
      }),
      prisma.equipment.count({ where: { Bus: { regionId } } }),
      prisma.consumable.count({
        where: {
          InventoryTransaction: {
            some: { bus: { regionId } },
          },
        },
      }),
      prisma.operationalIssue.count({ where: { regionId } }),
      prisma.inventoryTransaction.count({ where: { bus: { regionId } } }),
    ]);

    res.json({
      schools,
      students,
      labs,
      staff,
      visits,
      completedVisits,
      completionRate: visits ? Math.round((completedVisits / visits) * 100) : 0,
      equipment,
      consumables,
      issues,
      inventoryTransactions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * CSV export for the supported regional resources.
 */
regionalAdminRouter.get("/reports/:resource.csv", async (req, res) => {
  const resource = req.params.resource;
  const delegateName = resourceMap[resource];

  if (!delegateName) {
    return res.status(404).send("Unknown report");
  }

  const regionId = getRegionId(res);
  const delegate = (prisma as any)[delegateName];

  const whereMap: Record<string, Record<string, any>> = {
    schools: { regionId },
    districts: { regionId },
    blocks: { District: { regionId } },
    labs: { regionId },
    staff: { regionId },
    visits: { School: { regionId } },
<<<<<<< HEAD
=======
    sessions: { Event: { School: { regionId } } },
>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5
    issues: { regionId },
    students: { School: { regionId } },
    equipment: { Bus: { regionId } },
    routes: { regionId },
    inventory: { bus: { regionId } },
<<<<<<< HEAD
    consumables: {
      InventoryTransaction: {
        some: { bus: { regionId } },
      },
    },
=======
    attendance: { Event: { School: { regionId } } },
>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5
  };

  try {
    const rows = await delegate.findMany({
      where: whereMap[resource] || {},
      take: 1000,
    });

    const keys: string[] = Array.from(
      new Set(
        rows.flatMap((row: any) =>
          Object.keys(row).filter((key) => key !== "passwordHash"),
        ),
      ),
    );

    const escapeCsv = (value: unknown) => {
      const text = value instanceof Date ? value.toISOString() : String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const csv = [
      keys.map(escapeCsv).join(","),
      ...rows.map((row: any) =>
        keys.map((key) => escapeCsv(row[key])).join(","),
      ),
    ].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${resource}.csv"`,
    );
    return res.send(csv);
  } catch (error: any) {
    return res
      .status(400)
      .json({ message: error?.message || "Unable to generate report" });
  }
});

/**
 * Create a visit only when both school and bus belong to this region.
 */
regionalAdminRouter.post("/visits", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const schema = z.object({
    eventCode: z.string().min(1),
    schoolId: z.string().min(1),
    busId: z.string().min(1),
    eventDate: z.coerce.date(),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    expectedStudentCount: z.number().int().nonnegative(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid visit data" });
  }

  const [school, bus] = await Promise.all([
    prisma.school.findFirst({
      where: { id: parsed.data.schoolId, regionId },
    }),
    prisma.bus.findFirst({
      where: { id: parsed.data.busId, regionId },
    }),
  ]);

  if (!school || !bus) {
    return res
      .status(403)
      .json({ message: "School and lab must belong to your region" });
  }

  try {
    const row = await prisma.event.create({
      data: {
        id: makeId(),
        ...parsed.data,
      },
    });

    await writeAudit(req, "CREATE", "event", row.id, { regionId });
    return res.status(201).json(row);
  } catch (error: any) {
    return res
      .status(400)
      .json({ message: error?.message || "Unable to create visit" });
  }
});

/**
 * Create an operational issue with region checks for linked school and bus.
 */
regionalAdminRouter.post("/issues", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const schema = z.object({
    category: z.enum([
      "EQUIPMENT",
      "INVENTORY",
      "VEHICLE",
      "SAFETY",
      "TECHNICAL",
      "SCHOOL_VISIT",
      "OTHER",
    ]),
    description: z.string().min(1),
    location: z.string().optional(),
    schoolId: z.string().optional(),
    busId: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid issue data" });
  }

  if (
    parsed.data.schoolId &&
    !(await prisma.school.findFirst({
      where: { id: parsed.data.schoolId, regionId },
    }))
  ) {
    return res.status(403).json({ message: "School outside assigned region" });
  }

  if (
    parsed.data.busId &&
    !(await prisma.bus.findFirst({
      where: { id: parsed.data.busId, regionId },
    }))
  ) {
    return res.status(403).json({ message: "Lab outside assigned region" });
  }

  try {
    const row = await prisma.operationalIssue.create({
      data: {
        id: makeId(),
        ...parsed.data,
        reportedById: res.locals.user.id,
        regionId,
      },
    });

    await writeAudit(req, "CREATE", "operationalIssue", row.id, { regionId });
    return res.status(201).json(row);
  } catch (error: any) {
    return res
      .status(400)
      .json({ message: error?.message || "Unable to create issue" });
  }
});

/**
 * Update an issue only if it belongs to the Regional Admin's region.
 */
regionalAdminRouter.patch(
  "/issues/:id",
  async (req: AuthenticatedRequest, res) => {
    const regionId = getRegionId(res);

    const issueId = String(req.params.id);
    const existing = await prisma.operationalIssue.findFirst({
      where: { id: issueId, regionId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const schema = z.object({
      status: z
        .enum(["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"])
        .optional(),
      assignedResolverId: z.string().nullable().optional(),
      resolution: z.string().nullable().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid issue update" });
    }

    try {
      const row = await prisma.operationalIssue.update({
        where: { id: existing.id },
        data: parsed.data,
      });

      await writeAudit(req, "UPDATE", "operationalIssue", row.id, { regionId });
      return res.json(row);
    } catch (error: any) {
      return res
        .status(400)
        .json({ message: error?.message || "Unable to update issue" });
    }
  },
);

/**
 * Assign a Science Communicator to an event in this region.
 */
regionalAdminRouter.post(
  "/assignments/staff",
  async (req: AuthenticatedRequest, res) => {
    const regionId = getRegionId(res);
    const schema = z.object({
      eventId: z.string().min(1),
      userId: z.string().min(1),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid assignment" });
    }

    const [event, user] = await Promise.all([
      prisma.event.findFirst({
        where: {
          id: parsed.data.eventId,
          School: { regionId },
        },
      }),
      prisma.user.findFirst({
        where: {
          id: parsed.data.userId,
          regionId,
<<<<<<< HEAD
          roleEnum: "SCIENCE_COMMUNICATOR",
=======
          roleEnum: { in: ["SCIENCE_COMMUNICATOR", "DRIVER"] },
>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5
        },
      }),
    ]);

    if (!event || !user) {
      return res
        .status(403)
        .json({ message: "Assignment must remain inside your region" });
    }

    if (user.roleEnum !== "SCIENCE_COMMUNICATOR") {
      return res.status(400).json({
        message: "Only Science Communicators can be assigned to sessions",
      });
    }

    try {
      const row = await prisma.eventsOnCommunicator.upsert({
        where: {
          eventId_userId: {
            eventId: event.id,
            userId: user.id,
          },
        },
        update: {},
        create: {
          eventId: event.id,
          userId: user.id,
        },
      });

      await writeAudit(req, "STAFF_ASSIGNED", "event", event.id, {
        userId: user.id,
        regionId,
      });

      return res.status(201).json(row);
    } catch (error: any) {
      return res
        .status(400)
        .json({ message: error?.message || "Unable to assign staff" });
    }
  },
);

export default regionalAdminRouter;
