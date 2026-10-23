import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../services/api-client";
import { BrandLogo } from "../../../shared/components/BrandLogo";
import { MetricCard } from "../../../shared/components/MetricCard";
import type { Overview } from "../../../shared/types/admin";

export function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const data = await apiClient<Overview>("/super-admin/overview");
        setOverview(data);
      } catch (err) {
        console.error("Unable to load overview", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading || !overview) {
    return (
      <div className="loading-state">
        <div className="loader-ring" />
        Loading command center…
      </div>
    );
  }

  const metrics = [
    { label: "Regions", value: overview.kpis.regions, detail: "Organization footprint", tone: "violet" },
    { label: "Active Labs", value: overview.kpis.labs, detail: "Mobile laboratories", tone: "violet" },
    { label: "Field Staff", value: overview.kpis.fieldStaff, detail: "Active communicators" },
    { label: "Schools Covered", value: overview.kpis.schools, detail: "Connected school records" },
    { label: "Students Reached", value: overview.kpis.students, detail: "Students in platform" },
    { label: "Sessions Completed", value: overview.kpis.sessionsCompleted, detail: "Completed field sessions" },
    { label: "Sessions Pending", value: overview.kpis.sessionsPending, detail: "Scheduled / active" },
    { label: "Inventory Alerts", value: overview.kpis.inventoryAlerts, detail: "At or below minimum stock", tone: "alert" }
  ];

  return (
    <>
      <section className="command-hero">
        <div>
          <div className="eyebrow">ORGANIZATION COMMAND CENTER</div>
          <h2>Science in motion, under control.</h2>
          <p>
            Configure the network, control access, monitor mobile laboratories and turn field
            activity into organization-wide insight.
          </p>
          <div className="hero-actions">
            <button
              className="primary"
              onClick={() => navigate("/admin/users?sub=Regional%20Administrators")}
            >
              Create administrator
            </button>
            <button className="ghost" onClick={() => navigate("/admin/mobile-labs")}>
              View laboratories
            </button>
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
      </section>

      <section className="metric-grid">
        {metrics.map((m) => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={m.value}
            detail={m.detail}
            tone={m.tone}
          />
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="surface map-surface">
          <div className="surface-head">
            <div>
              <div className="section-kicker">DATABASE-SOURCED FLEET STATUS</div>
              <h3>Fleet network overview</h3>
            </div>
            <button
              className="text-button"
              onClick={() => navigate("/admin/mobile-labs?sub=Live%20Labs")}
            >
              Open live labs →
            </button>
          </div>
          <div className="network-map">
            <div className="map-grid" />
            <div className="map-caption">NETWORK TOPOLOGY / SCHEMATIC</div>
            <div className="map-route route-a" />
            <div className="map-route route-b" />
            {overview.liveLabs.slice(0, 8).map((lab, i) => (
              <button
                className={`map-pin p${i + 1}`}
                key={lab.id}
                onClick={() => navigate("/admin/mobile-labs")}
                title={`${lab.busCode || lab.registrationNumber} • ${lab.status}`}
              >
                <span />
                {i + 1}
              </button>
            ))}
            <div className="map-legend">
              <span>
                <i className="dot moving" /> Moving / active
              </span>
              <span>
                <i className="dot school" /> At school
              </span>
              <span>
                <i className="dot offline" /> Offline / stale
              </span>
            </div>
          </div>
        </article>

        <article className="surface alert-surface">
          <div className="surface-head">
            <div>
              <div className="section-kicker">ATTENTION</div>
              <h3>Alerts</h3>
            </div>
            <span className="live-pill">LIVE</span>
          </div>
          <div className="alert-list">
            {overview.alerts.length ? (
              overview.alerts.slice(0, 7).map((a, i) => (
                <div className={`alert-row ${a.severity}`} key={i}>
                  <div className="alert-icon">{a.severity === "warning" ? "!" : "•"}</div>
                  <div>
                    <strong>{a.title}</strong>
                    <span>{a.detail}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state compact">No active alerts. The network is quiet.</div>
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-grid lower">
        <article className="surface">
          <div className="surface-head">
            <div>
              <div className="section-kicker">RECENT ACTIVITY</div>
              <h3>What changed</h3>
            </div>
            <button
              className="text-button"
              onClick={() => navigate("/admin/audit-logs")}
            >
              Audit trail →
            </button>
          </div>
          <div className="timeline">
            {overview.recentActivity.length ? (
              overview.recentActivity.map((a) => (
                <div className="timeline-row" key={a.id}>
                  <div className="timeline-dot" />
                  <div>
                    <strong>{a.action.replace(/_/g, " ")}</strong>
                    <span>
                      {a.entity || "System"} {a.entityId ? `• ${a.entityId}` : ""}
                    </span>
                  </div>
                  <time>{new Date(a.timestamp).toLocaleString()}</time>
                </div>
              ))
            ) : (
              <div className="empty-state compact">No administrative activity recorded yet.</div>
            )}
          </div>
        </article>

        <article className="surface workflow">
          <div className="surface-head">
            <div>
              <div className="section-kicker">CONTROL LOOP</div>
              <h3>Configure → Control → Monitor → Analyse</h3>
            </div>
          </div>
          <div className="flow">
            <button onClick={() => navigate("/admin/organization")}>01 Configure</button>
            <span>→</span>
            <button onClick={() => navigate("/admin/users")}>02 Control</button>
            <span>→</span>
            <button onClick={() => navigate("/admin/mobile-labs")}>03 Monitor</button>
            <span>→</span>
            <button onClick={() => navigate("/admin/analytics")}>04 Analyse</button>
          </div>
          <p>
            Every operational record should travel through this loop so administrative decisions
            remain connected to field reality.
          </p>
        </article>
      </section>
    </>
  );
}
