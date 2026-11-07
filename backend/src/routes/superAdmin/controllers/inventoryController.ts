import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";
import { newId } from "../utils/normalizer";
import { formatPrismaError } from "../utils/errorFormatter";
import { audit } from "../utils/audit";

export async function getInventoryOverview(_req: Request, res: Response): Promise<void> {
  try {
    const [
      consumables,
      equipment,
      equipmentMasters,
      recentTransactions,
      regions
    ] = await Promise.all([
      prisma.consumable.findMany({
        orderBy: { name: "asc" }
      }),
      prisma.equipment.findMany({
        include: {
          Bus: { select: { id: true, busCode: true, registrationNumber: true } }
        },
        orderBy: { name: "asc" }
      }),
      (prisma as any).equipmentMaster.findMany(),
      (prisma as any).inventoryTransaction.findMany({
        take: 25,
        orderBy: { timestamp: "desc" },
        include: {
          consumable: { select: { id: true, name: true, category: true, unitMetric: true } },
          bus: { select: { id: true, busCode: true, registrationNumber: true } },
          performedBy: { select: { id: true, name: true, email: true } }
        }
      }),
      prisma.region.findMany({
        select: { id: true, name: true }
      })
    ]);

    const now = new Date();

    // Consumables statistics
    const totalConsumableItems = consumables.length;
    const totalConsumableUnits = consumables.reduce((sum, c) => sum + (c.currentStock || 0), 0);
    const lowStockConsumables = consumables.filter((c) => (c.currentStock || 0) <= (c.minimumStock || 0) && (c.currentStock || 0) > 0);
    const outOfStockConsumables = consumables.filter((c) => (c.currentStock || 0) <= 0);
    const expiredConsumables = consumables.filter((c) => c.expiryDate && new Date(c.expiryDate) < now);
    const nearExpiryConsumables = consumables.filter((c) => {
      if (!c.expiryDate) return false;
      const exp = new Date(c.expiryDate);
      const diffDays = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24);
      return diffDays > 0 && diffDays <= 90;
    });

    // Equipment statistics
    const totalEquipmentAssets = equipment.length;
    const availableEquipment = equipment.filter((e) => e.status === "AVAILABLE" && !e.busId);
    const assignedEquipment = equipment.filter((e) => e.busId || e.status === "ASSIGNED_TO_BUS");
    const maintenanceEquipment = equipment.filter((e) => e.status === "IN_MAINTENANCE");
    const damagedEquipment = equipment.filter((e) => e.status === "DAMAGED" || e.status === "MISSING");
    const totalEquipmentValuation = equipment.reduce((sum, e) => sum + (e.cost || 0), 0);

    // Allocations derived from InventoryTransactions
    const allocationTransactions = recentTransactions.filter((t: any) =>
      typeof t.referenceType === "string" && t.referenceType.startsWith("ALLOCATION")
    );

    const pendingAllocationsCount = allocationTransactions.filter((t: any) => t.referenceType === "ALLOCATION_PENDING").length;
    const dispatchedAllocationsCount = allocationTransactions.filter((t: any) => t.referenceType === "ALLOCATION_DISPATCHED").length;

    res.json({
      summary: {
        totalConsumableItems,
        totalConsumableUnits,
        lowStockCount: lowStockConsumables.length,
        outOfStockCount: outOfStockConsumables.length,
        expiredCount: expiredConsumables.length,
        nearExpiryCount: nearExpiryConsumables.length,
        totalEquipmentAssets,
        availableEquipmentCount: availableEquipment.length,
        assignedEquipmentCount: assignedEquipment.length,
        maintenanceEquipmentCount: maintenanceEquipment.length,
        damagedEquipmentCount: damagedEquipment.length,
        totalEquipmentValuation,
        totalCategories: new Set([
          ...consumables.map((c) => c.category),
          ...equipment.map((e) => e.category)
        ]).size,
        pendingAllocationsCount,
        dispatchedAllocationsCount
      },
      consumables: consumables.map((c) => ({
        ...c,
        isLowStock: (c.currentStock || 0) <= (c.minimumStock || 0),
        isOutOfStock: (c.currentStock || 0) <= 0,
        isExpired: Boolean(c.expiryDate && new Date(c.expiryDate) < now)
      })),
      equipment: equipment.map((e) => ({
        ...e,
        busName: e.Bus ? `${e.Bus.busCode || e.Bus.registrationNumber} (${e.Bus.registrationNumber})` : null,
        location: e.Bus ? `Bus ${e.Bus.busCode || e.Bus.registrationNumber}` : (e.storageUnit || "Central Warehouse (HQ)")
      })),
      equipmentMasters,
      recentTransactions,
      regions
    });
  } catch (error: any) {
    res.status(500).json({ message: formatPrismaError(error) });
  }
}

