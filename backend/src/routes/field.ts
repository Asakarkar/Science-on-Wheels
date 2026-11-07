import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const fieldRouter = Router();
fieldRouter.use(requireAuth);

function role(res: any): string {
  return res.locals.user?.role?.name ?? res.locals.user?.roleEnum ?? "";
}

function actor(res: any): string {
  return res.locals.user.id as string;
}

function newId(): string {
  return crypto.randomUUID();
}

function allow(res: any, roles: string[], permission?: string): boolean {
  const userRole = role(res);
  if (userRole === "SUPER_ADMIN") return true;
  if (!roles.includes(userRole)) {
    res.status(403).json({ message: "This action is not available for your role" });
    return false;
  }
  if (permission && res.locals.user?.role?.permissions) {
    const granted = res.locals.user.role.permissions.some(
      (item: any) => item.permission?.key === permission
    );
    if (!granted) {
      res.status(403).json({ message: "Required permission is not granted" });
      return false;
    }
  }
  return true;
}

async function audit(
  req: any,
  res: any,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: any
) {
  await prisma.auditLog
    .create({
      data: {
        actorUserId: actor(res),
        action,
        entity,
        entityId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        metadata,
      },
    })
    .catch(() => undefined);
}

/**
 * Helper to identify assigned bus for a field staff member
 */
