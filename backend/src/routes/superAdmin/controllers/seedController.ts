import type { Request, Response } from "express";
import { seedInventoryFromCsv } from "../../../lib/inventoryImporter";
import { seedSchoolsFromCsv } from "../../../lib/schoolImporter";

export async function seedInventory(_req: Request, res: Response): Promise<void> {
  try {
    const summary = await seedInventoryFromCsv({ removeDummy: true });
    res.json({ message: "Inventory CSV seeded successfully", summary });
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to seed inventory from CSV" });
  }
}

export async function seedSchools(_req: Request, res: Response): Promise<void> {
  try {
    const summary = await seedSchoolsFromCsv({ removeDummy: true });
    res.json({ message: "School CSV seeded successfully", summary });
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to seed schools from CSV" });
  }
}

