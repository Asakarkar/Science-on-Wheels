import { useEffect, useState } from "react";
import { apiClient, API_BASE_URL } from "../../../services/api-client";

function reportResource(x: string): string {
  if (x.includes("School")) return "schools";
  if (x.includes("Laboratory")) return "labs";
  if (x.includes("Session")) return "visits";
  if (x.includes("Student")) return "students";
  if (x.includes("Attendance")) return "attendance";
  if (x.includes("Experiment")) return "experiments";
  if (x.includes("Equipment")) return "equipment";
  if (x.includes("Inventory")) return "inventory";
  if (x.includes("Staff")) return "staff";
  return "visits";
}

export function RegionalReportsPage() {
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiClient<Record<string, any>>("/regional-admin/reports/summary");
        setSummary(data);
      } catch (err) {
        console.error("Unable to load regional summary", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function exportCsv(reportName: string) {
    const res = reportResource(reportName);
    window.open(`${API_BASE_URL}/regional-admin/reports/${res}.csv`, "_blank");
  }

  const reports = [
    "Regional Report",
    "School Report",
    "Laboratory Report",
    "Session Report",
    "Student Reach Report",
    "Attendance Report",
    "Experiment Report",
    "Equipment Report",
    "Inventory Report",
    "Staff Activity Report",
    "Monthly Regional Report"
  ];

  return (
    <div className="portal-module analytics-page">
      <div className="module-head">
        <div>
          <div className="section-kicker">REGION ANALYTICS & REPORTING</div>
          <h2>Regional Reports</h2>
          <p>Operational metrics and data extracts derived from live regional records.</p>
        </div>
        <button className="ghost" onClick={() => exportCsv("Regional Report")}>
          Export Visits CSV
        </button>
      </div>

      {loading ? (
        <div className="loading-state small">
          <div className="loader-ring" />
          Loading regional analytics…
        </div>
      ) : (
        <div className="analytics-cards">
          {summary &&
            Object.entries(summary).map(([k, v]) => (
              <div className="analytic-card" key={k}>
                <span>{k.replace(/([A-Z])/g, " $1")}</span>
                <strong>{String(v)}</strong>
              </div>
            ))}
        </div>
      )}

      <div className="surface" style={{ marginTop: "1.5rem" }}>
        <div className="section-kicker">REPORTS</div>
        <h3>Regional CSV Exports</h3>
        <div className="report-grid">
          {reports.map((x) => (
            <button key={x} onClick={() => exportCsv(x)}>
              {x}
              <span>CSV →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
