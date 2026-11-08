import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient, API_BASE_URL } from "../../services/api-client";
import { configs } from "./resources";
import { ResourceView } from "./ResourceView";

interface BusRecord {
  id: string;
  busCode?: string;
  registrationNumber: string;
  regionId: string;
  regionName?: string;
  driverId?: string | null;
  staffName?: string;
  staffEmail?: string | null;
  seatingCapacity: number;
  status: string;
  currentLat?: number | null;
  currentLng?: number | null;
  lastGpsUpdate?: string | null;
  gpsStatus?: string;
  insuranceExpiry: string;
  fitnessExpiry: string;
  serviceDate?: string | null;
  equipmentCount?: number;
  maintenanceCount?: number;
  tripCount?: number;
  createdAt: string;
}

interface RegionOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  roleEnum: string;
  regionId?: string | null;
}

interface BusProfileData {
  bus: BusRecord & {
    stateName?: string;
    Region?: {
      id: string;
      name: string;
      State?: { name: string; code: string };
    };
    User?: {
      id: string;
      name: string;
      email: string;
      phone?: string;
      status: string;
    } | null;
    GpsDevice?: {
      id: string;
      imeiNumber: string;
      providerName?: string;
      status: string;
      lastSeenAt?: string;
    } | null;
  };
  equipment: Array<{
    id: string;
    assetTag: string;
    name: string;
    category: string;
    status: string;
    storageUnit?: string;
    purchaseDate: string;
    cost: number;
  }>;
  maintenanceRecords: Array<{
    id: string;
    serviceType: string;
    costAmount: number;
    serviceDate: string;
    nextDueDate: string;
    remarks?: string;
  }>;
  trips: Array<{
    id: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    Route?: {
      routeCode: string;
      routeName: string;
      startLocation: string;
      endLocation: string;
    };
    User?: {
      name: string;
    };
  }>;
  inventoryTransactions: Array<{
    id: string;
    type: string;
    quantity: number;
    timestamp: string;
    consumable?: {
      name: string;
      unitMetric: string;
    };
  }>;
  stats: {
    totalEquipmentCount: number;
    totalEquipmentCost: number;
    totalMaintenanceCount: number;
    totalMaintenanceCost: number;
    totalTrips: number;
  };
}

