import fs from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export interface ParsedInventoryRow {
  serialNo: number;
  invoiceNo: string;
  invoiceDate: Date;
  supplierName: string;
  buyerName: string;
  buyerGstin: string;
  supplierGstin: string;
  currency: string;
  labCategory: string;
  itemName: string;
  hsnCode: string | null;
  quantity: number;
  unitRateInr: number;
  unit: string;
  gstPercent: number;
  amountInr: number;
}

export interface ImportSummary {
  csvPath: string;
  totalCsvRows: number;
  importedLinesUpserted: number;
  consumablesUpserted: number;
  equipmentMastersUpserted: number;
  equipmentAssetsUpserted: number;
  transactionsUpserted: number;
  skippedRows: Array<{ row: number; reason: string; itemName: string }>;
  dummyRecordsRemoved: {
    consumables: number;
    equipment: number;
    equipmentMasters: number;
    transactions: number;
  };
}

const DUMMY_CONSUMABLE_IDS = [
  "con-litmus",
  "con-test-tubes",
  "con-copper-sulphate",
  "con-magnesium-ribbon",
  "con-glass-slides",
  "con-alkaline-cells",
  "con-4efb60e3",
];

const DUMMY_EQUIPMENT_IDS = [
  "eq-mic-01",
  "eq-mic-02",
  "eq-tel-01",
  "eq-vdg-01",
  "eq-bal-01",
  "eq-opt-01",
];

const DUMMY_EQUIPMENT_MASTER_IDS = [
  "eqm-microscope",
  "eqm-telescope",
  "eqm-vandegraaff",
  "eqm-spectroscope",
  "eqm-digital-balance",
  "eqm-ray-optics",
];

const DUMMY_TRANSACTION_IDS = [
  "tx-init-01",
  "tx-init-02",
  "tx-init-03",
  "tx-init-04",
];

const EQUIPMENT_KEYWORDS = [
  "microscope",
  "balance",
  "water bath",
  "autoclave",
  "oven",
  "centrifuge",
  "spectrophotometer",
  "vortex",
  "laminar",
  "electroscope",
  "vernier",
  "screw gauge",
  "tuning fork",
  "pinhole camera",
  "laser light",
  "inclined plane",
  "archimedes",
  "ohm's law",
  "calipers",
  "apparatus",
  "setup",
  "set up",
  "telescope",
  "generator",
  "retort stand",
  "drawing board",
  "torch",
  "weight box",
  "protractor",
  "spectroscope",
  "lens holder",
  "kip's",
  "shaker",
  "spirometer",
  "optical bench",
];

