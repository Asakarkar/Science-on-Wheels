import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../services/api-client";
import { BrandLogo } from "../../../shared/components/BrandLogo";

interface RegionalDashboardData {
  region: {
    id: string;
    name: string;
    state?: string;
    adminName?: string;
    adminEmail?: string;
  };
  kpis: {
    totalSchools: number;
    activeBuses: number;
    maintenanceBuses: number;
    totalBuses: number;
    totalStaff: number;
    activeStaff: number;
    studentsReached: number;
    todayVisits: number;
    upcomingVisits: number;
    completedVisits: number;
    scheduledVisits: number;
    pendingReviews: number;
    consumablesAvailable: number;
    consumablesItemsCount: number;
    equipmentTotal: number;
    equipmentAvailable: number;
    equipmentAllocated: number;
    equipmentDamaged: number;
    equipmentMaintenance: number;
    lowStockCount: number;
    expiredConsumablesCount: number;
    pendingAllocationsCount: number;
    operationalIssues: number;
    districts: number;
    blocks: number;
  };
  labs: Array<{
    id: string;
    busCode: string;
    registrationNumber: string;
    status: string;
    currentLat: number | null;
    currentLng: number | null;
    driverName?: string;
    equipmentCount?: number;
    lastMaintenance?: string | null;
  }>;
  alerts: Array<{ severity: string; type: string; title: string; detail: string }>;
  recentActivity: any[];
  generatedAt: string;
}

