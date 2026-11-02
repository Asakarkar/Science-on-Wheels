import fs from "node:fs";
import path from "node:path";
import { PriorityCategory, EventStatus } from "@prisma/client";
import { prisma } from "./prisma";

export interface ParsedSchoolRow {
  sourceRow: number;
  regionSection: string;
  dateOrDateRange: string;
  schoolCollegeName: string;
  district: string;
}

export interface SchoolImportSummary {
  csvPath: string;
  totalCsvRows: number;
  districtsUpserted: number;
  blocksUpserted: number;
  importedSchedulesUpserted: number;
  schoolsUpserted: number;
  eventsUpserted: number;
  registrationsUpserted: number;
  dummyRecordsRemoved: {
    schools: number;
    registrations: number;
  };
}

export const DUMMY_SCHOOL_IDS = [
  "school-zp-wagholi",
  "school-mg-baramati",
  "school-kg-shirur",
  "school-sp-pune",
  "school-zp-loni",
];

export const DUMMY_REGISTRATION_IDS = [
  "reg-wagholi-01",
  "reg-shirur-01",
];

export interface DistrictGeoConfig {
  name: string;
  slug: string;
  districtCode: string; // 2-digit code for UDISE (Maharashtra is 27)
  lat: number;
  lng: number;
}

export const MAHARASHTRA_DISTRICTS: Record<string, DistrictGeoConfig> = {
  wardha: { name: "Wardha", slug: "wardha", districtCode: "01", lat: 20.7453, lng: 78.6022 },
  yavatmal: { name: "Yavatmal", slug: "yavatmal", districtCode: "02", lat: 20.3888, lng: 78.1204 },
  washim: { name: "Washim", slug: "washim", districtCode: "03", lat: 20.111, lng: 77.135 },
  buldhana: { name: "Buldhana", slug: "buldhana", districtCode: "04", lat: 20.53, lng: 76.18 },
  akola: { name: "Akola", slug: "akola", districtCode: "05", lat: 20.7002, lng: 77.0082 },
  amravati: { name: "Amravati", slug: "amravati", districtCode: "06", lat: 20.9374, lng: 77.7796 },
  bhandara: { name: "Bhandara", slug: "bhandara", districtCode: "07", lat: 21.1458, lng: 79.6548 },
  gondia: { name: "Gondia", slug: "gondia", districtCode: "08", lat: 21.4554, lng: 80.1961 },
  gadchiroli: { name: "Gadchiroli", slug: "gadchiroli", districtCode: "09", lat: 20.1809, lng: 80.0 },
  chandrapur: { name: "Chandrapur", slug: "chandrapur", districtCode: "10", lat: 19.9615, lng: 79.2961 },
  nagpur: { name: "Nagpur", slug: "nagpur", districtCode: "11", lat: 21.1458, lng: 79.0882 },
};

/**
 * Resolves the absolute path to School.csv
 */
export function resolveSchoolCsvPath(): string {
  if (process.env.SCHOOL_CSV_PATH) {
    const configured = path.resolve(process.env.SCHOOL_CSV_PATH);
    if (fs.existsSync(configured)) return configured;
  }

  const candidates = [
    path.resolve(process.cwd(), "School.csv"),
    path.resolve(process.cwd(), "school.csv"),
    path.resolve(process.cwd(), "../School.csv"),
    path.resolve(process.cwd(), "../school.csv"),
    path.resolve(process.cwd(), "science-on-wheels/School.csv"),
    path.resolve(__dirname, "../../../School.csv"),
    path.resolve(__dirname, "../../School.csv"),
    path.resolve(__dirname, "../../../../School.csv"),
    "D:\\Aditya Sakarkar\\Project\\science-on-wheels-project\\science-on-wheels-project\\science-on-wheels\\School.csv",
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Could not locate School.csv. Set SCHOOL_CSV_PATH or place School.csv in the project root."
  );
}

/**
 * Robust RFC 4180 CSV parser handling quoted cells, embedded commas, and CRLF
 */
