import { Router, type Request } from "express";
import type { Prisma } from "@prisma/client";
import crypto from "node:crypto";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
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
  buses: "bus",
  maintenance: "busMaintenanceRecord",
  registrations: "schoolRegistration",
  experiments: "experiment",
  equipment: "equipment",
  consumables: "consumable",
  inventory: "inventoryTransaction",
  visits: "event",
  schedules: "event",
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

// Helper to get multi-staff roster for a bus
async function getBusStaffRoster(busId: string): Promise<Array<{ staffId: string; staffName: string; role: string; assignedAt: string }>> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: `bus_staff_${busId}` },
    });
    if (config?.value) {
      return JSON.parse(config.value);
    }
  } catch {
    // fallback
  }
  return [];
}

async function setBusStaffRoster(busId: string, roster: Array<{ staffId: string; staffName: string; role: string; assignedAt: string }>) {
  await prisma.systemConfig.upsert({
    where: { key: `bus_staff_${busId}` },
    update: { value: JSON.stringify(roster), updatedAt: new Date() },
    create: {
      id: `bus-staff-${busId}`,
      key: `bus_staff_${busId}`,
      value: JSON.stringify(roster),
      description: `Assigned staff roster for Bus ${busId}`,
      updatedAt: new Date(),
    },
  });
}

// =========================================================================
// 1. DASHBOARD & REGIONAL OVERVIEW (Section 4.1)
// =========================================================================
regionalAdminRouter.get("/overview", async (req: AuthenticatedRequest, res, next) => {
  try {
    const regionId = getRegionId(res);
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [
      region,
      adminUser,
      districtsCount,
      blocksCount,
      schoolsCount,
      activeBusesCount,
      maintenanceBusesCount,
      staffCount,
      activeStaffCount,
      studentsCount,
      scheduledVisitsCount,
      completedVisitsCount,
      todayVisitsCount,
      upcomingVisitsCount,
      issuesCount,
      consumables,
      buses,
      equipment,
      recentActivity,
      pendingAllocationsCount,
      feedbackRecords,
    ] = await Promise.all([
      prisma.region.findUnique({
        where: { id: regionId },
        select: {
          id: true,
          name: true,
          State: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, name: true, email: true, phone: true },
      }),
      prisma.district.count({ where: { regionId } }),
      prisma.block.count({ where: { District: { regionId } } }),
      prisma.school.count({ where: { regionId } }),
      prisma.bus.count({ where: { regionId, status: { in: ["AVAILABLE", "ON_ROUTE", "AT_SCHOOL"] } } }),
      prisma.bus.count({ where: { regionId, status: "UNDER_MAINTENANCE" } }),
      prisma.user.count({ where: { regionId, roleEnum: "SCIENCE_COMMUNICATOR" } }),
      prisma.user.count({ where: { regionId, roleEnum: "SCIENCE_COMMUNICATOR", isActive: true, status: "ACTIVE" } }),
      prisma.student.count({ where: { School: { regionId } } }),
      prisma.event.count({ where: { School: { regionId }, status: { in: ["SCHEDULED", "READINESS_VERIFIED", "IN_TRANSIT", "ON_SITE"] } } }),
      prisma.event.count({ where: { School: { regionId }, status: "COMPLETED" } }),
      prisma.event.count({ where: { School: { regionId }, eventDate: { gte: dayStart, lt: dayEnd } } }),
      prisma.event.count({ where: { School: { regionId }, eventDate: { gte: now } } }),
      prisma.operationalIssue.count({ where: { regionId, status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] } } }),
      prisma.consumable.findMany({
        where: {
          InventoryTransaction: {
            some: {
              OR: [
                { bus: { regionId } },
                { referenceId: regionId, referenceType: { startsWith: "ALLOCATION" } },
              ],
            },
          },
        },
      }),
      prisma.bus.findMany({
        where: { regionId },
        include: {
          User: { select: { id: true, name: true, email: true, phone: true } },
          BusMaintenanceRecord: { orderBy: { serviceDate: "desc" }, take: 1 },
          Equipment: { select: { id: true } },
        },
      }),
      prisma.equipment.findMany({
        where: {
          Bus: { regionId },
        },
        include: { Bus: { select: { id: true, busCode: true, registrationNumber: true } } },
      }),
      prisma.auditLog.findMany({
        where: { actorUserId: { not: null } },
        orderBy: { timestamp: "desc" },
        take: 30,
      }),
      prisma.inventoryTransaction.count({
        where: {
          referenceId: regionId,
          referenceType: "ALLOCATION_DISPATCHED",
        },
      }),
      prisma.feedbackRecord.findMany({
        where: {
          Event: { School: { regionId } },
        },
        select: { comments: true },
        take: 100,
      }),
    ]);

    // Calculate pending reviews
    let pendingReviewsCount = 0;
    for (const fb of feedbackRecords) {
      try {
        const parsed = JSON.parse(fb.comments);
        if (parsed.reviewStatus === "SUBMITTED_FOR_REVIEW") {
          pendingReviewsCount++;
        }
      } catch {
        // ignore
      }
    }

    // Consumables statistics
    const lowStockConsumables = consumables.filter((c) => (c.currentStock || 0) <= (c.minimumStock || 0));
    const expiredConsumables = consumables.filter((c) => c.expiryDate && new Date(c.expiryDate) < now);
    const totalConsumablesUnits = consumables.reduce((acc, c) => acc + (c.currentStock || 0), 0);

    // Equipment statistics
    const damagedEquipment = equipment.filter((e) => e.status === "DAMAGED" || e.status === "MISSING");
    const maintenanceEquipment = equipment.filter((e) => e.status === "IN_MAINTENANCE");
    const allocatedEquipment = equipment.filter((e) => e.busId !== null || e.status === "ASSIGNED_TO_BUS");
    const availableEquipment = equipment.filter((e) => e.status === "AVAILABLE" && !e.busId);

    // Filter regional activity
    const regionalStaffIds = (
      await prisma.user.findMany({
        where: { regionId },
        select: { id: true },
      })
    ).map((u) => u.id);

    const regionalActivity = recentActivity
      .filter((entry) => regionalStaffIds.includes(entry.actorUserId || "") || entry.actorUserId === req.userId)
      .slice(0, 10);

    // Generate actionable alerts
    const alerts: Array<{ severity: string; type: string; title: string; detail: string }> = [];

    if (pendingAllocationsCount > 0) {
      alerts.push({
        severity: "info",
        type: "inventory",
        title: `${pendingAllocationsCount} central inventory shipments awaiting receipt`,
        detail: "Stock dispatched from HQ is ready for physical verification and receipt confirmation",
      });
    }

    if (pendingReviewsCount > 0) {
      alerts.push({
        severity: "warning",
        type: "report",
        title: `${pendingReviewsCount} field visit reports awaiting review`,
        detail: "Field staff submitted visit logs that require Regional Admin approval",
      });
    }

    for (const item of lowStockConsumables.slice(0, 4)) {
      alerts.push({
        severity: "warning",
        type: "inventory",
        title: `Low stock: ${item.name}`,
        detail: `${item.currentStock} ${item.unitMetric} remaining (threshold: ${item.minimumStock})`,
      });
    }

    for (const item of expiredConsumables.slice(0, 3)) {
      alerts.push({
        severity: "error",
        type: "inventory",
        title: `Expired consumable: ${item.name}`,
        detail: `Expired on ${new Date(item.expiryDate!).toLocaleDateString()}`,
      });
    }

    for (const asset of damagedEquipment.slice(0, 3)) {
      alerts.push({
        severity: "error",
        type: "equipment",
        title: `Damaged asset: ${asset.name} (${asset.assetTag})`,
        detail: `Reported damaged/missing. Maintenance or replacement required.`,
      });
    }

    if (issuesCount > 0) {
      alerts.push({
        severity: "warning",
        type: "issue",
        title: `${issuesCount} open operational issues`,
        detail: "Vehicle, safety, or inventory incidents require resolution in your region",
      });
    }

    const payload = {
      region: {
        id: region?.id || regionId,
        name: region?.name || "Assigned Region",
        state: region?.State?.name || "Regional State",
        adminName: adminUser?.name || "Regional Administrator",
        adminEmail: adminUser?.email,
      },
      kpis: {
        totalSchools: schoolsCount,
        activeBuses: activeBusesCount,
        maintenanceBuses: maintenanceBusesCount,
        totalBuses: buses.length,
        totalStaff: staffCount,
        activeStaff: activeStaffCount,
        studentsReached: studentsCount,
        todayVisits: todayVisitsCount,
        upcomingVisits: upcomingVisitsCount,
        completedVisits: completedVisitsCount,
        scheduledVisits: scheduledVisitsCount,
        pendingReviews: pendingReviewsCount,
        consumablesAvailable: totalConsumablesUnits,
        consumablesItemsCount: consumables.length,
        equipmentTotal: equipment.length,
        equipmentAvailable: availableEquipment.length,
        equipmentAllocated: allocatedEquipment.length,
        equipmentDamaged: damagedEquipment.length,
        equipmentMaintenance: maintenanceEquipment.length,
        lowStockCount: lowStockConsumables.length,
        expiredConsumablesCount: expiredConsumables.length,
        pendingAllocationsCount,
        operationalIssues: issuesCount,
        districts: districtsCount,
        blocks: blocksCount,
      },
      labs: buses.map((b) => ({
        id: b.id,
        busCode: b.busCode,
        registrationNumber: b.registrationNumber,
        status: b.status,
        currentLat: b.currentLat,
        currentLng: b.currentLng,
        driverName: b.User?.name || "Unassigned",
        equipmentCount: b.Equipment?.length || 0,
        lastMaintenance: b.BusMaintenanceRecord?.[0]?.serviceDate || null,
      })),
      alerts,
      recentActivity: regionalActivity,
      generatedAt: new Date().toISOString(),
    };

    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 2. SCHOOL MANAGEMENT (Section 4.2)
// =========================================================================

/**
 * Register a new school independently within assigned region
 */
regionalAdminRouter.post("/schools", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const schema = z.object({
    name: z.string().min(2, "School name is required"),
    udiseCode: z.string().min(3, "UDISE code is required"),
    address: z.string().min(3, "Address is required"),
    districtId: z.string().min(1, "District is required"),
    blockId: z.string().min(1, "Block is required"),
    latitude: z.coerce.number().default(0.0),
    longitude: z.coerce.number().default(0.0),
    principalName: z.string().optional().nullable(),
    contactPhone: z.string().default("0000000000"),
    totalStudents: z.coerce.number().int().min(0).default(0),
    hasScienceLab: z.boolean().default(false),
    hasElectricity: z.boolean().default(true),
    hasInternet: z.boolean().default(false),
    priorityCategory: z.enum(["HIGH_OUTREACH", "MEDIUM_PRIORITY", "STANDARD"]).default("STANDARD"),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed: " + parsed.error.issues.map((i) => i.message).join(", "),
    });
  }

  // Verify district belongs to this region
  const district = await prisma.district.findFirst({
    where: { id: parsed.data.districtId, regionId },
  });
  if (!district) {
    return res.status(400).json({ message: "Selected district must belong to your assigned region." });
  }

  // Verify block belongs to this district
  const block = await prisma.block.findFirst({
    where: { id: parsed.data.blockId, districtId: district.id },
  });
  if (!block) {
    return res.status(400).json({ message: "Selected block must belong to the selected district." });
  }

  // Check unique UDISE code
  const existing = await prisma.school.findUnique({
    where: { udiseCode: parsed.data.udiseCode },
  });
  if (existing) {
    return res.status(409).json({ message: `School with UDISE code '${parsed.data.udiseCode}' already exists.` });
  }

  try {
    const school = await prisma.school.create({
      data: {
        id: "sch-" + crypto.randomUUID().slice(0, 8),
        ...parsed.data,
        regionId,
      },
      include: {
        District: { select: { id: true, name: true } },
        Block: { select: { id: true, name: true } },
      },
    });

    await writeAudit(req, "CREATE_SCHOOL", "School", school.id, {
      schoolName: school.name,
      udiseCode: school.udiseCode,
      regionId,
    });

    return res.status(201).json(school);
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to register school" });
  }
});

