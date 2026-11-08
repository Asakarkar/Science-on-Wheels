import { useSearchParams } from "react-router-dom";
import { configs } from "./resources";
import { ResourceView } from "./ResourceView";
import { NavIcon } from "../../shared/components/NavIcon";

export function OperationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Visits";

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  const subOptions = ["Visits", "Routes", "Trips", "Operational Issues"];

  let activeConfig = configs.events;
  if (sub === "Routes") activeConfig = configs.routes;
  else if (sub === "Trips") activeConfig = configs.trips;
  else if (sub === "Operational Issues") activeConfig = configs.operationalIssues;

  return (
    <div className="portal-module">
      <div style={{ marginBottom: "20px" }}>
        <div className="section-kicker">ERP / FIELD OPERATIONS EXECUTION</div>
        <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", margin: "4px 0 8px" }}>
          School Visits, Routes & Trip Operations
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: 0, maxWidth: "720px", lineHeight: 1.5 }}>
          Real-time tracking of mobile lab dispatches, scheduled school STEM stops, route itineraries, and field-reported operational blockers.
        </p>
      </div>

      <div className="subnav-tabs" style={{ marginBottom: "20px" }}>
        {subOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`subnav-tab ${sub === opt ? "active" : ""}`}
            onClick={() => setSub(opt)}
          >
            {opt === "Visits" && <NavIcon name="ClipboardCheck" size={15} />}
            {opt === "Routes" && <NavIcon name="MapPin" size={15} />}
            {opt === "Trips" && <NavIcon name="Bus" size={15} />}
            {opt === "Operational Issues" && <NavIcon name="AlertTriangle" size={15} />}
            <span>{opt}</span>
          </button>
        ))}
      </div>

      <ResourceView config={activeConfig} />
    </div>
  );
}