function StatCard({
  label,
  value,
  subtext,
  accent = "cyan",
  onClick,
}: {
  label: string;
  value: any;
  subtext?: string;
  accent?: string;
  onClick?: () => void;
}) {
  const displayVal = typeof value === "number" ? value.toLocaleString() : value ?? "0";
  return (
    <div
      className={`kpi-card ${accent} ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      <div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-charcoal-muted block">{label}</span>
        <strong className="text-2xl font-bold tracking-tight text-charcoal block">{displayVal}</strong>
      </div>
      {subtext && <span className="font-mono text-[10px] text-charcoal-subtle block mt-1">{subtext}</span>}
    </div>
  );
}

export function RegionalDashboardPage() {
  const [data, setData] = useState<RegionalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<RegionalDashboardData>("/regional-admin/overview");
      setData(res);
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
      <div className="loading-state p-12 text-center font-mono text-sm">
        <div className="loader-ring mx-auto mb-4" />
        Loading regional command center…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="error-state p-8">
        <div className="surface max-w-md mx-auto p-6 text-center rounded-lg shadow-sm">
          <h3 className="text-crimson font-bold text-lg mb-2">Unable to Load Regional Operations</h3>
          <p className="text-charcoal-muted text-sm mb-4">{error || "Unexpected error occurred."}</p>
          <button className="primary font-mono text-xs px-4 py-2" onClick={() => void load()}>
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const k = data.kpis;

  return (
    <div className="space-y-6">
      {/* SECTION A: REGIONAL OVERVIEW HERO (Section 4.1.A) */}
      <div className="command-hero regional-hero">
        <div>
          <div className="eyebrow">REGIONAL COMMAND CENTER</div>
          <h2>{data.region?.name || "Operational Region"}</h2>
          <p>
            Centralized operational management for STEM education across {k.districts || 0} districts and {k.blocks || 0} blocks.
          </p>
          <div className="hero-meta">
            <span>Region: {data.region?.name}</span>
            <span>State: {data.region?.state || "State"}</span>
            <span>Admin: {data.region?.adminName || "Regional Admin"}</span>
            <span>Fleet: {k.totalBuses} Mobile Labs</span>
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

      {/* ACTIONABLE WORKFLOW BANNERS (Section 4.1.E) */}
      {(k.pendingAllocationsCount > 0 || k.pendingReviews > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {k.pendingAllocationsCount > 0 && (
            <div className="border border-blue-200 bg-blue-50/70 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📦</span>
                <div>
                  <strong className="text-sm font-semibold text-blue-950 block">
                    {k.pendingAllocationsCount} Central Stock Shipment(s) Ready for Receipt
                  </strong>
                  <span className="text-xs text-blue-800">
                    Dispatched from HQ. Verify quantities and confirm arrival into your regional depot.
                  </span>
                </div>
              </div>
              <button
                className="btn primary text-xs font-mono shrink-0 ml-4 px-3 py-1.5"
                onClick={() => navigate("/regional/inventory-allocation")}
              >
                Confirm Receipt →
              </button>
            </div>
          )}

          {k.pendingReviews > 0 && (
            <div className="border border-amber-200 bg-amber-50/70 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📝</span>
                <div>
                  <strong className="text-sm font-semibold text-amber-950 block">
                    {k.pendingReviews} Field Visit Report(s) Awaiting Review
                  </strong>
                  <span className="text-xs text-amber-800">
                    Field Staff submitted visit session data and material usage for administrative approval.
                  </span>
                </div>
              </div>
              <button
                className="btn primary text-xs font-mono shrink-0 ml-4 px-3 py-1.5"
                onClick={() => navigate("/regional/field-reports")}
              >
                Review Reports →
              </button>
            </div>
          )}
        </div>
      )}

      {/* CORE STATS GRID */}
      <div className="kpi-grid">
        <StatCard
          label="Registered Schools"
          value={k.totalSchools}
          subtext={`${k.districts} districts covered`}
          onClick={() => navigate("/regional/schools")}
        />
        <StatCard
          label="Active Mobile Labs"
          value={k.activeBuses}
          subtext={`${k.maintenanceBuses} in maintenance`}
          onClick={() => navigate("/regional/mobile-labs")}
        />
        <StatCard
          label="Field Staff"
          value={k.activeStaff}
          subtext={`${k.totalStaff} total registered`}
          onClick={() => navigate("/regional/staff")}
        />
        <StatCard
          label="Students Reached"
          value={k.studentsReached}
          subtext="Total participant impact"
        />
        <StatCard
          label="Today's Visits"
          value={k.todayVisits}
          subtext={`${k.upcomingVisits} upcoming visits`}
          accent="amber"
          onClick={() => navigate("/regional/schedules")}
        />
        <StatCard
          label="Reports for Review"
          value={k.pendingReviews}
          subtext={`${k.completedVisits} completed visits`}
          accent={k.pendingReviews > 0 ? "warning" : "cyan"}
          onClick={() => navigate("/regional/field-reports")}
        />
        <StatCard
          label="Consumables Units"
          value={k.consumablesAvailable}
          subtext={`${k.lowStockCount} low-stock alerts`}
          accent={k.lowStockCount > 0 ? "warning" : "cyan"}
          onClick={() => navigate("/regional/inventory")}
        />
        <StatCard
          label="Equipment Assets"
          value={k.equipmentTotal}
          subtext={`${k.equipmentAllocated} on buses, ${k.equipmentDamaged} damaged`}
          accent={k.equipmentDamaged > 0 ? "coral" : "cyan"}
          onClick={() => navigate("/regional/inventory")}
        />
      </div>

      {/* TWO COLUMN DETAIL GRID: (Section B: Inventory & Section C: Visits) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION B: REGIONAL INVENTORY OVERVIEW */}
        <div className="surface p-5 rounded-lg border border-stone">
          <div className="module-head flex items-center justify-between mb-4">
            <div>
              <div className="section-kicker font-mono text-[10px] text-[#3D6B52] uppercase font-bold">
                INVENTORY OVERVIEW
              </div>
              <h3 className="text-base font-bold text-charcoal">Depot & Fleet Stock</h3>
            </div>
            <button
              className="ghost font-mono text-xs text-charcoal-muted hover:text-charcoal"
              onClick={() => navigate("/regional/inventory")}
            >
              Manage Inventory →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-stone-50 rounded border border-stone text-center">
              <span className="block font-mono text-[10px] text-charcoal-muted uppercase">Consumables</span>
              <strong className="text-lg text-charcoal font-bold">{k.consumablesAvailable}</strong>
              <span className="block text-[10px] text-charcoal-subtle">{k.consumablesItemsCount} catalogue items</span>
            </div>
            <div className="p-3 bg-stone-50 rounded border border-stone text-center">
              <span className="block font-mono text-[10px] text-charcoal-muted uppercase">Equipment</span>
              <strong className="text-lg text-charcoal font-bold">{k.equipmentTotal}</strong>
              <span className="block text-[10px] text-charcoal-subtle">{k.equipmentAvailable} available</span>
            </div>
            <div className="p-3 bg-stone-50 rounded border border-stone text-center">
              <span className="block font-mono text-[10px] text-charcoal-muted uppercase">Allocated</span>
              <strong className="text-lg text-charcoal font-bold">{k.equipmentAllocated}</strong>
              <span className="block text-[10px] text-charcoal-subtle">Onboard buses</span>
            </div>
            <div className="p-3 bg-stone-50 rounded border border-stone text-center">
              <span className="block font-mono text-[10px] text-charcoal-muted uppercase">Alerts</span>
              <strong className="text-lg text-amber-700 font-bold">{k.lowStockCount + k.expiredConsumablesCount}</strong>
              <span className="block text-[10px] text-charcoal-subtle">Low stock / Expired</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs p-2 bg-stone-50 rounded font-mono">
              <span className="text-charcoal font-medium">Pending Central Transfers (In-Transit from HQ)</span>
              <span className="font-bold text-blue-700">{k.pendingAllocationsCount} shipments</span>
            </div>
            <div className="flex items-center justify-between text-xs p-2 bg-stone-50 rounded font-mono">
              <span className="text-charcoal font-medium">Damaged or Maintenance Required Assets</span>
              <span className="font-bold text-red-600">{k.equipmentDamaged + k.equipmentMaintenance} items</span>
            </div>
            <div className="flex items-center justify-between text-xs p-2 bg-stone-50 rounded font-mono">
              <span className="text-charcoal font-medium">School-Allocated Items (Bus Physical Custody)</span>
              <span className="font-bold text-[#3D6B52]">Tracked via Ledger</span>
            </div>
          </div>
        </div>

        {/* SECTION C: SCHOOL VISIT WORKLOAD */}
        <div className="surface p-5 rounded-lg border border-stone">
          <div className="module-head flex items-center justify-between mb-4">
            <div>
              <div className="section-kicker font-mono text-[10px] text-[#3D6B52] uppercase font-bold">
                VISIT PIPELINE
              </div>
              <h3 className="text-base font-bold text-charcoal">Operations & Review Status</h3>
            </div>
            <button
              className="ghost font-mono text-xs text-charcoal-muted hover:text-charcoal"
              onClick={() => navigate("/regional/schedules")}
            >
              View Schedule →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-stone-50 rounded border border-stone text-center">
              <span className="block font-mono text-[10px] text-charcoal-muted uppercase">Today</span>
              <strong className="text-lg text-charcoal font-bold">{k.todayVisits}</strong>
              <span className="block text-[10px] text-charcoal-subtle">Active operations</span>
            </div>
            <div className="p-3 bg-stone-50 rounded border border-stone text-center">
              <span className="block font-mono text-[10px] text-charcoal-muted uppercase">Upcoming</span>
              <strong className="text-lg text-charcoal font-bold">{k.upcomingVisits}</strong>
              <span className="block text-[10px] text-charcoal-subtle">Next 30 days</span>
            </div>
            <div className="p-3 bg-stone-50 rounded border border-stone text-center">
              <span className="block font-mono text-[10px] text-charcoal-muted uppercase">Completed</span>
              <strong className="text-lg text-charcoal font-bold">{k.completedVisits}</strong>
              <span className="block text-[10px] text-charcoal-subtle">Finished sessions</span>
            </div>
            <div className="p-3 bg-stone-50 rounded border border-stone text-center">
              <span className="block font-mono text-[10px] text-charcoal-muted uppercase">Awaiting Review</span>
              <strong className="text-lg text-amber-700 font-bold">{k.pendingReviews}</strong>
              <span className="block text-[10px] text-charcoal-subtle">Reports pending</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs p-2 bg-stone-50 rounded font-mono">
              <span className="text-charcoal font-medium">Buses en-route / on-site today</span>
              <span className="font-bold text-emerald-700">
                {data.labs.filter((l) => ["ON_ROUTE", "AT_SCHOOL"].includes(l.status)).length} buses
              </span>
            </div>
            <div className="flex items-center justify-between text-xs p-2 bg-stone-50 rounded font-mono">
              <span className="text-charcoal font-medium">Operational issues requiring resolution</span>
              <span className="font-bold text-amber-700">{k.operationalIssues} open</span>
            </div>
            <div className="flex items-center justify-between text-xs p-2 bg-stone-50 rounded font-mono">
              <span className="text-charcoal font-medium">Field Staff deployment rate</span>
              <span className="font-bold text-charcoal">
                {k.totalStaff > 0 ? Math.round((k.activeStaff / k.totalStaff) * 100) : 100}% active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION D: REGIONAL BUS FLEET (Section 4.3) */}
      <div className="surface p-5 rounded-lg border border-stone">
        <div className="module-head flex items-center justify-between mb-4">
          <div>
            <div className="section-kicker font-mono text-[10px] text-[#3D6B52] uppercase font-bold">
              LABORATORY FLEET
            </div>
            <h3 className="text-base font-bold text-charcoal">Mobile Laboratory Fleet Status</h3>
          </div>
          <button
            className="ghost font-mono text-xs text-charcoal-muted hover:text-charcoal"
            onClick={() => navigate("/regional/mobile-labs")}
          >
            Manage Fleet →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.labs.map((lab) => (
            <div key={lab.id} className="p-4 border border-stone rounded-lg bg-white shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-charcoal">
                  {lab.busCode || lab.registrationNumber}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    lab.status === "AVAILABLE"
                      ? "bg-emerald-100 text-emerald-800"
                      : lab.status === "ON_ROUTE"
                      ? "bg-blue-100 text-blue-800"
                      : lab.status === "UNDER_MAINTENANCE"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-stone-200 text-stone-700"
                  }`}
                >
                  {lab.status}
                </span>
              </div>
              <div className="text-xs text-charcoal-muted space-y-1 font-mono">
                <div>Plate: {lab.registrationNumber}</div>
                <div>Primary Staff: {lab.driverName || "Unassigned"}</div>
                <div>Equipment on board: {lab.equipmentCount || 0} assets</div>
                <div>
                  Last Servicing:{" "}
                  {lab.lastMaintenance ? new Date(lab.lastMaintenance).toLocaleDateString() : "Up to date"}
                </div>
              </div>
            </div>
          ))}
          {data.labs.length === 0 && (
            <div className="col-span-3 text-center p-6 font-mono text-xs text-charcoal-muted">
              No mobile laboratory buses registered in this region yet.
            </div>
          )}
        </div>
      </div>

      {/* SECTION E: ACTIVE OPERATIONAL ALERTS (Section 4.1.E) */}
      <div className="surface p-5 rounded-lg border border-stone">
        <div className="module-head flex items-center justify-between mb-3">
          <div>
            <div className="section-kicker font-mono text-[10px] text-[#3D6B52] uppercase font-bold">
              ACTIONABLE ALERTS
            </div>
            <h3 className="text-base font-bold text-charcoal">Regional Operational Notifications</h3>
          </div>
          <button
            className="ghost font-mono text-xs text-charcoal-muted hover:text-charcoal"
            onClick={() => navigate("/regional/notifications")}
          >
            Notification Center →
          </button>
        </div>

        <div className="space-y-2">
          {data.alerts.slice(0, 5).map((a, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border flex items-start space-x-3 text-xs ${
                a.severity === "error"
                  ? "bg-red-50 border-red-200 text-red-900"
                  : a.severity === "warning"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-blue-50 border-blue-200 text-blue-900"
              }`}
            >
              <span className="font-bold text-sm shrink-0">
                {a.severity === "error" ? "🚨" : a.severity === "warning" ? "⚠️" : "ℹ️"}
              </span>
              <div className="flex-1">
                <strong className="font-semibold block">{a.title}</strong>
                <span className="opacity-90">{a.detail}</span>
              </div>
            </div>
          ))}
          {data.alerts.length === 0 && (
            <div className="p-4 text-center font-mono text-xs text-charcoal-muted">
              All regional systems operating normally. No pending alerts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