/**
 * Update school details
 */
regionalAdminRouter.patch("/schools/:id", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const schoolId = String(req.params.id);

  const existing = await prisma.school.findFirst({
    where: { id: schoolId, regionId },
  });
  if (!existing) {
    return res.status(404).json({ message: "School not found in your assigned region." });
  }

  const schema = z.object({
    name: z.string().min(2).optional(),
    address: z.string().min(3).optional(),
    principalName: z.string().nullable().optional(),
    contactPhone: z.string().optional(),
    totalStudents: z.coerce.number().int().min(0).optional(),
    hasScienceLab: z.boolean().optional(),
    hasElectricity: z.boolean().optional(),
    hasInternet: z.boolean().optional(),
    priorityCategory: z.enum(["HIGH_OUTREACH", "MEDIUM_PRIORITY", "STANDARD"]).optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed: " + parsed.error.issues.map((i) => i.message).join(", "),
    });
  }

  try {
    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: parsed.data,
      include: {
        District: { select: { id: true, name: true } },
        Block: { select: { id: true, name: true } },
      },
    });

    await writeAudit(req, "UPDATE_SCHOOL", "School", schoolId, {
      updatedFields: Object.keys(parsed.data),
      regionId,
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to update school" });
  }
});

/**
 * Get full school profile (visits history, allocated inventory with physical custody)
 */
regionalAdminRouter.get("/schools/:id/profile", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const schoolId = String(req.params.id);

  const school = await prisma.school.findFirst({
    where: { id: schoolId, regionId },
    include: {
      District: { select: { id: true, name: true } },
      Block: { select: { id: true, name: true } },
      SchoolRegistration: { orderBy: { createdAt: "desc" }, take: 10 },
      Event: {
        orderBy: { eventDate: "desc" },
        include: {
          Bus: { select: { id: true, busCode: true, registrationNumber: true } },
          EventsOnCommunicator: { include: { User: { select: { id: true, name: true, email: true } } } },
          ExperimentSession: { include: { Experiment: { select: { id: true, title: true, subject: true } } } },
          _count: { select: { EventAttendance: true } },
        },
      },
    },
  });

  if (!school) {
    return res.status(404).json({ message: "School not found in your assigned region." });
  }

  // Fetch school inventory allocations (Section 7: Logical school balance vs physical custody on bus)
  const schoolAllocations = await prisma.inventoryTransaction.findMany({
    where: {
      referenceId: schoolId,
      referenceType: "SCHOOL_ALLOCATION",
    },
    include: {
      consumable: true,
      bus: { select: { id: true, busCode: true, registrationNumber: true } },
      performedBy: { select: { id: true, name: true } },
    },
    orderBy: { timestamp: "desc" },
  });

  const parsedAllocations = schoolAllocations.map((tx) => {
    let meta: any = {};
    try {
      meta = JSON.parse(tx.notes || "{}");
    } catch {
      meta = { rawNotes: tx.notes };
    }
    return {
      id: tx.id,
      itemType: meta.itemType || "CONSUMABLE",
      itemName: tx.consumable?.name || meta.equipmentName || "Item",
      quantity: tx.quantity,
      unit: tx.consumable?.unitMetric || meta.unit || "units",
      allocatedToSchool: school.name,
      physicalLocationBus: tx.bus ? `${tx.bus.busCode || tx.bus.registrationNumber}` : meta.currentLocationType || "Depot",
      busId: tx.busId,
      custodianName: meta.custodianName || "Assigned Field Staff",
      purpose: meta.purpose || "STEM Curriculum",
      allocatedAt: tx.timestamp,
      status: "IN_BUS_CUSTODY",
    };
  });

  return res.json({
    school,
    allocatedInventory: parsedAllocations,
    stats: {
      totalVisits: school.Event.length,
      completedVisits: school.Event.filter((e) => e.status === "COMPLETED").length,
      upcomingVisits: school.Event.filter((e) => new Date(e.eventDate) >= new Date()).length,
      totalAllocatedItems: parsedAllocations.length,
    },
  });
});

// =========================================================================
// 3. FIELD STAFF MANAGEMENT (Section 4.4)
// =========================================================================

/**
 * Register a new Field Staff account auto-scoped to this region
 */
