import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../../services/api-client";
import { configs } from "../config/resources";
import { ResourceView } from "../components/ResourceView";

export function MobileLabsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "All Labs";

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  const subOptions = ["All Labs", "Maintenance", "GPS / Telemetry", "Utilization"];

  if (sub === "Utilization") {
    return (
      <div className="portal-module">
        <SubnavTabs subOptions={subOptions} activeSub={sub} onSelect={setSub} />
        <UtilizationView />
      </div>
    );
  }

  let activeConfig = configs.labs;
  if (sub === "Maintenance") activeConfig = configs.maintenance;
  else if (sub === "GPS / Telemetry" || sub === "GPS / Location") activeConfig = configs.gpsDevices;

  return (
    <div className="portal-module">
      <SubnavTabs subOptions={subOptions} activeSub={sub} onSelect={setSub} />
      <ResourceView config={activeConfig} />
    </div>
  );
}

function SubnavTabs({
  subOptions,
  activeSub,
  onSelect
}: {
  subOptions: string[];
  activeSub: string;
  onSelect: (sub: string) => void;
}) {
  return (
    <div className="subnav-tabs" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
      {subOptions.map((opt) => (
        <button
          key={opt}
          className={`ghost ${activeSub === opt ? "primary" : ""}`}
          onClick={() => onSelect(opt)}
          style={{
            padding: "0.4rem 0.8rem",
            borderRadius: "4px",
            background: activeSub === opt ? "var(--color-primary, #6366f1)" : "rgba(255,255,255,0.05)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer"
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function UtilizationView() {
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient<any>("/super-admin/reports/summary")
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load utilization data"));
  }, []);

  const tripRate = summary?.trips ? Math.round((summary.completedTrips / summary.trips) * 100) : 0;
  const sessionRate = summary?.events ? Math.round((summary.completedEvents / summary.events) * 100) : 0;

  return (
    <section className="feature-card">
      <div className="section-kicker">LAB ANALYTICS / DATABASE SUMMARY</div>
      <h2>Operational completion</h2>
      <p>
        These indicators are calculated from the operational database. They represent completion
        rates, not GPS-derived driving hours or physical vehicle utilization.
      </p>
      {error && <div className="error banner">{error}</div>}
      {!summary && !error ? (
        <div className="loading-state small">
          <div className="loader-ring" />
          Loading operational counts…
        </div>
      ) : summary && (
        <div className="util-bars">
          {[
            ["Completed trips", summary.completedTrips, summary.trips, tripRate],
            ["Completed sessions", summary.completedEvents, summary.events, sessionRate]
          ].map(([label, complete, total, rate]) => (
            <div className="util-bar-row" key={String(label)}>
              <div className="util-bar-meta">
                <span>{label}</span>
                <strong>
                  {complete} / {total} <small>({rate}%)</small>
                </strong>
              </div>
              <div className="util-bar-track">
                <i style={{ width: `${rate}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
