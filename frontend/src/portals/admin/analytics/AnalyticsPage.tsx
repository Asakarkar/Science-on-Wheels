import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient, API_BASE_URL } from "../../../services/api-client";

const analyticsResource: Record<string, string> = {
  Organization: "regions",
  Regions: "regions",
  Schools: "schools",
  Labs: "labs",
  Students: "students",
  Sessions: "events",
  Inventory: "consumables",
  Staff: "users"
};

export function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Organization";
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  const resource = analyticsResource[sub] || "regions";

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await apiClient<Record<string, any>>("/super-admin/reports/summary");
        setSummary(data);
      } catch (err) {
        console.error("Unable to load analytics summary", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function csvDownload(res: string) {
    const url = `${API_BASE_URL}/super-admin/reports/${res}.csv`;
    window.open(url, "_blank");
  }

  const subOptions = ["Organization", "Regions", "Schools", "Labs", "Students", "Sessions", "Inventory", "Staff"];

  const reports = [
    { title: "Organization Report", res: "regions" },
    { title: "Regional Report", res: "regions" },
    { title: "Mobile Laboratory Report", res: "labs" },
    { title: "School Report", res: "schools" },
    { title: "Session Report", res: "events" },
    { title: "Student Reach Report", res: "students" },
    { title: "Experiment Report", res: "experiments" },
    { title: "Equipment Report", res: "equipment" },
    { title: "Inventory Report", res: "consumables" },
    { title: "Staff Activity Report", res: "users" }
  ];

  return (
    <div className="portal-module analytics-page">
      <div className="subnav-tabs" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {subOptions.map((opt) => (
          <button
            key={opt}
            className={`ghost ${sub === opt ? "primary" : ""}`}
            onClick={() => setSearchParams({ sub: opt })}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "4px",
              background: sub === opt ? "var(--color-primary, #6366f1)" : "rgba(255,255,255,0.05)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer"
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="module-head">
        <div>
          <div className="section-kicker">ANALYTICS / {sub.toUpperCase()}</div>
          <h2>{sub} analytics</h2>
          <p>Operational analytics generated from the live database rather than manually maintained numbers.</p>
        </div>
        <button className="ghost" onClick={() => csvDownload(resource)}>
          Export {sub} CSV
        </button>
      </div>

      {loading ? (
        <div className="loading-state small">
          <div className="loader-ring" />
          Loading analytics…
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

      <div className="surface analytics-panel" style={{ marginTop: "1.5rem" }}>
        <div className="section-kicker">REPORTING</div>
        <h3>Available report outputs</h3>
        <div className="report-grid">
          {reports.map((r) => (
            <button key={r.title} onClick={() => csvDownload(r.res)}>
              {r.title}
              <span>CSV →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
