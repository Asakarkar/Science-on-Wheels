import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { apiClient, API_BASE_URL } from "../../services/api-client";
import { configs } from "./resources";
import { ResourceView } from "./ResourceView";

interface RegionRecord {
  id: string;
  name: string;
  stateId: string;
  stateName?: string;
  schoolCount?: number;
  busCount?: number;
  districtCount?: number;
  adminName?: string;
  adminEmail?: string | null;
  adminId?: string | null;
  createdAt: string;
}

interface StateOption {
  id: string;
  name: string;
  code: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  roleEnum: string;
  regionId?: string | null;
}

interface RegionProfileData {
  region: {
    id: string;
    name: string;
    stateId: string;
    stateName: string;
  };
  regionalAdmins: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    status: string;
    lastLoginAt?: string | null;
  }>;
  schools: Array<{
    id: string;
    name: string;
    udiseCode: string;
    contactPhone?: string;
    totalStudents: number;
    priorityCategory?: string;
  }>;
  buses: Array<{
    id: string;
    busCode?: string;
    registrationNumber: string;
    status: string;
    User?: {
      id: string;
      name: string;
      email: string;
      phone?: string;
    } | null;
  }>;
  fieldStaff: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    status: string;
    busName: string;
  }>;
  equipment: Array<{
    id: string;
    assetTag: string;
    name: string;
    category: string;
    status: string;
    Bus?: {
      busCode?: string;
      registrationNumber: string;
    } | null;
  }>;
  recentTransactions: Array<{
    id: string;
    type: string;
    quantity: number;
    timestamp: string;
    consumable?: { name: string; unitMetric: string };
    bus?: { busCode?: string; registrationNumber: string };
  }>;
  recentIssues: Array<{
    id: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
  }>;
  performance: {
    totalSchools: number;
    totalStudents: number;
    totalBuses: number;
    availableBuses: number;
    totalFieldStaff: number;
    openIssuesCount: number;
  };
}