async function getAssignedBusForStaff(userId: string, regionId?: string | null) {
  // 1. Direct assignment as driver/lead
  const leadBus = await prisma.bus.findFirst({
    where: { driverId: userId },
    include: { Equipment: true, GpsDevice: true, Region: true },
  });
  if (leadBus) return leadBus;

  // 2. Bus roster assignment via SystemConfig
  const regionBuses = await prisma.bus.findMany({
    where: regionId ? { regionId } : {},
    include: { Equipment: true, GpsDevice: true, Region: true },
  });

  for (const b of regionBuses) {
    try {
      const cfg = await prisma.systemConfig.findUnique({
        where: { key: `bus_staff_${b.id}` },
      });
      if (cfg?.value) {
        const roster = JSON.parse(cfg.value);
        if (Array.isArray(roster) && roster.some((r: any) => r.staffId === userId)) {
          return b;
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  // 3. Fallback: bus from latest or upcoming assigned event
  const assignedEvent = await prisma.event.findFirst({
    where: { EventsOnCommunicator: { some: { userId } } },
    orderBy: { eventDate: "desc" },
    include: { Bus: { include: { Equipment: true, GpsDevice: true, Region: true } } },
  });
  if (assignedEvent?.Bus) return assignedEvent.Bus;

  // 4. Default to first active bus in region
  return regionBuses[0] || null;
}

/**
 * Helper to compute bus consumable stocks
 */
async function getBusConsumablesWithStock(busId?: string | null) {
  const consumables = await prisma.consumable.findMany({
    orderBy: { name: "asc" },
  });

  if (!busId) {
    return consumables.map((c) => ({
      ...c,
      busStock: c.currentStock,
    }));
  }

  const txs = await prisma.inventoryTransaction.findMany({
    where: { busId },
  });

  return consumables.map((c) => {
    const itemTxs = txs.filter((t) => t.consumableId === c.id);
    let calculated = 0;
    if (itemTxs.length > 0) {
      for (const t of itemTxs) {
        if (["RECEIPT", "TRANSFER", "ISSUE"].includes(t.type)) {
          calculated += t.quantity;
        } else if (["CONSUMPTION", "DAMAGE", "LOSS", "RETURN"].includes(t.type)) {
          calculated -= t.quantity;
        } else if (t.type === "ADJUSTMENT") {
          calculated += t.quantity;
        }
      }
    } else {
      calculated = c.currentStock;
    }

    return {
      ...c,
      busStock: Math.max(0, calculated),
    };
  });
}

// =========================================================================
// 1. DASHBOARD
// =========================================================================

fieldRouter.get("/dashboard", async (req, res) => {
  const r = role(res);
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "dashboard.view")) return;

  const uid = actor(res);
  const user = res.locals.user;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);

  const next14Days = new Date(startOfToday);
  next14Days.setDate(next14Days.getDate() + 14);

  const assignedWhere =
    r === "SUPER_ADMIN" ? {} : { EventsOnCommunicator: { some: { userId: uid } } };

  const [allEvents, assignedBus, openIssues, allConsumables] = await Promise.all([
    prisma.event.findMany({
      where: assignedWhere,
      include: {
        School: true,
        Bus: true,
        FeedbackRecord: { orderBy: { id: "desc" }, take: 1 },
        ExperimentSession: { include: { Experiment: true } },
      },
      orderBy: { eventDate: "asc" },
      take: 100,
    }),
    getAssignedBusForStaff(uid, user.regionId),
    prisma.operationalIssue.findMany({
      where: r === "SUPER_ADMIN" ? {} : { reportedById: uid },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.consumable.findMany({
      take: 30,
    }),
  ]);

  const todayVisits = allEvents.filter(
    (e) => e.eventDate >= startOfToday && e.eventDate <= endOfToday
  );
  const completedToday = todayVisits.filter((e) => e.status === "COMPLETED");
  const upcomingVisits = allEvents.filter(
    (e) => e.eventDate > endOfToday && e.eventDate <= next14Days
  );

  // Pending reports: visits completed that have not been approved
  const pendingReports = allEvents.filter((e) => {
    if (e.status !== "COMPLETED") return false;
    const fb = e.FeedbackRecord[0];
    if (!fb) return true;
    try {
      const meta = JSON.parse(fb.comments || "{}");
      return meta.reviewStatus !== "REVIEWED";
    } catch {
      return true;
    }
  });

  // Calculate inventory alerts on assigned bus
  const lowStockItems = allConsumables.filter((c) => c.currentStock <= c.minimumStock);
  const damagedEquipment = (assignedBus?.Equipment || []).filter(
    (eq: any) => eq.status === "DAMAGED" || eq.status === "MISSING"
  );
  const inventoryAlertsCount = lowStockItems.length + damagedEquipment.length;

  // Build actionable pending tasks
  const pendingTasks: Array<{ id: string; title: string; category: string; priority: string; actionPath: string }> = [];

  for (const v of todayVisits) {
    if (v.status === "SCHEDULED" || v.status === "READINESS_VERIFIED") {
      pendingTasks.push({
        id: `start-${v.id}`,
        title: `Conduct Visit at ${v.School?.name || "School"} (${v.startTime} - ${v.endTime})`,
        category: "VISIT_EXECUTION",
        priority: "HIGH",
        actionPath: `/field/visits`,
      });
    } else if (v.status === "ON_SITE" || v.status === "IN_TRANSIT") {
      pendingTasks.push({
        id: `complete-${v.id}`,
        title: `Wrap up session & record attendance for ${v.School?.name || "School"}`,
        category: "VISIT_EXECUTION",
        priority: "URGENT",
        actionPath: `/field/visits`,
      });
    }
  }

  for (const p of pendingReports) {
    const fb = p.FeedbackRecord[0];
    let isCorrection = false;
    try {
      const parsed = JSON.parse(fb?.comments || "{}");
      if (parsed.reviewStatus === "NEEDS_CORRECTION") isCorrection = true;
    } catch {}

    pendingTasks.push({
      id: `report-${p.id}`,
      title: isCorrection
        ? `Correction requested: Resubmit report for ${p.School?.name || "School"}`
        : `Submit visit report for ${p.School?.name || "School"}`,
      category: "REPORTING",
      priority: isCorrection ? "URGENT" : "MEDIUM",
      actionPath: `/field/reports`,
    });
  }

  return res.json({
    role: r,
    user: {
      id: uid,
      name: user.name || user.fullName,
      email: user.email,
      phone: user.phone,
      regionId: user.regionId,
    },
    assignedBus: assignedBus
      ? {
          id: assignedBus.id,
          registrationNumber: assignedBus.registrationNumber,
          model: (assignedBus as any).model || "Tata Winger Mobile Lab",
          seatingCapacity: assignedBus.seatingCapacity,
          status: assignedBus.status,
          equipmentCount: assignedBus.Equipment?.length || 0,
        }
      : null,
    kpis: {
      todayVisits: todayVisits.length,
      completedToday: completedToday.length,
      upcomingVisits: upcomingVisits.length,
      pendingReports: pendingReports.length,
      inventoryAlerts: inventoryAlertsCount,
      openIssues: openIssues.filter((x: any) => !["RESOLVED", "CLOSED"].includes(x.status)).length,
    },
    todayVisits: todayVisits.map((v) => ({
      ...v,
      reportStatus: v.FeedbackRecord[0]
        ? (() => {
            try {
              return JSON.parse(v.FeedbackRecord[0].comments || "{}").reviewStatus;
            } catch {
              return "SUBMITTED";
            }
          })()
        : null,
    })),
    upcomingVisits,
    pendingTasks,
    inventoryAlerts: [
      ...lowStockItems.map((c) => ({
        type: "CONSUMABLE_LOW",
        title: `Low Stock: ${c.name}`,
        details: `Current: ${c.currentStock} ${c.unitMetric} (Min: ${c.minimumStock})`,
      })),
      ...damagedEquipment.map((eq: any) => ({
        type: "EQUIPMENT_DAMAGED",
        title: `Asset Alert: ${eq.name}`,
        details: `Status: ${eq.status} (${eq.assetTag})`,
      })),
    ],
  });
});

// =========================================================================
// 2. MY SCHEDULE & ASSIGNMENTS
// =========================================================================

fieldRouter.get("/schedule", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.schedule.view")) return;
  const uid = actor(res);
  const r = role(res);

  const filter = String(req.query.filter || "all");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where: any = r === "SUPER_ADMIN" ? {} : { EventsOnCommunicator: { some: { userId: uid } } };

  if (filter === "today") {
    const endToday = new Date(today);
    endToday.setHours(23, 59, 59, 999);
    where.eventDate = { gte: today, lte: endToday };
  } else if (filter === "upcoming") {
    where.eventDate = { gte: today };
  } else if (filter === "past") {
    where.eventDate = { lt: today };
  }

  const rows = await prisma.event.findMany({
    where,
    include: {
      School: true,
      Bus: true,
      FeedbackRecord: { orderBy: { id: "desc" }, take: 1 },
      ExperimentSession: { include: { Experiment: true } },
    },
    orderBy: { eventDate: filter === "past" ? "desc" : "asc" },
    take: 100,
  });

  const enriched = rows.map((ev) => {
    let reportStatus = null;
    let reviewComments = null;
    if (ev.FeedbackRecord.length > 0) {
      try {
        const parsed = JSON.parse(ev.FeedbackRecord[0].comments || "{}");
        reportStatus = parsed.reviewStatus;
        reviewComments = parsed.reviewComments;
      } catch {}
    }

    return {
      ...ev,
      reportStatus,
      reviewComments,
      experiments: ev.ExperimentSession.map((s) => s.Experiment?.title).filter(Boolean),
    };
  });

  return res.json({ rows: enriched });
});

// Backwards compatibility alias for /schedule
fieldRouter.get("/events", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.schedule.view")) return;
  const uid = actor(res);
  const rows = await prisma.event.findMany({
    where: { EventsOnCommunicator: { some: { userId: uid } } },
    include: { School: true, Bus: true, ExperimentSession: { include: { Experiment: true } } },
    orderBy: { eventDate: "desc" },
    take: 150,
  });
  return res.json({ rows });
});

// =========================================================================
// 3. SCHOOL VISITS & VISIT EXECUTION
// =========================================================================

fieldRouter.get("/visits", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.visit.view")) return;
  const uid = actor(res);
  const r = role(res);

  const rows = await prisma.event.findMany({
    where: r === "SUPER_ADMIN" ? {} : { EventsOnCommunicator: { some: { userId: uid } } },
    include: {
      School: true,
      Bus: true,
      EventReadinessCheck: true,
      FeedbackRecord: { orderBy: { id: "desc" }, take: 1 },
      ExperimentSession: { include: { Experiment: true } },
    },
    orderBy: { eventDate: "desc" },
    take: 100,
  });

  return res.json({ rows });
});