regionalAdminRouter.post("/staff", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const schema = z.object({
    name: z.string().min(2, "Full name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().optional().default(""),
    password: z.string().min(6, "Password must be at least 6 characters"),
    busId: z.string().optional().nullable(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed: " + parsed.error.issues.map((i) => i.message).join(", "),
    });
  }

  const { name, email, phone, password, busId } = parsed.data;

  // Check unique email
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ message: `User with email '${email}' already exists.` });
  }

  // If bus specified, verify it belongs to region
  let targetBus: any = null;
  if (busId) {
    targetBus = await prisma.bus.findFirst({ where: { id: busId, regionId } });
    if (!targetBus) {
      return res.status(400).json({ message: "Selected bus must belong to your assigned region." });
    }
  }

  try {
    const passwordHash = await hashPassword(password);
    const userId = "usr-" + crypto.randomUUID().slice(0, 8);

    const newUser = await prisma.user.create({
      data: {
        id: userId,
        email,
        name,
        fullName: name,
        phone,
        passwordHash,
        regionId,
        roleEnum: "SCIENCE_COMMUNICATOR",
        status: "ACTIVE",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        fullName: true,
        email: true,
        phone: true,
        regionId: true,
        roleEnum: true,
        status: true,
        isActive: true,
        createdAt: true,
      },
    });

    // If bus provided, add to multi-staff bus roster
    if (targetBus) {
      const roster = await getBusStaffRoster(targetBus.id);
      roster.push({
        staffId: newUser.id,
        staffName: newUser.name || name,
        role: targetBus.driverId ? "SUPPORTING" : "PRIMARY",
        assignedAt: new Date().toISOString(),
      });
      await setBusStaffRoster(targetBus.id, roster);

      if (!targetBus.driverId) {
        await prisma.bus.update({
          where: { id: targetBus.id },
          data: { driverId: newUser.id },
        });
      }
    }

    await writeAudit(req, "CREATE_FIELD_STAFF", "User", newUser.id, {
      name: newUser.name,
      email: newUser.email,
      assignedBusId: busId || null,
      regionId,
    });

    return res.status(201).json(newUser);
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to create field staff account" });
  }
});

/**
 * Update field staff details
 */
regionalAdminRouter.patch("/staff/:id", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const staffId = String(req.params.id);

  const staff = await prisma.user.findFirst({
    where: { id: staffId, regionId, roleEnum: "SCIENCE_COMMUNICATOR" },
  });
  if (!staff) {
    return res.status(404).json({ message: "Field staff not found in your region." });
  }

  const schema = z.object({
    name: z.string().min(2).optional(),
    fullName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    isActive: z.boolean().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
    busId: z.string().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed: " + parsed.error.issues.map((i) => i.message).join(", "),
    });
  }

  try {
    const dataToUpdate: any = {};
    if (parsed.data.name) {
      dataToUpdate.name = parsed.data.name;
      dataToUpdate.fullName = parsed.data.fullName || parsed.data.name;
    }
    if (parsed.data.phone !== undefined) dataToUpdate.phone = parsed.data.phone;
    if (parsed.data.email) dataToUpdate.email = parsed.data.email;
    if (parsed.data.isActive !== undefined) dataToUpdate.isActive = parsed.data.isActive;
    if (parsed.data.status) dataToUpdate.status = parsed.data.status;

    const updated = await prisma.user.update({
      where: { id: staffId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        fullName: true,
        email: true,
        phone: true,
        roleEnum: true,
        status: true,
        isActive: true,
      },
    });

    // Handle bus assignment if provided
    if (parsed.data.busId !== undefined) {
      if (parsed.data.busId) {
        const bus = await prisma.bus.findFirst({ where: { id: parsed.data.busId, regionId } });
        if (bus) {
          const roster = await getBusStaffRoster(bus.id);
          if (!roster.some((r) => r.staffId === staffId)) {
            roster.push({
              staffId,
              staffName: updated.name || "Staff",
              role: bus.driverId ? "SUPPORTING" : "PRIMARY",
              assignedAt: new Date().toISOString(),
            });
            await setBusStaffRoster(bus.id, roster);
          }
          if (!bus.driverId) {
            await prisma.bus.update({ where: { id: bus.id }, data: { driverId: staffId } });
          }
        }
      }
    }

    await writeAudit(req, "UPDATE_FIELD_STAFF", "User", staffId, {
      updatedFields: Object.keys(dataToUpdate),
      regionId,
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to update staff account" });
  }
});

/**
 * Reset Field Staff password
 */
regionalAdminRouter.post("/staff/:id/reset-password", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const staffId = String(req.params.id);

  const staff = await prisma.user.findFirst({
    where: { id: staffId, regionId, roleEnum: "SCIENCE_COMMUNICATOR" },
  });
  if (!staff) {
    return res.status(404).json({ message: "Field staff not found in your assigned region." });
  }

  const schema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.user.update({
      where: { id: staffId },
      data: { passwordHash },
    });

    await writeAudit(req, "RESET_STAFF_PASSWORD", "User", staffId, { regionId });
    return res.json({ message: `Password reset successfully for ${staff.name || staff.email}.` });
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to reset password" });
  }
});

/**
 * Get Field Staff history and performance
 */