export function OrganizationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const isSettingsRoute = location.pathname.includes("settings");
  const sub = searchParams.get("sub") || (isSettingsRoute ? "Organization Settings" : "Regions");

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  const subOptions = ["Regions", "States", "Districts", "Blocks", "Organization Settings"];

  // Regions state
  const [regions, setRegions] = useState<RegionRecord[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingRegion, setEditingRegion] = useState<RegionRecord | null>(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningRegion, setAssigningRegion] = useState<RegionRecord | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState<RegionProfileData | null>(null);

  async function loadRegionsData() {
    setLoading(true);
    setError("");
    try {
      const [regionsRes, statesRes, usersRes] = await Promise.all([
        apiClient<{ rows: RegionRecord[] }>("/super-admin/resource/regions?limit=100"),
        apiClient<{ rows: StateOption[] }>("/super-admin/resource/states?limit=100").catch(() => ({ rows: [] })),
        apiClient<{ rows: UserOption[] }>("/super-admin/resource/users?limit=300").catch(() => ({ rows: [] }))
      ]);
      setRegions(regionsRes.rows || []);
      setStates(statesRes.rows || []);
      setUsers(usersRes.rows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load regions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sub === "Regions") {
      void loadRegionsData();
    }
  }, [sub]);

  // Filtered regions
  const filteredRegions = useMemo(() => {
    if (!search.trim()) return regions;
    const q = search.toLowerCase();
    return regions.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.stateName?.toLowerCase().includes(q) ||
        r.adminName?.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
    );
  }, [regions, search]);

  // Overall geographic metrics
  const metrics = useMemo(() => {
    const totalRegions = regions.length;
    const totalSchools = regions.reduce((sum, r) => sum + (r.schoolCount || 0), 0);
    const totalBuses = regions.reduce((sum, r) => sum + (r.busCount || 0), 0);
    const assignedAdmins = regions.filter((r) => r.adminName && r.adminName !== "Unassigned").length;
    return { totalRegions, totalSchools, totalBuses, assignedAdmins };
  }, [regions]);

  async function handleOpenProfile(region: RegionRecord) {
    setShowProfileModal(true);
    setProfileLoading(true);
    try {
      const data = await apiClient<RegionProfileData>(`/super-admin/regions/${region.id}/profile`);
      setProfileData(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load regional profile");
      setShowProfileModal(false);
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleDeleteRegion(region: RegionRecord) {
    if (region.id === "region-west-1") {
      alert("The core operational region (Western Region) is protected and cannot be deleted because schools, buses, and personnel depend on it.");
      return;
    }
    const confirm = window.confirm(
      `Delete operational region "${region.name}"?\n\nSchools, buses, and staff scoped to this region will be unassigned. This action cannot be undone.`
    );
    if (!confirm) return;

    try {
      await apiClient(`/super-admin/resource/regions/${region.id}?cascade=true`, { method: "DELETE" });
      await loadRegionsData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  // Active resource config for non-region tabs
  let activeConfig = configs.regions;
  if (sub === "States" || sub === "Geography") activeConfig = configs.states;
  else if (sub === "Districts") activeConfig = configs.districts;
  else if (sub === "Blocks") activeConfig = configs.blocks;
  else if (sub === "Organization Settings" || sub === "Settings") activeConfig = configs.systemConfig;

  return (
    <div className="portal-module regional-management-page">
      {/* Top Header */}
      <div className="module-head" style={{ marginBottom: "1.25rem" }}>
        <div>
          <div className="section-kicker">CENTRAL COMMAND / GEOGRAPHY</div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0.25rem 0" }}>
            {sub === "Regions" ? "Regional Management" : sub}
          </h2>
          <p style={{ color: "var(--charcoal-muted)", fontSize: "0.9rem", margin: 0 }}>
            {sub === "Regions"
              ? "Manage the geographic structure of NGO operations, appoint Regional Administrators, and monitor regional schools, fleet, and inventory."
              : `Administer ${sub.toLowerCase()} master data across the operating hierarchy.`}
          </p>
        </div>
        {sub === "Regions" && (
          <div className="module-actions" style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="ghost"
              onClick={() => window.open(`${API_BASE_URL}/super-admin/reports/regions.csv`, "_blank")}
              style={{ cursor: "pointer" }}
            >
              Export CSV
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => {
                setEditingRegion(null);
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
              + Add Region
            </button>
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
              {opt === "Regions" ? `Operational Regions (${regions.length})` : opt}
            </button>
          );
        })}
      </div>

      {/* If viewing other sub-tabs (States, Districts, Blocks, Settings), use standard ResourceView */}
      {sub !== "Regions" ? (
        <ResourceView config={activeConfig} />
      ) : (
        <>
          {/* Metrics Summary Cards */}
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
                Operational Regions
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--charcoal)" }}>{metrics.totalRegions}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--charcoal-muted)", marginTop: "0.25rem" }}>Geographical nodes</div>
            </div>

            <div className="surface metric-card" style={{ padding: "1rem", border: "1px solid var(--stone)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.75rem", fontFamily: "var(--mono)", color: "#BE755F", textTransform: "uppercase" }}>
                Regional Admins
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#BE755F" }}>{metrics.assignedAdmins}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--charcoal-muted)", marginTop: "0.25rem" }}>
                {metrics.totalRegions - metrics.assignedAdmins > 0
                  ? `${metrics.totalRegions - metrics.assignedAdmins} unassigned`
                  : "All regions staffed"}
              </div>
            </div>

            <div className="surface metric-card" style={{ padding: "1rem", border: "1px solid var(--stone)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.75rem", fontFamily: "var(--mono)", color: "#2B523D", textTransform: "uppercase" }}>
                Regional Schools
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#2B523D" }}>{metrics.totalSchools}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--charcoal-muted)", marginTop: "0.25rem" }}>Schools across regions</div>
            </div>

            <div className="surface metric-card" style={{ padding: "1rem", border: "1px solid var(--stone)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.75rem", fontFamily: "var(--mono)", color: "#2B6CB0", textTransform: "uppercase" }}>
                Assigned Fleet
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#2B6CB0" }}>{metrics.totalBuses}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--charcoal-muted)", marginTop: "0.25rem" }}>Mobile lab buses</div>
            </div>
          </div>

          {/* Search Toolbar */}
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
                placeholder="Search regions by name, state, administrator, or ID..."
                style={{
                  width: "100%",
                  padding: "0.55rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--stone)",
                  fontSize: "13px"
                }}
              />
            </div>
            <span style={{ fontSize: "12px", color: "var(--charcoal-subtle)", fontFamily: "var(--mono)" }}>
              {filteredRegions.length} of {regions.length} regions listed
            </span>
          </div>

          {error && <div className="error banner" style={{ marginBottom: "1rem" }}>{error}</div>}

          {/* Regions Directory Table */}
          <div className="table-wrap">
            {loading ? (
              <div className="loading-state small" style={{ padding: "2.5rem 0", textAlign: "center" }}>
                <div className="loader-ring" />
                <span style={{ display: "block", marginTop: "0.5rem" }}>Loading Regions…</span>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "22%" }}>Region & Identity</th>
                    <th style={{ width: "16%" }}>State / Geography</th>
                    <th style={{ width: "24%" }}>Appointed Regional Admin</th>
                    <th style={{ width: "12%" }}>Schools</th>
                    <th style={{ width: "10%" }}>Buses</th>
                    <th style={{ width: "16%" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegions.map((region) => {
                    const hasAdmin = region.adminName && region.adminName !== "Unassigned";

                    return (
                      <tr key={region.id}>
                        {/* Region Identity */}
                        <td>
                          <div>
                            <strong style={{ fontSize: "13px", color: "var(--charcoal)", display: "block" }}>
                              {region.name}
                            </strong>
                            <span style={{ fontSize: "10px", color: "var(--charcoal-subtle)", fontFamily: "var(--mono)" }}>
                              ID: {region.id}
                            </span>
                          </div>
                        </td>

                        {/* State */}
                        <td>
                          <span style={{ fontSize: "12px", color: "var(--charcoal)", fontWeight: 500 }}>
                            {region.stateName || "—"}
                          </span>
                        </td>

                        {/* Appointed Regional Admin */}
                        <td>
                          <div>
                            {hasAdmin ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                    background: "#BE755F",
                                    color: "#fff",
                                    display: "grid",
                                    placeItems: "center",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    fontFamily: "var(--mono)"
                                  }}
                                >
                                  {(region.adminName || "").slice(0, 1).toUpperCase()}
                                </div>
                                <div>
                                  <strong style={{ display: "block", fontSize: "12px", color: "var(--charcoal)" }}>
                                    {region.adminName}
                                  </strong>
                                  <span style={{ fontSize: "11px", color: "var(--charcoal-muted)", fontFamily: "var(--mono)" }}>
                                    {region.adminEmail}
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
                                ⚠ Unassigned Admin
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Schools count */}
                        <td>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--charcoal)" }}>
                            🏫 {region.schoolCount || 0}
                          </span>
                        </td>

                        {/* Buses count */}
                        <td>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--charcoal)" }}>
                            🚌 {region.busCount || 0}
                          </span>
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="row-actions" style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => handleOpenProfile(region)}
                              title="Open comprehensive regional profile"
                              style={{ fontWeight: 600 }}
                            >
                              Profile
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAssigningRegion(region);
                                setShowAssignModal(true);
                              }}
                              title="Appoint or transfer regional administrator responsibility"
                            >
                              Assign
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRegion(region);
                                setShowAddEditModal(true);
                              }}
                              title="Edit region details"
                            >
                              Edit
                            </button>
                            {region.id !== "region-west-1" && (
                              <button
                                type="button"
                                className="danger-link"
                                onClick={() => handleDeleteRegion(region)}
                                title="Delete region"
                              >
                                Del
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!filteredRegions.length && (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-table" style={{ padding: "3rem 1rem", textAlign: "center" }}>
                          <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>∅</span>
                          <strong>No regions found</strong>
                          <small style={{ display: "block", marginTop: "0.25rem", color: "var(--charcoal-subtle)" }}>
                            Click "+ Add Region" to register your first operational region.
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

      {/* Add / Edit Region Modal */}
      {showAddEditModal && (
        <RegionFormModal
          region={editingRegion}
          states={states}
          users={users}
          onClose={() => setShowAddEditModal(false)}
          onSaved={() => {
            setShowAddEditModal(false);
            void loadRegionsData();
          }}
        />
      )}

      {/* Assign / Transfer Regional Admin Modal */}
      {showAssignModal && assigningRegion && (
        <AssignAdminModal
          region={assigningRegion}
          users={users}
          onClose={() => setShowAssignModal(false)}
          onSaved={() => {
            setShowAssignModal(false);
            void loadRegionsData();
          }}
        />
      )}

      {/* Regional Profile Modal (Drill-Down) */}
      {showProfileModal && (
        <RegionalProfileModal
          loading={profileLoading}
          data={profileData}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// ADD / EDIT REGION MODAL
// -------------------------------------------------------------
interface RegionFormModalProps {
  region: RegionRecord | null;
  states: StateOption[];
  users: UserOption[];
  onClose: () => void;
  onSaved: () => void;
}

function RegionFormModal({ region, states, users, onClose, onSaved }: RegionFormModalProps) {
  const isEdit = Boolean(region);
  const [name, setName] = useState(region?.name || "");
  const [stateId, setStateId] = useState(region?.stateId || (states[0]?.id || ""));
  const [adminUserId, setAdminUserId] = useState(region?.adminId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (!name.trim()) {
      setError("Region name is required.");
      setSaving(false);
      return;
    }
    if (!stateId) {
      setError("State selection is required.");
      setSaving(false);
      return;
    }

    const payload: any = {
      name: name.trim(),
      stateId,
      adminUserId: adminUserId || null
    };

    try {
      if (isEdit && region) {
        await apiClient(`/super-admin/resource/regions/${region.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await apiClient("/super-admin/resource/regions", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save region");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleSubmit} style={{ width: "min(560px, 95vw)" }}>
        <div className="modal-head">
          <div>
            <div className="section-kicker">{isEdit ? "EDIT REGION" : "NEW OPERATIONAL REGION"}</div>
            <h3>{isEdit ? `Edit Region: ${region?.name}` : "Register New Region"}</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="error banner" style={{ marginBottom: "1rem" }}>{error}</div>}

        <div className="form-grid" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label className="form-field">
            <span>Region Name <b>*</b></span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Northern Maharashtra Region"
            />
          </label>

          <label className="form-field">
            <span>Geographic State <b>*</b></span>
            <select required value={stateId} onChange={(e) => setStateId(e.target.value)}>
              <option value="">Select State…</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Appoint Regional Administrator</span>
            <select value={adminUserId} onChange={(e) => setAdminUserId(e.target.value)}>
              <option value="">Leave Unassigned (Appoint later)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) - {u.roleEnum}
                </option>
              ))}
            </select>
            <small style={{ fontSize: "11px", color: "var(--charcoal-subtle)", marginTop: "4px" }}>
              Appointing a user automatically scopes their access to this operational region.
            </small>
          </label>
        </div>

        <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Register Region"}
          </button>
        </div>
      </form>
    </div>
  );
}

// -------------------------------------------------------------
// ASSIGN / TRANSFER REGIONAL ADMIN MODAL
// -------------------------------------------------------------
interface AssignAdminModalProps {
  region: RegionRecord;
  users: UserOption[];
  onClose: () => void;
  onSaved: () => void;
}

function AssignAdminModal({ region, users, onClose, onSaved }: AssignAdminModalProps) {
  const [selectedUserId, setSelectedUserId] = useState(region.adminId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiClient(`/super-admin/regions/${region.id}/assign-admin`, {
        method: "POST",
        body: JSON.stringify({ userId: selectedUserId || null })
      });
      alert(
        selectedUserId
          ? `Administrative responsibility for "${region.name}" successfully transferred.`
          : `Regional Administrator unassigned for "${region.name}".`
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer responsibility");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleAssign} style={{ width: "min(520px, 95vw)" }}>
        <div className="modal-head">
          <div>
            <div className="section-kicker">GOVERNANCE & RESPONSIBILITY</div>
            <h3>Appoint Regional Administrator</h3>
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
            <strong>Operational Region:</strong> {region.name} ({region.stateName})
          </div>
          <div style={{ marginTop: "4px" }}>
            <strong>Current Admin:</strong> {region.adminName ? `${region.adminName} (${region.adminEmail || ""})` : "Unassigned"}
          </div>
        </div>

        {error && <div className="error banner" style={{ marginBottom: "1rem" }}>{error}</div>}

        <label className="form-field">
          <span>Select New Administrator</span>
          <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
            <option value="">Unassign / No Administrator</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email}) - {u.roleEnum} {u.regionId ? `[Current Region: ${u.regionId}]` : ""}
              </option>
            ))}
          </select>
        </label>

        <p style={{ fontSize: "11px", color: "var(--charcoal-subtle)", margin: "0.75rem 0 0" }}>
          <strong>Note on Access Isolation:</strong> Regional Admins are granted strictly scoped access to their assigned region. Transferring responsibility updates their credentials and grants them complete oversight of local schools, staff, routes, and mobile lab buses.
        </p>

        <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Transferring…" : "Confirm Transfer"}
          </button>
        </div>
      </form>
    </div>
  );
}

// -------------------------------------------------------------
// REGIONAL PROFILE MODAL (Comprehensive Deep-Dive)
// -------------------------------------------------------------
interface RegionalProfileModalProps {
  loading: boolean;
  data: RegionProfileData | null;
  onClose: () => void;
}

function RegionalProfileModal({ loading, data, onClose }: RegionalProfileModalProps) {
  const [profileTab, setProfileTab] = useState<"overview" | "schools" | "buses" | "staff" | "inventory">("overview");

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: "min(880px, 95vw)", maxHeight: "90vh" }}>
        <div className="modal-head">
          <div>
            <div className="section-kicker">REGIONAL PROFILE & PERFORMANCE</div>
            <h3>{data?.region?.name || "Regional Profile"}</h3>
            <span style={{ fontSize: "12px", color: "var(--charcoal-muted)" }}>
              State: {data?.region?.stateName} | Identity: {data?.region?.id}
            </span>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>

        {loading || !data ? (
          <div style={{ textAlign: "center", padding: "3rem 0" }}>
            <div className="loader-ring" />
            <span style={{ display: "block", marginTop: "0.5rem" }}>Loading regional telemetry…</span>
          </div>
        ) : (
          <>
            {/* Regional Navigation Tabs */}
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
                { key: "overview", label: "Overview & Performance" },
                { key: "schools", label: `Schools (${data.schools.length})` },
                { key: "buses", label: `Mobile Labs (${data.buses.length})` },
                { key: "staff", label: `Field Staff (${data.fieldStaff.length})` },
                { key: "inventory", label: `Inventory & Equipment (${data.equipment.length})` }
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

            {/* TAB 1: OVERVIEW & PERFORMANCE */}
            {profileTab === "overview" && (
              <div>
                {/* Metric Summary Cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "0.75rem",
                    marginBottom: "1.25rem"
                  }}
                >
                  <div style={{ background: "var(--paper)", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--stone)" }}>
                    <div style={{ fontSize: "10px", color: "var(--charcoal-subtle)", fontFamily: "var(--mono)" }}>SCHOOLS</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{data.performance.totalSchools}</div>
                  </div>
                  <div style={{ background: "var(--paper)", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--stone)" }}>
                    <div style={{ fontSize: "10px", color: "var(--charcoal-subtle)", fontFamily: "var(--mono)" }}>TOTAL STUDENTS</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#2B523D" }}>{data.performance.totalStudents}</div>
                  </div>
                  <div style={{ background: "var(--paper)", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--stone)" }}>
                    <div style={{ fontSize: "10px", color: "var(--charcoal-subtle)", fontFamily: "var(--mono)" }}>ACTIVE BUSES</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#BE755F" }}>
                      {data.performance.availableBuses} / {data.performance.totalBuses}
                    </div>
                  </div>
                  <div style={{ background: "var(--paper)", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--stone)" }}>
                    <div style={{ fontSize: "10px", color: "var(--charcoal-subtle)", fontFamily: "var(--mono)" }}>FIELD STAFF</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#2B6CB0" }}>{data.performance.totalFieldStaff}</div>
                  </div>
                  <div style={{ background: "var(--paper)", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--stone)" }}>
                    <div style={{ fontSize: "10px", color: "var(--charcoal-subtle)", fontFamily: "var(--mono)" }}>OPEN ISSUES</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: data.performance.openIssuesCount > 0 ? "#DC2626" : "#16A34A" }}>
                      {data.performance.openIssuesCount}
                    </div>
                  </div>
                </div>

                {/* Appointed Administrator Details */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <h4 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "0.5rem" }}>Regional Administration</h4>
                  {data.regionalAdmins.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {data.regionalAdmins.map((adm) => (
                        <div
                          key={adm.id}
                          style={{
                            padding: "0.75rem",
                            borderRadius: "6px",
                            border: "1px solid var(--stone)",
                            background: "#fff",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                        >
                          <div>
                            <strong>{adm.name}</strong> ({adm.email})
                            <div style={{ fontSize: "11px", color: "var(--charcoal-muted)" }}>
                              {adm.phone ? `Phone: ${adm.phone} | ` : ""}Status: {adm.status}
                            </div>
                          </div>
                          <span style={{ fontSize: "11px", fontFamily: "var(--mono)", color: "var(--charcoal-subtle)" }}>
                            Last login: {adm.lastLoginAt ? new Date(adm.lastLoginAt).toLocaleDateString() : "Never"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "0.75rem", borderRadius: "6px", background: "#FEF3C7", color: "#B45309", fontSize: "12px" }}>
                      ⚠ No Regional Administrator currently appointed. Use the "Assign" action to designate an administrator.
                    </div>
                  )}
                </div>

                {/* Recent Operational Issues */}
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "0.5rem" }}>Recent Regional Issues</h4>
                  {data.recentIssues.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {data.recentIssues.slice(0, 5).map((issue) => (
                        <div
                          key={issue.id}
                          style={{
                            padding: "0.6rem 0.75rem",
                            borderRadius: "5px",
                            border: "1px solid var(--stone)",
                            background: "#fff",
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "12px"
                          }}
                        >
                          <div>
                            <strong>{issue.title}</strong>
                            <span style={{ marginLeft: "8px", fontSize: "10px", color: "var(--charcoal-subtle)", fontFamily: "var(--mono)" }}>
                              [{issue.category}]
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              color: issue.status === "RESOLVED" ? "#16A34A" : "#D97706"
                            }}
                          >
                            {issue.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: "12px", color: "var(--charcoal-muted)" }}>No open issues in this region.</div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: REGIONAL SCHOOLS */}
            {profileTab === "schools" && (
              <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                <table style={{ width: "100%", fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th>School Name</th>
                      <th>UDISE Code</th>
                      <th>Contact Phone</th>
                      <th>Total Students</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.schools.map((s) => (
                      <tr key={s.id}>
                        <td><strong>{s.name}</strong></td>
                        <td style={{ fontFamily: "var(--mono)" }}>{s.udiseCode}</td>
                        <td>{s.contactPhone || "—"}</td>
                        <td><strong>{s.totalStudents}</strong></td>
                      </tr>
                    ))}
                    {!data.schools.length && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "1.5rem" }}>
                          No schools currently registered under this region.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: REGIONAL BUSES */}
            {profileTab === "buses" && (
              <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                <table style={{ width: "100%", fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th>Lab Code</th>
                      <th>Registration</th>
                      <th>Status</th>
                      <th>Assigned Driver / Staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.buses.map((b) => (
                      <tr key={b.id}>
                        <td><strong>{b.busCode || "—"}</strong></td>
                        <td style={{ fontFamily: "var(--mono)" }}>{b.registrationNumber}</td>
                        <td>
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "10px",
                              fontWeight: 700,
                              background: b.status === "AVAILABLE" ? "#DCFCE7" : "#FEE2E2",
                              color: b.status === "AVAILABLE" ? "#16A34A" : "#DC2626"
                            }}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td>{b.User ? `${b.User.name} (${b.User.email})` : "Unassigned"}</td>
                      </tr>
                    ))}
                    {!data.buses.length && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "1.5rem" }}>
                          No mobile laboratories assigned to this region.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 4: FIELD STAFF */}
            {profileTab === "staff" && (
              <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                <table style={{ width: "100%", fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th>Staff Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Assigned Bus</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.fieldStaff.map((f) => (
                      <tr key={f.id}>
                        <td><strong>{f.name}</strong></td>
                        <td style={{ fontFamily: "var(--mono)" }}>{f.email}</td>
                        <td>{f.phone || "—"}</td>
                        <td>{f.busName}</td>
                        <td>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: f.status === "ACTIVE" ? "#16A34A" : "#64748B" }}>
                            {f.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!data.fieldStaff.length && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "1.5rem" }}>
                          No field staff assigned to this region.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 5: INVENTORY & EQUIPMENT */}
            {profileTab === "inventory" && (
              <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                <h4 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "0.5rem" }}>
                  Regional Equipment Assets ({data.equipment.length})
                </h4>
                <table style={{ width: "100%", fontSize: "12px", marginBottom: "1.5rem" }}>
                  <thead>
                    <tr>
                      <th>Asset Tag</th>
                      <th>Equipment Name</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Allocated Bus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.equipment.map((eq) => (
                      <tr key={eq.id}>
                        <td style={{ fontFamily: "var(--mono)" }}>{eq.assetTag}</td>
                        <td><strong>{eq.name}</strong></td>
                        <td>{eq.category}</td>
                        <td>{eq.status}</td>
                        <td>{eq.Bus?.busCode ? `${eq.Bus.busCode} (${eq.Bus.registrationNumber})` : "—"}</td>
                      </tr>
                    ))}
                    {!data.equipment.length && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "1rem" }}>
                          No equipment assets currently allocated to buses in this region.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <h4 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "0.5rem" }}>
                  Recent Consumables Activity
                </h4>
                <table style={{ width: "100%", fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Transaction</th>
                      <th>Quantity</th>
                      <th>Bus</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td><strong>{tx.consumable?.name || "Consumable"}</strong></td>
                        <td>{tx.type}</td>
                        <td>{tx.quantity} {tx.consumable?.unitMetric || "units"}</td>
                        <td>{tx.bus?.busCode || tx.bus?.registrationNumber || "—"}</td>
                        <td style={{ fontSize: "11px", fontFamily: "var(--mono)" }}>{new Date(tx.timestamp).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {!data.recentTransactions.length && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "1rem" }}>
                          No recent inventory transactions recorded for this region.
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
