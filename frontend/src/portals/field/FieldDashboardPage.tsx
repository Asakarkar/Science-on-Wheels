import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { OperationalCalendar, type CalendarEvent } from "../../shared/components/OperationalCalendar";
import { DonutChart, HorizontalBarChart } from "../../shared/components/Charts";

interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  assignedBus: {
    id: string;
    registrationNumber: string;
    model: string;
    seatingCapacity: number;
    status: string;
    equipmentCount: number;
  } | null;
  kpis: {
    todayVisits: number;
    completedToday: number;
    upcomingVisits: number;
    pendingReports: number;
    inventoryAlerts: number;
    openIssues: number;
  };
  todayVisits: Array<{
    id: string;
    eventCode: string;
    startTime: string;
    endTime: string;
    status: string;
    expectedStudentCount: number;
    reportStatus?: string | null;
    School?: {
      id: string;
      name: string;
      address?: string;
      contactPerson?: string;
      contactPhone?: string;
    };
    Bus?: {
      registrationNumber: string;
    };
  }>;
  upcomingVisits: any[];
  pendingTasks: Array<{
    id: string;
    title: string;
    category: string;
    priority: string;
    actionPath: string;
  }>;
  inventoryAlerts: Array<{
    type: string;
    title: string;
    details: string;
  }>;
}