export function resolveInventoryCsvPath(): string {
  if (process.env.INVENTORY_CSV_PATH && fs.existsSync(process.env.INVENTORY_CSV_PATH)) {
    return path.resolve(process.env.INVENTORY_CSV_PATH);
  }

  const candidates = [
    path.resolve(__dirname, "../../Inventory.csv"),
    path.resolve(__dirname, "../../../Inventory.csv"),
    path.resolve(process.cwd(), "Inventory.csv"),
    path.resolve(process.cwd(), "../Inventory.csv"),
    path.resolve(process.cwd(), "science-on-wheels/Inventory.csv"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Could not locate Inventory.csv. Set INVENTORY_CSV_PATH environment variable or place Inventory.csv in the science-on-wheels directory."
  );
}

/**
 * Robust RFC 4180 compliant CSV parser.
 * Properly handles quotes, escaped quotes, embedded commas, and CRLF/LF line endings.
 */
export function parseCsvContent(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++; // skip LF in CRLF
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function parseInventoryCsv(filePath?: string): ParsedInventoryRow[] {
  const targetPath = filePath || resolveInventoryCsvPath();
  const rawContent = fs.readFileSync(targetPath, "utf8");
  const rawRows = parseCsvContent(rawContent);

  if (rawRows.length < 2) {
    throw new Error(`Inventory CSV file at ${targetPath} is empty or has no data rows.`);
  }

  const header = rawRows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, "_"));
  const expectedCols = [
    "serial_no",
    "invoice_no",
    "invoice_date",
    "supplier_name",
    "buyer_name",
    "buyer_gstin",
    "supplier_gstin",
    "currency",
    "lab_category",
    "item_name",
    "hsn_code",
    "quantity",
    "unit_rate_inr",
    "unit",
    "gst_percent",
    "amount_inr",
  ];

  for (const col of expectedCols) {
    if (!header.includes(col)) {
      throw new Error(`Invalid Inventory CSV: missing required header column '${col}'. Found: ${header.join(", ")}`);
    }
  }

  const colIdx = (name: string) => header.indexOf(name);

  const parsedRecords: ParsedInventoryRow[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (row.length < expectedCols.length) {
      continue;
    }

    const serialNo = parseInt(row[colIdx("serial_no")], 10);
    const invoiceNo = row[colIdx("invoice_no")].trim();
    const rawDate = row[colIdx("invoice_date")].trim();
    const invoiceDate = new Date(rawDate);
    if (isNaN(invoiceDate.getTime())) {
      throw new Error(`Invalid date '${rawDate}' at row ${i + 1}`);
    }

    const supplierName = row[colIdx("supplier_name")].trim();
    const buyerName = row[colIdx("buyer_name")].trim();
    const buyerGstin = row[colIdx("buyer_gstin")].trim();
    const supplierGstin = row[colIdx("supplier_gstin")].trim();
    const currency = row[colIdx("currency")].trim() || "INR";
    const labCategory = row[colIdx("lab_category")].trim();
    const itemName = row[colIdx("item_name")].trim();
    const rawHsn = row[colIdx("hsn_code")].trim();
    const hsnCode = rawHsn.length > 0 ? rawHsn : null;
    const quantity = parseInt(row[colIdx("quantity")].replace(/[^0-9]/g, ""), 10) || 0;
    const unitRateInr = parseFloat(row[colIdx("unit_rate_inr")].replace(/,/g, "")) || 0;
    const unit = row[colIdx("unit")].trim();
    const gstPercent = parseFloat(row[colIdx("gst_percent")].replace(/,/g, "")) || 0;
    const amountInr = parseFloat(row[colIdx("amount_inr")].replace(/,/g, "")) || 0;

    parsedRecords.push({
      serialNo,
      invoiceNo,
      invoiceDate,
      supplierName,
      buyerName,
      buyerGstin,
      supplierGstin,
      currency,
      labCategory,
      itemName,
      hsnCode,
      quantity,
      unitRateInr,
      unit,
      gstPercent,
      amountInr,
    });
  }

  return parsedRecords;
}

