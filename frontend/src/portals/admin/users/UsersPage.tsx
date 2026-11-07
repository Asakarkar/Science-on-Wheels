import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient, API_BASE_URL } from "../../../services/api-client";
import { formatValue } from "../../../shared/utils/format";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roleEnum: string;
  status: string;
  isActive: boolean;
  regionId?: string | null;
  regionName?: string;
  busId?: string | null;
  busName?: string;
  lastLoginAt?: string | null;
  createdAt: string;
}

interface RegionOption {
  id: string;
  name: string;
}

interface BusOption {
  id: string;
  busCode?: string;
  registrationNumber: string;
  regionId: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entity?: string;
  entityId?: string;
  ipAddress?: string;
  metadata?: any;
  timestamp: string;
}

export function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const subParam = searchParams.get("sub") || "All Users";

  // Data states
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [regionFilter, setRegionFilter] = useState("ALL");

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState<UserRecord | null>(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyUser, setHistoryUser] = useState<UserRecord | null>(null);
  const [historyLogs, setHistoryLogs] = useState<AuditLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Sync tab with URL
  const activeTab = useMemo(() => {
    if (subParam === "Regional Administrators") return "REGIONAL_ADMIN";
    if (subParam === "Field Staff") return "SCIENCE_COMMUNICATOR";
    if (subParam === "Administrators") return "SUPER_ADMIN";
    return "ALL";
  }, [subParam]);

  function setTab(tab: string) {
    if (tab === "REGIONAL_ADMIN") setSearchParams({ sub: "Regional Administrators" });
    else if (tab === "SCIENCE_COMMUNICATOR") setSearchParams({ sub: "Field Staff" });
    else if (tab === "SUPER_ADMIN") setSearchParams({ sub: "Administrators" });
    else setSearchParams({});
  }

  // Load live data
  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [usersRes, regionsRes, busesRes] = await Promise.all([
        apiClient<{ rows: UserRecord[] }>("/super-admin/resource/users?limit=300"),
        apiClient<{ rows: RegionOption[] }>("/super-admin/resource/regions?limit=100").catch(() => ({ rows: [] })),
        apiClient<{ rows: BusOption[] }>("/super-admin/resource/labs?limit=100").catch(() => ({ rows: [] }))
      ]);
      setUsers(usersRes.rows || []);
      setRegions(regionsRes.rows || []);
      setBuses(busesRes.rows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user directory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter from tab
      if (activeTab !== "ALL" && u.roleEnum !== activeTab) return false;

      // Status filter
      if (statusFilter !== "ALL" && u.status !== statusFilter) return false;

      // Region filter
      if (regionFilter !== "ALL" && u.regionId !== regionFilter) return false;

      // Search query
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = u.name?.toLowerCase().includes(query);
        const matchesEmail = u.email?.toLowerCase().includes(query);
        const matchesPhone = u.phone?.toLowerCase().includes(query);
        const matchesRegion = u.regionName?.toLowerCase().includes(query);
        const matchesBus = u.busName?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesRegion && !matchesBus) {
          return false;
        }
      }

      return true;
    });
  }, [users, activeTab, statusFilter, regionFilter, search]);

  // Metrics
  const metrics = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.roleEnum === "SUPER_ADMIN").length;
    const regional = users.filter((u) => u.roleEnum === "REGIONAL_ADMIN").length;
    const field = users.filter((u) => u.roleEnum === "SCIENCE_COMMUNICATOR").length;
    const active = users.filter((u) => u.status === "ACTIVE" && u.isActive).length;
    const deactivated = users.filter((u) => u.status === "DEACTIVATED" || !u.isActive).length;
    return { total, admins, regional, field, active, deactivated };
  }, [users]);

  // Actions
  async function handleToggleStatus(user: UserRecord) {
    const isCurrentlyActive = user.status === "ACTIVE" && user.isActive;
    const newStatus = isCurrentlyActive ? "DEACTIVATED" : "ACTIVE";
    const newIsActive = !isCurrentlyActive;

    if (isCurrentlyActive) {
      const confirmDeactivate = window.confirm(
        `Are you sure you want to deactivate ${user.name} (${user.email})?\n\nDeactivating this account will immediately revoke all active sessions. This action should be performed when staff leave the organization.`
      );
      if (!confirmDeactivate) return;
    }

    try {
      await apiClient(`/super-admin/resource/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus, isActive: newIsActive })
      });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update account status");
    }
  }

  async function handleDelete(user: UserRecord) {
    if (user.roleEnum === "SUPER_ADMIN" && user.email.toLowerCase().includes("admin")) {
      alert("The primary bootstrap Administrator account is protected and cannot be deleted.");
      return;
    }
    const confirmDelete = window.confirm(
      `Permanently delete user ${user.name} (${user.email})?\n\nThis will remove their profile and unassign all linked vehicles and routes. This cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      await apiClient(`/super-admin/resource/users/${user.id}?cascade=true`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  async function handleViewHistory(user: UserRecord) {
    setHistoryUser(user);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const res = await apiClient<{ logs: AuditLogEntry[] }>(`/super-admin/users/${user.id}/history`);
      setHistoryLogs(res.logs || []);
    } catch (err) {
      console.error("Failed to load user history", err);
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleExportCsv() {
    window.open(`${API_BASE_URL}/super-admin/reports/users.csv`, "_blank");
  }

  return (
    <div className="portal-module user-admin-page">
      {/* Page Header */}
      <div className="module-head" style={{ marginBottom: "1.25rem" }}>
        <div>
          <div className="section-kicker">CENTRAL COMMAND / ACCESS CONTROL</div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0.25rem 0" }}>
            User Administration
          </h2>
          <p style={{ color: "var(--charcoal-muted)", fontSize: "0.9rem", margin: 0 }}>
            Manage platform identity, assign Regional Admins and Field Staff, configure regional and bus scopes, and enforce security lifecycles.
          </p>
        </div>
        <div className="module-actions" style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="ghost" onClick={handleExportCsv} style={{ cursor: "pointer" }}>
            Export CSV
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setEditingUser(null);
              setShowUserModal(true);
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
            + Add User
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-label">Total Accounts</div>
          <strong>{metrics.total}</strong>
          <small>All registered users</small>
        </div>

        <div className="metric-card">
          <div className="metric-label">Administrators</div>
          <strong>{metrics.admins}</strong>
          <small>Complete system access</small>
        </div>

        <div className="metric-card">
          <div className="metric-label">Regional Admins</div>
          <strong>{metrics.regional}</strong>
          <small>Regional operations</small>
        </div>

        <div className="metric-card">
          <div className="metric-label">Field Staff</div>
          <strong>{metrics.field}</strong>
          <small>Bus & laboratory staff</small>
        </div>
      </div>

      {/* Navigation Directory Tabs */}
      <div
        className="subnav-tabs"
        style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", borderBottom: "1px solid var(--stone)", paddingBottom: "0.75rem" }}
      >
        {[
          { key: "ALL", label: `All Users (${metrics.total})` },
          { key: "REGIONAL_ADMIN", label: `Regional Administrators (${metrics.regional})` },
          { key: "SCIENCE_COMMUNICATOR", label: `Field Staff (${metrics.field})` },
          { key: "SUPER_ADMIN", label: `Administrators (${metrics.admins})` }
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className={`ghost ${isActive ? "primary" : ""}`}
              onClick={() => setTab(tab.key)}
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
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Directory Filter & Search Toolbar */}
      <div
        className="toolbar"
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
          alignItems: "center"
        }}
      >
        <div style={{ flex: 1, minWidth: "260px" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, region, or bus..."
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
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="DEACTIVATED">Deactivated Only</option>
            <option value="SUSPENDED">Suspended Only</option>
            <option value="LOCKED">Locked Only</option>
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
          {filteredUsers.length} of {users.length} users listed
        </span>
      </div>

      {error && <div className="error banner" style={{ marginBottom: "1rem" }}>{error}</div>}

      {/* User Directory Table */}
      <div className="table-wrap">
        {loading ? (
          <div className="loading-state small" style={{ padding: "2.5rem 0", textAlign: "center" }}>
            <div className="loader-ring" />
            <span style={{ display: "block", marginTop: "0.5rem" }}>Loading User Directory…</span>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: "24%" }}>User & Identity</th>
                <th style={{ width: "16%" }}>Role & Access</th>
                <th style={{ width: "18%" }}>Regional Assignment</th>
                <th style={{ width: "16%" }}>Bus Assignment</th>
                <th style={{ width: "12%" }}>Account Status</th>
                <th style={{ width: "14%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isSuperAdmin = user.roleEnum === "SUPER_ADMIN";
                const isRegionalAdmin = user.roleEnum === "REGIONAL_ADMIN";
                const isFieldStaff = user.roleEnum === "SCIENCE_COMMUNICATOR";
                const isActive = user.status === "ACTIVE" && user.isActive;

                return (
                  <tr key={user.id}>
                    {/* User Identity */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "50%",
                            background: isSuperAdmin
                              ? "var(--charcoal-dark, #1E242B)"
                              : isRegionalAdmin
                              ? "#BE755F"
                              : "#2B523D",
                            color: "#fff",
                            display: "grid",
                            placeItems: "center",
                            fontSize: "13px",
                            fontWeight: 700,
                            fontFamily: "var(--mono)"
                          }}
                        >
                          {(user.name || user.email).slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ display: "block", fontSize: "13px", color: "var(--charcoal)" }}>
                            {user.name || "Unnamed User"}
                          </strong>
                          <span style={{ fontSize: "11px", color: "var(--charcoal-muted)", fontFamily: "var(--mono)" }}>
                            {user.email}
                          </span>
                          {user.phone && (
                            <div style={{ fontSize: "10px", color: "var(--charcoal-subtle)" }}>
                              📞 {user.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role & Access */}
                    <td>
                      <div>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 700,
                            fontFamily: "var(--mono)",
                            background: isSuperAdmin
                              ? "#1E242B"
                              : isRegionalAdmin
                              ? "#FBE9E7"
                              : "#E8F5E9",
                            color: isSuperAdmin
                              ? "#ffffff"
                              : isRegionalAdmin
                              ? "#C05621"
                              : "#276749"
                          }}
                        >
                          {isSuperAdmin
                            ? "Admin"
                            : isRegionalAdmin
                            ? "Regional Admin"
                            : isFieldStaff
                            ? "Field Staff"
                            : user.roleEnum}
                        </span>
                        <small
                          style={{
                            display: "block",
                            fontSize: "10px",
                            color: "var(--charcoal-subtle)",
                            marginTop: "2px"
                          }}
                        >
                          {isSuperAdmin
                            ? "Complete system access"
                            : isRegionalAdmin
                            ? "Assigned regional ops"
                            : "Bus & laboratory ops"}
                        </small>
                      </div>
                    </td>

                    {/* Regional Assignment */}
                    <td>
                      <div>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--charcoal)" }}>
                          {isSuperAdmin ? "🌐 Central HQ (All Regions)" : user.regionName || "—"}
                        </span>
                        {user.regionId && !isSuperAdmin && (
                          <div style={{ fontSize: "10px", color: "var(--charcoal-subtle)", fontFamily: "var(--mono)" }}>
                            ID: {user.regionId}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Bus Assignment */}
                    <td>
                      <div>
                        {user.busName && user.busName !== "—" ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 7px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              background: "#EBF8FF",
                              color: "#2B6CB0",
                              fontWeight: 600
                            }}
                          >
                            🚌 {user.busName}
                          </span>
                        ) : (
                          <span style={{ color: "var(--charcoal-subtle)", fontSize: "12px" }}>
                            {isFieldStaff ? "Unassigned bus" : "Not applicable"}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Account Status */}
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
                              user.status === "ACTIVE" && user.isActive
                                ? "#DCFCE7"
                                : user.status === "DEACTIVATED" || !user.isActive
                                ? "#F1F5F9"
                                : "#FEF3C7",
                            color:
                              user.status === "ACTIVE" && user.isActive
                                ? "#15803D"
                                : user.status === "DEACTIVATED" || !user.isActive
                                ? "#64748B"
                                : "#B45309"
                          }}
                        >
                          ● {user.status}
                        </span>
                        <div style={{ marginTop: "4px" }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              fontSize: "11px",
                              color: isActive ? "#BE755F" : "#16A34A",
                              cursor: "pointer",
                              textDecoration: "underline"
                            }}
                          >
                            {isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="row-actions" style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(user);
                            setShowUserModal(true);
                          }}
                          title="Edit personal details, role, region, and bus assignment"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordUser(user);
                            setShowPasswordModal(true);
                          }}
                          title="Reset user password"
                        >
                          Key
                        </button>
                        <button
                          type="button"
                          onClick={() => handleViewHistory(user)}
                          title="View user activity and assignment history"
                        >
                          Log
                        </button>
                        {user.roleEnum !== "SUPER_ADMIN" && (
                          <button
                            type="button"
                            className="danger-link"
                            onClick={() => handleDelete(user)}
                            title="Delete user account"
                          >
                            Del
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!filteredUsers.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-table" style={{ padding: "3rem 1rem", textAlign: "center" }}>
                      <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>∅</span>
                      <strong>No matching users found</strong>
                      <small style={{ display: "block", marginTop: "0.25rem", color: "var(--charcoal-subtle)" }}>
                        Try clearing search terms or changing the active status/role filters.
                      </small>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {showUserModal && (
        <UserFormModal
          user={editingUser}
          regions={regions}
          buses={buses}
          onClose={() => setShowUserModal(false)}
          onSaved={() => {
            setShowUserModal(false);
            void loadData();
          }}
        />
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && passwordUser && (
        <PasswordResetModal
          user={passwordUser}
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            setShowPasswordModal(false);
            void loadData();
          }}
        />
      )}

      {/* User History Modal */}
      {showHistoryModal && historyUser && (
        <UserHistoryModal
          user={historyUser}
          logs={historyLogs}
          loading={historyLoading}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// USER FORM MODAL (Add User / Edit User / Assign Role & Bus)
// -------------------------------------------------------------
interface UserFormModalProps {
  user: UserRecord | null;
  regions: RegionOption[];
  buses: BusOption[];
  onClose: () => void;
  onSaved: () => void;
}

function UserFormModal({ user, regions, buses, onClose, onSaved }: UserFormModalProps) {
  const isEdit = Boolean(user);

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    roleEnum: user?.roleEnum || "REGIONAL_ADMIN",
    regionId: user?.regionId || "",
    busId: user?.busId || "",
    status: user?.status || "ACTIVE",
    isActive: user?.isActive ?? true,
    password: ""
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isFieldStaff = form.roleEnum === "SCIENCE_COMMUNICATOR";
  const isRegionalAdmin = form.roleEnum === "REGIONAL_ADMIN";
  const isSuperAdmin = form.roleEnum === "SUPER_ADMIN";

  // Filter available buses by selected region if applicable
  const availableBuses = useMemo(() => {
    if (!form.regionId) return buses;
    return buses.filter((b) => b.regionId === form.regionId);
  }, [buses, form.regionId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    // Validate
    if (!form.name.trim()) {
      setError("User full name is required.");
      setSaving(false);
      return;
    }
    if (!form.email.trim()) {
      setError("User email address is required.");
      setSaving(false);
      return;
    }
    if (!isEdit && !form.password) {
      setError("Temporary password is required for new accounts.");
      setSaving(false);
      return;
    }
    if (isRegionalAdmin && !form.regionId) {
      setError("Regional assignment is required for Regional Administrators.");
      setSaving(false);
      return;
    }

    const payload: any = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      roleEnum: form.roleEnum,
      regionId: isSuperAdmin ? null : form.regionId || null,
      status: form.status,
      isActive: form.isActive
    };

    // Include bus assignment for field staff
    if (isFieldStaff) {
      payload.busId = form.busId || null;
    } else {
      payload.busId = null;
    }

    // Password handling
    if (form.password) {
      payload.password = form.password;
    }

    try {
      if (isEdit && user) {
        await apiClient(`/super-admin/resource/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await apiClient("/super-admin/resource/users", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleSubmit} style={{ width: "min(680px, 95vw)" }}>
        <div className="modal-head">
          <div>
            <div className="section-kicker">{isEdit ? "USER PROFILE" : "NEW ACCOUNT"}</div>
            <h3>{isEdit ? `Edit User: ${user?.name}` : "Create New User Account"}</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="error banner" style={{ marginBottom: "1rem" }}>{error}</div>}

        <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {/* Full Name */}
          <label className="form-field">
            <span>Full Name <b>*</b></span>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Rahul Sharma"
            />
          </label>

          {/* Email Address */}
          <label className="form-field">
            <span>Email Address <b>*</b></span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="e.g. rahul.sharma@sow.org"
            />
          </label>

          {/* Phone Number */}
          <label className="form-field">
            <span>Contact Phone</span>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="e.g. +91 98765 43210"
            />
          </label>

          {/* User Role */}
          <label className="form-field">
            <span>User Role <b>*</b></span>
            <select
              value={form.roleEnum}
              onChange={(e) => setForm((p) => ({ ...p, roleEnum: e.target.value }))}
            >
              <option value="SUPER_ADMIN">Admin (Complete system access)</option>
              <option value="REGIONAL_ADMIN">Regional Admin (Assigned regional operations)</option>
              <option value="SCIENCE_COMMUNICATOR">Field Staff (Assigned bus & lab operations)</option>
            </select>
          </label>

          {/* Regional Assignment */}
          <label className="form-field" style={{ gridColumn: isSuperAdmin ? "span 2" : "span 1" }}>
            <span>
              Regional Assignment {isRegionalAdmin && <b>*</b>}
            </span>
            {isSuperAdmin ? (
              <input type="text" disabled value="All Regions (Central HQ Access)" style={{ opacity: 0.7 }} />
            ) : (
              <select
                value={form.regionId}
                onChange={(e) => setForm((p) => ({ ...p, regionId: e.target.value, busId: "" }))}
                required={isRegionalAdmin}
              >
                <option value="">Select Region Scope…</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
          </label>

          {/* Bus Assignment (Field Staff Only) */}
          {isFieldStaff && (
            <label className="form-field">
              <span>Bus Assignment</span>
              <select
                value={form.busId}
                onChange={(e) => setForm((p) => ({ ...p, busId: e.target.value }))}
              >
                <option value="">No Bus Assigned (Standby)</option>
                {availableBuses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.busCode ? `${b.busCode} - ` : ""}{b.registrationNumber}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Account Status */}
          <label className="form-field">
            <span>Account Status</span>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  status: e.target.value,
                  isActive: e.target.value === "ACTIVE"
                }))
              }
            >
              <option value="ACTIVE">Active (Can log in)</option>
              <option value="DEACTIVATED">Deactivated (Staff left organization)</option>
              <option value="SUSPENDED">Suspended (Temporary hold)</option>
              <option value="LOCKED">Locked (Security lockout)</option>
            </select>
          </label>

          {/* Password Management */}
          <label className="form-field">
            <span>
              {isEdit ? "Reset Password" : "Temporary Password"} {!isEdit && <b>*</b>}
            </span>
            <input
              type="text"
              required={!isEdit}
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder={isEdit ? "Leave blank to keep unchanged" : "Set initial password"}
            />
          </label>
        </div>

        <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
}

// -------------------------------------------------------------
// PASSWORD RESET MODAL
// -------------------------------------------------------------
interface PasswordResetModalProps {
  user: UserRecord;
  onClose: () => void;
  onSuccess: () => void;
}

function PasswordResetModal({ user, onClose, onSuccess }: PasswordResetModalProps) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      await apiClient(`/super-admin/resource/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password })
      });
      alert(`Password successfully updated for ${user.name}. Active sessions have been revoked.`);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleReset} style={{ width: "min(460px, 95vw)" }}>
        <div className="modal-head">
          <div>
            <div className="section-kicker">PASSWORD MANAGEMENT</div>
            <h3>Reset Password</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div style={{ marginBottom: "1rem", fontSize: "13px", color: "var(--charcoal-muted)" }}>
          Set a new password for <strong>{user.name}</strong> ({user.email}). Updating the password will immediately revoke all current active sessions for security.
        </div>

        {error && <div className="error banner" style={{ marginBottom: "1rem" }}>{error}</div>}

        <label className="form-field">
          <span>New Password <b>*</b></span>
          <input
            type="text"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new secure password (min 6 chars)"
          />
        </label>

        <div className="modal-actions" style={{ marginTop: "1.25rem" }}>
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Resetting…" : "Confirm Reset"}
          </button>
        </div>
      </form>
    </div>
  );
}

// -------------------------------------------------------------
// USER HISTORY / AUDIT LOG MODAL
// -------------------------------------------------------------
interface UserHistoryModalProps {
  user: UserRecord;
  logs: AuditLogEntry[];
  loading: boolean;
  onClose: () => void;
}

function UserHistoryModal({ user, logs, loading, onClose }: UserHistoryModalProps) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: "min(680px, 95vw)", maxHeight: "85vh" }}>
        <div className="modal-head">
          <div>
            <div className="section-kicker">AUDIT TRAIL / USER HISTORY</div>
            <h3>Activity History: {user.name}</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>

        {/* User Identity Summary */}
        <div
          style={{
            background: "var(--paper, #F8FAFC)",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            border: "1px solid var(--stone)",
            marginBottom: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px"
          }}
        >
          <div>
            <strong>Role:</strong> {user.roleEnum} | <strong>Region:</strong> {user.regionName || "None"}
          </div>
          <div>
            <strong>Status:</strong> {user.status} | <strong>Bus:</strong> {user.busName || "None"}
          </div>
        </div>

        {/* Timeline Log Entries */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div className="loader-ring" />
            <span style={{ display: "block", marginTop: "0.5rem" }}>Loading activity history…</span>
          </div>
        ) : logs.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  borderLeft: "3px solid var(--charcoal)",
                  paddingLeft: "0.75rem",
                  paddingBottom: "0.5rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "var(--mono)" }}>
                  <span style={{ fontWeight: 700, color: "var(--charcoal)" }}>
                    {log.action}
                  </span>
                  <span style={{ color: "var(--charcoal-subtle)" }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                {log.entity && (
                  <div style={{ fontSize: "12px", color: "var(--charcoal-muted)", marginTop: "2px" }}>
                    Target: {log.entity} {log.entityId ? `(#${log.entityId})` : ""}
                  </div>
                )}
                {log.metadata && (
                  <pre
                    style={{
                      margin: "4px 0 0",
                      fontSize: "11px",
                      background: "rgba(0,0,0,0.03)",
                      padding: "4px 6px",
                      borderRadius: "4px",
                      fontFamily: "var(--mono)"
                    }}
                  >
                    {JSON.stringify(log.metadata)}
                  </pre>
                )}
                {log.ipAddress && (
                  <div style={{ fontSize: "10px", color: "var(--charcoal-subtle)", marginTop: "2px" }}>
                    IP: {log.ipAddress}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--charcoal-muted)" }}>
            No recorded audit activity found for this user.
          </div>
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