regionalAdminRouter.get("/staff/:id/history", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const staffId = String(req.params.id);

  const staff = await prisma.user.findFirst({
    where: { id: staffId, regionId, roleEnum: "SCIENCE_COMMUNICATOR" },
    select: { id: true, name: true, fullName: true, email: true, phone: true, status: true, isActive: true },
  });
  if (!staff) {
    return res.status(404).json({ message: "Field staff not found." });
  }

  const [events, attendanceCount, consumptionCount, issues] = await Promise.all([
    prisma.event.findMany({
      where: {
        School: { regionId },
        EventsOnCommunicator: { some: { userId: staffId } },
      },
      include: {
        School: { select: { id: true, name: true } },
        Bus: { select: { id: true, busCode: true, registrationNumber: true } },
      },
      orderBy: { eventDate: "desc" },
      take: 50,
    }),
    prisma.eventAttendance.count({
      where: {
        Event: { EventsOnCommunicator: { some: { userId: staffId } } },
      },
    }),
    prisma.inventoryTransaction.count({
      where: { performedById: staffId },
    }),
    prisma.operationalIssue.findMany({
      where: { reportedById: staffId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return res.json({
    staff,
    events,
    stats: {
      totalVisitsAssigned: events.length,
      completedVisits: events.filter((e) => e.status === "COMPLETED").length,
      studentsAttended: attendanceCount,
      consumablesRecorded: consumptionCount,
      issuesReported: issues.length,
    },
    issues,
  });
});

// =========================================================================
// 4. BUS FLEET & MULTI-STAFF ASSIGNMENT (Section 4.3)
// =========================================================================

/**
 * List regional buses with multi-staff roster and maintenance
 */
regionalAdminRouter.get("/buses", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);

  const buses = await prisma.bus.findMany({
    where: { regionId },
    include: {
      User: { select: { id: true, name: true, email: true, phone: true } },
      BusMaintenanceRecord: { orderBy: { serviceDate: "desc" }, take: 3 },
      Equipment: {
        select: { id: true, assetTag: true, name: true, category: true, status: true },
      },
      Event: {
        where: { eventDate: { gte: new Date() } },
        take: 3,
        select: { id: true, eventCode: true, eventDate: true, School: { select: { name: true } } },
      },
    },
    orderBy: { registrationNumber: "asc" },
  });

  const enrichedBuses = await Promise.all(
    buses.map(async (bus) => {
      const roster = await getBusStaffRoster(bus.id);
      return {
        ...bus,
        primaryStaff: bus.User,
        assignedStaffRoster: roster,
        staffCount: Math.max(roster.length, bus.driverId ? 1 : 0),
      };
    })
  );

  return res.json({ rows: enrichedBuses, regionId });
});

/**
 * Assign a staff member to bus roster (supports multiple staff per bus)
 */
regionalAdminRouter.post("/buses/:id/staff", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const busId = String(req.params.id);

  const bus = await prisma.bus.findFirst({ where: { id: busId, regionId } });
  if (!bus) {
    return res.status(404).json({ message: "Bus not found in your assigned region." });
  }

  const schema = z.object({
    staffId: z.string().min(1, "Staff member must be selected"),
    role: z.enum(["PRIMARY", "SUPPORTING"]).default("SUPPORTING"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const staff = await prisma.user.findFirst({
    where: { id: parsed.data.staffId, regionId, roleEnum: "SCIENCE_COMMUNICATOR" },
  });
  if (!staff) {
    return res.status(400).json({ message: "Staff member must belong to your assigned region." });
  }

  const roster = await getBusStaffRoster(busId);
  const existingIndex = roster.findIndex((r) => r.staffId === staff.id);
  if (existingIndex >= 0) {
    roster[existingIndex].role = parsed.data.role;
  } else {
    roster.push({
      staffId: staff.id,
      staffName: staff.name || staff.fullName || "Staff",
      role: parsed.data.role,
      assignedAt: new Date().toISOString(),
    });
  }

  await setBusStaffRoster(busId, roster);

  // If role is primary, set bus driverId
  if (parsed.data.role === "PRIMARY" || !bus.driverId) {
    await prisma.bus.update({
      where: { id: busId },
      data: { driverId: staff.id },
    });
  }

  await writeAudit(req, "ASSIGN_BUS_STAFF", "Bus", busId, {
    staffId: staff.id,
    staffName: staff.name,
    role: parsed.data.role,
    busCode: bus.busCode,
    regionId,
  });

  return res.json({ message: `Assigned ${staff.name} to ${bus.busCode || bus.registrationNumber}`, roster });
});

/**
 * Remove a staff member from bus roster
 */
regionalAdminRouter.delete("/buses/:id/staff/:staffId", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const busId = String(req.params.id);
  const staffId = String(req.params.staffId);

  const bus = await prisma.bus.findFirst({ where: { id: busId, regionId } });
  if (!bus) {
    return res.status(404).json({ message: "Bus not found." });
  }

  let roster = await getBusStaffRoster(busId);
  roster = roster.filter((r) => r.staffId !== staffId);
  await setBusStaffRoster(busId, roster);

  if (bus.driverId === staffId) {
    const nextPrimary = roster.find((r) => r.role === "PRIMARY") || roster[0];
    await prisma.bus.update({
      where: { id: busId },
      data: { driverId: nextPrimary ? nextPrimary.staffId : null },
    });
  }

  await writeAudit(req, "UNASSIGN_BUS_STAFF", "Bus", busId, { staffId, regionId });
  return res.json({ message: "Staff removed from bus roster", roster });
});

/**
 * Update bus operational status or maintenance
 */
regionalAdminRouter.patch("/buses/:id", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const busId = String(req.params.id);

  const bus = await prisma.bus.findFirst({ where: { id: busId, regionId } });
  if (!bus) {
    return res.status(404).json({ message: "Bus not found in your region." });
  }

  const schema = z.object({
    status: z.enum(["AVAILABLE", "ON_ROUTE", "AT_SCHOOL", "UNDER_MAINTENANCE", "EMERGENCY"]).optional(),
    busCode: z.string().optional(),
    seatingCapacity: z.coerce.number().optional(),
    serviceDate: z.string().optional().nullable(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  try {
    const dataToUpdate: any = {};
    if (parsed.data.status) dataToUpdate.status = parsed.data.status;
    if (parsed.data.busCode) dataToUpdate.busCode = parsed.data.busCode;
    if (parsed.data.seatingCapacity) dataToUpdate.seatingCapacity = parsed.data.seatingCapacity;
    if (parsed.data.serviceDate !== undefined) {
      dataToUpdate.serviceDate = parsed.data.serviceDate ? new Date(parsed.data.serviceDate) : null;
    }

    const updated = await prisma.bus.update({
      where: { id: busId },
      data: dataToUpdate,
    });

    await writeAudit(req, "UPDATE_BUS", "Bus", busId, { updatedFields: Object.keys(dataToUpdate), regionId });
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to update bus" });
  }
});

/**
 * Log maintenance record for a bus
 */
regionalAdminRouter.post("/buses/:id/maintenance", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const busId = String(req.params.id);

  const bus = await prisma.bus.findFirst({ where: { id: busId, regionId } });
  if (!bus) {
    return res.status(404).json({ message: "Bus not found." });
  }

  const schema = z.object({
    serviceType: z.enum(["TYRE", "BATTERY", "ENGINE", "GPS", "GENERAL_SERVICING"]).default("GENERAL_SERVICING"),
    costAmount: z.coerce.number().min(0).default(0),
    serviceDate: z.string().default(new Date().toISOString()),
    nextDueDate: z.string().optional(),
    remarks: z.string().optional(),
    setMaintenanceStatus: z.boolean().default(false),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  try {
    const sDate = new Date(parsed.data.serviceDate);
    const nDate = parsed.data.nextDueDate ? new Date(parsed.data.nextDueDate) : new Date(sDate.getTime() + 90 * 86400000);

    const record = await prisma.busMaintenanceRecord.create({
      data: {
        id: "maint-" + crypto.randomUUID().slice(0, 8),
        busId,
        serviceType: parsed.data.serviceType,
        costAmount: parsed.data.costAmount,
        serviceDate: sDate,
        nextDueDate: nDate,
        remarks: parsed.data.remarks || null,
      },
    });

    if (parsed.data.setMaintenanceStatus) {
      await prisma.bus.update({
        where: { id: busId },
        data: { status: "UNDER_MAINTENANCE", serviceDate: sDate },
      });
    }

    await writeAudit(req, "LOG_BUS_MAINTENANCE", "BusMaintenanceRecord", record.id, {
      busId,
      costAmount: parsed.data.costAmount,
      serviceType: parsed.data.serviceType,
      regionId,
    });

    return res.status(201).json(record);
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to record maintenance" });
  }
});

// =========================================================================
// 5. INVENTORY ALLOCATIONS & TRANSFERS (Section 6 & 7)
// =========================================================================

/**
 * List central transfers dispatched from HQ to this region
 */
regionalAdminRouter.get("/inventory/central-transfers", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);

  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      referenceId: regionId,
      referenceType: { startsWith: "ALLOCATION" },
    },
    include: {
      consumable: { select: { id: true, name: true, category: true, unitMetric: true } },
      performedBy: { select: { id: true, name: true } },
    },
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  const transfers = transactions.map((t) => {
    let meta: any = {};
    try {
      meta = JSON.parse(t.notes || "{}");
    } catch {
      meta = { rawNotes: t.notes };
    }

    const status = t.referenceType?.replace("ALLOCATION_", "") || "PENDING";

    return {
      id: t.id,
      allocationNumber: meta.allocationNumber || `ALC-${t.id.slice(0, 8)}`,
      status, // PENDING, DISPATCHED, RECEIVED
      itemType: meta.itemType || "CONSUMABLE",
      itemName: t.consumable?.name || meta.equipmentName || meta.consumableName || "Inventory Item",
      consumableId: t.consumableId,
      equipmentId: meta.equipmentId || null,
      assetTag: meta.assetTag || null,
      quantity: t.quantity,
      unit: t.consumable?.unitMetric || meta.unit || "units",
      carrierName: meta.carrierName || "SciMove Logistics",
      trackingNumber: meta.trackingNumber || null,
      dispatchedAt: meta.dispatchedAt || null,
      receivedAt: meta.receivedAt || null,
      createdAt: t.timestamp,
      notes: meta.userNotes || meta.rawNotes || "",
    };
  });

  return res.json({ rows: transfers, regionId });
});

/**
 * Regional Admin confirms receipt of dispatched central stock
 */
regionalAdminRouter.post("/inventory/central-transfers/:id/receive", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const transferId = String(req.params.id);

  const transaction = await prisma.inventoryTransaction.findFirst({
    where: {
      id: transferId,
      referenceId: regionId,
    },
    include: { consumable: true },
  });

  if (!transaction) {
    return res.status(404).json({ message: "Stock allocation transfer not found for your region." });
  }

  if (transaction.referenceType !== "ALLOCATION_DISPATCHED") {
    return res.status(400).json({
      message: `Cannot confirm receipt for allocation in '${transaction.referenceType}' status. Stock must be DISPATCHED from HQ first.`,
    });
  }

  let meta: any = {};
  try {
    meta = JSON.parse(transaction.notes || "{}");
  } catch {
    meta = {};
  }

  meta.receivedAt = new Date().toISOString();
  meta.receivedByRegionalAdmin = req.userId;

  const region = await prisma.region.findUnique({ where: { id: regionId } });
  const regionName = region ? region.name : "Region";

  try {
    // If equipment asset, update equipment location and mark available at Regional Depot
    if (meta.itemType === "EQUIPMENT" && meta.equipmentId) {
      await prisma.equipment.update({
        where: { id: meta.equipmentId },
        data: {
          storageUnit: `Regional Depot (${regionName})`,
          status: "AVAILABLE",
        },
      });

      await prisma.equipmentMovement.create({
        data: {
          id: makeId(),
          equipmentId: meta.equipmentId,
          fromLocation: `In-Transit to ${regionName}`,
          toLocation: `Regional Depot (${regionName})`,
          movedById: req.userId!,
        },
      }).catch(() => undefined);
    }

    // Update allocation record
    const updated = await prisma.inventoryTransaction.update({
      where: { id: transferId },
      data: {
        referenceType: "ALLOCATION_RECEIVED",
        notes: JSON.stringify(meta),
      },
    });

    await writeAudit(req, "RECEIVE_CENTRAL_STOCK", "InventoryTransaction", transferId, {
      allocationNumber: meta.allocationNumber,
      itemType: meta.itemType,
      quantity: transaction.quantity,
      regionId,
    });

    return res.json({
      message: `Receipt confirmed for ${meta.allocationNumber || transferId}. Items added to regional depot inventory.`,
      transfer: updated,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to confirm receipt" });
  }
});

/**
 * Allocate inventory to a school (Section 7: School Logical Allocation with Physical Bus Custody)
 */
regionalAdminRouter.post("/inventory/allocate-school", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const schema = z.object({
    schoolId: z.string().min(1, "School is required"),
    busId: z.string().min(1, "Physical laboratory bus is required"),
    custodianId: z.string().optional().nullable(),
    itemType: z.enum(["CONSUMABLE", "EQUIPMENT"]).default("CONSUMABLE"),
    consumableId: z.string().optional(),
    equipmentId: z.string().optional(),
    quantity: z.coerce.number().positive().default(1),
    purpose: z.string().default("School STEM Education Lab"),
    notes: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { schoolId, busId, custodianId, itemType, consumableId, equipmentId, quantity, purpose, notes } = parsed.data;

  // Verify school and bus belong to region
  const [school, bus] = await Promise.all([
    prisma.school.findFirst({ where: { id: schoolId, regionId } }),
    prisma.bus.findFirst({ where: { id: busId, regionId } }),
  ]);

  if (!school || !bus) {
    return res.status(403).json({ message: "School and Bus must both belong to your assigned region." });
  }

  // Resolve custodian
  let custodianName = "Assigned Field Staff";
  if (custodianId) {
    const custodian = await prisma.user.findFirst({ where: { id: custodianId, regionId } });
    if (custodian) custodianName = custodian.name || custodian.email;
  } else if (bus.driverId) {
    const driver = await prisma.user.findUnique({ where: { id: bus.driverId } });
    if (driver) custodianName = driver.name || driver.email;
  }

  try {
    if (itemType === "CONSUMABLE") {
      if (!consumableId) {
        return res.status(400).json({ message: "Consumable item must be selected." });
      }

      const consumable = await prisma.consumable.findUnique({ where: { id: consumableId } });
      if (!consumable) {
        return res.status(404).json({ message: "Consumable not found." });
      }

      const meta = {
        allocatedToType: "SCHOOL",
        allocatedToId: school.id,
        schoolName: school.name,
        currentLocationType: "BUS",
        currentLocationId: bus.id,
        busCode: bus.busCode || bus.registrationNumber,
        custodianId: custodianId || bus.driverId || null,
        custodianName,
        purpose,
        userNotes: notes || "",
        allocatedAt: new Date().toISOString(),
      };

      const tx = await prisma.inventoryTransaction.create({
        data: {
          id: makeId(),
          consumableId,
          busId: bus.id, // PHYSICAL STORAGE IS ON THE BUS
          quantity,
          type: "TRANSFER",
          referenceType: "SCHOOL_ALLOCATION",
          referenceId: school.id, // LOGICAL BENEFICIARY IS THE SCHOOL
          performedById: req.userId,
          notes: JSON.stringify(meta),
        },
        include: { consumable: true, bus: true },
      });

      await writeAudit(req, "ALLOCATE_SCHOOL_INVENTORY", "InventoryTransaction", tx.id, {
        schoolId: school.id,
        schoolName: school.name,
        busId: bus.id,
        consumableName: consumable.name,
        quantity,
        regionId,
      });

      return res.status(201).json({
        message: `Allocated ${quantity} ${consumable.unitMetric} of ${consumable.name} to ${school.name} (stored in custody on ${bus.busCode || bus.registrationNumber}).`,
        allocation: tx,
      });
    } else {
      // Equipment allocation
      if (!equipmentId) {
        return res.status(400).json({ message: "Equipment asset must be selected." });
      }

      const eq = await prisma.equipment.findUnique({ where: { id: equipmentId } });
      if (!eq) {
        return res.status(404).json({ message: "Equipment asset not found." });
      }

      // Update equipment to bus storage with school tag
      const updatedEq = await prisma.equipment.update({
        where: { id: equipmentId },
        data: {
          busId: bus.id,
          status: "ASSIGNED_TO_BUS",
          storageUnit: `Bus ${bus.busCode || bus.registrationNumber} (Allocated for ${school.name})`,
        },
      });

      await prisma.equipmentMovement.create({
        data: {
          id: makeId(),
          equipmentId,
          fromLocation: eq.storageUnit || "Regional Depot",
          toLocation: `Bus ${bus.busCode || bus.registrationNumber} (Custody for ${school.name})`,
          movedById: req.userId!,
        },
      }).catch(() => undefined);

      await writeAudit(req, "ALLOCATE_SCHOOL_EQUIPMENT", "Equipment", equipmentId, {
        schoolId: school.id,
        schoolName: school.name,
        busId: bus.id,
        assetTag: eq.assetTag,
        regionId,
      });

      return res.status(201).json({
        message: `Allocated equipment ${eq.name} (${eq.assetTag}) to ${school.name} (onboard ${bus.busCode || bus.registrationNumber}).`,
        equipment: updatedEq,
      });
    }
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to allocate inventory" });
  }
});

/**
 * List all regional allocations (school and bus allocations)
 */
regionalAdminRouter.get("/inventory/allocations", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);

  const [transactions, schools, buses] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where: {
        OR: [
          { referenceType: "SCHOOL_ALLOCATION" },
          { bus: { regionId } },
        ],
      },
      include: {
        consumable: true,
        bus: { select: { id: true, busCode: true, registrationNumber: true } },
        performedBy: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: "desc" },
      take: 100,
    }),
    prisma.school.findMany({ where: { regionId }, select: { id: true, name: true } }),
    prisma.bus.findMany({ where: { regionId }, select: { id: true, busCode: true, registrationNumber: true } }),
  ]);

  const schoolMap = new Map(schools.map((s) => [s.id, s.name]));

  const rows = transactions.map((tx) => {
    let meta: any = {};
    try {
      meta = JSON.parse(tx.notes || "{}");
    } catch {
      meta = { userNotes: tx.notes };
    }

    const schoolName = meta.schoolName || schoolMap.get(tx.referenceId || "") || null;
    const isSchoolAlloc = tx.referenceType === "SCHOOL_ALLOCATION" || Boolean(schoolName);

    return {
      id: tx.id,
      allocationType: isSchoolAlloc ? "SCHOOL" : "BUS",
      beneficiary: isSchoolAlloc ? schoolName || "School" : tx.bus?.busCode || "Bus",
      physicalLocation: tx.bus ? `${tx.bus.busCode || tx.bus.registrationNumber}` : "Depot",
      custodian: meta.custodianName || "Field Staff",
      itemName: tx.consumable?.name || meta.equipmentName || "Item",
      quantity: tx.quantity,
      unit: tx.consumable?.unitMetric || meta.unit || "units",
      purpose: meta.purpose || "STEM Operations",
      allocatedAt: tx.timestamp,
      performedByName: tx.performedBy?.name || "Regional Admin",
    };
  });

  return res.json({ rows, schools, buses, regionId });
});

