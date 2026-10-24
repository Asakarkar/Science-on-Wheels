export type KPIKey =
  | "regions"
  | "labs"
  | "fieldStaff"
  | "schools"
  | "students"
  | "sessionsCompleted"
  | "sessionsPending"
  | "inventoryAlerts";

export interface Overview {
  kpis: Record<KPIKey, number>;
  liveLabs: Array<{
    id: string;
    busCode?: string | null;
    registrationNumber: string;
    status: string;
    currentLat?: number | null;
    currentLng?: number | null;
    lastGpsUpdate?: string | null;
    regionName: string;
  }>;
  alerts: Array<{
    type: string;
    severity: string;
    title: string;
    detail: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entity?: string | null;
    timestamp: string;
    entityId?: string | null;
  }>;
  generatedAt: string;
}

export interface ResourceResponse<T = Record<string, unknown>> {
  rows: T[];
}

export interface FieldConfig {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "datetime-local" | "boolean" | "textarea" | "select";
  required?: boolean;
  options?: string[];
}

export interface ResourceConfig {
  key: string;
  title: string;
  description: string;
  fields: FieldConfig[];
  columns: string[];
  readOnly?: boolean;
  permission?: string;
  filterQuery?: string;
}