export async function adjustStock(req: Request, res: Response): Promise<void> {
  const { consumableId, type, quantity, notes, busId } = req.body;
  const performedById = (req as any).userId;

  if (!consumableId || !type || quantity === undefined) {
    res.status(400).json({ message: "Consumable ID, adjustment type, and quantity are required." });
    return;
  }

  const validTypes = ["RECEIPT", "RETURN", "ISSUE", "DAMAGE", "LOSS", "ADJUSTMENT", "CONSUMPTION"];
  if (!validTypes.includes(type)) {
    res.status(400).json({ message: `Invalid adjustment type. Must be one of: ${validTypes.join(", ")}` });
    return;
  }

  const numQty = Number(quantity);
  if (isNaN(numQty) || numQty <= 0) {
    res.status(400).json({ message: "Quantity must be a positive number." });
    return;
  }

  const deltaByType: Record<string, number> = {
    RECEIPT: 1,
    RETURN: 1,
    ISSUE: -1,
    DAMAGE: -1,
    LOSS: -1,
    CONSUMPTION: -1,
    ADJUSTMENT: 1
  };

  const delta = (deltaByType[type] || 1) * numQty;

  try {
    const consumable = await prisma.consumable.findUnique({ where: { id: consumableId } });
    if (!consumable) {
      res.status(404).json({ message: "Consumable item not found." });
      return;
    }

    if (delta < 0 && consumable.currentStock + delta < 0) {
      res.status(400).json({
        message: `Insufficient stock. Current stock is ${consumable.currentStock} ${consumable.unitMetric}, cannot deduct ${numQty}.`
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedConsumable = await tx.consumable.update({
        where: { id: consumableId },
        data: { currentStock: { increment: delta } }
      });

      const transaction = await (tx as any).inventoryTransaction.create({
        data: {
          id: newId(),
          consumableId,
          busId: busId || null,
          quantity: numQty,
          type,
          referenceType: "MANUAL_ADJUSTMENT",
          referenceId: `ADJ-${Date.now().toString().slice(-6)}`,
          performedById: performedById || null,
          notes: notes || `Stock ${type.toLowerCase()} of ${numQty} ${consumable.unitMetric}`
        }
      });

      return { updatedConsumable, transaction };
    });

    await audit(req, "STOCK_ADJUSTMENT", "Consumable", consumableId, {
      type,
      quantity: numQty,
      delta,
      newStock: result.updatedConsumable.currentStock,
      notes
    });

    res.json({
      message: `Stock successfully adjusted for "${consumable.name}". New balance: ${result.updatedConsumable.currentStock} ${consumable.unitMetric}`,
      consumable: result.updatedConsumable,
      transaction: result.transaction
    });
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
}

export async function listAllocations(_req: Request, res: Response): Promise<void> {
  try {
    const [transactions, regions, consumables, equipment] = await Promise.all([
      (prisma as any).inventoryTransaction.findMany({
        where: {
          referenceType: { startsWith: "ALLOCATION" }
        },
        orderBy: { timestamp: "desc" },
        take: 100,
        include: {
          consumable: { select: { id: true, name: true, category: true, unitMetric: true } },
          bus: { select: { id: true, busCode: true, registrationNumber: true } },
          performedBy: { select: { id: true, name: true, email: true } }
        }
      }),
      prisma.region.findMany({ select: { id: true, name: true } }),
      prisma.consumable.findMany({ select: { id: true, name: true, currentStock: true, unitMetric: true } }),
      prisma.equipment.findMany({ select: { id: true, assetTag: true, name: true, status: true, storageUnit: true } })
    ]);

    const regionMap = new Map<string, string>();
    for (const r of regions) regionMap.set(r.id, r.name);

    const allocations = transactions.map((t: any) => {
      let meta: any = {};
      try {
        if (t.notes && t.notes.startsWith("{")) {
          meta = JSON.parse(t.notes);
        }
      } catch {
        meta = { rawNotes: t.notes };
      }

      const status = t.referenceType.replace("ALLOCATION_", "") || "PENDING";
      const regionId = t.referenceId;
      const regionName = regionMap.get(regionId) || meta.regionName || "Unassigned Region";

      return {
        id: t.id,
        allocationNumber: meta.allocationNumber || `ALC-${t.id.slice(0, 8)}`,
        status, // PENDING, DISPATCHED, RECEIVED, REJECTED, CANCELLED
        regionId,
        regionName,
        itemType: meta.itemType || "CONSUMABLE",
        consumableId: t.consumableId,
        consumableName: t.consumable?.name || meta.consumableName || "Consumable Item",
        equipmentId: meta.equipmentId || null,
        assetTag: meta.assetTag || null,
        equipmentName: meta.equipmentName || null,
        quantity: t.quantity,
        unit: t.consumable?.unitMetric || meta.unit || "units",
        trackingNumber: meta.trackingNumber || null,
        carrierName: meta.carrierName || null,
        dispatchedAt: meta.dispatchedAt || null,
        receivedAt: meta.receivedAt || null,
        createdAt: t.timestamp,
        createdByName: t.performedBy?.name || "HQ Administrator",
        notes: meta.userNotes || meta.rawNotes || ""
      };
    });

    res.json({
      allocations,
      regions,
      consumables,
      equipment
    });
  } catch (error: any) {
    res.status(500).json({ message: formatPrismaError(error) });
  }
}

export async function createAllocation(req: Request, res: Response): Promise<void> {
  const { regionId, itemType, consumableId, equipmentId, quantity, notes, carrierName, trackingNumber } = req.body;
  const performedById = (req as any).userId;

  if (!regionId) {
    res.status(400).json({ message: "Destination region is required." });
    return;
  }

  const region = await prisma.region.findUnique({ where: { id: regionId } });
  if (!region) {
    res.status(404).json({ message: "Selected region does not exist." });
    return;
  }

  const isEquipment = itemType === "EQUIPMENT";
  let targetConsumableId = consumableId;
  let targetEquipment: any = null;
  let allocConsumable: any = null;

  if (isEquipment) {
    if (!equipmentId) {
      res.status(400).json({ message: "Equipment asset must be selected." });
      return;
    }
    targetEquipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!targetEquipment) {
      res.status(404).json({ message: "Selected equipment asset not found." });
      return;
    }
    // For transaction reference, use a placeholder consumable or the first consumable
    const fallbackConsumable = await prisma.consumable.findFirst();
    targetConsumableId = fallbackConsumable ? fallbackConsumable.id : "placeholder-consumable";
  } else {
    if (!consumableId || !quantity || Number(quantity) <= 0) {
      res.status(400).json({ message: "Valid consumable item and quantity are required." });
      return;
    }
    allocConsumable = await prisma.consumable.findUnique({ where: { id: consumableId } });
    if (!allocConsumable) {
      res.status(404).json({ message: "Consumable item not found." });
      return;
    }
    if (allocConsumable.currentStock < Number(quantity)) {
      res.status(400).json({
        message: `Insufficient global stock. Central stock has ${allocConsumable.currentStock} ${allocConsumable.unitMetric}, cannot allocate ${quantity}.`
      });
      return;
    }
  }

  const allocationNumber = `ALC-${Date.now().toString().slice(-6)}`;
  const meta = {
    allocationNumber,
    itemType: isEquipment ? "EQUIPMENT" : "CONSUMABLE",
    regionName: region.name,
    consumableName: allocConsumable?.name || null,
    equipmentId: targetEquipment?.id || null,
    assetTag: targetEquipment?.assetTag || null,
    equipmentName: targetEquipment?.name || null,
    unit: allocConsumable?.unitMetric || "unit",
    carrierName: carrierName || "SciMove Logistics",
    trackingNumber: trackingNumber || `TRK-${Date.now().toString().slice(-7)}`,
    userNotes: notes || ""
  };

  try {
    const transaction = await (prisma as any).inventoryTransaction.create({
      data: {
        id: newId(),
        consumableId: targetConsumableId,
        quantity: isEquipment ? 1 : Number(quantity),
        type: "TRANSFER",
        referenceType: "ALLOCATION_PENDING",
        referenceId: regionId,
        performedById: performedById || null,
        notes: JSON.stringify(meta)
      }
    });

    await audit(req, "CREATE_ALLOCATION", "InventoryAllocation", transaction.id, {
      allocationNumber,
      regionId,
      regionName: region.name,
      itemType: meta.itemType,
      quantity: isEquipment ? 1 : Number(quantity)
    });

    res.status(201).json({
      message: `Inventory allocation ${allocationNumber} to "${region.name}" created successfully in PENDING status.`,
      allocation: {
        id: transaction.id,
        status: "PENDING",
        regionId,
        ...meta
      }
    });
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
}

export async function dispatchAllocation(req: Request, res: Response): Promise<void> {
  const allocationId = String(req.params.id);

  try {
    const transaction = await (prisma as any).inventoryTransaction.findUnique({
      where: { id: allocationId },
      include: { consumable: true }
    });

    if (!transaction) {
      res.status(404).json({ message: "Allocation not found." });
      return;
    }

    if (transaction.referenceType !== "ALLOCATION_PENDING") {
      res.status(400).json({ message: `Cannot dispatch allocation with status "${transaction.referenceType}".` });
      return;
    }

    let meta: any = {};
    try {
      meta = JSON.parse(transaction.notes || "{}");
    } catch {
      meta = {};
    }

    // Business rule: Deduct from central available inventory when dispatch is confirmed
    if (meta.itemType === "CONSUMABLE" && transaction.consumableId) {
      const consumable = await prisma.consumable.findUnique({ where: { id: transaction.consumableId } });
      if (!consumable || consumable.currentStock < transaction.quantity) {
        res.status(400).json({
          message: `Cannot dispatch: Available central stock (${consumable?.currentStock ?? 0}) is less than allocated quantity (${transaction.quantity}).`
        });
        return;
      }

      await prisma.consumable.update({
        where: { id: transaction.consumableId },
        data: { currentStock: { decrement: transaction.quantity } }
      });
    } else if (meta.itemType === "EQUIPMENT" && meta.equipmentId) {
      const region = await prisma.region.findUnique({ where: { id: transaction.referenceId } });
      const regionName = region ? region.name : "Region";

      await prisma.equipment.update({
        where: { id: meta.equipmentId },
        data: {
          storageUnit: `In-Transit to ${regionName}`
        }
      });

      const performedById = (req as any).userId;
      if (performedById) {
        await (prisma as any).equipmentMovement.create({
          data: {
            id: newId(),
            equipmentId: meta.equipmentId,
            fromLocation: "Central Warehouse (HQ)",
            toLocation: `In-Transit to ${regionName}`,
            movedById: performedById
          }
        }).catch(() => undefined);
      }
    }

    meta.dispatchedAt = new Date().toISOString();

    const updated = await (prisma as any).inventoryTransaction.update({
      where: { id: allocationId },
      data: {
        referenceType: "ALLOCATION_DISPATCHED",
        notes: JSON.stringify(meta)
      }
    });

    await audit(req, "DISPATCH_ALLOCATION", "InventoryAllocation", allocationId, {
      allocationNumber: meta.allocationNumber,
      dispatchedAt: meta.dispatchedAt
    });

    res.json({
      message: `Allocation ${meta.allocationNumber || allocationId} has been DISPATCHED. Central available stock updated; stock is now in transit.`,
      allocation: updated
    });
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
}

export async function receiveAllocation(req: Request, res: Response): Promise<void> {
  const allocationId = String(req.params.id);

  try {
    const transaction = await (prisma as any).inventoryTransaction.findUnique({
      where: { id: allocationId }
    });

    if (!transaction) {
      res.status(404).json({ message: "Allocation not found." });
      return;
    }

    if (transaction.referenceType !== "ALLOCATION_DISPATCHED") {
      res.status(400).json({ message: `Cannot confirm receipt for allocation in "${transaction.referenceType}" status. Must be DISPATCHED first.` });
      return;
    }

    let meta: any = {};
    try {
      meta = JSON.parse(transaction.notes || "{}");
    } catch {
      meta = {};
    }

    meta.receivedAt = new Date().toISOString();

    const region = await prisma.region.findUnique({ where: { id: transaction.referenceId } });
    const regionName = region ? region.name : "Region";

    if (meta.itemType === "EQUIPMENT" && meta.equipmentId) {
      await prisma.equipment.update({
        where: { id: meta.equipmentId },
        data: {
          storageUnit: `Regional Depot (${regionName})`,
          status: "AVAILABLE"
        }
      });

      const performedById = (req as any).userId;
      if (performedById) {
        await (prisma as any).equipmentMovement.create({
          data: {
            id: newId(),
            equipmentId: meta.equipmentId,
            fromLocation: `In-Transit to ${regionName}`,
            toLocation: `Regional Depot (${regionName})`,
            movedById: performedById
          }
        }).catch(() => undefined);
      }
    }

    const updated = await (prisma as any).inventoryTransaction.update({
      where: { id: allocationId },
      data: {
        referenceType: "ALLOCATION_RECEIVED",
        notes: JSON.stringify(meta)
      }
    });

    await audit(req, "RECEIVE_ALLOCATION", "InventoryAllocation", allocationId, {
      allocationNumber: meta.allocationNumber,
      receivedAt: meta.receivedAt,
      regionName
    });

    res.json({
      message: `Stock receipt confirmed for allocation ${meta.allocationNumber || allocationId}. Regional inventory updated; in-transit status cleared.`,
      allocation: updated
    });
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
}

export async function cancelAllocation(req: Request, res: Response): Promise<void> {
  const allocationId = String(req.params.id);

  try {
    const transaction = await (prisma as any).inventoryTransaction.findUnique({
      where: { id: allocationId }
    });

    if (!transaction) {
      res.status(404).json({ message: "Allocation not found." });
      return;
    }

    if (transaction.referenceType === "ALLOCATION_RECEIVED") {
      res.status(400).json({ message: "Cannot cancel an allocation that has already been received by the region." });
      return;
    }

    let meta: any = {};
    try {
      meta = JSON.parse(transaction.notes || "{}");
    } catch {
      meta = {};
    }

    // If it was already dispatched, reverse deduction back to central warehouse
    if (transaction.referenceType === "ALLOCATION_DISPATCHED") {
      if (meta.itemType === "CONSUMABLE" && transaction.consumableId) {
        await prisma.consumable.update({
          where: { id: transaction.consumableId },
          data: { currentStock: { increment: transaction.quantity } }
        });
      } else if (meta.itemType === "EQUIPMENT" && meta.equipmentId) {
        await prisma.equipment.update({
          where: { id: meta.equipmentId },
          data: { storageUnit: "Central Warehouse (HQ)" }
        });
      }
    }

    meta.cancelledAt = new Date().toISOString();

    const updated = await (prisma as any).inventoryTransaction.update({
      where: { id: allocationId },
      data: {
        referenceType: "ALLOCATION_CANCELLED",
        notes: JSON.stringify(meta)
      }
    });

    await audit(req, "CANCEL_ALLOCATION", "InventoryAllocation", allocationId, {
      allocationNumber: meta.allocationNumber,
      cancelledAt: meta.cancelledAt
    });

    res.json({
      message: `Allocation ${meta.allocationNumber || allocationId} has been CANCELLED and refunded to central warehouse.`,
      allocation: updated
    });
  } catch (error: any) {
    res.status(400).json({ message: formatPrismaError(error) });
  }
}