// =========================================================================
// 6. SCHOOL VISIT SCHEDULING & CONFLICT VALIDATION (Section 8)
// =========================================================================

/**
 * Pre-flight check for scheduling conflicts (Bus or Field Staff availability)
 */
regionalAdminRouter.post("/schedules/check-conflict", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const schema = z.object({
    eventDate: z.string().min(1, "Date is required"),
    busId: z.string().min(1, "Bus is required"),
    staffUserIds: z.array(z.string()).default([]),
    excludeEventId: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { eventDate, busId, staffUserIds, excludeEventId } = parsed.data;

  const date = new Date(eventDate);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  // 1. Bus Conflict Check
  const busConflict = await prisma.event.findFirst({
    where: {
      busId,
      eventDate: { gte: dayStart, lt: dayEnd },
      status: { notIn: ["CANCELLED"] },
      ...(excludeEventId ? { id: { not: excludeEventId } } : {}),
    },
    include: {
      School: { select: { name: true } },
      Bus: { select: { busCode: true, registrationNumber: true } },
    },
  });

  // 2. Staff Conflict Check
  const staffConflicts: Array<{ staffId: string; staffName: string; conflictingEvent: string }> = [];
  if (staffUserIds.length > 0) {
    const existingAssignments = await prisma.eventsOnCommunicator.findMany({
      where: {
        userId: { in: staffUserIds },
        Event: {
          eventDate: { gte: dayStart, lt: dayEnd },
          status: { notIn: ["CANCELLED"] },
          ...(excludeEventId ? { id: { not: excludeEventId } } : {}),
        },
      },
      include: {
        User: { select: { id: true, name: true } },
        Event: { include: { School: { select: { name: true } } } },
      },
    });

    for (const ea of existingAssignments) {
      staffConflicts.push({
        staffId: ea.userId,
        staffName: ea.User?.name || "Staff",
        conflictingEvent: `${ea.Event.eventCode} at ${ea.Event.School?.name || "School"}`,
      });
    }
  }

  const hasConflict = Boolean(busConflict) || staffConflicts.length > 0;

  return res.json({
    hasConflict,
    busConflict: busConflict
      ? `Bus ${busConflict.Bus?.busCode || busConflict.Bus?.registrationNumber} is already scheduled at ${busConflict.School?.name} (${busConflict.startTime}-${busConflict.endTime})`
      : null,
    staffConflicts,
  });
});

/**
 * Schedule a new school visit with multi-staff assignment & conflict validation
 */
regionalAdminRouter.post("/schedules", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const schema = z.object({
    schoolId: z.string().min(1, "School is required"),
    busId: z.string().min(1, "Bus is required"),
    eventDate: z.string().min(1, "Date is required"),
    startTime: z.string().default("09:00"),
    endTime: z.string().default("15:00"),
    expectedStudentCount: z.coerce.number().int().min(1).default(50),
    staffUserIds: z.array(z.string()).default([]),
    topics: z.array(z.string()).optional(),
    force: z.boolean().default(false),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { schoolId, busId, eventDate, startTime, endTime, expectedStudentCount, staffUserIds, force } = parsed.data;

  // Validate regional ownership
  const [school, bus] = await Promise.all([
    prisma.school.findFirst({ where: { id: schoolId, regionId } }),
    prisma.bus.findFirst({ where: { id: busId, regionId } }),
  ]);

  if (!school || !bus) {
    return res.status(403).json({ message: "School and Lab Bus must both belong to your region." });
  }

  // Conflict validation
  const date = new Date(eventDate);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  if (!force) {
    const busConflict = await prisma.event.findFirst({
      where: {
        busId,
        eventDate: { gte: dayStart, lt: dayEnd },
        status: { notIn: ["CANCELLED"] },
      },
      include: { School: { select: { name: true } } },
    });

    if (busConflict) {
      return res.status(409).json({
        message: `Scheduling conflict: Bus is already scheduled at '${busConflict.School?.name}' on this date.`,
      });
    }

    if (staffUserIds.length > 0) {
      const staffConflict = await prisma.eventsOnCommunicator.findFirst({
        where: {
          userId: { in: staffUserIds },
          Event: {
            eventDate: { gte: dayStart, lt: dayEnd },
            status: { notIn: ["CANCELLED"] },
          },
        },
        include: { User: { select: { name: true } }, Event: { include: { School: true } } },
      });

      if (staffConflict) {
        return res.status(409).json({
          message: `Scheduling conflict: Field Staff '${staffConflict.User?.name}' is already assigned to a visit at '${staffConflict.Event.School?.name}'.`,
        });
      }
    }
  }

  try {
    const eventCode = `EVT-${Date.now().toString().slice(-6)}`;
    const event = await prisma.event.create({
      data: {
        id: makeId(),
        eventCode,
        schoolId,
        busId,
        eventDate: date,
        startTime,
        endTime,
        expectedStudentCount,
        status: "SCHEDULED",
      },
      include: {
        School: true,
        Bus: true,
      },
    });

    // Assign multiple staff members
    if (staffUserIds.length > 0) {
      await Promise.all(
        staffUserIds.map((userId) =>
          prisma.eventsOnCommunicator.upsert({
            where: { eventId_userId: { eventId: event.id, userId } },
            update: {},
            create: { eventId: event.id, userId },
          })
        )
      );
    } else if (bus.driverId) {
      // Auto assign primary bus staff if no other staff selected
      await prisma.eventsOnCommunicator.upsert({
        where: { eventId_userId: { eventId: event.id, userId: bus.driverId } },
        update: {},
        create: { eventId: event.id, userId: bus.driverId },
      }).catch(() => undefined);
    }

    await writeAudit(req, "SCHEDULE_VISIT", "Event", event.id, {
      eventCode,
      schoolName: school.name,
      busCode: bus.busCode,
      staffCount: staffUserIds.length,
      regionId,
    });

    return res.status(201).json(event);
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to schedule visit" });
  }
});

/**
 * List all scheduled visits with schools, buses, and assigned staff
 */
regionalAdminRouter.get("/schedules", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);

  const events = await prisma.event.findMany({
    where: { School: { regionId } },
    include: {
      School: { select: { id: true, name: true, udiseCode: true, principalName: true, contactPhone: true } },
      Bus: { select: { id: true, busCode: true, registrationNumber: true } },
      EventsOnCommunicator: {
        include: { User: { select: { id: true, name: true, email: true, phone: true } } },
      },
      ExperimentSession: {
        include: { Experiment: { select: { id: true, title: true, subject: true } } },
      },
      _count: { select: { EventAttendance: true, FeedbackRecord: true } },
    },
    orderBy: { eventDate: "desc" },
    take: 100,
  });

  return res.json({ rows: events, regionId });
});

