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
          State: { select: { name: true, code: true } },
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
          roleEnum: "SCIENCE_COMMUNICATOR",
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

    const regionPayload = region
      ? {
          id: region.id,
          name: region.name,
          state: (region as any).State,
          State: (region as any).State,
        }
      : null;

    res.json({
      region: regionPayload,
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
regionalAdminRouter.get(["/resource/:resource", "/:resource"], async (req, res, next) => {
  const resource = String(req.params.resource);
  const delegateName = resourceMap[resource];

  if (!delegateName) {
    return next();
  }

  // RBAC Permission Check
  const regionalPermissions: Record<string, string> = {
    schools: "schools.view",
    registrations: "schools.view",
    students: "schools.view",
    teachers: "schools.view",
    staff: "people.view",
    labs: "labs.view",
    maintenance: "labs.view",
    equipment: "resources.view",
    consumables: "resources.view",
    inventory: "resources.view",
    routes: "operations.view",
    routeStops: "operations.view",
    schedules: "operations.view",
    visits: "operations.view",
    sessions: "operations.view",
    attendance: "operations.view",
    reports: "analytics.view",
  };

  const user = res.locals.user;
  const userRole = user?.role?.name ?? user?.roleEnum;
  if (userRole !== "SUPER_ADMIN") {
    const requiredPerm = regionalPermissions[resource];
    if (requiredPerm) {
      const hasPerm = user?.role?.permissions?.some((p: any) => p.permission.key === requiredPerm);
      if (!hasPerm) {
        return res.status(403).json({ message: `Access denied: your role lacks the '${requiredPerm}' permission.` });
      }
    }
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
          OR: fields.map((field: string) => ({
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
          roleEnum: "SCIENCE_COMMUNICATOR",
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
    issues: { regionId },
    students: { School: { regionId } },
    equipment: { Bus: { regionId } },
    routes: { regionId },
    inventory: { bus: { regionId } },
    consumables: {
      InventoryTransaction: {
        some: { bus: { regionId } },
      },
    },
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
          roleEnum: "SCIENCE_COMMUNICATOR",
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

/**
 * Record an Inventory Transaction for a regional laboratory bus.
 */
regionalAdminRouter.post(
  ["/inventory", "/resource/inventory"],
  async (req: AuthenticatedRequest, res) => {
    const regionId = getRegionId(res);
    const schema = z.object({
      consumableId: z.string().min(1),
      busId: z.string().min(1),
      quantity: z.coerce.number().positive(),
      type: z
        .enum([
          "RECEIPT",
          "ISSUE",
          "RETURN",
          "TRANSFER",
          "ADJUSTMENT",
          "DAMAGE",
          "LOSS",
          "CONSUMPTION",
        ])
        .default("RECEIPT"),
      notes: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message:
          "Invalid transaction data: " +
          parsed.error.issues.map((i) => i.message).join(", "),
      });
    }

    const { consumableId, busId, quantity, type, notes } = parsed.data;

    // Verify the lab bus belongs to the caller's region
    const bus = await prisma.bus.findFirst({
      where: { id: busId, regionId },
    });
    if (!bus) {
      return res.status(403).json({
        message: "Laboratory vehicle must belong to your assigned region",
      });
    }

    const consumable = await prisma.consumable.findUnique({
      where: { id: consumableId },
    });
    if (!consumable) {
      return res.status(404).json({ message: "Consumable item not found" });
    }

    const deltaByType: Record<string, number> = {
      RECEIPT: 1,
      RETURN: 1,
      ADJUSTMENT: 1,
      ISSUE: -1,
      DAMAGE: -1,
      LOSS: -1,
      CONSUMPTION: -1,
      TRANSFER: 0,
    };

    const delta = (deltaByType[type] ?? 0) * quantity;

    if (delta < 0 && consumable.currentStock + delta < 0) {
      return res.status(400).json({
        message: `Insufficient stock for ${consumable.name}. Current stock: ${consumable.currentStock} ${consumable.unitMetric}`,
      });
    }

    try {
      const transaction = await prisma.$transaction(async (tx) => {
        const row = await tx.inventoryTransaction.create({
          data: {
            consumableId,
            busId,
            quantity,
            type,
            notes,
            performedById: req.userId,
          },
          include: {
            consumable: true,
            bus: {
              select: { id: true, busCode: true, registrationNumber: true },
            },
          },
        });

        if (delta !== 0) {
          await tx.consumable.update({
            where: { id: consumableId },
            data: { currentStock: { increment: delta } },
          });
        }

        return row;
      });

      await writeAudit(
        req,
        "INVENTORY_TRANSACTION",
        "inventoryTransaction",
        transaction.id,
        {
          consumableId,
          busId,
          type,
          quantity,
          regionId,
        },
      );

      return res.status(201).json(transaction);
    } catch (error: any) {
      return res
        .status(400)
        .json({ message: error?.message || "Unable to record transaction" });
    }
  },
);

/**
 * Add a consumable item for regional laboratories.
 */
regionalAdminRouter.post(
  ["/consumables", "/resource/consumables"],
  async (req: AuthenticatedRequest, res) => {
    const regionId = getRegionId(res);
    const schema = z.object({
      name: z.string().min(1),
      category: z.string().min(1),
      currentStock: z.coerce.number().min(0).default(0),
      minimumStock: z.coerce.number().min(0).default(10),
      unitMetric: z.string().min(1).default("units"),
      expiryDate: z.string().optional().nullable(),
      busId: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message:
          "Invalid consumable data: " +
          parsed.error.issues.map((i) => i.message).join(", "),
      });
    }

    const {
      name,
      category,
      currentStock,
      minimumStock,
      unitMetric,
      expiryDate,
      busId,
    } = parsed.data;

    let targetBusId = busId;
    if (targetBusId) {
      const bus = await prisma.bus.findFirst({
        where: { id: targetBusId, regionId },
      });
      if (!bus)
        return res
          .status(403)
          .json({ message: "Selected lab must belong to your region" });
    } else {
      const firstBus = await prisma.bus.findFirst({ where: { regionId } });
      targetBusId = firstBus?.id;
    }

    try {
      const consumableId = "con-" + crypto.randomUUID().slice(0, 8);
      const consumable = await prisma.consumable.create({
        data: {
          id: consumableId,
          name,
          category,
          currentStock,
          minimumStock,
          unitMetric,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        },
      });

      if (currentStock > 0 && targetBusId) {
        await prisma.inventoryTransaction.create({
          data: {
            consumableId: consumable.id,
            busId: targetBusId,
            quantity: currentStock,
            type: "RECEIPT",
            notes: "Initial regional stock registration",
            performedById: req.userId,
          },
        });
      }

      await writeAudit(
        req,
        "CONSUMABLE_CREATED",
        "consumable",
        consumable.id,
        {
          name,
          category,
          regionId,
        },
      );

      return res.status(201).json(consumable);
    } catch (error: any) {
      return res
        .status(400)
        .json({ message: error?.message || "Unable to create consumable" });
    }
  },
);

/**
 * Add an equipment asset assigned to a regional mobile lab.
 */
regionalAdminRouter.post(
  ["/equipment", "/resource/equipment"],
  async (req: AuthenticatedRequest, res) => {
    const regionId = getRegionId(res);
    const schema = z.object({
      assetTag: z.string().min(1),
      name: z.string().min(1),
      category: z.string().min(1),
      busId: z.string().min(1),
      cost: z.coerce.number().min(0).default(0),
      purchaseDate: z.string().optional(),
      status: z
        .enum([
          "AVAILABLE",
          "ASSIGNED_TO_BUS",
          "IN_MAINTENANCE",
          "DAMAGED",
          "MISSING",
        ])
        .default("ASSIGNED_TO_BUS"),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message:
          "Invalid equipment data: " +
          parsed.error.issues.map((i) => i.message).join(", "),
      });
    }

    const { assetTag, name, category, busId, cost, purchaseDate, status } =
      parsed.data;

    const bus = await prisma.bus.findFirst({ where: { id: busId, regionId } });
    if (!bus) {
      return res
        .status(403)
        .json({ message: "Selected lab must belong to your region" });
    }

    try {
      const equipment = await prisma.equipment.create({
        data: {
          id: "eq-" + crypto.randomUUID().slice(0, 8),
          assetTag,
          name,
          category,
          busId,
          cost,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          status,
        },
      });

      await writeAudit(
        req,
        "EQUIPMENT_CREATED",
        "equipment",
        equipment.id,
        {
          assetTag,
          name,
          busId,
          regionId,
        },
      );

      return res.status(201).json(equipment);
    } catch (error: any) {
      return res
        .status(400)
        .json({ message: error?.message || "Unable to create equipment" });
    }
  },
);

/**
 * Update a consumable record (stock, limits, name, unit, expiry).
 */
regionalAdminRouter.patch(
  ["/consumables/:id", "/resource/consumables/:id"],
  async (req: AuthenticatedRequest, res) => {
    const id = String(req.params.id);
    const regionId = getRegionId(res);

    const schema = z.object({
      name: z.string().min(1).optional(),
      category: z.string().min(1).optional(),
      currentStock: z.coerce.number().min(0).optional(),
      minimumStock: z.coerce.number().min(0).optional(),
      unitMetric: z.string().min(1).optional(),
      expiryDate: z.string().optional().nullable(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid consumable data: " + parsed.error.issues.map((i) => i.message).join(", "),
      });
    }

    const consumable = await prisma.consumable.findUnique({
      where: { id },
      include: {
        InventoryTransaction: {
          select: { bus: { select: { regionId: true } } },
        },
      },
    });

    if (!consumable) {
      return res.status(404).json({ message: "Consumable record not found" });
    }

    const userRole = res.locals.user?.role?.name ?? res.locals.user?.roleEnum;
    if (userRole !== "SUPER_ADMIN" && regionId) {
      const hasRegionalLink = consumable.InventoryTransaction.some(
        (tx) => tx.bus?.regionId === regionId
      );
      if (!hasRegionalLink) {
        return res.status(403).json({ message: "Consumable is not associated with your region" });
      }
    }

    const dataToUpdate: any = {};
    if (parsed.data.name !== undefined) dataToUpdate.name = parsed.data.name;
    if (parsed.data.category !== undefined) dataToUpdate.category = parsed.data.category;
    if (parsed.data.currentStock !== undefined) dataToUpdate.currentStock = parsed.data.currentStock;
    if (parsed.data.minimumStock !== undefined) dataToUpdate.minimumStock = parsed.data.minimumStock;
    if (parsed.data.unitMetric !== undefined) dataToUpdate.unitMetric = parsed.data.unitMetric;
    if (parsed.data.expiryDate !== undefined) {
      dataToUpdate.expiryDate = parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null;
    }

    try {
      const updated = await prisma.consumable.update({
        where: { id },
        data: dataToUpdate,
      });

      await writeAudit(req, "CONSUMABLE_UPDATED", "consumable", id, {
        updatedFields: Object.keys(dataToUpdate),
        regionId,
      });

      return res.json(updated);
    } catch (error: any) {
      return res.status(400).json({ message: error?.message || "Failed to update consumable" });
    }
  }
);

/**
 * Update an equipment asset record (name, category, status, bus assignment, cost).
 */
regionalAdminRouter.patch(
  ["/equipment/:id", "/resource/equipment/:id"],
  async (req: AuthenticatedRequest, res) => {
    const id = String(req.params.id);
    const regionId = getRegionId(res);

    const schema = z.object({
      name: z.string().min(1).optional(),
      category: z.string().min(1).optional(),
      status: z.enum([
        "AVAILABLE",
        "ASSIGNED_TO_BUS",
        "IN_MAINTENANCE",
        "DAMAGED",
        "MISSING",
      ]).optional(),
      busId: z.string().optional().nullable(),
      cost: z.coerce.number().min(0).optional(),
      purchaseDate: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid equipment data: " + parsed.error.issues.map((i) => i.message).join(", "),
      });
    }

    const eq = await prisma.equipment.findUnique({
      where: { id },
      include: { Bus: true },
    });

    if (!eq) {
      return res.status(404).json({ message: "Equipment asset not found" });
    }

    const userRole = res.locals.user?.role?.name ?? res.locals.user?.roleEnum;
    if (userRole !== "SUPER_ADMIN" && regionId && eq.Bus && eq.Bus.regionId !== regionId) {
      return res.status(403).json({ message: "Equipment is assigned to another region" });
    }

    if (parsed.data.busId) {
      const targetBus = await prisma.bus.findFirst({
        where: { id: parsed.data.busId, ...(userRole === "SUPER_ADMIN" ? {} : { regionId }) },
      });
      if (!targetBus) {
        return res.status(403).json({ message: "Selected lab does not belong to your region" });
      }
    }

    const dataToUpdate: any = {};
    if (parsed.data.name !== undefined) dataToUpdate.name = parsed.data.name;
    if (parsed.data.category !== undefined) dataToUpdate.category = parsed.data.category;
    if (parsed.data.status !== undefined) dataToUpdate.status = parsed.data.status;
    if (parsed.data.busId !== undefined) dataToUpdate.busId = parsed.data.busId;
    if (parsed.data.cost !== undefined) dataToUpdate.cost = parsed.data.cost;
    if (parsed.data.purchaseDate !== undefined) {
      dataToUpdate.purchaseDate = new Date(parsed.data.purchaseDate);
    }

    try {
      const updated = await prisma.equipment.update({
        where: { id },
        data: dataToUpdate,
      });

      await writeAudit(req, "EQUIPMENT_UPDATED", "equipment", id, {
        updatedFields: Object.keys(dataToUpdate),
        regionId,
      });

      return res.json(updated);
    } catch (error: any) {
      return res.status(400).json({ message: error?.message || "Failed to update equipment" });
    }
  }
);

/**
 * Update an inventory transaction record (notes, quantity).
 */
regionalAdminRouter.patch(
  ["/inventory/:id", "/resource/inventory/:id"],
  async (req: AuthenticatedRequest, res) => {
    const id = String(req.params.id);
    const regionId = getRegionId(res);

    const schema = z.object({
      notes: z.string().optional(),
      quantity: z.coerce.number().positive().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid transaction data: " + parsed.error.issues.map((i) => i.message).join(", "),
      });
    }

    const tx = await prisma.inventoryTransaction.findUnique({
      where: { id },
      include: { bus: true },
    });

    if (!tx) {
      return res.status(404).json({ message: "Transaction record not found" });
    }

    const userRole = res.locals.user?.role?.name ?? res.locals.user?.roleEnum;
    if (userRole !== "SUPER_ADMIN" && regionId && tx.bus && tx.bus.regionId !== regionId) {
      return res.status(403).json({ message: "Transaction does not belong to your region" });
    }

    const dataToUpdate: any = {};
    if (parsed.data.notes !== undefined) dataToUpdate.notes = parsed.data.notes;
    if (parsed.data.quantity !== undefined) dataToUpdate.quantity = parsed.data.quantity;

    try {
      const updated = await prisma.inventoryTransaction.update({
        where: { id },
        data: dataToUpdate,
      });

      await writeAudit(req, "INVENTORY_TX_UPDATED", "inventoryTransaction", id, {
        updatedFields: Object.keys(dataToUpdate),
        regionId,
      });

      return res.json(updated);
    } catch (error: any) {
      return res.status(400).json({ message: error?.message || "Failed to update transaction" });
    }
  }
);

export default regionalAdminRouter;
