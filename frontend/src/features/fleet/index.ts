export type LabStatus =
  | "AVAILABLE"
  | "ON_ROUTE"
  | "AT_SCHOOL"
  | "UNDER_MAINTENANCE"
  | "EMERGENCY";

export interface MobileLab {
  id: string;
  busCode?: string;
  registrationNumber: string;
  regionId: string;
  driverId?: string;
  status: LabStatus;
  insuranceExpiry: string;
  fitnessExpiry: string;
  currentLat?: number | null;
  currentLng?: number | null;
  lastGpsUpdate?: string;
}

export function formatLabStatus(status: LabStatus | string): string {
  return String(status).replaceAll("_", " ");
}

export function isLabMoving(status: LabStatus | string): boolean {
  return status === "ON_ROUTE";
}
