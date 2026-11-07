import { prisma } from "../lib/prisma";

export interface StaffRosterEntry {
  staffId: string;
  staffName: string;
  role: "PRIMARY" | "SUPPORTING" | string;
  assignedAt: string;
}

/**
 * Retrieves the multi-staff operational roster assigned to a mobile laboratory bus
 */
export async function getBusStaffRoster(busId: string): Promise<StaffRosterEntry[]> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: `bus_staff_${busId}` },
    });
    if (config?.value) {
      const parsed = JSON.parse(config.value);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback to empty roster on failure
  }
  return [];
}

/**
 * Persists the multi-staff roster configuration for a bus
 */
export async function setBusStaffRoster(busId: string, roster: StaffRosterEntry[]): Promise<void> {
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