fieldRouter.get("/visits/:id", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.visit.view")) return;
  const uid = actor(res);
  const r = role(res);

  const event = await prisma.event.findFirst({
    where: {
      id: req.params.id,
      ...(r === "SUPER_ADMIN" ? {} : { EventsOnCommunicator: { some: { userId: uid } } }),
    },
    include: {
      School: true,
      Bus: { include: { Equipment: true } },
      EventReadinessCheck: true,
      FeedbackRecord: { orderBy: { id: "desc" } },
      ConsumableUsage: { include: { Consumable: true } },
      OperationalIssues: true,
      ExperimentSession: { include: { Experiment: true } },
    },
  });

  if (!event) {
    return res.status(404).json({ message: "Assigned visit not found" });
  }

  return res.json({ visit: event });
});

fieldRouter.post("/visits/:id/status", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.session.execute")) return;
  const uid = actor(res);
  const r = role(res);

  const event = await prisma.event.findFirst({
    where: {
      id: req.params.id,
      ...(r === "SUPER_ADMIN" ? {} : { EventsOnCommunicator: { some: { userId: uid } } }),
    },
    include: { School: true },
  });

  if (!event) {
    return res.status(404).json({ message: "Assigned visit not found" });
  }

  const schema = z.object({
    status: z.enum(["SCHEDULED", "READINESS_VERIFIED", "IN_TRANSIT", "ON_SITE", "COMPLETED", "CANCELLED"]),
    actualStudentCount: z.number().int().nonnegative().optional(),
    notes: z.string().optional(),
    locationLat: z.number().optional(),
    locationLng: z.number().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const updateData: any = {
    status: parsed.data.status,
  };

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: updateData,
  });

  // If coordinates provided, update bus GPS telemetry
  if (parsed.data.locationLat && parsed.data.locationLng && event.busId) {
    await prisma.bus.update({
      where: { id: event.busId },
      data: {
        currentLat: parsed.data.locationLat,
        currentLng: parsed.data.locationLng,
        lastGpsUpdate: new Date(),
      },
    }).catch(() => undefined);
  }

  await audit(req, res, `VISIT_STATUS_${parsed.data.status}`, "Event", event.id, {
    schoolName: event.School?.name,
    actualStudentCount: parsed.data.actualStudentCount,
  });

  return res.json({ message: `Visit marked as ${parsed.data.status}`, visit: updated });
});

// Backwards compatibility execution endpoints
fieldRouter.post("/events/:id/arrival", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.session.execute")) return;
  const uid = actor(res);
  const event = await prisma.event.findFirst({
    where: { id: req.params.id, EventsOnCommunicator: { some: { userId: uid } } },
  });
  if (!event) return res.status(404).json({ message: "Assigned visit not found" });
  const row = await prisma.event.update({ where: { id: event.id }, data: { status: "ON_SITE" } });
  await audit(req, res, "VISIT_ARRIVED", "Event", row.id);
  res.json(row);
});

fieldRouter.post("/events/:id/start", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.session.execute")) return;
  const uid = actor(res);
  const event = await prisma.event.findFirst({
    where: { id: req.params.id, EventsOnCommunicator: { some: { userId: uid } } },
  });
  if (!event) return res.status(404).json({ message: "Assigned visit not found" });
  const row = await prisma.event.update({ where: { id: event.id }, data: { status: "ON_SITE" } });
  await audit(req, res, "SESSION_STARTED", "Event", row.id);
  res.json(row);
});

fieldRouter.post("/events/:id/complete", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.session.execute")) return;
  const uid = actor(res);
  const event = await prisma.event.findFirst({
    where: { id: req.params.id, EventsOnCommunicator: { some: { userId: uid } } },
  });
  if (!event) return res.status(404).json({ message: "Assigned visit not found" });
  const row = await prisma.event.update({ where: { id: event.id }, data: { status: "COMPLETED" } });
  await audit(req, res, "VISIT_COMPLETED", "Event", row.id);
  res.json(row);
});

// =========================================================================
// 4. BUS INVENTORY & RECONCILIATION HUB
// =========================================================================

fieldRouter.get("/inventory/bus", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.inventory.view")) return;
  const uid = actor(res);
  const user = res.locals.user;

  const assignedBus = await getAssignedBusForStaff(uid, user.regionId);
  const busId = assignedBus?.id;

  const [consumables, equipment, recentTransactions] = await Promise.all([
    getBusConsumablesWithStock(busId),
    busId
      ? prisma.equipment.findMany({
          where: { busId },
          orderBy: { name: "asc" },
        })
      : [],
    busId
      ? prisma.inventoryTransaction.findMany({
          where: { busId },
          include: { consumable: true },
          orderBy: { timestamp: "desc" },
          take: 25,
        })
      : [],
  ]);

  return res.json({
    bus: assignedBus,
    consumables,
    equipment,
    recentTransactions,
  });
});