export function FieldDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [fieldEvents, setFieldEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const navigate = useNavigate();

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");
      const [res, eventsRes] = await Promise.all([
        apiClient<DashboardData>("/field/dashboard"),
        apiClient<{ rows: any[] }>("/field/events").catch(() => ({ rows: [] }))
      ]);
      setData(res);
      setFieldEvents(
        (eventsRes.rows || []).map((ev: any) => ({
          id: ev.id,
          eventCode: ev.eventCode,
          title: ev.School?.name || ev.eventCode || "School Visit",
          schoolName: ev.School?.name || "School Visit",
          eventDate: ev.eventDate,
          startTime: ev.startTime,
          endTime: ev.endTime,
          busCode: ev.Bus?.registrationNumber || ev.Bus?.busCode,
          status: ev.status,
          location: ev.School?.address
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load field dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function handleQuickStatus(eventId: string, newStatus: string) {
    try {
      setActionMsg("");
      await apiClient(`/field/visits/${eventId}/status`, {
        method: "POST",
        body: JSON.stringify({ status: newStatus }),
      });
      setActionMsg(`Visit marked as ${newStatus}`);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update visit status");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-charcoal-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone border-t-[#176B50] mb-3" />
        <span className="font-mono text-xs">Loading Field Command Dashboard...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="surface p-6 max-w-xl mx-auto my-8 border border-stone rounded-xl text-center">
        <div className="text-3xl mb-2">⚠️</div>
        <h2 className="text-lg font-bold text-charcoal mb-1">Unable to Load Dashboard</h2>
        <p className="text-xs text-charcoal-muted mb-4">{error || "No operational data available."}</p>
        <button
          className="btn btn-primary"
          style={{ backgroundColor: "#176B50" }}
          onClick={() => void loadDashboard()}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Operational Shift Status */}
      <div className="surface p-5 border border-stone rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] font-bold tracking-wider text-emerald-800 uppercase">
              Field Operations Terminal Active
            </span>
          </div>
          <h1 className="text-xl font-bold text-charcoal mt-1">
            Welcome back, {data.user.name || "Science Communicator"}
          </h1>
          <p className="text-xs text-charcoal-muted">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
            {" • "}
            {data.assignedBus
              ? `Assigned Mobile Lab: ${data.assignedBus.registrationNumber} (${data.assignedBus.model})`
              : "No vehicle assigned currently"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/field/inventory"
            className="btn btn-secondary text-xs flex items-center space-x-1 border border-stone"
          >
            <span>🚌</span>
            <span>Bus Stock & Verification</span>
          </Link>
          <Link
            to="/field/issues"
            className="btn btn-primary text-xs flex items-center space-x-1"
            style={{ backgroundColor: "#176B50" }}
          >
            <span>⚠️</span>
            <span>Report Issue</span>
          </Link>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <span>✓ {actionMsg}</span>
          <button onClick={() => setActionMsg("")} className="font-bold">×</button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="surface p-4 border border-stone rounded-xl bg-white shadow-xs">
          <span className="text-[11px] font-medium text-charcoal-muted uppercase block">Today's Visits</span>
          <div className="flex items-baseline justify-between mt-2">
            <strong className="text-2xl font-bold text-charcoal">{data.kpis.todayVisits}</strong>
            <span className="text-xs text-charcoal-subtle">🏫</span>
          </div>
        </div>

        <div className="surface p-4 border border-stone rounded-xl bg-white shadow-xs">
          <span className="text-[11px] font-medium text-charcoal-muted uppercase block">Completed Today</span>
          <div className="flex items-baseline justify-between mt-2">
            <strong className="text-2xl font-bold text-emerald-700">{data.kpis.completedToday}</strong>
            <span className="text-xs text-emerald-600">✓</span>
          </div>
        </div>

        <div className="surface p-4 border border-stone rounded-xl bg-white shadow-xs">
          <span className="text-[11px] font-medium text-charcoal-muted uppercase block">Upcoming (14d)</span>
          <div className="flex items-baseline justify-between mt-2">
            <strong className="text-2xl font-bold text-charcoal">{data.kpis.upcomingVisits}</strong>
            <span className="text-xs text-charcoal-subtle">📅</span>
          </div>
        </div>

        <div className="surface p-4 border border-stone rounded-xl bg-white shadow-xs">
          <span className="text-[11px] font-medium text-charcoal-muted uppercase block">Pending Reports</span>
          <div className="flex items-baseline justify-between mt-2">
            <strong className="text-2xl font-bold text-amber-600">{data.kpis.pendingReports}</strong>
            <span className="text-xs text-amber-500">📝</span>
          </div>
        </div>

        <div className="surface p-4 border border-stone rounded-xl bg-white shadow-xs">
          <span className="text-[11px] font-medium text-charcoal-muted uppercase block">Inventory Alerts</span>
          <div className="flex items-baseline justify-between mt-2">
            <strong className="text-2xl font-bold text-rose-600">{data.kpis.inventoryAlerts}</strong>
            <span className="text-xs text-rose-500">⚡</span>
          </div>
        </div>

        <div className="surface p-4 border border-stone rounded-xl bg-white shadow-xs">
          <span className="text-[11px] font-medium text-charcoal-muted uppercase block">My Open Issues</span>
          <div className="flex items-baseline justify-between mt-2">
            <strong className="text-2xl font-bold text-charcoal">{data.kpis.openIssues}</strong>
            <span className="text-xs text-charcoal-subtle">⚠️</span>
          </div>
        </div>
      </div>

      {/* Visual Charts & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HorizontalBarChart
          title="Field Delivery & Visit Progress"
          subtitle="Your on-site science demonstrations and visit completion rate"
          data={[
            { label: "Completed Visits", value: data.kpis.completedToday, total: Math.max(data.kpis.todayVisits || 1, 1), color: "#10b981", detail: "Today" },
            { label: "Upcoming Schedule (14d)", value: data.kpis.upcomingVisits, color: "#4f46e5" },
            { label: "Pending Visit Reports", value: data.kpis.pendingReports, color: "#f59e0b" },
            { label: "Bus Equipment Checked", value: data.assignedBus?.equipmentCount || 0, color: "#06b6d4", detail: "Reusable kits" }
          ]}
        />
        <DonutChart
          title="Visit Execution Distribution"
          subtitle="Overview of assigned visits and pending documentation"
          centerLabel="Assigned"
          centerValue={data.kpis.todayVisits + data.kpis.upcomingVisits}
          data={[
            { label: "Completed", value: data.kpis.completedToday, color: "#10b981" },
            { label: "Scheduled", value: data.kpis.upcomingVisits, color: "#4f46e5" },
            { label: "Pending Report", value: data.kpis.pendingReports, color: "#f59e0b" }
          ]}
        />
      </div>

      {/* Interactive Operational Schedule Calendar */}
      <div>
        <OperationalCalendar
          events={fieldEvents}
          title="My Field Visit Calendar"
          subtitle="Interactive schedule of your assigned mobile science lab stops and schools"
          onSelectEvent={() => navigate("/field/visits")}
        />
      </div>

      {/* Main Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Schedule & Action Hub */}
        <div className="lg:col-span-2 space-y-6">
          <div className="surface border border-stone rounded-xl bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider">
                  Today's Scheduled School Visits
                </h2>
                <span className="text-[11px] text-charcoal-muted">
                  Execute sessions, record attendance, and complete field logs
                </span>
              </div>
              <Link to="/field/visits" className="text-xs font-semibold text-[#176B50] hover:underline">
                View All Visits →
              </Link>
            </div>

            <div className="divide-y divide-stone">
              {data.todayVisits.length === 0 ? (
                <div className="p-8 text-center text-charcoal-muted">
                  <div className="text-2xl mb-1">☕</div>
                  <p className="text-xs font-medium">No school visits scheduled for today.</p>
                  <p className="text-[11px] text-charcoal-subtle mt-1">
                    Check your upcoming calendar or perform vehicle and stock maintenance.
                  </p>
                </div>
              ) : (
                data.todayVisits.map((v) => {
                  const isOnSite = v.status === "ON_SITE";
                  const isCompleted = v.status === "COMPLETED";

                  return (
                    <div key={v.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone/10 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                            isCompleted ? "bg-emerald-100 text-emerald-800" :
                            isOnSite ? "bg-blue-100 text-blue-800" :
                            "bg-amber-100 text-amber-800"
                          }`}>
                            {v.status}
                          </span>
                          <span className="font-mono text-xs text-charcoal-subtle">
                            {v.startTime} – {v.endTime}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-charcoal">
                          {v.School?.name || "Target School"}
                        </h3>
                        <p className="text-xs text-charcoal-muted">
                          📍 {v.School?.address || "Address on file"}
                          {" • "}
                          👥 Expected Students: <strong>{v.expectedStudentCount}</strong>
                          {v.School?.contactPerson && ` • Contact: ${v.School.contactPerson} (${v.School.contactPhone || ""})`}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {v.status === "SCHEDULED" && (
                          <button
                            onClick={() => handleQuickStatus(v.id, "ON_SITE")}
                            className="btn btn-sm btn-primary text-xs"
                            style={{ backgroundColor: "#176B50" }}
                          >
                            Mark Arrived (On-Site)
                          </button>
                        )}

                        {isOnSite && (
                          <>
                            <button
                              onClick={() => handleQuickStatus(v.id, "COMPLETED")}
                              className="btn btn-sm bg-emerald-700 text-white hover:bg-emerald-800 text-xs"
                            >
                              Complete Visit
                            </button>
                            <Link
                              to="/field/inventory"
                              className="btn btn-sm btn-secondary text-xs border border-stone"
                            >
                              Log Materials
                            </Link>
                          </>
                        )}

                        {isCompleted && (
                          <Link
                            to={`/field/reports`}
                            className="btn btn-sm btn-secondary text-xs border border-stone text-[#176B50] font-semibold"
                          >
                            {v.reportStatus ? `Report: ${v.reportStatus}` : "Submit Report →"}
                          </Link>
                        )}

                        <button
                          onClick={() => navigate(`/field/visits`)}
                          className="btn btn-sm btn-secondary text-xs border border-stone"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pending Tasks & Operational Checklist */}
          <div className="surface border border-stone rounded-xl bg-white shadow-xs p-5">
            <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider mb-1">
              Required Operational Tasks
            </h2>
            <p className="text-xs text-charcoal-muted mb-4">
              Action items requiring your attention before and after school sessions
            </p>

            <div className="space-y-2">
              {data.pendingTasks.length === 0 ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
                  <span>✓</span>
                  <span>All routine checklists and visit reports are up to date!</span>
                </div>
              ) : (
                data.pendingTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 border border-stone rounded-lg flex items-center justify-between hover:bg-stone/10 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`h-2 w-2 rounded-full ${
                        t.priority === "URGENT" ? "bg-rose-500" :
                        t.priority === "HIGH" ? "bg-amber-500" : "bg-blue-500"
                      }`} />
                      <div>
                        <span className="text-xs font-semibold text-charcoal block">{t.title}</span>
                        <span className="text-[10px] font-mono text-charcoal-subtle uppercase">{t.category}</span>
                      </div>
                    </div>
                    <Link
                      to={t.actionPath}
                      className="text-xs font-semibold text-[#176B50] hover:underline"
                    >
                      Open Task →
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Bus Details & Stock Alerts */}
        <div className="space-y-6">
          {/* Assigned Bus Card */}
          <div className="surface border border-stone rounded-xl bg-white shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider">
                Assigned Mobile Lab
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 rounded-full">
                {data.assignedBus?.status || "STANDBY"}
              </span>
            </div>

            {data.assignedBus ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-stone/20 rounded-lg">
                  <div className="font-mono text-sm font-bold text-charcoal">
                    {data.assignedBus.registrationNumber}
                  </div>
                  <div className="text-charcoal-muted text-[11px]">
                    {data.assignedBus.model}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-charcoal-muted">
                  <div className="p-2 border border-stone rounded-md">
                    <span className="text-[10px] uppercase block">Capacity</span>
                    <strong className="text-charcoal">{data.assignedBus.seatingCapacity} Staff / Lab Seats</strong>
                  </div>
                  <div className="p-2 border border-stone rounded-md">
                    <span className="text-[10px] uppercase block">Equipment</span>
                    <strong className="text-charcoal">{data.assignedBus.equipmentCount} Reusable Assets</strong>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <Link
                    to="/field/inventory"
                    className="btn btn-sm btn-secondary w-full text-center border border-stone text-xs"
                  >
                    Inventory Hub
                  </Link>
                  <Link
                    to="/field/profile"
                    className="btn btn-sm btn-secondary w-full text-center border border-stone text-xs"
                  >
                    Bus Details
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-xs text-charcoal-muted py-4 text-center">
                No mobile laboratory bus currently assigned to your account.
              </div>
            )}
          </div>

          {/* Bus Stock & Equipment Alerts */}
          <div className="surface border border-stone rounded-xl bg-white shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider">
                Stock & Asset Alerts
              </h2>
              <span className="text-xs text-charcoal-subtle">
                {data.inventoryAlerts.length} Active
              </span>
            </div>

            {data.inventoryAlerts.length === 0 ? (
              <div className="text-xs text-charcoal-muted text-center py-4 bg-emerald-50 rounded-lg text-emerald-800">
                ✓ All consumables and laboratory equipment meet operational levels.
              </div>
            ) : (
              <div className="space-y-2">
                {data.inventoryAlerts.slice(0, 5).map((alert, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 border border-stone rounded-lg text-xs hover:bg-stone/10"
                  >
                    <div className="font-semibold text-rose-700 flex items-center space-x-1.5">
                      <span>•</span>
                      <span>{alert.title}</span>
                    </div>
                    <p className="text-[11px] text-charcoal-muted mt-0.5">{alert.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
