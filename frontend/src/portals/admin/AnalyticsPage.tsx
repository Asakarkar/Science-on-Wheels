import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  Bus,
  School,
  Users,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Microscope,
  Package,
  UserCircle,
  AlertCircle,
  BookOpen,
  ArrowUpDown,
  Download,
  RefreshCw,
  TrendingUp,
  Activity,
  Layers
} from "lucide-react";
import { apiClient, downloadCsv, API_BASE_URL } from "../../services/api-client";
import { MetricCard } from "../../shared/components/MetricCard";
import { HorizontalBarChart, DonutChart } from "../../shared/components/Charts";

export interface OperationalSummary {
  regions: number;
  labs: number;
  schools: number;
  students: number;
  events: number;
  completedEvents: number;
  trips: number;
  completedTrips: number;
  equipment: number;
  consumables: number;
  users: number;
  issues: number;
  curriculumNodes: number;
  inventoryTransactions: number;
}

const analyticsResource: Record<string, string> = {
  Overview: "regions",
  Organization: "regions",
  Regions: "regions",
  Schools: "schools",
  Labs: "labs",
  Students: "students",
  Sessions: "events",
  Inventory: "consumables",
  Staff: "users"
};

const subOptions = [
  "Overview",
  "Organization",
  "Regions",
  "Schools",
  "Labs",
  "Students",
  "Sessions",
  "Inventory",
  "Staff"
];

const reports = [
  { title: "Organization Summary", res: "regions", desc: "Regional hierarchy & operational boundaries" },
  { title: "Regional Operations", res: "regions", desc: "Territory-level performance & bus allocation" },
  { title: "Mobile Laboratory Fleet", res: "labs", desc: "Bus readiness, registration & maintenance" },
  { title: "Partner School Directory", res: "schools", desc: "School affiliations, reach & facilities" },
  { title: "Field Session Logs", res: "events", desc: "Completed & scheduled laboratory visits" },
  { title: "Student Reach & Attendance", res: "students", desc: "Student engagement & session footprints" },
  { title: "Science Experiments", res: "experiments", desc: "Curriculum experimental modules & protocols" },
  { title: "Equipment Register", res: "equipment", desc: "Asset condition, tracking & allocations" },
  { title: "Inventory & Consumables", res: "consumables", desc: "Stock levels, chemicals & reorder metrics" },
  { title: "Staff & Field Personnel", res: "users", desc: "Field instructors, drivers & coordinators" }
];