/**
 * Step A: Pre-visit Opening Stock Verification
 */
fieldRouter.post("/inventory/opening-verification", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.inventory.record")) return;
  const uid = actor(res);
  const user = res.locals.user;

  const schema = z.object({
    busId: z.string().min(1),
    eventId: z.string().optional(),
    items: z.array(
      z.object({
        consumableId: z.string(),
        expectedStock: z.number().int().nonnegative(),
        physicalCount: z.number().int().nonnegative(),
        discrepancyReason: z.string().optional(),
      })
    ).min(1, "At least one consumable item must be counted"),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { busId, eventId, items } = parsed.data;
  const discrepancies: any[] = [];

  for (const item of items) {
    const variance = item.physicalCount - item.expectedStock;
    if (variance !== 0) {
      if (!item.discrepancyReason || item.discrepancyReason.trim().length === 0) {
        return res.status(400).json({
          message: `Discrepancy detected for item (variance: ${variance}). A justification reason is required.`,
        });
      }

      // Record adjustment ledger entry
      await prisma.inventoryTransaction.create({
        data: {
          id: newId(),
          consumableId: item.consumableId,
          busId,
          quantity: variance,
          type: "ADJUSTMENT",
          referenceType: "OPENING_VERIFICATION",
          referenceId: eventId || undefined,
          performedById: uid,
          notes: `Opening stock discrepancy. Physical count: ${item.physicalCount}, Expected: ${item.expectedStock}. Reason: ${item.discrepancyReason}`,
        },
      });

      // Record an operational issue alerting Regional Admin
      const cons = await prisma.consumable.findUnique({ where: { id: item.consumableId } });
      await prisma.operationalIssue.create({
        data: {
          id: newId(),
          category: "INVENTORY",
          description: `Opening stock variance on Bus ${busId}: ${cons?.name || "Item"} expected ${item.expectedStock}, physical count ${item.physicalCount} (Diff: ${variance}). Note: ${item.discrepancyReason}`,
          reportedById: uid,
          regionId: user.regionId || undefined,
          busId,
          eventId: eventId || undefined,
          status: "OPEN",
        },
      });

      discrepancies.push({
        consumableId: item.consumableId,
        itemName: cons?.name,
        variance,
        reason: item.discrepancyReason,
      });
    }
  }

  await audit(req, res, "OPENING_STOCK_VERIFIED", "Bus", busId, {
    itemsCount: items.length,
    discrepanciesCount: discrepancies.length,
    eventId,
  });

  return res.json({
    message: discrepancies.length > 0
      ? `Opening verification recorded with ${discrepancies.length} discrepancy alert(s) sent to Regional Admin.`
      : "Opening stock verified successfully with zero discrepancies.",
    discrepancies,
  });
});

/**
 * Step B: Material Consumption Logger
 */
fieldRouter.post("/inventory/consumption", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.inventory.record")) return;
  const uid = actor(res);

  const schema = z.object({
    busId: z.string().min(1),
    consumableId: z.string().min(1),
    quantity: z.number().int().positive("Quantity must be greater than zero"),
    eventId: z.string().optional(),
    activityName: z.string().optional(),
    notes: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { busId, consumableId, quantity, eventId, activityName, notes } = parsed.data;

  const consumable = await prisma.consumable.findUnique({ where: { id: consumableId } });
  if (!consumable) {
    return res.status(404).json({ message: "Consumable material not found" });
  }

  if (consumable.currentStock < quantity) {
    return res.status(400).json({
      message: `Insufficient stock for ${consumable.name}. Available: ${consumable.currentStock} ${consumable.unitMetric}`,
    });
  }

  const tx = await prisma.$transaction(async (db) => {
    // 1. Decrement master/bus stock
    const updated = await db.consumable.update({
      where: { id: consumableId },
      data: { currentStock: { decrement: quantity } },
    });

    // 2. Create usage record if eventId provided
    if (eventId) {
      await db.consumableUsage.create({
        data: {
          id: newId(),
          consumableId,
          eventId,
          qtyUsed: quantity,
        },
      });
    }

    // 3. Create immutable ledger record
    const record = await db.inventoryTransaction.create({
      data: {
        id: newId(),
        consumableId,
        busId,
        quantity,
        type: "CONSUMPTION",
        referenceType: "FIELD_SESSION",
        referenceId: eventId || undefined,
        performedById: uid,
        notes: [activityName ? `Activity: ${activityName}` : "", notes || ""].filter(Boolean).join(". "),
      },
    });

    return { record, updatedStock: updated.currentStock };
  });

  await audit(req, res, "CONSUMABLE_CONSUMED", "InventoryTransaction", tx.record.id, {
    material: consumable.name,
    quantity,
    eventId,
  });

  return res.status(201).json({
    message: `Recorded consumption of ${quantity} ${consumable.unitMetric} for ${consumable.name}`,
    transaction: tx.record,
    remainingStock: tx.updatedStock,
  });
});

// Legacy consumption alias
fieldRouter.post("/consumption", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.inventory.record")) return;
  const parsed = z
    .object({
      consumableId: z.string(),
      busId: z.string(),
      quantity: z.number().int().positive(),
      notes: z.string().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ message: "Invalid consumption payload" });
  const uid = actor(res);

  const consumable = await prisma.consumable.findUnique({ where: { id: parsed.data.consumableId } });
  if (!consumable || consumable.currentStock < parsed.data.quantity) {
    return res.status(400).json({ message: "Insufficient stock" });
  }

  const tx = await prisma.$transaction(async (db) => {
    const row = await db.inventoryTransaction.create({
      data: {
        id: newId(),
        consumableId: parsed.data.consumableId,
        busId: parsed.data.busId,
        quantity: parsed.data.quantity,
        type: "CONSUMPTION",
        performedById: uid,
        notes: parsed.data.notes,
        referenceType: "FIELD_SESSION",
      },
    });
    await db.consumable.update({
      where: { id: consumable.id },
      data: { currentStock: { decrement: parsed.data.quantity } },
    });
    return row;
  });

  await audit(req, res, "CONSUMABLE_CONSUMED", "InventoryTransaction", tx.id);
  res.status(201).json(tx);
});

/**
 * Step C: Equipment Physical Verification (Pre-visit & Post-visit)
 */
fieldRouter.post("/inventory/equipment-verification", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.inventory.record")) return;
  const uid = actor(res);
  const user = res.locals.user;

  const schema = z.object({
    busId: z.string().min(1),
    eventId: z.string().optional(),
    stage: z.enum(["PRE_VISIT", "POST_VISIT"]).default("PRE_VISIT"),
    items: z.array(
      z.object({
        equipmentId: z.string(),
        status: z.enum(["AVAILABLE", "ASSIGNED_TO_BUS", "IN_MAINTENANCE", "DAMAGED", "MISSING"]),
        notes: z.string().optional(),
      })
    ).min(1, "At least one equipment item must be verified"),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { busId, eventId, stage, items } = parsed.data;
  const alertsCreated: any[] = [];

  for (const item of items) {
    const existing = await prisma.equipment.findUnique({ where: { id: item.equipmentId } });
    if (!existing) continue;

    // Update equipment status
    await prisma.equipment.update({
      where: { id: item.equipmentId },
      data: { status: item.status },
    });

    // Alert if damaged or missing
    if (["DAMAGED", "MISSING", "IN_MAINTENANCE"].includes(item.status)) {
      await prisma.operationalIssue.create({
        data: {
          id: newId(),
          category: "EQUIPMENT",
          description: `Equipment Alert [${stage}]: ${existing.name} (${existing.assetTag}) marked as ${item.status}. ${item.notes || ""}`,
          reportedById: uid,
          regionId: user.regionId || undefined,
          busId,
          eventId: eventId || undefined,
          status: "OPEN",
        },
      });

      alertsCreated.push({
        equipmentId: item.equipmentId,
        name: existing.name,
        status: item.status,
      });
    }
  }

  await audit(req, res, `EQUIPMENT_${stage}_VERIFIED`, "Bus", busId, {
    itemsCount: items.length,
    alertsCount: alertsCreated.length,
  });

  return res.json({
    message: alertsCreated.length > 0
      ? `Equipment verified. ${alertsCreated.length} defect/missing alert(s) escalated to Regional Admin.`
      : `All equipment verified in working condition (${stage}).`,
    alerts: alertsCreated,
  });
});

/**
 * Step D: Post-visit Closing Stock Reconciliation
 */
fieldRouter.post("/inventory/closing-verification", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.inventory.record")) return;
  const uid = actor(res);
  const user = res.locals.user;

  const schema = z.object({
    busId: z.string().min(1),
    eventId: z.string().optional(),
    items: z.array(
      z.object({
        consumableId: z.string(),
        openingCount: z.number().int().nonnegative(),
        consumedCount: z.number().int().nonnegative(),
        physicalClosingCount: z.number().int().nonnegative(),
        discrepancyReason: z.string().optional(),
      })
    ).min(1, "At least one consumable item must be verified"),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { busId, eventId, items } = parsed.data;
  const discrepancies: any[] = [];

  for (const item of items) {
    const expectedClosing = item.openingCount - item.consumedCount;
    const variance = item.physicalClosingCount - expectedClosing;

    if (variance !== 0) {
      if (!item.discrepancyReason || item.discrepancyReason.trim().length === 0) {
        return res.status(400).json({
          message: `Discrepancy detected (Expected closing: ${expectedClosing}, Counted: ${item.physicalClosingCount}). A reason is required.`,
        });
      }

      // Record adjustment ledger entry
      await prisma.inventoryTransaction.create({
        data: {
          id: newId(),
          consumableId: item.consumableId,
          busId,
          quantity: variance,
          type: variance < 0 ? "LOSS" : "ADJUSTMENT",
          referenceType: "CLOSING_VERIFICATION",
          referenceId: eventId || undefined,
          performedById: uid,
          notes: `Closing stock variance. Expected closing: ${expectedClosing}, Physical count: ${item.physicalClosingCount}. Reason: ${item.discrepancyReason}`,
        },
      });

      const cons = await prisma.consumable.findUnique({ where: { id: item.consumableId } });
      await prisma.operationalIssue.create({
        data: {
          id: newId(),
          category: "INVENTORY",
          description: `Post-visit closing variance on Bus ${busId}: ${cons?.name || "Item"} expected ${expectedClosing}, actual closing count ${item.physicalClosingCount} (Diff: ${variance}). Reason: ${item.discrepancyReason}`,
          reportedById: uid,
          regionId: user.regionId || undefined,
          busId,
          eventId: eventId || undefined,
          status: "OPEN",
        },
      });

      discrepancies.push({
        consumableId: item.consumableId,
        itemName: cons?.name,
        expectedClosing,
        physicalClosingCount: item.physicalClosingCount,
        variance,
        reason: item.discrepancyReason,
      });
    }
  }

  await audit(req, res, "CLOSING_STOCK_VERIFIED", "Bus", busId, {
    itemsCount: items.length,
    discrepanciesCount: discrepancies.length,
    eventId,
  });

  return res.json({
    message: discrepancies.length > 0
      ? `Closing verification saved. ${discrepancies.length} discrepancy alert(s) reported to Regional Admin.`
      : "Closing stock reconciled with zero variance.",
    discrepancies,
  });
});

// =========================================================================
// 5. VISIT REPORTS & SUBMISSION WORKFLOW
// =========================================================================

fieldRouter.get("/reports", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.session.view")) return;
  const uid = actor(res);
  const r = role(res);

  const events = await prisma.event.findMany({
    where: r === "SUPER_ADMIN" ? {} : { EventsOnCommunicator: { some: { userId: uid } } },
    include: {
      School: true,
      Bus: true,
      FeedbackRecord: { orderBy: { id: "desc" } },
      ConsumableUsage: { include: { Consumable: true } },
    },
    orderBy: { eventDate: "desc" },
    take: 100,
  });

  const reports = events.map((ev) => {
    let reviewStatus = "NOT_STARTED";
    let observations = "";
    let reviewComments = "";
    let submittedAt = null;
    let studentsParticipated = ev.expectedStudentCount;
    let curriculumCovered = "";
    let challenges = "";
    let activitiesConducted: string[] = [];

    for (const fb of ev.FeedbackRecord) {
      try {
        const parsed = JSON.parse(fb.comments || "{}");
        if (parsed.reviewStatus) reviewStatus = parsed.reviewStatus;
        if (parsed.observations) observations = parsed.observations;
        if (parsed.reviewComments) reviewComments = parsed.reviewComments;
        if (parsed.submittedAt) submittedAt = parsed.submittedAt;
        if (parsed.studentsParticipated) studentsParticipated = parsed.studentsParticipated;
        if (parsed.curriculumCovered) curriculumCovered = parsed.curriculumCovered;
        if (parsed.challenges) challenges = parsed.challenges;
        if (parsed.activitiesConducted) activitiesConducted = parsed.activitiesConducted;
      } catch {}
    }

    return {
      eventId: ev.id,
      eventCode: ev.eventCode,
      schoolName: ev.School?.name || "School",
      eventDate: ev.eventDate,
      startTime: ev.startTime,
      endTime: ev.endTime,
      status: ev.status,
      reviewStatus,
      reviewComments,
      submittedAt,
      studentsParticipated,
      curriculumCovered,
      challenges,
      observations,
      activitiesConducted,
      materialsUsedCount: ev.ConsumableUsage.length,
    };
  });

  return res.json({ rows: reports });
});

fieldRouter.get("/reports/:eventId", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.session.view")) return;
  const uid = actor(res);
  const r = role(res);

  const event = await prisma.event.findFirst({
    where: {
      id: req.params.eventId,
      ...(r === "SUPER_ADMIN" ? {} : { EventsOnCommunicator: { some: { userId: uid } } }),
    },
    include: {
      School: true,
      Bus: true,
      FeedbackRecord: { orderBy: { id: "desc" } },
      ConsumableUsage: { include: { Consumable: true } },
      ExperimentSession: { include: { Experiment: true } },
    },
  });

  if (!event) {
    return res.status(404).json({ message: "Visit not found" });
  }

  let latestReport: any = null;
  for (const fb of event.FeedbackRecord) {
    try {
      const parsed = JSON.parse(fb.comments || "{}");
      if (!latestReport) {
        latestReport = { ...parsed, rawId: fb.id, createdAt: fb.id };
      }
    } catch {}
  }

  return res.json({
    event,
    report: latestReport || {
      reviewStatus: "DRAFT",
      studentsParticipated: event.expectedStudentCount,
      observations: "",
      challenges: "",
      curriculumCovered: "",
      activitiesConducted: event.ExperimentSession.map((s) => s.Experiment?.title).filter(Boolean),
    },
    history: event.FeedbackRecord,
  });
});

fieldRouter.post("/reports", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.session.execute")) return;
  const uid = actor(res);
  const r = role(res);

  const schema = z.object({
    eventId: z.string().min(1),
    studentsParticipated: z.number().int().nonnegative(),
    activitiesConducted: z.array(z.string()).optional(),
    curriculumCovered: z.string().optional(),
    observations: z.string().min(1, "Observations and key session takeaways are required"),
    challenges: z.string().optional(),
    teacherFeedback: z.string().optional(),
    evidenceUrl: z.string().optional(),
    status: z.enum(["DRAFT", "SUBMITTED_FOR_REVIEW"]).default("SUBMITTED_FOR_REVIEW"),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { eventId, studentsParticipated, activitiesConducted, curriculumCovered, observations, challenges, teacherFeedback, evidenceUrl, status } = parsed.data;

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      ...(r === "SUPER_ADMIN" ? {} : { EventsOnCommunicator: { some: { userId: uid } } }),
    },
    include: { School: true },
  });

  if (!event) {
    return res.status(404).json({ message: "Assigned visit not found" });
  }

  const reportPayload = {
    reviewStatus: status,
    studentsParticipated,
    activitiesConducted: activitiesConducted || [],
    curriculumCovered: curriculumCovered || "",
    observations,
    challenges: challenges || "",
    teacherFeedback: teacherFeedback || "",
    evidenceUrl: evidenceUrl || "",
    submittedAt: new Date().toISOString(),
    submittedById: uid,
  };

  const fb = await prisma.feedbackRecord.create({
    data: {
      id: newId(),
      eventId: event.id,
      userId: uid,
      userRole: "SCIENCE_COMMUNICATOR",
      rating: 5,
      comments: JSON.stringify(reportPayload),
    },
  });

  if (status === "SUBMITTED_FOR_REVIEW") {
    await prisma.event.update({
      where: { id: event.id },
      data: {
        status: "COMPLETED",
      },
    });
  }

  await audit(req, res, `VISIT_REPORT_${status}`, "Event", event.id, {
    schoolName: event.School?.name,
    status,
  });

  return res.json({
    message: status === "SUBMITTED_FOR_REVIEW"
      ? "Visit report submitted for Regional Admin sign-off."
      : "Draft report saved successfully.",
    report: reportPayload,
    recordId: fb.id,
  });
});