export function isEquipmentItem(itemName: string): boolean {
  const lower = itemName.toLowerCase();
  return EQUIPMENT_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Removes all legacy preloaded dummy inventory data,
 * sample equipment records, and dummy transaction rows.
 */
export async function removeDummyInventoryData(): Promise<{
  consumables: number;
  equipment: number;
  equipmentMasters: number;
  transactions: number;
}> {
  // 1. Delete transactions referencing dummy consumables or dummy transaction IDs
  const txDelete = await prisma.inventoryTransaction.deleteMany({
    where: {
      OR: [
        { id: { in: DUMMY_TRANSACTION_IDS } },
        { consumableId: { in: DUMMY_CONSUMABLE_IDS } },
      ],
    },
  });

  // 2. Delete dummy physical equipment assets
  const eqDelete = await prisma.equipment.deleteMany({
    where: {
      OR: [
        { id: { in: DUMMY_EQUIPMENT_IDS } },
        { assetTag: { in: ["SOW-EQ-001", "SOW-EQ-002", "SOW-EQ-003", "SOW-EQ-004", "SOW-EQ-005", "SOW-EQ-006"] } },
      ],
    },
  });

  // 3. Delete dummy equipment master entries
  const masterDelete = await prisma.equipmentMaster.deleteMany({
    where: {
      OR: [
        { id: { in: DUMMY_EQUIPMENT_MASTER_IDS } },
        {
          name: {
            in: [
              "Compound Optical Microscope (1000x)",
              "Refractor Astronomical Telescope (70mm)",
              "Van de Graaff Electrostatic Generator",
              "Direct Vision Diffraction Spectroscope",
              "Precision Electronic Balance (0.01g)",
              "Laser Ray Optics Demonstration Kit",
            ],
          },
        },
      ],
    },
  });

  // 4. Delete dummy consumable records
  const conDelete = await prisma.consumable.deleteMany({
    where: {
      id: { in: DUMMY_CONSUMABLE_IDS },
    },
  });

  return {
    transactions: txDelete.count,
    equipment: eqDelete.count,
    equipmentMasters: masterDelete.count,
    consumables: conDelete.count,
  };
}

/**
 * Idempotently imports all records from Inventory.csv into the application database,
 * populating ImportedInventoryLine, Consumable, EquipmentMaster, Equipment, and InventoryTransaction.
 */
export async function seedInventoryFromCsv(options?: {
  csvPath?: string;
  removeDummy?: boolean;
}): Promise<ImportSummary> {
  const shouldRemoveDummy = options?.removeDummy !== false;
  const targetPath = options?.csvPath || resolveInventoryCsvPath();

  console.log(`[Inventory Importer] Reading CSV from: ${targetPath}`);
  const records = parseInventoryCsv(targetPath);
  console.log(`[Inventory Importer] Parsed ${records.length} total inventory records.`);

  let dummyStats = {
    consumables: 0,
    equipment: 0,
    equipmentMasters: 0,
    transactions: 0,
  };

  if (shouldRemoveDummy) {
    console.log(`[Inventory Importer] Purging legacy dummy inventory data...`);
    dummyStats = await removeDummyInventoryData();
    console.log(
      `[Inventory Importer] Purged dummy data: ${dummyStats.consumables} consumables, ${dummyStats.equipment} equipment, ${dummyStats.equipmentMasters} masters, ${dummyStats.transactions} transactions.`
    );
  }

  // Ensure regional laboratory buses are available to link physical assets & transactions
  const availableBuses = await prisma.bus.findMany({ select: { id: true, busCode: true, regionId: true } });
  const bus1 = availableBuses[0]?.id || "bus-pune-01";
  const bus2 = availableBuses[1]?.id || bus1;

  let importedLinesUpserted = 0;
  let consumablesUpserted = 0;
  let equipmentMastersUpserted = 0;
  let equipmentAssetsUpserted = 0;
  let transactionsUpserted = 0;
  const skippedRows: Array<{ row: number; reason: string; itemName: string }> = [];

  // Process all CSV records within an idempotent transaction sequence
  for (const r of records) {
    const lineId = `inv-${r.invoiceNo}-${r.serialNo}`;

    // 1. Seed ImportedInventoryLine (100% of rows from purchase invoice)
    await prisma.importedInventoryLine.upsert({
      where: {
        invoiceNo_serialNo: {
          invoiceNo: r.invoiceNo,
          serialNo: r.serialNo,
        },
      },
      update: {
        sourceRow: r.serialNo,
        invoiceDate: r.invoiceDate,
        supplierName: r.supplierName,
        buyerName: r.buyerName,
        buyerGstin: r.buyerGstin,
        supplierGstin: r.supplierGstin,
        currency: r.currency,
        labCategory: r.labCategory,
        itemName: r.itemName,
        hsnCode: r.hsnCode,
        quantity: r.quantity,
        unitRateInr: new Prisma.Decimal(r.unitRateInr),
        unit: r.unit,
        gstPercent: new Prisma.Decimal(r.gstPercent),
        amountInr: new Prisma.Decimal(r.amountInr),
      },
      create: {
        id: lineId,
        sourceRow: r.serialNo,
        serialNo: r.serialNo,
        invoiceNo: r.invoiceNo,
        invoiceDate: r.invoiceDate,
        supplierName: r.supplierName,
        buyerName: r.buyerName,
        buyerGstin: r.buyerGstin,
        supplierGstin: r.supplierGstin,
        currency: r.currency,
        labCategory: r.labCategory,
        itemName: r.itemName,
        hsnCode: r.hsnCode,
        quantity: r.quantity,
        unitRateInr: new Prisma.Decimal(r.unitRateInr),
        unit: r.unit,
        gstPercent: new Prisma.Decimal(r.gstPercent),
        amountInr: new Prisma.Decimal(r.amountInr),
      },
    });
    importedLinesUpserted++;

    // Skip service / freight charges from physical stock models
    if (r.labCategory.toLowerCase() === "other" && r.itemName.toLowerCase().includes("packing & forwarding")) {
      skippedRows.push({
        row: r.serialNo,
        reason: "Freight/service charge not a physical inventory stock item",
        itemName: r.itemName,
      });
      continue;
    }

    const assignedBusId = r.serialNo % 2 === 1 ? bus1 : bus2;
    const isEquipment = isEquipmentItem(r.itemName);

    // 2. Physical Stock / Consumable Record
    // Every chemical, reagent, glassware, and consumable item is registered in Consumable
    const consumableId = `con-inv214-${r.serialNo}`;
    const minStock = Math.max(1, Math.round(r.quantity * 0.15));

    await prisma.consumable.upsert({
      where: { id: consumableId },
      update: {
        name: r.itemName,
        category: r.labCategory,
        currentStock: r.quantity,
        minimumStock: minStock,
        unitMetric: r.unit,
      },
      create: {
        id: consumableId,
        name: r.itemName,
        category: r.labCategory,
        currentStock: r.quantity,
        minimumStock: minStock,
        unitMetric: r.unit,
      },
    });
    consumablesUpserted++;

    // 3. Initial Stock Receipt Transaction (links consumable to regional bus & reflects in regional portals)
    const txId = `tx-inv214-${r.serialNo}`;
    await prisma.inventoryTransaction.upsert({
      where: { id: txId },
      update: {
        consumableId,
        busId: assignedBusId,
        quantity: r.quantity,
        type: "RECEIPT",
        referenceType: "PURCHASE_INVOICE",
        referenceId: r.invoiceNo,
        notes: `Initial invoice receipt: ${r.itemName} (${r.quantity} ${r.unit}) from ${r.supplierName}`,
        timestamp: r.invoiceDate,
      },
      create: {
        id: txId,
        consumableId,
        busId: assignedBusId,
        quantity: r.quantity,
        type: "RECEIPT",
        referenceType: "PURCHASE_INVOICE",
        referenceId: r.invoiceNo,
        notes: `Initial invoice receipt: ${r.itemName} (${r.quantity} ${r.unit}) from ${r.supplierName}`,
        timestamp: r.invoiceDate,
      },
    });
    transactionsUpserted++;

    // 4. Equipment Master & Tracked Physical Assets
    if (isEquipment) {
      const eqMaster = await prisma.equipmentMaster.upsert({
        where: { name: r.itemName },
        update: {
          category: r.labCategory,
          unit: r.unit,
          trackable: true,
          qrRequired: true,
          minimumStock: Math.max(1, Math.round(r.quantity * 0.2)),
          description: `Purchased from ${r.supplierName} under invoice ${r.invoiceNo}. Category: ${r.labCategory}.`,
          isActive: true,
        },
        create: {
          name: r.itemName,
          category: r.labCategory,
          unit: r.unit,
          trackable: true,
          qrRequired: true,
          minimumStock: Math.max(1, Math.round(r.quantity * 0.2)),
          description: `Purchased from ${r.supplierName} under invoice ${r.invoiceNo}. Category: ${r.labCategory}.`,
          isActive: true,
        },
      });
      equipmentMastersUpserted++;

      const assetTag = `SOW-EQ-${String(r.serialNo).padStart(4, "0")}`;
      const eqAssetId = `eq-inv214-${r.serialNo}`;

      await prisma.equipment.upsert({
        where: { assetTag },
        update: {
          name: r.itemName,
          category: r.labCategory,
          status: "ASSIGNED_TO_BUS",
          busId: assignedBusId,
          purchaseDate: r.invoiceDate,
          cost: r.unitRateInr,
          equipmentMasterId: eqMaster.id,
        },
        create: {
          id: eqAssetId,
          assetTag,
          name: r.itemName,
          category: r.labCategory,
          status: "ASSIGNED_TO_BUS",
          busId: assignedBusId,
          purchaseDate: r.invoiceDate,
          cost: r.unitRateInr,
          equipmentMasterId: eqMaster.id,
        },
      });
      equipmentAssetsUpserted++;
    }
  }

  const summary: ImportSummary = {
    csvPath: targetPath,
    totalCsvRows: records.length,
    importedLinesUpserted,
    consumablesUpserted,
    equipmentMastersUpserted,
    equipmentAssetsUpserted,
    transactionsUpserted,
    skippedRows,
    dummyRecordsRemoved: dummyStats,
  };

  console.log(`[Inventory Importer] Successfully completed seeding from CSV.`);
  console.log(`[Inventory Importer] Total CSV records: ${summary.totalCsvRows}`);
  console.log(`[Inventory Importer] Imported invoice lines: ${summary.importedLinesUpserted}`);
  console.log(`[Inventory Importer] Consumables upserted: ${summary.consumablesUpserted}`);
  console.log(`[Inventory Importer] Equipment masters: ${summary.equipmentMastersUpserted}`);
  console.log(`[Inventory Importer] Equipment assets: ${summary.equipmentAssetsUpserted}`);
  console.log(`[Inventory Importer] Stock transactions: ${summary.transactionsUpserted}`);
  console.log(`[Inventory Importer] Skipped service rows: ${summary.skippedRows.length}`);

  return summary;
}

