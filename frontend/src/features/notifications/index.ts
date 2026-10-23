export interface OperationalAlert {
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  timestamp?: string;
}

export function getAlertSeverityClass(severity: OperationalAlert["severity"]): string {
  switch (severity) {
    case "critical":
      return "alert-critical";
    case "warning":
      return "alert-warning";
    default:
      return "alert-info";
  }
}