// Backwards-compat submit-report endpoint
fieldRouter.post("/events/:id/submit-report", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.session.execute")) return;
  const uid = actor(res);
  const event = await prisma.event.findFirst({
    where: { id: req.params.id, EventsOnCommunicator: { some: { userId: uid } } },
    include: { School: true },
  });
  if (!event) return res.status(404).json({ message: "Assigned visit not found" });

  const { observations, studentsParticipated, remarks } = req.body;
  const reportPayload = {
    reviewStatus: "SUBMITTED_FOR_REVIEW",
    observations: observations || "",
    studentsParticipated: studentsParticipated ? Number(studentsParticipated) : event.expectedStudentCount,
    submittedAt: new Date().toISOString(),
    submittedById: uid,
    remarks: remarks || "",
  };

  await prisma.feedbackRecord.create({
    data: {
      id: newId(),
      eventId: event.id,
      userId: uid,
      userRole: "SCIENCE_COMMUNICATOR",
      rating: 5,
      comments: JSON.stringify(reportPayload),
    },
  });

  const row = await prisma.event.update({
    where: { id: event.id },
    data: { status: "COMPLETED" },
  });

  await audit(req, res, "VISIT_REPORT_SUBMITTED", "Event", row.id, { schoolName: event.School?.name });
  res.json({ message: "Report submitted for Regional Admin review", event: row, report: reportPayload });
});

