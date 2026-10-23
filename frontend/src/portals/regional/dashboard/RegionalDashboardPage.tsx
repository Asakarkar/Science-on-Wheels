import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../services/api-client";
import { BrandLogo } from "../../../shared/components/BrandLogo";

interface RegionalOverview {
  region: { id: string; name: string; state?: { name: string } };
  kpis: {
    districts: number;
    blocks: number;
    schools: number;
    activeLabs: number;
    availableStaff: number;
    studentsReached: number;
    todayVisits: number;
    upcomingVisits: number;
    completedSessions: number;
    pendingSessions: number;
    inventoryAlerts: number;
    operationalIssues: number;
  };
  labs: Array<{
    id: string;
    busCode: string;
    registrationNumber: string;
    status: string;
    currentLat: number | null;
    currentLng: number | null;
  }>;
  alerts: Array<{ severity: string; title: string; detail: string }>;
  recentActivity: any[];
  generatedAt: string;
}

function Stat({ label, value, accent = "cyan" }: { label: string; value: any; accent?: string }) {
  return (
    <div className={`kpi-card ${accent}`}>
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
    </div>
  );
}

export function RegionalDashboardPage() {
  const [overview, setOverview] = useState<RegionalOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<RegionalOverview>("/regional-admin/overview");
      setOverview(data);
    } catch (err: any) {
      console.error("Unable to load regional overview", err);
      setError(err?.message || "Failed to load regional overview data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loader-ring" />
        Loading regional command center…
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="error-state">
        <div className="surface" style={{ maxWidth: 480, margin: "2rem auto", textAlign: "center" }}>
          <h3 style={{ color: "var(--crimson)", marginBottom: 8 }}>Unable to Load Regional Command Center</h3>
          <p style={{ color: "var(--charcoal-muted)", fontSize: 13, marginBottom: 16 }}>{error || "An unexpected error occurred while fetching regional data."}</p>
          <button className="primary" onClick={() => void load()}>Retry loading</button>
        </div>
      </div>
    );
  }

  const k = overview.kpis;

  return (
    <section>
      <div className="command-hero regional-hero">
        <div>
          <div className="eyebrow">REGIONAL COMMAND CENTER</div>
          <h2>{overview.region?.name || "Assigned Region"}</h2>
          <p>
            Plan, assign, coordinate and monitor Science on Wheels operations within your assigned
            region.
          </p>
          <div className="hero-meta">
            <span>Region scoped access</span>
            <span>{overview.region?.state?.name || "State"}</span>
            <span>Live database</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit one" />
          <div className="hero-orbit two" />
          <div className="hero-node node-a" />
          <div className="hero-node node-b" />
          <div className="hero-node node-c" />
          <div className="hero-core">
            <BrandLogo />
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <Stat label="Districts" value={k?.districts} />
        <Stat label="Blocks" value={k?.blocks} />
        <Stat label="Schools covered" value={k?.schools} />
        <Stat label="Active labs" value={k?.activeLabs} />
        <Stat label="Available field staff" value={k?.availableStaff} />
        <Stat label="Students reached" value={k?.studentsReached} />
        <Stat label="Today's visits" value={k?.todayVisits} />
        <Stat label="Upcoming visits" value={k?.upcomingVisits} />
        <Stat label="Completed sessions" value={k?.completedSessions} />
        <Stat label="Pending sessions" value={k?.pendingSessions} />
        <Stat label="Inventory alerts" value={k?.inventoryAlerts} accent="warning" />
        <Stat label="Operational issues" value={k?.operationalIssues} accent="coral" />
      </div>

      <div className="dashboard-grid">
        <section className="surface">
          <div className="module-head">
            <div>
              <div className="section-kicker">TODAY'S OPERATIONS</div>
              <h2>Field workload</h2>
            </div>
            <button className="ghost" onClick={() => navigate("/regional/schedules")}>
              Open schedules →
            </button>
          </div>
          <div className="mini-grid">
            <div>
              <strong>{k?.todayVisits ?? 0}</strong>
              <span>Visits today</span>
            </div>
            <div>
              <strong>{k?.pendingSessions ?? 0}</strong>
              <span>Pending sessions</span>
            </div>
            <div>
              <strong>
                {overview.labs.filter((x) => x.status === "ON_ROUTE").length}
              </strong>
              <span>Labs moving</span>
            </div>
            <div>
              <strong>
                {overview.labs.filter((x) => x.status === "AT_SCHOOL").length}
              </strong>
              <span>Labs at schools</span>
            </div>
          </div>
        </section>

        <section className="surface">
          <div className="module-head">
            <div>
              <div className="section-kicker">REGIONAL ALERTS</div>
              <h2>Needs attention</h2>
            </div>
            <button className="ghost" onClick={() => navigate("/regional/reports")}>
              View all →
            </button>
          </div>
          <div className="alert-list">
            {overview.alerts.length ? (
              overview.alerts.slice(0, 5).map((a, i) => (
                <div className={`alert-row ${a.severity}`} key={i}>
                  <div className="alert-icon">!</div>
                  <div>
                    <strong>{a.title}</strong>
                    <span>{a.detail}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state compact">No active alerts for this region.</div>
            )}
          </div>
        </section>
      </div>

      <section className="surface" style={{ marginTop: "1rem" }}>
        <div className="module-head">
          <div>
            <div className="section-kicker">LIVE LABS</div>
            <h2>Regional laboratory network</h2>
          </div>
          <button className="ghost" onClick={() => navigate("/regional/mobile-labs")}>
            Open telemetry →
          </button>
        </div>
        <div className="lab-grid">
          {overview.labs.map((l) => (
            <div className="lab-card" key={l.id}>
              <div className="lab-status">
                <span className={`status-dot ${String(l.status).toLowerCase()}`} />
                {String(l.status).replaceAll("_", " ")}
              </div>
              <h3>{l.busCode || l.registrationNumber}</h3>
              <p>{l.registrationNumber}</p>
              <div className="lab-coords">
                {l.currentLat != null
                  ? `${Number(l.currentLat).toFixed(4)}, ${Number(l.currentLng).toFixed(4)}`
                  : "Location unavailable"}
              </div>
            </div>
          ))}
          {!overview.labs.length && (
            <div className="empty-state">No laboratories assigned to this region yet.</div>
          )}
        </div>
      </section>
    </section>
  );
}