export function MobileLabsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "All Labs";

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  const subOptions = ["All Labs", "Maintenance", "GPS / Telemetry", "Utilization"];

  // Fleet state
  const [buses, setBuses] = useState<BusRecord[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [staffUsers, setStaffUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter toolbar state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [regionFilter, setRegionFilter] = useState("ALL");

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingBus, setEditingBus] = useState<BusRecord | null>(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningBus, setAssigningBus] = useState<BusRecord | null>(null);

  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceBus, setMaintenanceBus] = useState<BusRecord | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState<BusProfileData | null>(null);

  async function loadFleetData() {
    setLoading(true);
    setError("");
    try {
      const [busesRes, regionsRes, staffRes] = await Promise.all([
        apiClient<{ rows: BusRecord[] }>("/super-admin/resource/labs?limit=150"),
        apiClient<{ rows: RegionOption[] }>("/super-admin/resource/regions?limit=100").catch(() => ({ rows: [] })),
        apiClient<{ rows: UserOption[] }>("/super-admin/resource/users?limit=300").catch(() => ({ rows: [] }))
      ]);
      setBuses(busesRes.rows || []);
      setRegions(regionsRes.rows || []);
      // Filter communicators and staff
      setStaffUsers((staffRes.rows || []).filter((u) => u.roleEnum === "SCIENCE_COMMUNICATOR" || u.roleEnum === "REGIONAL_ADMIN"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mobile lab fleet");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sub === "All Labs") {
      void loadFleetData();
    }
  }, [sub]);

  // Filtered buses
  const filteredBuses = useMemo(() => {
    return buses.filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
      if (regionFilter !== "ALL" && b.regionId !== regionFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesCode = b.busCode?.toLowerCase().includes(q);
        const matchesReg = b.registrationNumber?.toLowerCase().includes(q);
        const matchesRegion = b.regionName?.toLowerCase().includes(q);
        const matchesStaff = b.staffName?.toLowerCase().includes(q);
        if (!matchesCode && !matchesReg && !matchesRegion && !matchesStaff) return false;
      }
      return true;
    });
  }, [buses, statusFilter, regionFilter, search]);

  // Fleet operational metrics
  const metrics = useMemo(() => {
    const total = buses.length;
    const available = buses.filter((b) => b.status === "AVAILABLE" || b.status === "AT_SCHOOL" || b.status === "ON_ROUTE").length;
    const maintenance = buses.filter((b) => b.status === "UNDER_MAINTENANCE" || b.status === "EMERGENCY").length;
    const assignedStaff = buses.filter((b) => b.staffName && b.staffName !== "Unassigned").length;
    const totalAssets = buses.reduce((sum, b) => sum + (b.equipmentCount || 0), 0);
    return { total, available, maintenance, assignedStaff, totalAssets };
  }, [buses]);

  async function handleOpenProfile(bus: BusRecord) {
    setShowProfileModal(true);
    setProfileLoading(true);
    try {
      const data = await apiClient<BusProfileData>(`/super-admin/buses/${bus.id}/profile`);
      setProfileData(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load bus profile");
      setShowProfileModal(false);
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleDeleteBus(bus: BusRecord) {
    const confirm = window.confirm(
      `Delete mobile laboratory "${bus.busCode || bus.registrationNumber}"?\n\nThis will remove the vehicle and unassign its equipment. This action cannot be undone.`
    );
    if (!confirm) return;

    try {
      await apiClient(`/super-admin/resource/labs/${bus.id}`, { method: "DELETE" });
      await loadFleetData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete bus");
    }
  }

  // Active configuration for other tabs
  let activeConfig = configs.labs;
  if (sub === "Maintenance") activeConfig = configs.maintenance;
  else if (sub === "GPS / Telemetry" || sub === "GPS / Location") activeConfig = configs.gpsDevices;

  return (
    <div className="portal-module bus-management-page">
      {/* Top Header */}
      <div className="module-head" style={{ marginBottom: "1.25rem" }}>
        <div>
          <div className="section-kicker">CENTRAL COMMAND / FLEET OPERATIONS</div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0.25rem 0" }}>
            {sub === "All Labs" ? "Bus Management" : sub}
          </h2>
          <p style={{ color: "var(--charcoal-muted)", fontSize: "0.9rem", margin: 0 }}>
            {sub === "All Labs"
              ? "Operational oversight of all mobile laboratory buses, regional allocations, field staff assignments, inventory holdings, and maintenance history."
              : `Fleet telemetry and ${sub.toLowerCase()} data across mobile laboratories.`}
          </p>
        </div>
        {sub === "All Labs" && (
          <div className="module-actions" style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="ghost"
              onClick={() => window.open(`${API_BASE_URL}/super-admin/reports/labs.csv`, "_blank")}
              style={{ cursor: "pointer" }}
            >
              Export CSV
            </button>
            {buses.length >= 5 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "0.5rem 0.85rem",
                  borderRadius: "6px",
                  background: "rgba(100, 116, 139, 0.12)",
                  color: "var(--charcoal-muted)",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  border: "1px solid var(--stone)"
                }}
              >
                Fleet at Capacity (5/5 Labs)
              </span>
            ) : (
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setEditingBus(null);
                  setShowAddEditModal(true);
                }}
                style={{
                  cursor: "pointer",
                  background: "var(--charcoal-dark, #1E242B)",
                  color: "#fff",
                  fontWeight: 600,
                  padding: "0.5rem 1rem",
                  borderRadius: "6px"
                }}
              >
                + Register Bus ({buses.length}/5)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Subnav Tabs */}
      <div
        className="subnav-tabs"
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          borderBottom: "1px solid var(--stone)",
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
              onClick={() => setSub(opt)}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "6px",
                background: isActive ? "var(--charcoal-dark, #1E242B)" : "#ffffff",
                color: isActive ? "#ffffff" : "var(--charcoal)",
                border: isActive ? "1px solid var(--charcoal-dark)" : "1px solid var(--stone)",
                fontWeight: isActive ? 700 : 500,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {opt === "All Labs" ? `Fleet Directory (${buses.length}/5)` : opt}
            </button>
          );
        })}
      </div>

      {/* Render Sub Tabs */}
      {sub === "Utilization" ? (
        <UtilizationView />
      ) : sub !== "All Labs" ? (
        <ResourceView config={activeConfig} />
      ) : (
        <>
          {/* Metrics Summary Row */}
          <div
            className="metrics-row"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
              marginBottom: "1.5rem"
            }}
          >
            <div className="surface metric-card" style={{ padding: "1rem", border: "1px solid var(--stone)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.75rem", fontFamily: "var(--mono)", color: "var(--charcoal-subtle)", textTransform: "uppercase" }}>
                Total Fleet Size
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--charcoal)" }}>
                {metrics.total} <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--charcoal-muted)" }}>/ 5</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--charcoal-muted)", marginTop: "0.25rem" }}>
                Max 5 mobile laboratories
              </div>
            </div>

            <div className="surface metric-card" style={{ padding: "1rem", border: "1px solid var(--stone)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.75rem", fontFamily: "var(--mono)", color: "#16A34A", textTransform: "uppercase" }}>
                Active / In-Service
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#16A34A" }}>{metrics.available}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--charcoal-muted)", marginTop: "0.25rem" }}>Available or at schools</div>
            </div>

            <div className="surface metric-card" style={{ padding: "1rem", border: "1px solid var(--stone)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.75rem", fontFamily: "var(--mono)", color: "#DC2626", textTransform: "uppercase" }}>
                Maintenance / Offline
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#DC2626" }}>{metrics.maintenance}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--charcoal-muted)", marginTop: "0.25rem" }}>Service required or hold</div>
            </div>

            <div className="surface metric-card" style={{ padding: "1rem", border: "1px solid var(--stone)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.75rem", fontFamily: "var(--mono)", color: "#2B6CB0", textTransform: "uppercase" }}>
                Field Staff Assigned
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#2B6CB0" }}>{metrics.assignedStaff}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--charcoal-muted)", marginTop: "0.25rem" }}>
                {metrics.total - metrics.assignedStaff > 0 ? `${metrics.total - metrics.assignedStaff} unstaffed` : "All labs staffed"}
              </div>
            </div>

            <div className="surface metric-card" style={{ padding: "1rem", border: "1px solid var(--stone)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.75rem", fontFamily: "var(--mono)", color: "#BE755F", textTransform: "uppercase" }}>
                Onboard Inventory
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#BE755F" }}>{metrics.totalAssets}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--charcoal-muted)", marginTop: "0.25rem" }}>Physical equipment assets</div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div
            className="toolbar"
            style={{
              display: "flex",
              gap: "0.75rem",
              marginBottom: "1rem",
              alignItems: "center",
              flexWrap: "wrap"
            }}
          >
            <div style={{ flex: 1, minWidth: "260px" }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search buses by code, registration number, staff, or region..."
                style={{
                  width: "100%",
                  padding: "0.55rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--stone)",
                  fontSize: "13px"
                }}
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: "0.55rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--stone)",
                  fontSize: "13px",
                  background: "#fff"
                }}
              >
                <option value="ALL">All Operational Statuses</option>
                <option value="AVAILABLE">AVAILABLE (Ready)</option>
                <option value="ON_ROUTE">ON_ROUTE (In transit)</option>
                <option value="AT_SCHOOL">AT_SCHOOL (Active session)</option>
                <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                <option value="EMERGENCY">EMERGENCY</option>
              </select>
            </div>

            <div>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                style={{
                  padding: "0.55rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--stone)",
                  fontSize: "13px",
                  background: "#fff"
                }}
              >
                <option value="ALL">All Regions</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <span style={{ fontSize: "12px", color: "var(--charcoal-subtle)", fontFamily: "var(--mono)" }}>
              {filteredBuses.length} of {buses.length} mobile laboratories listed
            </span>
          </div>

          {error && <div className="error banner" style={{ marginBottom: "1rem" }}>{error}</div>}

          {/* Fleet Directory Table */}
          <div className="table-wrap">
            {loading ? (
              <div className="loading-state small" style={{ padding: "2.5rem 0", textAlign: "center" }}>
                <div className="loader-ring" />
                <span style={{ display: "block", marginTop: "0.5rem" }}>Loading Fleet Data…</span>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "22%" }}>Bus & Laboratory Details</th>
                    <th style={{ width: "16%" }}>Region Allocation</th>
                    <th style={{ width: "20%" }}>Assigned Field Staff</th>
                    <th style={{ width: "14%" }}>Operational Status</th>
                    <th style={{ width: "10%" }}>Onboard Assets</th>
                    <th style={{ width: "18%" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBuses.map((bus) => {
                    const hasStaff = bus.staffName && bus.staffName !== "Unassigned";
                    const isAvailable = bus.status === "AVAILABLE" || bus.status === "ON_ROUTE" || bus.status === "AT_SCHOOL";

                    return (
                      <tr key={bus.id}>
                        {/* Bus & Registration */}
                        <td>
                          <div>
                            <strong style={{ fontSize: "13px", color: "var(--charcoal)", display: "block" }}>
                              {bus.busCode ? `${bus.busCode} • ` : ""}{bus.registrationNumber}
                            </strong>
                            <span style={{ fontSize: "11px", color: "var(--charcoal-muted)", fontFamily: "var(--mono)" }}>
                              Capacity: {bus.seatingCapacity} seats | ID: {bus.id}
                            </span>
                            {bus.currentLat && (
                              <div style={{ fontSize: "10px", color: "#2B6CB0", marginTop: "2px" }}>
                                📍 {bus.currentLat.toFixed(3)}, {bus.currentLng?.toFixed(3)}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Region */}
                        <td>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--charcoal)" }}>
                            {bus.regionName || "—"}
                          </span>
                        </td>

                        {/* Assigned Staff */}
                        <td>
                          <div>
                            {hasStaff ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                    background: "#2B6CB0",
                                    color: "#fff",
                                    display: "grid",
                                    placeItems: "center",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    fontFamily: "var(--mono)"
                                  }}
                                >
                                  {(bus.staffName || "").slice(0, 1).toUpperCase()}
                                </div>
                                <div>
                                  <strong style={{ display: "block", fontSize: "12px", color: "var(--charcoal)" }}>
                                    {bus.staffName}
                                  </strong>
                                  <span style={{ fontSize: "11px", color: "var(--charcoal-muted)", fontFamily: "var(--mono)" }}>
                                    {bus.staffEmail}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  background: "#FEF3C7",
                                  color: "#B45309"
                                }}
                              >
                                ⚠ Unassigned Staff
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Operational Status */}
                        <td>
                          <div>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: 700,
                                background:
                                  bus.status === "AVAILABLE"
                                    ? "#DCFCE7"
                                    : bus.status === "ON_ROUTE"
                                    ? "#E0F2FE"
                                    : bus.status === "AT_SCHOOL"
                                    ? "#E0E7FF"
                                    : bus.status === "UNDER_MAINTENANCE"
                                    ? "#FEF3C7"
                                    : "#FEE2E2",
                                color:
                                  bus.status === "AVAILABLE"
                                    ? "#15803D"
                                    : bus.status === "ON_ROUTE"
                                    ? "#0369A1"
                                    : bus.status === "AT_SCHOOL"
                                    ? "#4338CA"
                                    : bus.status === "UNDER_MAINTENANCE"
                                    ? "#B45309"
                                    : "#B91C1C"
                              }}
                            >
                              ● {bus.status}
                            </span>
                            <div style={{ fontSize: "10px", color: "var(--charcoal-subtle)", marginTop: "2px" }}>
                              Fitness: {bus.fitnessExpiry ? new Date(bus.fitnessExpiry).toLocaleDateString() : "—"}
                            </div>
                          </div>
                        </td>

                        {/* Onboard Assets */}
                        <td>
                          <div>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--charcoal)" }}>
                              🔬 {bus.equipmentCount || 0}
                            </span>
                            <div style={{ fontSize: "10px", color: "var(--charcoal-subtle)" }}>
                              {bus.maintenanceCount || 0} services
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="row-actions" style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => handleOpenProfile(bus)}
                              title="View full vehicle telemetry, inventory, and history"
                              style={{ fontWeight: 600 }}
                            >
                              Profile
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAssigningBus(bus);
                                setShowAssignModal(true);
                              }}
                              title="Assign or change designated field staff and region"
                            >
                              Assign
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMaintenanceBus(bus);
                                setShowMaintenanceModal(true);
                              }}
                              title="Record service, repair, or maintenance event"
                            >
                              Service
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBus(bus);
                                setShowAddEditModal(true);
                              }}
                              title="Edit bus registration, model and capacity"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="danger-link"
                              onClick={() => handleDeleteBus(bus)}
                              title="Delete mobile laboratory"
                            >
                              Del
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!filteredBuses.length && (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-table" style={{ padding: "3rem 1rem", textAlign: "center" }}>
                          <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>∅</span>
                          <strong>No mobile laboratories found</strong>
                          <small style={{ display: "block", marginTop: "0.25rem", color: "var(--charcoal-subtle)" }}>
                            Click "+ Register Bus" to add a new mobile laboratory to your fleet.
                          </small>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Register / Edit Bus Modal */}
      {showAddEditModal && (
        <BusFormModal
          bus={editingBus}
          totalBuses={buses.length}
          regions={regions}
          staffUsers={staffUsers}
          onClose={() => setShowAddEditModal(false)}
          onSaved={() => {
            setShowAddEditModal(false);
            void loadFleetData();
          }}
        />
      )}

      {/* Assign Staff & Region Modal */}
      {showAssignModal && assigningBus && (
        <AssignStaffModal
          bus={assigningBus}
          regions={regions}
          staffUsers={staffUsers}
          onClose={() => setShowAssignModal(false)}
          onSaved={() => {
            setShowAssignModal(false);
            void loadFleetData();
          }}
        />
      )}

      {/* Add Maintenance Record Modal */}
      {showMaintenanceModal && maintenanceBus && (
        <BusMaintenanceModal
          bus={maintenanceBus}
          onClose={() => setShowMaintenanceModal(false)}
          onSaved={() => {
            setShowMaintenanceModal(false);
            void loadFleetData();
          }}
        />
      )}

      {/* Bus Profile Modal (Deep-Dive Telemetry) */}
      {showProfileModal && (
        <BusProfileModal
          loading={profileLoading}
          data={profileData}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// REGISTER / EDIT BUS MODAL
// -------------------------------------------------------------
interface BusFormModalProps {
  bus: BusRecord | null;
  totalBuses?: number;
  regions: RegionOption[];
  staffUsers: UserOption[];
  onClose: () => void;
  onSaved: () => void;
}

function BusFormModal({ bus, totalBuses = 0, regions, staffUsers, onClose, onSaved }: BusFormModalProps) {
  const isEdit = Boolean(bus);

  const [form, setForm] = useState({
    registrationNumber: bus?.registrationNumber || "",
    busCode: bus?.busCode || "",
    regionId: bus?.regionId || (regions[0]?.id || ""),
    driverId: bus?.driverId || "",
    seatingCapacity: bus?.seatingCapacity ?? 4,
    status: bus?.status || "AVAILABLE",
    currentLat: bus?.currentLat ?? "",
    currentLng: bus?.currentLng ?? "",
    insuranceExpiry: bus?.insuranceExpiry ? bus.insuranceExpiry.slice(0, 10) : "",
    fitnessExpiry: bus?.fitnessExpiry ? bus.fitnessExpiry.slice(0, 10) : ""
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (!isEdit && totalBuses >= 5) {
      setError("Fleet capacity limit reached: The platform accommodates a maximum of 5 mobile laboratories.");
      setSaving(false);
      return;
    }

    if (!form.registrationNumber.trim()) {
      setError("Vehicle registration number is required.");
      setSaving(false);
      return;
    }
    if (!form.regionId) {
      setError("Operational region assignment is required.");
      setSaving(false);
      return;
    }

    const payload: any = {
      registrationNumber: form.registrationNumber.trim().toUpperCase(),
      busCode: form.busCode.trim() || null,
      regionId: form.regionId,
      driverId: form.driverId || null,
      seatingCapacity: Number(form.seatingCapacity) || 4,
      status: form.status,
      currentLat: form.currentLat !== "" ? Number(form.currentLat) : null,
      currentLng: form.currentLng !== "" ? Number(form.currentLng) : null
    };

    if (form.insuranceExpiry) {
      payload.insuranceExpiry = new Date(form.insuranceExpiry).toISOString();
    }
    if (form.fitnessExpiry) {
      payload.fitnessExpiry = new Date(form.fitnessExpiry).toISOString();
    }

    try {
      if (isEdit && bus) {
        await apiClient(`/super-admin/resource/labs/${bus.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await apiClient("/super-admin/resource/labs", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save mobile laboratory");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleSubmit} style={{ width: "min(640px, 95vw)" }}>
        <div className="modal-head">
          <div>
            <div className="section-kicker">{isEdit ? "EDIT VEHICLE" : "FLEET REGISTRATION"}</div>
            <h3>{isEdit ? `Edit Bus: ${bus?.busCode || bus?.registrationNumber}` : "Register New Mobile Laboratory"}</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="error banner" style={{ marginBottom: "1rem" }}>{error}</div>}

        <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {/* Registration Number */}
          <label className="form-field">
            <span>Registration Number <b>*</b></span>
            <input
              type="text"
              required
              value={form.registrationNumber}
              onChange={(e) => setForm((p) => ({ ...p, registrationNumber: e.target.value }))}
              placeholder="e.g. MH-12-AB-1234"
            />
          </label>

          {/* Bus Code */}
          <label className="form-field">
            <span>Bus / Lab Code</span>
            <input
              type="text"
              value={form.busCode}
              onChange={(e) => setForm((p) => ({ ...p, busCode: e.target.value }))}
              placeholder="e.g. BUS-01 or Lab Alpha"
            />
          </label>

          {/* Region Assignment */}
          <label className="form-field">
            <span>Operational Region <b>*</b></span>
            <select
              required
              value={form.regionId}
              onChange={(e) => setForm((p) => ({ ...p, regionId: e.target.value }))}
            >
              <option value="">Select Region…</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          {/* Field Staff Assignment */}
          <label className="form-field">
            <span>Assigned Field Staff</span>
            <select
              value={form.driverId}
              onChange={(e) => setForm((p) => ({ ...p, driverId: e.target.value }))}
            >
              <option value="">No Staff Assigned (Standby)</option>
              {staffUsers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
          </label>

          {/* Seating Capacity */}
          <label className="form-field">
            <span>Seating Capacity</span>
            <input
              type="number"
              min={1}
              max={50}
              value={form.seatingCapacity}
              onChange={(e) => setForm((p) => ({ ...p, seatingCapacity: Number(e.target.value) }))}
            />
          </label>

          {/* Status */}
          <label className="form-field">
            <span>Operational Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="AVAILABLE">AVAILABLE (In Service / Standby)</option>
              <option value="ON_ROUTE">ON_ROUTE (In Transit)</option>
              <option value="AT_SCHOOL">AT_SCHOOL (Conducting Sessions)</option>
              <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE (Repair/Service)</option>
              <option value="EMERGENCY">EMERGENCY (Breakdown / Urgent)</option>
            </select>
          </label>

          {/* Insurance Expiry */}
          <label className="form-field">
            <span>Insurance Expiry Date</span>
            <input
              type="date"
              value={form.insuranceExpiry}
              onChange={(e) => setForm((p) => ({ ...p, insuranceExpiry: e.target.value }))}
            />
          </label>

          {/* Fitness Expiry */}
          <label className="form-field">
            <span>Vehicle Fitness Expiry Date</span>
            <input
              type="date"
              value={form.fitnessExpiry}
              onChange={(e) => setForm((p) => ({ ...p, fitnessExpiry: e.target.value }))}
            />
          </label>
        </div>

        <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Register Bus"}
          </button>
        </div>
      </form>
    </div>
  );
}

// -------------------------------------------------------------
// ASSIGN STAFF & REGION MODAL
// -------------------------------------------------------------
interface AssignStaffModalProps {
  bus: BusRecord;
  regions: RegionOption[];
  staffUsers: UserOption[];
  onClose: () => void;
  onSaved: () => void;
}

function AssignStaffModal({ bus, regions, staffUsers, onClose, onSaved }: AssignStaffModalProps) {
  const [selectedStaffId, setSelectedStaffId] = useState(bus.driverId || "");
  const [selectedRegionId, setSelectedRegionId] = useState(bus.regionId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      // Update region if changed
      if (selectedRegionId !== bus.regionId) {
        await apiClient(`/super-admin/buses/${bus.id}/assign-region`, {
          method: "POST",
          body: JSON.stringify({ regionId: selectedRegionId })
        });
      }

      // Update staff
      await apiClient(`/super-admin/buses/${bus.id}/assign-staff`, {
        method: "POST",
        body: JSON.stringify({ staffId: selectedStaffId || null })
      });

      alert(`Assignments updated for mobile lab ${bus.busCode || bus.registrationNumber}.`);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update assignments");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleAssign} style={{ width: "min(520px, 95vw)" }}>
        <div className="modal-head">
          <div>
            <div className="section-kicker">FLEET ASSIGNMENT</div>
            <h3>Assign Staff & Operational Region</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div
          style={{
            background: "var(--paper, #F8FAFC)",
            padding: "0.85rem 1rem",
            borderRadius: "6px",
            border: "1px solid var(--stone)",
            marginBottom: "1.25rem",
            fontSize: "12px"
          }}
        >
          <div>
            <strong>Mobile Laboratory:</strong> {bus.busCode ? `${bus.busCode} • ` : ""}{bus.registrationNumber}
          </div>
          <div style={{ marginTop: "4px" }}>
            <strong>Current Region:</strong> {bus.regionName || "Unassigned"} | <strong>Current Staff:</strong> {bus.staffName || "Unassigned"}
          </div>
        </div>

        {error && <div className="error banner" style={{ marginBottom: "1rem" }}>{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label className="form-field">
            <span>Operational Region</span>
            <select
              value={selectedRegionId}
              onChange={(e) => setSelectedRegionId(e.target.value)}
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Designated Field Staff (Science Communicator)</span>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              <option value="">No Staff Assigned (Standby)</option>
              {staffUsers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
          </label>
        </div>

        <p style={{ fontSize: "11px", color: "var(--charcoal-subtle)", margin: "0.75rem 0 0" }}>
          Assigning a staff member designates them as the primary operator of this mobile lab, allowing them to record school sessions, manage onboard equipment, and submit vehicle checklists.
        </p>

        <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Updating…" : "Confirm Assignment"}
          </button>
        </div>
      </form>
    </div>
  );
}

// -------------------------------------------------------------
// ADD MAINTENANCE RECORD MODAL
// -------------------------------------------------------------
interface BusMaintenanceModalProps {
  bus: BusRecord;
  onClose: () => void;
  onSaved: () => void;
}

function BusMaintenanceModal({ bus, onClose, onSaved }: BusMaintenanceModalProps) {
  const [serviceType, setServiceType] = useState("GENERAL_SERVICING");
  const [costAmount, setCostAmount] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [nextDueDate, setNextDueDate] = useState(
    new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [remarks, setRemarks] = useState("");
  const [updateBusStatus, setUpdateBusStatus] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiClient(`/super-admin/buses/${bus.id}/maintenance`, {
        method: "POST",
        body: JSON.stringify({
          serviceType,
          costAmount: Number(costAmount) || 0,
          serviceDate,
          nextDueDate,
          remarks: remarks || null,
          updateBusStatus: updateBusStatus || undefined
        })
      });
      alert(`Service record recorded for bus ${bus.busCode || bus.registrationNumber}.`);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record maintenance");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleSubmit} style={{ width: "min(560px, 95vw)" }}>
        <div className="modal-head">
          <div>
            <div className="section-kicker">VEHICLE MAINTENANCE</div>
            <h3>Record Maintenance & Servicing</h3>
            <span style={{ fontSize: "12px", color: "var(--charcoal-muted)" }}>
              {bus.busCode ? `${bus.busCode} • ` : ""}{bus.registrationNumber} ({bus.regionName})
            </span>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="error banner" style={{ marginBottom: "1rem" }}>{error}</div>}

        <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <label className="form-field">
            <span>Service Type <b>*</b></span>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
            >
              <option value="GENERAL_SERVICING">General Servicing & Oil Change</option>
              <option value="TYRE">Tyre Replacement & Alignment</option>
              <option value="BATTERY">Battery & Electrical Repair</option>
              <option value="ENGINE">Engine & Transmission Work</option>
              <option value="GPS">GPS Telemetry / Sensor Calibration</option>
            </select>
          </label>

          <label className="form-field">
            <span>Maintenance Cost (INR) <b>*</b></span>
            <input
              type="number"
              min={0}
              required
              value={costAmount}
              onChange={(e) => setCostAmount(e.target.value)}
              placeholder="e.g. 8500"
            />
          </label>

          <label className="form-field">
            <span>Service Date <b>*</b></span>
            <input
              type="date"
              required
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
          </label>

          <label className="form-field">
            <span>Next Inspection Due Date <b>*</b></span>
            <input
              type="date"
              required
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
            />
          </label>

          <label className="form-field" style={{ gridColumn: "span 2" }}>
            <span>Update Bus Status</span>
            <select
              value={updateBusStatus}
              onChange={(e) => setUpdateBusStatus(e.target.value)}
            >
              <option value="">Keep Current Status ({bus.status})</option>
              <option value="AVAILABLE">Mark AVAILABLE (Service completed)</option>
              <option value="UNDER_MAINTENANCE">Mark UNDER_MAINTENANCE (Currently in workshop)</option>
            </select>
          </label>

          <label className="form-field" style={{ gridColumn: "span 2" }}>
            <span>Remarks / Work Performed</span>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Describe work performed, parts replaced, vendor name, etc."
            />
          </label>
        </div>

        <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving…" : "Save Record"}
          </button>
        </div>
      </form>
    </div>
  );
}

// -------------------------------------------------------------
// BUS PROFILE MODAL (Deep-Dive Telemetry)
// -------------------------------------------------------------
interface BusProfileModalProps {
  loading: boolean;
  data: BusProfileData | null;
  onClose: () => void;
}

function BusProfileModal({ loading, data, onClose }: BusProfileModalProps) {
  const [profileTab, setProfileTab] = useState<"overview" | "inventory" | "maintenance" | "gps" | "history">("overview");

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: "min(880px, 95vw)", maxHeight: "90vh" }}>
        <div className="modal-head">
          <div>
            <div className="section-kicker">VEHICLE TELEMETRY & PROFILE</div>
            <h3>
              {data?.bus?.busCode ? `${data.bus.busCode} • ` : ""}
              {data?.bus?.registrationNumber || "Mobile Laboratory"}
            </h3>
            <span style={{ fontSize: "12px", color: "var(--charcoal-muted)" }}>
              Region: {data?.bus?.regionName} | Status: <strong>{data?.bus?.status}</strong> | Assigned Staff: {data?.bus?.staffName}
            </span>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>

        {loading || !data ? (
          <div style={{ textAlign: "center", padding: "3rem 0" }}>
            <div className="loader-ring" />
            <span style={{ display: "block", marginTop: "0.5rem" }}>Loading vehicle telemetry…</span>
          </div>
        ) : (
          <>
            {/* Tab navigation */}
            <div
              style={{
                display: "flex",
                gap: "0.4rem",
                borderBottom: "1px solid var(--stone)",
                paddingBottom: "0.5rem",
                marginBottom: "1rem",
                flexWrap: "wrap"
              }}
            >
              {[
                { key: "overview", label: "Overview & Specs" },
                { key: "inventory", label: `Onboard Inventory (${data.equipment.length})` },
                { key: "maintenance", label: `Maintenance Records (${data.maintenanceRecords.length})` },
                { key: "gps", label: "Location & GPS" },
                { key: "history", label: `Trips & Movements (${data.trips.length})` }
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`ghost ${profileTab === t.key ? "primary" : ""}`}
                  onClick={() => setProfileTab(t.key as any)}
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: "4px",
                    background: profileTab === t.key ? "var(--charcoal-dark, #1E242B)" : "#ffffff",
                    color: profileTab === t.key ? "#ffffff" : "var(--charcoal)",
                    border: "1px solid var(--stone)",
                    fontSize: "12px",
                    fontWeight: profileTab === t.key ? 700 : 500,
                    cursor: "pointer"
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: OVERVIEW & SPECS */}
            {profileTab === "overview" && (
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "0.75rem",
                    marginBottom: "1.25rem"
                  }}
                >
                  <div style={{ background: "var(--paper)", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--stone)" }}>
                    <div style={{ fontSize: "10px", color: "var(--charcoal-subtle)", fontFamily: "var(--mono)" }}>ONBOARD ASSETS</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#BE755F" }}>{data.stats.totalEquipmentCount}</div>
                    <div style={{ fontSize: "10px", color: "var(--charcoal-muted)" }}>₹{data.stats.totalEquipmentCost.toLocaleString()}</div>
                  </div>
                  <div style={{ background: "var(--paper)", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--stone)" }}>
                    <div style={{ fontSize: "10px", color: "var(--charcoal-subtle)", fontFamily: "var(--mono)" }}>MAINTENANCE</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#2B523D" }}>{data.stats.totalMaintenanceCount}</div>
                    <div style={{ fontSize: "10px", color: "var(--charcoal-muted)" }}>₹{data.stats.totalMaintenanceCost.toLocaleString()} total</div>
                  </div>
                  <div style={{ background: "var(--paper)", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--stone)" }}>
                    <div style={{ fontSize: "10px", color: "var(--charcoal-subtle)", fontFamily: "var(--mono)" }}>TRIPS COMPLETED</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#2B6CB0" }}>{data.stats.totalTrips}</div>
                  </div>
                  <div style={{ background: "var(--paper)", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--stone)" }}>
                    <div style={{ fontSize: "10px", color: "var(--charcoal-subtle)", fontFamily: "var(--mono)" }}>SEATING CAPACITY</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{data.bus.seatingCapacity} seats</div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    background: "#fff",
                    padding: "1rem",
                    borderRadius: "6px",
                    border: "1px solid var(--stone)"
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--charcoal-subtle)", margin: "0 0 0.5rem" }}>
                      Compliance & Validity
                    </h4>
                    <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                      <div>
                        <strong>Insurance Expiry:</strong>{" "}
                        {data.bus.insuranceExpiry ? new Date(data.bus.insuranceExpiry).toLocaleDateString() : "Not recorded"}
                      </div>
                      <div>
                        <strong>Fitness Expiry:</strong>{" "}
                        {data.bus.fitnessExpiry ? new Date(data.bus.fitnessExpiry).toLocaleDateString() : "Not recorded"}
                      </div>
                      <div>
                        <strong>Last Serviced:</strong>{" "}
                        {data.bus.serviceDate ? new Date(data.bus.serviceDate).toLocaleDateString() : "No record"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--charcoal-subtle)", margin: "0 0 0.5rem" }}>
                      Allocations & Operator
                    </h4>
                    <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                      <div>
                        <strong>Operational Region:</strong> {data.bus.regionName} ({data.bus.stateName || "State"})
                      </div>
                      <div>
                        <strong>Assigned Staff:</strong> {data.bus.staffName}
                      </div>
                      {data.bus.User?.phone && (
                        <div>
                          <strong>Staff Phone:</strong> {data.bus.User.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ONBOARD INVENTORY */}
            {profileTab === "inventory" && (
              <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                <h4 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "0.5rem" }}>
                  Equipment Physically Mounted / Held ({data.equipment.length})
                </h4>
                <table style={{ width: "100%", fontSize: "12px", marginBottom: "1.5rem" }}>
                  <thead>
                    <tr>
                      <th>Asset Tag</th>
                      <th>Equipment Name</th>
                      <th>Category</th>
                      <th>Condition / Status</th>
                      <th>Storage Unit</th>
                      <th>Asset Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.equipment.map((eq) => (
                      <tr key={eq.id}>
                        <td style={{ fontFamily: "var(--mono)" }}>{eq.assetTag}</td>
                        <td><strong>{eq.name}</strong></td>
                        <td>{eq.category}</td>
                        <td>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: eq.status === "AVAILABLE" ? "#16A34A" : "#D97706" }}>
                            {eq.status}
                          </span>
                        </td>
                        <td>{eq.storageUnit || "Rack A"}</td>
                        <td>₹{eq.cost ? eq.cost.toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                    {!data.equipment.length && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "1.5rem" }}>
                          No equipment assets currently mapped to this bus.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <h4 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "0.5rem" }}>
                  Consumables Transactions on this Bus
                </h4>
                <table style={{ width: "100%", fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Transaction</th>
                      <th>Quantity</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.inventoryTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td><strong>{tx.consumable?.name || "Consumable"}</strong></td>
                        <td>{tx.type}</td>
                        <td>{tx.quantity} {tx.consumable?.unitMetric || "units"}</td>
                        <td style={{ fontSize: "11px", fontFamily: "var(--mono)" }}>
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {!data.inventoryTransactions.length && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "1rem" }}>
                          No consumable transactions recorded for this bus.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: MAINTENANCE RECORDS */}
            {profileTab === "maintenance" && (
              <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                <table style={{ width: "100%", fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th>Service Type</th>
                      <th>Cost (INR)</th>
                      <th>Service Date</th>
                      <th>Next Due Date</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.maintenanceRecords.map((m) => (
                      <tr key={m.id}>
                        <td><strong>{m.serviceType.replace(/_/g, " ")}</strong></td>
                        <td>₹{m.costAmount.toLocaleString()}</td>
                        <td style={{ fontFamily: "var(--mono)" }}>{new Date(m.serviceDate).toLocaleDateString()}</td>
                        <td style={{ fontFamily: "var(--mono)" }}>{new Date(m.nextDueDate).toLocaleDateString()}</td>
                        <td style={{ color: "var(--charcoal-muted)" }}>{m.remarks || "—"}</td>
                      </tr>
                    ))}
                    {!data.maintenanceRecords.length && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "1.5rem" }}>
                          No maintenance records logged for this vehicle yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 4: LOCATION & GPS */}
            {profileTab === "gps" && (
              <div style={{ padding: "0.5rem 0" }}>
                <div
                  style={{
                    background: "#fff",
                    padding: "1rem",
                    borderRadius: "6px",
                    border: "1px solid var(--stone)",
                    marginBottom: "1rem"
                  }}
                >
                  <h4 style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 0.5rem" }}>
                    GPS Device Telemetry
                  </h4>
                  {data.bus.GpsDevice ? (
                    <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                      <div><strong>Device IMEI:</strong> <code style={{ fontFamily: "var(--mono)" }}>{data.bus.GpsDevice.imeiNumber}</code></div>
                      <div><strong>Provider:</strong> {data.bus.GpsDevice.providerName || "Telematics Global"}</div>
                      <div><strong>Device Status:</strong> <span style={{ color: "#16A34A", fontWeight: 700 }}>● {data.bus.GpsDevice.status}</span></div>
                      <div><strong>Last Ping:</strong> {data.bus.GpsDevice.lastSeenAt ? new Date(data.bus.GpsDevice.lastSeenAt).toLocaleString() : "Recently"}</div>
                    </div>
                  ) : (
                    <div style={{ color: "var(--charcoal-muted)", fontSize: "12px" }}>
                      No physical GPS hardware device linked to this bus.
                    </div>
                  )}
                </div>

                <div
                  style={{
                    background: "var(--paper)",
                    padding: "1rem",
                    borderRadius: "6px",
                    border: "1px solid var(--stone)",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: "11px", fontFamily: "var(--mono)", color: "var(--charcoal-subtle)", marginBottom: "4px" }}>
                    CURRENT COORDINATES
                  </div>
                  {data.bus.currentLat ? (
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--charcoal)" }}>
                      📍 {data.bus.currentLat.toFixed(5)}, {data.bus.currentLng?.toFixed(5)}
                    </div>
                  ) : (
                    <div style={{ color: "var(--charcoal-subtle)", fontSize: "13px" }}>
                      Coordinates pending vehicle departure.
                    </div>
                  )}
                  {data.bus.lastGpsUpdate && (
                    <div style={{ fontSize: "11px", color: "var(--charcoal-muted)", marginTop: "4px" }}>
                      Updated: {new Date(data.bus.lastGpsUpdate).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: TRIPS & HISTORY */}
            {profileTab === "history" && (
              <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                <table style={{ width: "100%", fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th>Route Code & Name</th>
                      <th>Corridor</th>
                      <th>Operator</th>
                      <th>Date / Timestamp</th>
                      <th>Trip Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trips.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <strong>{t.Route?.routeCode || "RT-GEN"}</strong>
                          <div>{t.Route?.routeName || "General Trip"}</div>
                        </td>
                        <td>{t.Route?.startLocation} → {t.Route?.endLocation}</td>
                        <td>{t.User?.name || "Driver"}</td>
                        <td style={{ fontFamily: "var(--mono)", fontSize: "11px" }}>
                          {new Date(t.startedAt).toLocaleDateString()}
                        </td>
                        <td>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: t.status === "COMPLETED" ? "#16A34A" : "#2B6CB0" }}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!data.trips.length && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "1.5rem" }}>
                          No recorded trips or route movements for this bus yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// UTILIZATION SUMMARY VIEW
// -------------------------------------------------------------
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
    <section className="feature-card" style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", border: "1px solid var(--stone)" }}>
      <div className="section-kicker">LAB ANALYTICS / DATABASE SUMMARY</div>
      <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0.25rem 0 0.5rem" }}>Operational Completion</h2>
      <p style={{ color: "var(--charcoal-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        These indicators reflect operational completion rates and fleet delivery across all mobile laboratories.
      </p>
      {error && <div className="error banner">{error}</div>}
      {!summary && !error ? (
        <div className="loading-state small">
          <div className="loader-ring" />
          Loading operational metrics…
        </div>
      ) : summary && (
        <div className="util-bars" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[
            ["Completed Trips & Routes", summary.completedTrips, summary.trips, tripRate],
            ["Completed Science Sessions", summary.completedEvents, summary.events, sessionRate]
          ].map(([label, complete, total, rate]) => (
            <div className="util-bar-row" key={String(label)}>
              <div className="util-bar-meta" style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "13px" }}>
                <span>{label}</span>
                <strong>
                  {complete} / {total} <small>({rate}%)</small>
                </strong>
              </div>
              <div className="util-bar-track" style={{ width: "100%", height: "8px", background: "var(--stone-light, #f1f5f9)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: `${rate}%`, height: "100%", background: "#2B523D", transition: "width 0.3s ease" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
