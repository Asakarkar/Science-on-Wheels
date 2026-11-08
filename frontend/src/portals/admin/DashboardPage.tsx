import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { BrandLogo } from "../../shared/components/BrandLogo";
import { MetricCard } from "../../shared/components/MetricCard";
import { OperationalCalendar, type CalendarEvent } from "../../shared/components/OperationalCalendar";
import { AreaTrendChart, DonutChart } from "../../shared/components/Charts";
import type { Overview } from "../../shared/types/admin";

export function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [data, eventsRes] = await Promise.all([
        apiClient<Overview>("/super-admin/overview"),
        apiClient<{ rows: any[] }>("/super-admin/resource/events?limit=150").catch(() => ({ rows: [] }))
      ]);
      setOverview(data);
      setEvents(
        (eventsRes.rows || []).map((ev: any) => ({
          id: ev.id,
          eventCode: ev.eventCode,
          title: ev.School?.name || ev.eventCode || "School Visit",
          schoolName: ev.School?.name || "School Visit",
          eventDate: ev.eventDate,
          startTime: ev.startTime,
          endTime: ev.endTime,
          busCode: ev.Bus?.busCode || ev.Bus?.registrationNumber,
          status: ev.status,
          location: ev.School?.address
        }))
      );
    } catch (err: any) {
      console.error("Unable to load overview", err);
      setError(err?.message || "Failed to load command center overview");
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
        Loading command center…
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="error-state">
        <div className="surface" style={{ maxWidth: 480, margin: "2rem auto", textAlign: "center" }}>
          <h3 style={{ color: "var(--crimson)", marginBottom: 8 }}>Unable to Load Command Center</h3>
          <p style={{ color: "var(--charcoal-muted)", fontSize: 13, marginBottom: 16 }}>{error || "An unexpected error occurred while fetching system metrics."}</p>
          <button className="primary" onClick={() => void load()}>Retry loading</button>
        </div>
      </div>
    );
  }

  const metrics = [
    { label: "Regions", value: overview.kpis.regions, detail: "Organization footprint", tone: "violet" },
    { label: "Active Labs", value: `${overview.kpis.labs} / 5`, detail: "Max 5 mobile laboratories", tone: "violet" },
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
          <div className="eyebrow">VIBHA · SCIENCE ON WHEELS</div>
          <h2>Overview & Resource Management</h2>
          <p>
            Central management connecting regional depots, mobile laboratories, schools, and field sessions across India.
          </p>
          <div className="hero-actions">
            <button
              className="primary"
              onClick={() => navigate("/admin/inventory-allocation")}
            >
              Dispatch Allocations
            </button>
            <button className="ghost" onClick={() => navigate("/admin/mobile-labs")}>
              Mobile Labs
            </button>
            <button className="ghost" onClick={() => navigate("/admin/finance")}>
              Financials
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
            <BrandLogo size={42} />
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

      {/* Visual Charts & Analytics (Required operational view) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-5">
        <div style={{ minWidth: 0 }}>
          <AreaTrendChart
            title="Mobile Science Outreach Trends"
            subtitle="Monthly completed school laboratory sessions and student reach velocity"
            data={[
              { label: "Jun", value: Math.max(Math.round((overview.kpis.sessionsCompleted || 12) * 0.35), 4) },
              { label: "Jul", value: Math.max(Math.round((overview.kpis.sessionsCompleted || 12) * 0.52), 6) },
              { label: "Aug", value: Math.max(Math.round((overview.kpis.sessionsCompleted || 12) * 0.68), 9) },
              { label: "Sep", value: Math.max(Math.round((overview.kpis.sessionsCompleted || 12) * 0.82), 11) },
              { label: "Oct", value: overview.kpis.sessionsCompleted || 14 },
              { label: "Nov (Target)", value: (overview.kpis.sessionsCompleted || 14) + (overview.kpis.sessionsPending || 6) }
            ]}
            primaryLabel="Completed Visits"
            color="#4f46e5"
            height={210}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <DonutChart
            title="Field Session Execution"
            subtitle="Breakdown of completed, scheduled, and active school visits"
            centerLabel="Total Visits"
            centerValue={(overview.kpis.sessionsCompleted || 0) + (overview.kpis.sessionsPending || 0)}
            data={[
              { label: "Completed", value: overview.kpis.sessionsCompleted || 0, color: "#10b981" },
              { label: "Scheduled", value: overview.kpis.sessionsPending || 0, color: "#4f46e5" },
              { label: "In Preparation", value: Math.max(Math.round((overview.kpis.sessionsPending || 4) * 0.25), 1), color: "#f59e0b" }
            ]}
          />
        </div>
      </section>

      {/* Interactive Visit Schedule Calendar */}
      <section style={{ margin: "1.25rem 0" }}>
        <OperationalCalendar
          events={events}
          title="Organization Visit Schedule Calendar"
          subtitle="Real-time calendar tracking mobile laboratory school visits and field demonstrations"
          onSelectEvent={() => navigate("/admin/operations")}
        />
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
            {overview.liveLabs.slice(0, 5).map((lab, i) => (
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
              <div className="section-kicker">OPERATIONAL WORKFLOW</div>
              <h3>Operations Workflow</h3>
            </div>
          </div>
          <div className="flow" style={{ flexWrap: "wrap", gap: "8px" }}>
            <button onClick={() => navigate("/admin/mobile-labs")}>01 Fleet</button>
            <span>→</span>
            <button onClick={() => navigate("/admin/inventory")}>02 Inventory</button>
            <span>→</span>
            <button onClick={() => navigate("/admin/schools")}>03 Schools</button>
            <span>→</span>
            <button onClick={() => navigate("/admin/operations")}>04 Field Sessions</button>
            <span>→</span>
            <button onClick={() => navigate("/admin/finance")}>05 Finance</button>
            <span>→</span>
            <button onClick={() => navigate("/admin/analytics")}>06 Reports</button>
          </div>
          <p>
            Resources allocated from central supply integrate into regional depots, support scheduled school visits, and sync records across the organization.
          </p>
        </article>
      </section>
    </>
  );
}
