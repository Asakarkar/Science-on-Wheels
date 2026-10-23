export interface RouteRecord {
  id: string;
  routeCode: string;
  routeName: string;
  regionId?: string;
  status: "DRAFT" | "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  startLocation: string;
  endLocation: string;
  totalDistanceKm?: number;
  estimatedDurationMinutes?: number;
}

export function formatDistance(km?: number): string {
  if (km == null) return "—";
  return `${km.toFixed(1)} km`;
}

export function formatDuration(mins?: number): string {
  if (mins == null) return "—";
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  if (hours > 0) return `${hours}h ${remainder}m`;
  return `${mins}m`;
}