// =========================================================================
// 7. VISIT MONITORING & FIELD REPORT REVIEW WORKFLOW (Section 9)
// =========================================================================

/**
 * Get all visit reports requiring review or reviewed
 */
regionalAdminRouter.get("/reports/reviews", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);

  const events = await prisma.event.findMany({
    where: {
      School: { regionId },
      status: { in: ["COMPLETED", "ON_SITE", "SCHEDULED"] },
    },
    include: {
      School: { select: { id: true, name: true, udiseCode: true } },
      Bus: { select: { id: true, busCode: true, registrationNumber: true } },
      EventsOnCommunicator: { include: { User: { select: { id: true, name: true } } } },
      ExperimentSession: { select: { id: true, conductedBy: true, studentsParticipated: true } },
      FeedbackRecord: { orderBy: { id: "desc" } },
      _count: { select: { EventAttendance: true, ConsumableUsage: true } },
    },
    orderBy: { eventDate: "desc" },
    take: 100,
  });

  const reports = events.map((ev) => {
    let reviewStatus = ev.status === "COMPLETED" ? "SUBMITTED_FOR_REVIEW" : "IN_PROGRESS";
    let observations = "";
    let reviewComments = "";
    let reviewedAt: string | null = null;

    // Inspect feedback records for workflow transitions
    for (const fb of ev.FeedbackRecord) {
      try {
        const meta = JSON.parse(fb.comments || "{}");
        if (meta.reviewStatus) reviewStatus = meta.reviewStatus;
        if (meta.observations) observations = meta.observations;
        if (meta.reviewComments) reviewComments = meta.reviewComments;
        if (meta.reviewedAt) reviewedAt = meta.reviewedAt;
      } catch {
        // ignore
      }
    }

    return {
      eventId: ev.id,
      eventCode: ev.eventCode,
      eventDate: ev.eventDate,
      schoolName: ev.School?.name,
      busCode: ev.Bus?.busCode || ev.Bus?.registrationNumber,
      staffNames: ev.EventsOnCommunicator.map((e) => e.User?.name).filter(Boolean).join(", "),
      studentsParticipated: ev._count.EventAttendance || ev.expectedStudentCount,
      sessionsCount: ev.ExperimentSession.length,
      consumablesUsedCount: ev._count.ConsumableUsage,
      reviewStatus, // SUBMITTED_FOR_REVIEW, NEEDS_CORRECTION, REVIEWED, IN_PROGRESS
      observations,
      reviewComments,
      reviewedAt,
    };
  });

  return res.json({ rows: reports, regionId });
});

/**
 * Detailed report review packet for a specific event
 */
regionalAdminRouter.get("/reports/reviews/:eventId", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const eventId = String(req.params.eventId);

  const event = await prisma.event.findFirst({
    where: { id: eventId, School: { regionId } },
    include: {
      School: true,
      Bus: { include: { Equipment: true } },
      EventsOnCommunicator: { include: { User: { select: { id: true, name: true, email: true, phone: true } } } },
      ExperimentSession: { include: { Experiment: true } },
      ConsumableUsage: { include: { Consumable: true } },
      EventAttendance: { take: 50 },
      FeedbackRecord: { include: { User: { select: { id: true, name: true, roleEnum: true } } } },
      OperationalIssues: true,
    },
  });

  if (!event) {
    return res.status(404).json({ message: "Visit event not found in your region." });
  }

  let reviewStatus = event.status === "COMPLETED" ? "SUBMITTED_FOR_REVIEW" : "IN_PROGRESS";
  let observations = "";
  let reviewComments = "";

  for (const fb of event.FeedbackRecord) {
    try {
      const meta = JSON.parse(fb.comments || "{}");
      if (meta.reviewStatus) reviewStatus = meta.reviewStatus;
      if (meta.observations) observations = meta.observations;
      if (meta.reviewComments) reviewComments = meta.reviewComments;
    } catch {
      // ignore
    }
  }

  return res.json({
    event,
    reviewStatus,
    observations,
    reviewComments,
    attendanceCount: event.EventAttendance.length,
    sessions: event.ExperimentSession,
    consumablesUsed: event.ConsumableUsage,
    issues: event.OperationalIssues,
    feedbackHistory: event.FeedbackRecord,
  });
});