// =========================================================================
// 6. REPORT AN ISSUE
// =========================================================================

fieldRouter.get("/issues", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.issue.report")) return;
  const uid = actor(res);
  const r = role(res);

  const issues = await prisma.operationalIssue.findMany({
    where: r === "SUPER_ADMIN" ? {} : { reportedById: uid },
    include: {
      bus: { select: { id: true, registrationNumber: true } },
      school: { select: { id: true, name: true } },
      region: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return res.json({ rows: issues });
});

fieldRouter.post("/issues", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.issue.report")) return;
  const uid = actor(res);
  const user = res.locals.user;

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
    description: z.string().min(5, "Description must be at least 5 characters"),
    location: z.string().optional(),
    schoolId: z.string().optional(),
    busId: z.string().optional(),
    eventId: z.string().optional(),
    evidenceUrl: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const issue = await prisma.operationalIssue.create({
    data: {
      id: newId(),
      ...parsed.data,
      reportedById: uid,
      regionId: user.regionId || undefined,
      status: "OPEN",
    },
  });

  await audit(req, res, "FIELD_ISSUE_REPORTED", "OperationalIssue", issue.id, {
    category: parsed.data.category,
    busId: parsed.data.busId,
  });

  return res.status(201).json({
    message: "Operational issue reported successfully. Regional Admin notified.",
    issue,
  });
});

// =========================================================================
// 7. NOTIFICATIONS & ALERTS
// =========================================================================

fieldRouter.get("/notifications", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "dashboard.view")) return;
  const uid = actor(res);
  const user = res.locals.user;
  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 86400000);

  const [upcomingVisits, feedbackRecords, openIssues, bus] = await Promise.all([
    prisma.event.findMany({
      where: {
        EventsOnCommunicator: { some: { userId: uid } },
        eventDate: { gte: now, lte: next7Days },
      },
      include: { School: true, Bus: true },
      take: 10,
    }),
    prisma.feedbackRecord.findMany({
      where: {
        Event: { EventsOnCommunicator: { some: { userId: uid } } },
      },
      include: { Event: { include: { School: true } } },
      orderBy: { id: "desc" },
      take: 10,
    }),
    prisma.operationalIssue.findMany({
      where: { reportedById: uid, status: { in: ["OPEN", "IN_PROGRESS", "RESOLVED"] } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    getAssignedBusForStaff(uid, user.regionId),
  ]);

  const items: Array<{
    id: string;
    type: "SCHEDULE" | "REPORT" | "ISSUE" | "INVENTORY";
    severity: "info" | "warning" | "error" | "success";
    title: string;
    detail: string;
    timestamp: Date;
  }> = [];

  // 1. Visit assignments
  for (const v of upcomingVisits) {
    items.push({
      id: `sch-${v.id}`,
      type: "SCHEDULE",
      severity: "info",
      title: `Upcoming Visit: ${v.School?.name || "School"}`,
      detail: `Scheduled on ${new Date(v.eventDate).toLocaleDateString()} from ${v.startTime} to ${v.endTime}.`,
      timestamp: v.eventDate,
    });
  }

  // 2. Report reviews / corrections
  for (const fb of feedbackRecords) {
    try {
      const parsed = JSON.parse(fb.comments || "{}");
      if (parsed.reviewStatus === "NEEDS_CORRECTION") {
        items.push({
          id: `rev-${fb.id}`,
          type: "REPORT",
          severity: "warning",
          title: `Report Needs Correction: ${fb.Event?.School?.name || "Visit"}`,
          detail: parsed.reviewComments || "Please review notes and resubmit report.",
          timestamp: fb.Event?.eventDate || now,
        });
      } else if (parsed.reviewStatus === "REVIEWED") {
        items.push({
          id: `rev-${fb.id}`,
          type: "REPORT",
          severity: "success",
          title: `Report Approved: ${fb.Event?.School?.name || "Visit"}`,
          detail: "Regional Admin has reviewed and signed off on this visit report.",
          timestamp: fb.Event?.eventDate || now,
        });
      }
    } catch {}
  }

  // 3. Issue updates
  for (const is of openIssues) {
    if (is.status === "RESOLVED") {
      items.push({
        id: `iss-${is.id}`,
        type: "ISSUE",
        severity: "success",
        title: `Issue Resolved: ${is.category}`,
        detail: is.resolution || is.description,
        timestamp: is.updatedAt,
      });
    }
  }

  // 4. Equipment defect alerts on assigned bus
  if (bus?.Equipment) {
    for (const eq of bus.Equipment) {
      if (eq.status === "DAMAGED" || eq.status === "MISSING") {
        items.push({
          id: `eq-${eq.id}`,
          type: "INVENTORY",
          severity: "error",
          title: `Asset Alert: ${eq.name}`,
          detail: `Equipment ${eq.assetTag} is currently marked as ${eq.status}.`,
          timestamp: now,
        });
      }
    }
  }

  items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return res.json({
    notifications: items,
    unreadCount: items.length,
  });
});

// =========================================================================
// 8. MY PROFILE
// =========================================================================

fieldRouter.get("/profile", async (_req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "dashboard.view")) return;
  const uid = actor(res);
  const user = res.locals.user;

  const [dbUser, assignedBus, totalCompletedVisits] = await Promise.all([
    prisma.user.findUnique({
      where: { id: uid },
      include: {
        Region: { select: { id: true, name: true, State: true } },
        District: { select: { id: true, name: true } },
      },
    }),
    getAssignedBusForStaff(uid, user.regionId),
    prisma.event.count({
      where: {
        EventsOnCommunicator: { some: { userId: uid } },
        status: "COMPLETED",
      },
    }),
  ]);

  if (!dbUser) {
    return res.status(404).json({ message: "User profile not found" });
  }

  // Find Regional Admin for escalation
  const regionalAdmin = user.regionId
    ? await prisma.user.findFirst({
        where: { regionId: user.regionId, roleEnum: "REGIONAL_ADMIN", isActive: true },
        select: { id: true, name: true, fullName: true, email: true, phone: true },
      })
    : null;

  return res.json({
    profile: {
      id: dbUser.id,
      name: dbUser.name || dbUser.fullName,
      fullName: dbUser.fullName || dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone || "Not configured",
      role: dbUser.roleEnum,
      employeeId: `EMP-${dbUser.id.slice(0, 6).toUpperCase()}`,
      region: dbUser.Region?.name || "Unassigned Region",
      district: dbUser.District?.name || "All Districts",
      state: dbUser.Region?.State?.name || "State",
      joinedAt: dbUser.createdAt,
    },
    assignedBus: assignedBus
      ? {
          id: assignedBus.id,
          registrationNumber: assignedBus.registrationNumber,
          model: (assignedBus as any).model || "Tata Winger Mobile Lab",
          seatingCapacity: assignedBus.seatingCapacity,
          status: assignedBus.status,
          currentLocation: assignedBus.currentLat
            ? `${assignedBus.currentLat.toFixed(4)}, ${assignedBus.currentLng?.toFixed(4)}`
            : "Base Depot",
          equipmentCount: assignedBus.Equipment?.length || 0,
        }
      : null,
    regionalAdmin: regionalAdmin
      ? {
          name: regionalAdmin.fullName || regionalAdmin.name,
          email: regionalAdmin.email,
          phone: regionalAdmin.phone || "Regional Office",
        }
      : null,
    stats: {
      completedVisits: totalCompletedVisits,
      activeStatus: dbUser.status || "ACTIVE",
    },
  });
});