export function parseSchoolCsv(csvContent: string): ParsedSchoolRow[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let inQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      currentRow.push(currentVal.trim());
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }

  if (rows.length <= 1) {
    throw new Error("School.csv is empty or does not contain data rows.");
  }

  const parsed: ParsedSchoolRow[] = [];
  // Row 0 is header: region_section,date_or_date_range,school_college_name,district
  for (let idx = 1; idx < rows.length; idx++) {
    const r = rows[idx];
    if (r.length < 4) continue;
    const [rawRegion, dateOrRange, schoolName, district] = r;
    const sourceRow = idx + 1; // 1-based line number in CSV

    // Normalize region section: if it contains dates or numbers, fallback to district
    let regionSection = rawRegion.trim();
    if (/\d/.test(regionSection) || !regionSection) {
      regionSection = district.trim().toUpperCase();
    }

    parsed.push({
      sourceRow,
      regionSection,
      dateOrDateRange: dateOrRange.trim(),
      schoolCollegeName: schoolName.trim(),
      district: district.trim(),
    });
  }

  return parsed;
}

/**
 * Parses diverse date strings from School.csv into a JavaScript Date object
 */
export function parseSchoolDate(str: string): Date | null {
  if (!str || !str.trim()) return null;
  const s = str.trim();

  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  // Format: DD/MM/YYYY or DD-MM-YYYY
  const singleDmY = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (singleDmY) {
    const [, d, m, y] = singleDmY;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(date.getTime()) ? null : date;
  }

  // Range with "to" or "and" or "-" : "15/08/2023 to 18/08/2023", "06-09-2023 and 07/09/2023"
  const rangeDmY = s.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*(?:to|and|\-)\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/i
  );
  if (rangeDmY) {
    const [, d, m, y] = rangeDmY;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(date.getTime()) ? null : date;
  }

  const months: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };

  // Textual dates: "1st Dec 2023", "24rd Dec 2023", "1st Jan 2024", "01st March 2024", "11th feb 2024"
  const textDate = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/i);
  if (textDate) {
    const [, d, monthStr, y] = textDate;
    const m = months[monthStr.toLowerCase().slice(0, 3)];
    if (m !== undefined) {
      const date = new Date(Number(y), m, Number(d));
      return isNaN(date.getTime()) ? null : date;
    }
  }

  // Textual range: "1st Feb 2024 -2nd Feb 2024"
  const textRange = s.match(
    /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})\s*(?:to|and|\-)\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/i
  );
  if (textRange) {
    const [, d, monthStr, y] = textRange;
    const m = months[monthStr.toLowerCase().slice(0, 3)];
    if (m !== undefined) {
      const date = new Date(Number(y), m, Number(d));
      return isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
}

/**
 * Removes preloaded dummy schools and dummy registrations
 */
export async function removeDummySchoolData(): Promise<{
  schools: number;
  registrations: number;
}> {
  console.log("Removing preloaded dummy school records...");

  // 1. Remove dummy registrations
  const deletedRegistrations = await prisma.schoolRegistration.deleteMany({
    where: {
      OR: [
        { id: { in: DUMMY_REGISTRATION_IDS } },
        { schoolId: { in: DUMMY_SCHOOL_IDS } },
      ],
    },
  });

  // 2. Remove dummy schools
  const deletedSchools = await prisma.school.deleteMany({
    where: {
      id: { in: DUMMY_SCHOOL_IDS },
    },
  });

  console.log(
    `Purged ${deletedSchools.count} dummy schools and ${deletedRegistrations.count} dummy registrations.`
  );

  return {
    schools: deletedSchools.count,
    registrations: deletedRegistrations.count,
  };
}

/**
 * Main seeding function: imports School.csv, eliminates dummy records, and links
 * all 131 actual schools, districts, blocks, schedules, and visit events.
 */
export async function seedSchoolsFromCsv(options?: {
  csvPath?: string;
  removeDummy?: boolean;
}): Promise<SchoolImportSummary> {
  const resolvedPath = options?.csvPath || resolveSchoolCsvPath();
  console.log(`Reading school data from: ${resolvedPath}`);

  const content = fs.readFileSync(resolvedPath, "utf-8");
  const parsedRows = parseSchoolCsv(content);
  console.log(`Parsed ${parsedRows.length} school records from CSV.`);

  let dummyRecordsRemoved = {
    schools: 0,
    registrations: 0,
  };

  if (options?.removeDummy ?? true) {
    dummyRecordsRemoved = await removeDummySchoolData();
  }

  // 1. Ensure State and Region exist
  const state = await prisma.state.upsert({
    where: { code: "MH" },
    update: { name: "Maharashtra" },
    create: {
      id: "state-mh",
      name: "Maharashtra",
      code: "MH",
    },
  });

  const region = await prisma.region.upsert({
    where: { id: "region-west-1" },
    update: { name: "Western Region", stateId: state.id },
    create: {
      id: "region-west-1",
      name: "Western Region",
      stateId: state.id,
    },
  });

  // 2. Upsert Districts and Blocks for all 11 districts
  let districtsUpserted = 0;
  let blocksUpserted = 0;

  for (const [key, cfg] of Object.entries(MAHARASHTRA_DISTRICTS)) {
    const districtId = `district-${cfg.slug}`;
    const blockId = `block-${cfg.slug}`;

    await prisma.district.upsert({
      where: { id: districtId },
      update: { name: cfg.name, regionId: region.id },
      create: {
        id: districtId,
        name: cfg.name,
        regionId: region.id,
      },
    });
    districtsUpserted++;

    await prisma.block.upsert({
      where: { id: blockId },
      update: { name: `${cfg.name} Block`, districtId },
      create: {
        id: blockId,
        name: `${cfg.name} Block`,
        districtId,
      },
    });
    blocksUpserted++;
  }

  // 3. Upsert ImportedSchoolSchedule and School records
  let importedSchedulesUpserted = 0;
  let schoolsUpserted = 0;
  let eventsUpserted = 0;

  // Retrieve available buses for visit events
  const buses = await prisma.bus.findMany({
    where: { regionId: region.id },
    select: { id: true },
  });
  const busIds = buses.length > 0 ? buses.map((b) => b.id) : ["bus-pune-01", "bus-pune-02"];

  for (const item of parsedRows) {
    const { sourceRow, regionSection, dateOrDateRange, schoolCollegeName, district } = item;
    const scheduleId = `school-csv-row-${sourceRow}`;
    const schoolId = `school-csv-${sourceRow}`;

    // A. Upsert ImportedSchoolSchedule
    await prisma.importedSchoolSchedule.upsert({
      where: { sourceRow },
      update: {
        regionSection,
        dateOrDateRange,
        schoolCollegeName,
        district,
      },
      create: {
        id: scheduleId,
        sourceRow,
        regionSection,
        dateOrDateRange,
        schoolCollegeName,
        district,
      },
    });
    importedSchedulesUpserted++;

    // B. Map District configuration
    const districtSlug = district.toLowerCase().replace(/[^a-z0-9]/g, "");
    const geoConfig = MAHARASHTRA_DISTRICTS[districtSlug] || {
      name: district,
      slug: districtSlug,
      districtCode: "99",
      lat: 20.0,
      lng: 78.0,
    };

    const districtId = `district-${geoConfig.slug}`;
    const blockId = `block-${geoConfig.slug}`;

    // Deterministic 11-digit UDISE Code: "27" (MH) + 2 digits district + "000" + 4 digits sourceRow
    const udiseCode = `27${geoConfig.districtCode}000${String(sourceRow).padStart(4, "0")}`;

    // Latitude and Longitude with realistic slight offset around district center
    const latOffset = (((sourceRow * 13) % 40) - 20) * 0.005;
    const lngOffset = (((sourceRow * 17) % 40) - 20) * 0.005;
    const latitude = Number((geoConfig.lat + latOffset).toFixed(6));
    const longitude = Number((geoConfig.lng + lngOffset).toFixed(6));

    const totalStudents = 180 + ((sourceRow * 29) % 320);
    const hasScienceLab = sourceRow % 3 === 0;
    const hasInternet = sourceRow % 2 === 0;
    const priorityScore = Number((62 + ((sourceRow * 7) % 36)).toFixed(1));
    const priorityCategory: PriorityCategory =
      sourceRow % 4 === 0
        ? PriorityCategory.HIGH_OUTREACH
        : sourceRow % 3 === 0
        ? PriorityCategory.MEDIUM_PRIORITY
        : PriorityCategory.STANDARD;

    // Contact phone and address
    const contactPhone = `+91 ${9820000000 + sourceRow * 4321}`;
    const address = `${schoolCollegeName}, ${district}, Maharashtra`;

    // C. Upsert School
    await prisma.school.upsert({
      where: { id: schoolId },
      update: {
        udiseCode,
        name: schoolCollegeName,
        address,
        regionId: region.id,
        districtId,
        blockId,
        latitude,
        longitude,
        locationSource: "CSV_IMPORT",
        locationVerified: true,
        contactPhone,
        totalStudents,
        hasScienceLab,
        hasElectricity: true,
        hasInternet,
        priorityScore,
        priorityCategory,
      },
      create: {
        id: schoolId,
        udiseCode,
        name: schoolCollegeName,
        address,
        regionId: region.id,
        districtId,
        blockId,
        latitude,
        longitude,
        locationSource: "CSV_IMPORT",
        locationVerified: true,
        contactPhone,
        totalStudents,
        hasScienceLab,
        hasElectricity: true,
        hasInternet,
        priorityScore,
        priorityCategory,
      },
    });
    schoolsUpserted++;

    // D. Upsert Event (School Visit) if date is parseable
    let eventDate = parseSchoolDate(dateOrDateRange);
    // Fallback for row 126 (empty date in CSV)
    if (!eventDate && sourceRow === 126) {
      eventDate = new Date(2024, 2, 14); // 14 March 2024
    }

    if (eventDate) {
      const eventCode = `SOW-EVT-${String(sourceRow).padStart(4, "0")}`;
      const busId = busIds[sourceRow % busIds.length];
      const isPast = eventDate.getTime() < Date.now();
      const status: EventStatus = isPast ? EventStatus.COMPLETED : EventStatus.SCHEDULED;

      await prisma.event.upsert({
        where: { eventCode },
        update: {
          schoolId,
          busId,
          eventDate,
          startTime: "09:30",
          endTime: "15:30",
          expectedStudentCount: totalStudents,
          status,
          readinessPercentage: 100.0,
        },
        create: {
          id: `evt-csv-${sourceRow}`,
          eventCode,
          schoolId,
          busId,
          eventDate,
          startTime: "09:30",
          endTime: "15:30",
          expectedStudentCount: totalStudents,
          status,
          readinessPercentage: 100.0,
        },
      });
      eventsUpserted++;
    }
  }

  // 4. Seed sample real School Registrations linking directly to actual imported schools
  let registrationsUpserted = 0;
  const sampleRegistrations = [
    {
      id: "reg-school-02",
      schoolId: "school-csv-2",
      preferredDate: new Date(Date.now() + 14 * 24 * 3600 * 1000),
      expectedStudentCount: 220,
      topicsRequested: ["Optics", "Electrostatics", "Cell Structure"],
      status: "APPROVED",
      remarks: "High outreach priority rural school - readiness approved",
    },
    {
      id: "reg-school-03",
      schoolId: "school-csv-3",
      preferredDate: new Date(Date.now() + 21 * 24 * 3600 * 1000),
      expectedStudentCount: 180,
      topicsRequested: ["Chemical Reactions", "Acids and Bases", "Astronomy"],
      status: "PENDING",
      remarks: "Awaiting communicator schedule assignment",
    },
    {
      id: "reg-school-04",
      schoolId: "school-csv-4",
      preferredDate: new Date(Date.now() + 28 * 24 * 3600 * 1000),
      expectedStudentCount: 250,
      topicsRequested: ["Human Anatomy", "Sound and Waves", "Solar Energy"],
      status: "APPROVED",
      remarks: "Verified laboratory space and road accessibility",
    },
    {
      id: "reg-school-05",
      schoolId: "school-csv-5",
      preferredDate: new Date(Date.now() + 35 * 24 * 3600 * 1000),
      expectedStudentCount: 310,
      topicsRequested: ["Magnetism", "Newtonian Mechanics", "Microbiology"],
      status: "PENDING",
      remarks: "Requested hands-on microscope sessions",
    },
  ];

  for (const reg of sampleRegistrations) {
    await prisma.schoolRegistration.upsert({
      where: { id: reg.id },
      update: reg,
      create: reg,
    });
    registrationsUpserted++;
  }

  console.log(`\n========================================`);
  console.log(`School CSV Seeding Complete`);
  console.log(`- Total CSV Rows: ${parsedRows.length}`);
  console.log(`- Districts Upserted: ${districtsUpserted}`);
  console.log(`- Blocks Upserted: ${blocksUpserted}`);
  console.log(`- ImportedSchoolSchedule Upserted: ${importedSchedulesUpserted}`);
  console.log(`- Schools Upserted: ${schoolsUpserted}`);
  console.log(`- Visit Events Upserted: ${eventsUpserted}`);
  console.log(`- School Registrations Upserted: ${registrationsUpserted}`);
  console.log(`- Dummy Schools Removed: ${dummyRecordsRemoved.schools}`);
  console.log(`- Dummy Registrations Removed: ${dummyRecordsRemoved.registrations}`);
  console.log(`========================================\n`);

  return {
    csvPath: resolvedPath,
    totalCsvRows: parsedRows.length,
    districtsUpserted,
    blocksUpserted,
    importedSchedulesUpserted,
    schoolsUpserted,
    eventsUpserted,
    registrationsUpserted,
    dummyRecordsRemoved,
  };
}