/**
 * Regional Admin approves report or requests corrections
 */
regionalAdminRouter.post("/reports/reviews/:eventId", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const eventId = String(req.params.eventId);

  const event = await prisma.event.findFirst({
    where: { id: eventId, School: { regionId } },
    include: { School: true },
  });

  if (!event) {
    return res.status(404).json({ message: "Visit event not found." });
  }

  const schema = z.object({
    action: z.enum(["APPROVE", "REQUEST_CORRECTION"]),
    comments: z.string().optional().default(""),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const isApproval = parsed.data.action === "APPROVE";
  const newStatus = isApproval ? "REVIEWED" : "NEEDS_CORRECTION";

  const reviewPayload = {
    reviewStatus: newStatus,
    reviewDecision: isApproval ? "APPROVED" : "CORRECTIONS_REQUESTED",
    reviewComments: parsed.data.comments || (isApproval ? "Report verified and approved." : "Corrections required."),
    reviewedBy: req.userId,
    reviewedAt: new Date().toISOString(),
  };

  try {
    await prisma.feedbackRecord.create({
      data: {
        id: makeId(),
        eventId: event.id,
        userId: req.userId!,
        userRole: "REGIONAL_ADMIN",
        rating: isApproval ? 5 : 3,
        comments: JSON.stringify(reviewPayload),
      },
    });

    await writeAudit(req, isApproval ? "APPROVE_FIELD_REPORT" : "REQUEST_REPORT_CORRECTIONS", "Event", event.id, {
      decision: reviewPayload.reviewDecision,
      comments: parsed.data.comments,
      schoolName: event.School?.name,
      regionId,
    });

    return res.json({
      message: isApproval
        ? `Field report for '${event.School?.name}' has been approved successfully.`
        : `Correction request sent back to Field Staff for '${event.School?.name}'.`,
      status: newStatus,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to process report review" });
  }
});

// =========================================================================
// 8. REGIONAL OPERATIONAL REPORTS & EXPORTS (Section 10)
// =========================================================================

/**
 * Consolidated dataset for all 9 regional reports
 */
regionalAdminRouter.get("/reports/data", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);

  const [schools, buses, staff, consumables, equipment, allocations, visits] = await Promise.all([
    prisma.school.findMany({
      where: { regionId },
      include: { District: { select: { name: true } }, Block: { select: { name: true } }, _count: { select: { Event: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.bus.findMany({
      where: { regionId },
      include: { User: { select: { name: true } }, _count: { select: { Equipment: true, Event: true } } },
      orderBy: { registrationNumber: "asc" },
    }),
    prisma.user.findMany({
      where: { regionId, roleEnum: "SCIENCE_COMMUNICATOR" },
      select: { id: true, name: true, fullName: true, email: true, phone: true, status: true, isActive: true, createdAt: true },
      orderBy: { name: "asc" },
    }),
    prisma.consumable.findMany({
      where: {
        InventoryTransaction: {
          some: {
            OR: [
              { bus: { regionId } },
              { referenceId: regionId, referenceType: { startsWith: "ALLOCATION" } },
            ],
          },
        },
      },
      include: {
        ConsumableUsage: { select: { qtyUsed: true } },
      },
    }),
    prisma.equipment.findMany({
      where: {
        OR: [
          { Bus: { regionId } },
          { storageUnit: { contains: regionId } },
        ],
      },
      include: { Bus: { select: { busCode: true, registrationNumber: true } } },
    }),
    prisma.inventoryTransaction.findMany({
      where: {
        OR: [
          { referenceId: regionId, referenceType: { startsWith: "ALLOCATION" } },
          { referenceType: "SCHOOL_ALLOCATION" },
          { bus: { regionId } },
        ],
      },
      include: {
        consumable: { select: { name: true, unitMetric: true } },
        bus: { select: { busCode: true } },
      },
      orderBy: { timestamp: "desc" },
      take: 100,
    }),
    prisma.event.findMany({
      where: { School: { regionId } },
      include: {
        School: { select: { name: true } },
        Bus: { select: { busCode: true } },
        _count: { select: { EventAttendance: true } },
      },
      orderBy: { eventDate: "desc" },
      take: 100,
    }),
  ]);

  return res.json({
    schools,
    buses,
    staff,
    consumables: consumables.map((c) => ({
      ...c,
      totalConsumed: c.ConsumableUsage.reduce((acc, u) => acc + u.qtyUsed, 0),
    })),
    equipment,
    allocations,
    visits,
    regionId,
  });
});

// =========================================================================
// 9. NOTIFICATIONS & ALERTS (Section 11)
// =========================================================================

/**
 * Consolidated operational alerts and notifications
 */
regionalAdminRouter.get("/notifications", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 86400000);

  const [lowStock, pendingTransfers, upcomingVisits, pendingReviews, damagedAssets] = await Promise.all([
    prisma.consumable.findMany({
      where: {
        currentStock: { lte: 10 },
        InventoryTransaction: { some: { bus: { regionId } } },
      },
      take: 5,
    }),
    prisma.inventoryTransaction.findMany({
      where: {
        referenceId: regionId,
        referenceType: "ALLOCATION_DISPATCHED",
      },
      take: 5,
    }),
    prisma.event.findMany({
      where: {
        School: { regionId },
        eventDate: { gte: now, lte: next7Days },
      },
      include: { School: { select: { name: true } } },
      take: 5,
    }),
    prisma.feedbackRecord.findMany({
      where: {
        Event: { School: { regionId } },
        comments: { contains: "SUBMITTED_FOR_REVIEW" },
      },
      include: { Event: { include: { School: { select: { name: true } } } } },
      take: 5,
    }),
    prisma.equipment.findMany({
      where: {
        Bus: { regionId },
        status: { in: ["DAMAGED", "MISSING", "IN_MAINTENANCE"] },
      },
      take: 5,
    }),
  ]);

  const items = [
    ...pendingTransfers.map((t) => ({
      id: `trans-${t.id}`,
      type: "TRANSFER",
      severity: "info",
      title: "New Inventory Transfer Dispatched",
      detail: `HQ dispatched stock shipment. Physical verification and receipt required.`,
      timestamp: t.timestamp,
    })),
    ...pendingReviews.map((r) => ({
      id: `rev-${r.id}`,
      type: "REPORT",
      severity: "warning",
      title: "Field Visit Report Submitted",
      detail: `Report for '${r.Event?.School?.name || "School"}' requires review and sign-off.`,
      timestamp: r.Event?.eventDate || now,
    })),
    ...lowStock.map((l) => ({
      id: `stock-${l.id}`,
      type: "INVENTORY",
      severity: "warning",
      title: `Low Stock: ${l.name}`,
      detail: `Only ${l.currentStock} ${l.unitMetric} available. Request reorder from HQ.`,
      timestamp: now,
    })),
    ...damagedAssets.map((d) => ({
      id: `dam-${d.id}`,
      type: "EQUIPMENT",
      severity: "error",
      title: `Asset Requires Attention: ${d.name}`,
      detail: `Status is ${d.status}. Coordinate service or return.`,
      timestamp: now,
    })),
    ...upcomingVisits.map((v) => ({
      id: `vis-${v.id}`,
      type: "SCHEDULE",
      severity: "info",
      title: `Upcoming Visit: ${v.School?.name}`,
      detail: `Scheduled on ${new Date(v.eventDate).toLocaleDateString()} (${v.startTime} - ${v.endTime}).`,
      timestamp: v.eventDate,
    })),
  ];

  return res.json({ notifications: items, unreadCount: items.length });
});

// =========================================================================
// 10. GENERIC / LEGACY RESOURCE HANDLERS (for backwards compatibility)
// =========================================================================

regionalAdminRouter.get(["/resource/:resource", "/:resource"], async (req, res, next) => {
  const resource = String(req.params.resource);
  const delegateName = resourceMap[resource];

  if (!delegateName) {
    return next();
  }

  const take = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const search = String(req.query.search || "").trim();
  const regionId = getRegionId(res);
  const delegate = (prisma as any)[delegateName];

  const regionalWhere: Record<string, Record<string, any>> = {
    districts: { regionId },
    blocks: { District: { regionId } },
    schools: { regionId },
    staff: { regionId, roleEnum: "SCIENCE_COMMUNICATOR" },
    labs: { regionId },
    buses: { regionId },
    maintenance: { Bus: { regionId } },
    registrations: { School: { regionId } },
    experiments: {},
    equipment: {
      OR: [
        { Bus: { regionId } },
        { storageUnit: { contains: regionId } },
      ],
    },
    consumables: {
      InventoryTransaction: {
        some: {
          OR: [
            { bus: { regionId } },
            { referenceId: regionId, referenceType: { startsWith: "ALLOCATION" } },
          ],
        },
      },
    },
    inventory: { bus: { regionId } },
    visits: { School: { regionId } },
    schedules: { School: { regionId } },
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
    buses: ["busCode", "registrationNumber", "status"],
    maintenance: ["serviceType", "remarks"],
    registrations: ["status", "remarks"],
    experiments: ["title", "subject", "difficultyLevel"],
    equipment: ["assetTag", "name", "category"],
    consumables: ["name", "category"],
    visits: ["eventCode", "status"],
    schedules: ["eventCode", "status"],
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
    const hasCreatedAt = ["schools", "staff", "registrations", "routes", "issues", "curriculum"].includes(resource);
    const rows = await delegate.findMany({
      where,
      take,
      ...(hasCreatedAt ? { orderBy: { createdAt: "desc" } } : {}),
    });

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
 * CSV report export
 */
regionalAdminRouter.get("/reports/:resource.csv", async (req, res) => {
  const resource = String(req.params.resource);
  const delegateName = resourceMap[resource];

  if (!delegateName) {
    return res.status(404).send("Unknown report resource");
  }

  const regionId = getRegionId(res);
  const delegate = (prisma as any)[delegateName];

  try {
    const where: any = {};
    if (["schools", "staff", "buses", "labs", "issues"].includes(resource)) {
      where.regionId = regionId;
    }

    const rows = await delegate.findMany({ where, take: 500 });
    if (!rows.length) {
      return res.status(200).type("text/csv").send("No records found");
    }

    const headers = Object.keys(rows[0]).filter((k) => k !== "passwordHash");
    const csvLines = [headers.join(",")];

    for (const row of rows) {
      const line = headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvLines.push(line.join(","));
    }

    res.setHeader("Content-Disposition", `attachment; filename="${resource}-regional.csv"`);
    res.type("text/csv").send(csvLines.join("\n"));
  } catch (error: any) {
    res.status(500).send("Failed to export report: " + error?.message);
  }
});

// Consumable & Equipment registration / patches
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
      return res.status(400).json({ message: parsed.error.issues.map((i) => i.message).join(", ") });
    }

    try {
      const consumable = await prisma.consumable.create({
        data: {
          id: "con-" + crypto.randomUUID().slice(0, 8),
          name: parsed.data.name,
          category: parsed.data.category,
          currentStock: parsed.data.currentStock,
          minimumStock: parsed.data.minimumStock,
          unitMetric: parsed.data.unitMetric,
          expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
        },
      });

      if (parsed.data.currentStock > 0 && parsed.data.busId) {
        await prisma.inventoryTransaction.create({
          data: {
            consumableId: consumable.id,
            busId: parsed.data.busId,
            quantity: parsed.data.currentStock,
            type: "RECEIPT",
            notes: "Initial regional stock receipt",
            performedById: req.userId,
          },
        });
      }

      await writeAudit(req, "CREATE_CONSUMABLE", "Consumable", consumable.id, {
        name: consumable.name,
        regionId,
      });

      return res.status(201).json(consumable);
    } catch (error: any) {
      return res.status(400).json({ message: error?.message || "Failed to create consumable" });
    }
  }
);

regionalAdminRouter.post(
  ["/equipment", "/resource/equipment"],
  async (req: AuthenticatedRequest, res) => {
    const regionId = getRegionId(res);
    const schema = z.object({
      assetTag: z.string().min(1),
      name: z.string().min(1),
      category: z.string().min(1),
      busId: z.string().optional().nullable(),
      cost: z.coerce.number().min(0).default(0),
      purchaseDate: z.string().optional(),
      status: z.enum(["AVAILABLE", "ASSIGNED_TO_BUS", "IN_MAINTENANCE", "DAMAGED", "MISSING"]).default("AVAILABLE"),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues.map((i) => i.message).join(", ") });
    }

    try {
      const equipment = await prisma.equipment.create({
        data: {
          id: "eq-" + crypto.randomUUID().slice(0, 8),
          assetTag: parsed.data.assetTag,
          name: parsed.data.name,
          category: parsed.data.category,
          busId: parsed.data.busId || null,
          cost: parsed.data.cost,
          purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : new Date(),
          status: parsed.data.status,
          storageUnit: parsed.data.busId ? "Assigned to Bus" : "Regional Depot",
        },
      });

      await writeAudit(req, "CREATE_EQUIPMENT", "Equipment", equipment.id, {
        assetTag: equipment.assetTag,
        regionId,
      });

      return res.status(201).json(equipment);
    } catch (error: any) {
      return res.status(400).json({ message: error?.message || "Failed to create equipment" });
    }
  }
);

regionalAdminRouter.patch(
  ["/consumables/:id", "/resource/consumables/:id"],
  async (req: AuthenticatedRequest, res) => {
    const id = String(req.params.id);
    const schema = z.object({
      name: z.string().optional(),
      category: z.string().optional(),
      currentStock: z.coerce.number().min(0).optional(),
      minimumStock: z.coerce.number().min(0).optional(),
      unitMetric: z.string().optional(),
      expiryDate: z.string().optional().nullable(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues.map((i) => i.message).join(", ") });
    }

    try {
      const dataToUpdate: any = { ...parsed.data };
      if (parsed.data.expiryDate !== undefined) {
        dataToUpdate.expiryDate = parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null;
      }

      const updated = await prisma.consumable.update({
        where: { id },
        data: dataToUpdate,
      });

      await writeAudit(req, "UPDATE_CONSUMABLE", "Consumable", id, { updatedFields: Object.keys(dataToUpdate) });
      return res.json(updated);
    } catch (error: any) {
      return res.status(400).json({ message: error?.message || "Failed to update consumable" });
    }
  }
);

regionalAdminRouter.patch(
  ["/equipment/:id", "/resource/equipment/:id"],
  async (req: AuthenticatedRequest, res) => {
    const id = String(req.params.id);
    const schema = z.object({
      name: z.string().optional(),
      category: z.string().optional(),
      status: z.enum(["AVAILABLE", "ASSIGNED_TO_BUS", "IN_MAINTENANCE", "DAMAGED", "MISSING"]).optional(),
      busId: z.string().optional().nullable(),
      cost: z.coerce.number().min(0).optional(),
      storageUnit: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues.map((i) => i.message).join(", ") });
    }

    try {
      const updated = await prisma.equipment.update({
        where: { id },
        data: parsed.data,
      });

      await writeAudit(req, "UPDATE_EQUIPMENT", "Equipment", id, { updatedFields: Object.keys(parsed.data) });
      return res.json(updated);
    } catch (error: any) {
      return res.status(400).json({ message: error?.message || "Failed to update equipment" });
    }
  }
);

// Issues reporting & patch
regionalAdminRouter.post("/issues", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const schema = z.object({
    category: z.enum(["EQUIPMENT", "INVENTORY", "VEHICLE", "SAFETY", "TECHNICAL", "SCHOOL_VISIT", "OTHER"]),
    description: z.string().min(1),
    location: z.string().optional(),
    schoolId: z.string().optional(),
    busId: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid issue payload" });

  try {
    const issue = await prisma.operationalIssue.create({
      data: {
        id: makeId(),
        ...parsed.data,
        reportedById: req.userId!,
        regionId,
      },
    });

    await writeAudit(req, "CREATE_ISSUE", "OperationalIssue", issue.id, { regionId });
    return res.status(201).json(issue);
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to report issue" });
  }
});

regionalAdminRouter.patch("/issues/:id", async (req: AuthenticatedRequest, res) => {
  const regionId = getRegionId(res);
  const issueId = String(req.params.id);

  const existing = await prisma.operationalIssue.findFirst({
    where: { id: issueId, regionId },
  });
  if (!existing) return res.status(404).json({ message: "Issue not found" });

  const schema = z.object({
    status: z.enum(["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
    resolution: z.string().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid update" });

  try {
    const updated = await prisma.operationalIssue.update({
      where: { id: issueId },
      data: parsed.data,
    });
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to update issue" });
  }
});

export default regionalAdminRouter;