// Lab telemetry endpoint backwards compatibility
fieldRouter.get("/lab", async (_req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.lab.view")) return;
  const uid = actor(res);
  const bus = await getAssignedBusForStaff(uid, res.locals.user.regionId);
  if (!bus) return res.json({ lab: null });
  const detailed = await prisma.bus.findUnique({
    where: { id: bus.id },
    include: { Equipment: true, BusMaintenanceRecord: true, GpsDevice: true },
  });
  return res.json({ lab: detailed });
});

// Student attendance recording
fieldRouter.post("/attendance", async (req, res) => {
  if (!allow(res, ["SCIENCE_COMMUNICATOR"], "field.session.execute")) return;
  const parsed = z
    .object({
      eventId: z.string(),
      studentIds: z.array(z.string()),
      present: z.boolean().default(true),
    })
    .safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ message: "Invalid attendance payload" });
  const event = await prisma.event.findFirst({
    where: { id: parsed.data.eventId, EventsOnCommunicator: { some: { userId: actor(res) } } },
  });
  if (!event) return res.status(403).json({ message: "Session is not assigned to you" });

  await prisma.$transaction(
    parsed.data.studentIds.map((studentId) =>
      prisma.eventAttendance.upsert({
        where: { id: `${event.id}:${studentId}` },
        update: { isPresent: parsed.data.present, markedAt: new Date() },
        create: { id: `${event.id}:${studentId}`, eventId: event.id, studentId, isPresent: parsed.data.present },
      })
    )
  );

  await audit(req, res, "ATTENDANCE_RECORDED", "Event", event.id, {
    count: parsed.data.studentIds.length,
  });

  res.json({ ok: true });
});

export default fieldRouter;
