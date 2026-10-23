import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../../services/api-client";
import { configs } from "../config/resources";
import { ResourceView } from "../components/ResourceView";

export function SecurityAuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Audit Logs";

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  const subOptions = ["Audit Logs", "Login Activity", "Permission Changes", "Security Events", "System Health"];

  if (sub === "System Health") {
    return (
      <div className="portal-module">
        <SubnavTabs subOptions={subOptions} activeSub={sub} onSelect={setSub} />
        <SystemHealthView />
      </div>
    );
  }

  let filterQuery: string | undefined = undefined;
  if (sub === "Login Activity") filterQuery = "action=LOGIN_SUCCESS";
  else if (sub === "Permission Changes") filterQuery = "action=PERMISSION_CHANGE";
  else if (sub === "Security Events") filterQuery = "action=SECURITY_EVENT";

  return (
    <div className="portal-module">
      <SubnavTabs subOptions={subOptions} activeSub={sub} onSelect={setSub} />
      <ResourceView
        config={configs.auditLogs}
        titleOverride={sub}
        descriptionOverride={`Immutable trace of ${sub.toLowerCase()} in the platform.`}
        filterQuery={filterQuery}
      />
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

function SystemHealthView() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient<any>("/super-admin/health")
      .then(setHealth)
      .catch((e) => console.error("Health check error", e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="feature-card">
      <div className="section-kicker">MONITORING / SYSTEM HEALTH</div>
      <h2>System health</h2>
      <p>Real-time operational indicators for the API server and database layer.</p>

      {loading ? (
        <div className="loading-state small">
          <div className="loader-ring" />
          Checking system health…
        </div>
      ) : (
        <div className="health-grid" style={{ marginTop: "1rem" }}>
          {[
            ["API", health?.api || "Healthy"],
            ["Database", health?.database || "Connected"],
            ["Response", health ? `${health.responseMs} ms` : "—"],
            ["Node", health?.node || "—"],
            ["Uptime", health ? `${Math.round(health.uptimeSeconds / 60)} min` : "—"]
          ].map(([a, b]) => (
            <div className="health-card" key={a as string}>
              <span>{a}</span>
              <strong>{b}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