export function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const sub = searchParams.get("sub") || "Overview";
  const [summary, setSummary] = useState<OperationalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const resource = analyticsResource[sub] || "regions";

  async function loadData(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      const data = await apiClient<OperationalSummary>("/super-admin/reports/summary");
      setSummary(data);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err) {
      console.error("Unable to load operational analytics summary", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData(true);
  }, []);

  async function handleCsvDownload(res: string, title?: string) {
    try {
      setExporting(res);
      await downloadCsv(`/super-admin/reports/${res}.csv`, `${res}_report_${new Date().toISOString().split("T")[0]}`);
    } catch {
      // Fallback in case browser blocks stream
      const fallbackUrl = `${API_BASE_URL}/super-admin/reports/${res}.csv`;
      window.open(fallbackUrl, "_blank");
    } finally {
      setExporting(null);
    }
  }

  // Derive key operational health indicators
  const derivedStats = useMemo(() => {
    if (!summary) return null;
    const completionRate = summary.events > 0
      ? Math.round((summary.completedEvents / summary.events) * 100)
      : 0;
    const tripRate = summary.trips > 0
      ? Math.round((summary.completedTrips / summary.trips) * 100)
      : 100;
    const avgEquipmentPerLab = summary.labs > 0
      ? (summary.equipment / summary.labs).toFixed(1)
      : "0";
    const pendingEvents = Math.max((summary.events || 0) - (summary.completedEvents || 0), 0);

    return {
      completionRate,
      tripRate,
      avgEquipmentPerLab,
      pendingEvents
    };
  }, [summary]);

  // Full structured mapping of all 14 database metrics
  const allMetricCards = useMemo(() => {
    if (!summary) return [];

    return [
      {
        id: "regions",
        label: "Operational Regions",
        value: summary.regions,
        detail: "Active administrative zones",
        tone: "info",
        icon: <MapPin size={18} />,
        domains: ["Overview", "Organization", "Regions"],
        actionPath: "/admin/organization"
      },
      {
        id: "labs",
        label: "Mobile Science Labs",
        value: summary.labs,
        detail: `${summary.labs} mobile vans deployed`,
        tone: "violet",
        icon: <Bus size={18} />,
        domains: ["Overview", "Organization", "Labs"],
        actionPath: "/admin/mobile-labs"
      },
      {
        id: "schools",
        label: "Partner Schools",
        value: summary.schools,
        detail: "Institutional network footprint",
        tone: "default",
        icon: <School size={18} />,
        domains: ["Overview", "Organization", "Schools"],
        actionPath: "/admin/schools"
      },
      {
        id: "students",
        label: "Registered Students",
        value: summary.students,
        detail: "Active student portal profiles",
        tone: "default",
        icon: <Users size={18} />,
        domains: ["Overview", "Organization", "Students", "Schools"]
      },
      {
        id: "events",
        label: "Science Sessions",
        value: summary.events,
        detail: `${summary.completedEvents} completed visits`,
        tone: "default",
        icon: <CalendarDays size={18} />,
        domains: ["Overview", "Organization", "Sessions"],
        actionPath: "/admin/operations"
      },
      {
        id: "completedEvents",
        label: "Completed Sessions",
        value: summary.completedEvents,
        detail: `${derivedStats?.completionRate ?? 0}% field delivery rate`,
        tone: "success",
        icon: <CheckCircle2 size={18} />,
        domains: ["Overview", "Organization", "Sessions"]
      },
      {
        id: "trips",
        label: "Fleet Trips",
        value: summary.trips,
        detail: "Dispatched transit routes",
        tone: "default",
        icon: <ArrowUpDown size={18} />,
        domains: ["Overview", "Organization", "Labs"]
      },
      {
        id: "completedTrips",
        label: "Completed Trips",
        value: summary.completedTrips,
        detail: `${summary.completedTrips} transit legs completed`,
        tone: "default",
        icon: <ClipboardCheck size={18} />,
        domains: ["Overview", "Organization", "Labs"]
      },
      {
        id: "equipment",
        label: "Lab Equipment Units",
        value: summary.equipment,
        detail: `${derivedStats?.avgEquipmentPerLab ?? 0} units / active van`,
        tone: "default",
        icon: <Microscope size={18} />,
        domains: ["Overview", "Organization", "Inventory"],
        actionPath: "/admin/inventory"
      },
      {
        id: "consumables",
        label: "Inventory Consumables",
        value: summary.consumables,
        detail: "Chemical & supply catalog items",
        tone: "default",
        icon: <Package size={18} />,
        domains: ["Overview", "Organization", "Inventory"],
        actionPath: "/admin/inventory"
      },
      {
        id: "users",
        label: "Active Personnel",
        value: summary.users,
        detail: "Instructors, drivers & coordinators",
        tone: "violet",
        icon: <UserCircle size={18} />,
        domains: ["Overview", "Organization", "Staff"],
        actionPath: "/admin/users"
      },
      {
        id: "issues",
        label: "Operational Issues",
        value: summary.issues,
        detail: summary.issues === 0 ? "0 active operational blockers" : `${summary.issues} pending field tickets`,
        tone: summary.issues > 0 ? "alert" : "success",
        icon: <AlertCircle size={18} />,
        domains: ["Overview", "Organization", "Staff"]
      },
      {
        id: "curriculumNodes",
        label: "Curriculum Modules",
        value: summary.curriculumNodes,
        detail: "Standardized science experiment units",
        tone: "default",
        icon: <BookOpen size={18} />,
        domains: ["Overview", "Organization", "Schools"]
      },
      {
        id: "inventoryTransactions",
        label: "Supply Transactions",
        value: summary.inventoryTransactions,
        detail: "Central & depot movement logs",
        tone: "info",
        icon: <Layers size={18} />,
        domains: ["Overview", "Organization", "Inventory"],
        actionPath: "/admin/inventory-allocation"
      }
    ];
  }, [summary, derivedStats]);

  // Filtered metrics for currently selected domain
  const visibleCards = useMemo(() => {
    if (!summary) return [];
    if (sub === "Overview" || sub === "Organization") {
      return allMetricCards;
    }
    const filtered = allMetricCards.filter((c) => c.domains.includes(sub));
    return filtered.length > 0 ? filtered : allMetricCards;
  }, [allMetricCards, sub, summary]);

  return (
    <div className="portal-module analytics-page">
      {/* Subnavigation Bar */}
      <div
        className="subnav-tabs"
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          borderBottom: "1px solid var(--border, #e2e8f0)",
          paddingBottom: "0.75rem"
        }}
      >
        {subOptions.map((opt) => {
          const isActive = sub === opt;
          return (
            <button
              key={opt}
              type="button"
              className={`ghost ${isActive ? "primary" : ""}`}
              onClick={() => setSearchParams({ sub: opt })}
              style={{
                padding: "0.45rem 0.95rem",
                borderRadius: "var(--r-md, 8px)",
                background: isActive ? "var(--brand, #0F172A)" : "var(--surface-0, #ffffff)",
                color: isActive ? "#ffffff" : "var(--text-muted, #475569)",
                border: isActive ? "1px solid var(--brand, #0F172A)" : "1px solid var(--border, #e2e8f0)",
                fontWeight: isActive ? 700 : 500,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all var(--dur-base, 0.15s) var(--ease, ease)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Module Header */}
      <div className="module-head" style={{ marginBottom: "1.5rem" }}>
        <div>
          <div className="section-kicker">
            ADMIN DASHBOARD / OPERATIONAL ANALYTICS {sub !== "Overview" && `· ${sub.toUpperCase()}`}
          </div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0.25rem 0 0.5rem" }}>
            {sub === "Overview" ? "Operational Analytics & Telemetry" : `${sub} Analytics`}
          </h2>
          <p style={{ color: "var(--text-muted, #475569)", fontSize: "0.92rem", margin: 0, maxWidth: "780px" }}>
            Live database aggregation of institutional outreach, mobile science laboratory deployment, field visit
            completion rates, and central inventory telemetry.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="ghost"
            onClick={() => void loadData(false)}
            disabled={refreshing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "0.55rem 0.95rem",
              fontSize: "13px",
              borderRadius: "var(--r-md, 8px)",
              cursor: refreshing ? "not-allowed" : "pointer"
            }}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Updating…" : "Refresh Telemetry"}
          </button>

          <button
            type="button"
            className="primary"
            onClick={() => void handleCsvDownload(resource, sub)}
            disabled={exporting !== null}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "0.55rem 1.1rem",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "var(--r-md, 8px)",
              cursor: exporting ? "not-allowed" : "pointer",
              backgroundColor: "var(--accent, #2563EB)",
              color: "#ffffff"
            }}
          >
            <Download size={15} />
            {exporting === resource ? "Exporting…" : `Export ${sub} CSV`}
          </button>
        </div>
      </div>

      {/* Telemetry Progress & Operational Health Bar */}
      {summary && derivedStats && (
        <div className="telemetry-progress-banner">
          <div className="telemetry-header">
            <div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#38BDF8",
                  marginBottom: "4px"
                }}
              >
                <Activity size={14} /> Real-Time Database Operations Telemetry
              </span>
              <h3>Science Outreach Fleet & Operational Delivery</h3>
            </div>
            {lastRefreshed && (
              <span style={{ fontSize: "12px", color: "#94A3B8" }}>
                Last synced at: {lastRefreshed}
              </span>
            )}
          </div>

          {/* Delivery Completion Progress Bar */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
                fontSize: "13px"
              }}
            >
              <span>Field Session Delivery Completion ({summary.completedEvents} / {summary.events} visits)</span>
              <strong style={{ color: "#34D399" }}>{derivedStats.completionRate}% Conducted</strong>
            </div>
            <div
              style={{
                width: "100%",
                height: "10px",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                borderRadius: "999px",
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  width: `${Math.min(derivedStats.completionRate, 100)}%`,
                  height: "100%",
                  backgroundColor: "#10B981",
                  borderRadius: "999px",
                  transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
              />
            </div>
          </div>

          {/* Telemetry Metric Highlights */}
          <div className="telemetry-metrics-bar">
            <div className="telemetry-metric-item">
              <span>Mobile Fleet Units</span>
              <strong>{summary.labs} Mobile Labs</strong>
            </div>
            <div className="telemetry-metric-item">
              <span>Partner Schools</span>
              <strong>{summary.schools} Connected</strong>
            </div>
            <div className="telemetry-metric-item">
              <span>Scheduled Sessions</span>
              <strong>{summary.events} Events</strong>
            </div>
            <div className="telemetry-metric-item">
              <span>Supply Chain Activity</span>
              <strong>{summary.inventoryTransactions} Transactions</strong>
            </div>
          </div>
        </div>
      )}

      {/* Main KPI Metric Cards Grid */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.85rem",
            flexWrap: "wrap",
            gap: "8px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingUp size={18} style={{ color: "var(--accent, #2563EB)" }} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
              {sub === "Overview" ? "All Operational Metrics (Live Database Aggregate)" : `${sub} Key Performance Indicators`}
            </h3>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-subtle)", fontFamily: "var(--font-mono)" }}>
            Showing {visibleCards.length} metrics
          </span>
        </div>

        {loading ? (
          <div className="loading-state" style={{ padding: "3rem", background: "var(--surface-0)", borderRadius: "var(--r-xl)", border: "1px solid var(--border)" }}>
            <div className="loader-ring" />
            <p style={{ marginTop: "1rem", color: "var(--text-muted)", fontSize: "14px" }}>
              Loading operational analytics from live database…
            </p>
          </div>
        ) : (
          <section className="metric-grid">
            {visibleCards.map((card) => (
              <MetricCard
                key={card.id}
                label={card.label}
                value={card.value}
                detail={card.detail}
                tone={card.tone}
                icon={card.icon}
                onClick={card.actionPath ? () => navigate(card.actionPath!) : undefined}
              />
            ))}
          </section>
        )}
      </div>

      {/* Operational Charts and Analytics Visuals */}
      {summary && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
          <HorizontalBarChart
            title="Operational Reach & Resource Metrics"
            subtitle="Live database aggregation of institutional network, mobile labs and supply items"
            data={[
              { label: "Partner Schools Connected", value: summary.schools || 0, color: "#4f46e5" },
              {
                label: "Mobile Science Labs Deployed",
                value: summary.labs || 0,
                total: 5,
                color: "#10b981",
                detail: `${summary.labs || 0} / 5 max capacity`
              },
              {
                label: "Field Visits Hosted",
                value: summary.events || 0,
                color: "#06b6d4",
                detail: `${summary.completedEvents || 0} completed visits`
              },
              { label: "Active Field Personnel", value: summary.users || 0, color: "#f59e0b" },
              { label: "Supply Chain Items", value: summary.consumables || 0, color: "#8b5cf6" }
            ]}
          />

          <DonutChart
            title="Field Session Delivery"
            subtitle="Ratio of completed visits to scheduled mobile laboratory stops"
            centerLabel="Total Visits"
            centerValue={summary.events || 0}
            data={[
              { label: "Completed Visits", value: summary.completedEvents || 0, color: "#10b981" },
              {
                label: "Scheduled / In Progress",
                value: Math.max((summary.events || 0) - (summary.completedEvents || 0), 0),
                color: "#4f46e5"
              }
            ]}
          />
        </section>
      )}

      {/* Available Report Outputs / CSV Exporters */}
      <div className="surface analytics-panel" style={{ marginTop: "1.75rem" }}>
        <div className="surface-head">
          <div>
            <div className="section-kicker">REPORTING & AUDIT EXPORTS</div>
            <h3 style={{ margin: "4px 0 0 0" }}>Available Report Outputs & Data Tables</h3>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-subtle)", fontFamily: "var(--font-mono)" }}>
            Format: UTF-8 RFC 4180 CSV
          </span>
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px", marginBottom: "16px" }}>
          Generate certified point-in-time CSV and Excel exports directly from the live operational database for
          regional stakeholders, ministry reporting, and supply inventory reconciliation.
        </p>

        <div className="report-grid">
          {reports.map((r) => {
            const isCurrentExport = exporting === r.res;
            return (
              <button
                key={r.title}
                type="button"
                className="report-card-button"
                onClick={() => void handleCsvDownload(r.res, r.title)}
                disabled={exporting !== null}
                style={{ opacity: exporting && !isCurrentExport ? 0.6 : 1 }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--text-primary)" }}>{r.title}</div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-subtle)", marginTop: "2px", lineHeight: 1.3 }}>
                    {r.desc}
                  </div>
                </div>
                <span>{isCurrentExport ? "Exporting…" : "CSV ↓"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
