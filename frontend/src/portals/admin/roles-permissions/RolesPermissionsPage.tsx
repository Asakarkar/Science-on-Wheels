import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../../services/api-client";
import { configs } from "../config/resources";
import { ResourceView } from "../components/ResourceView";

interface RoleRecord {
  id: string;
  name: string;
  description?: string;
  userCount?: number;
  permissionKeys?: string[];
}

interface PermissionRecord {
  id: string;
  key: string;
  description?: string;
}

const CATEGORY_MAP: Record<string, { label: string; icon: string; match: (key: string) => boolean }> = {
  dashboard: {
    label: "Dashboard & Analytics",
    icon: "📊",
    match: (key) => key.startsWith("dashboard.") || key.startsWith("analytics."),
  },
  people: {
    label: "Personnel & User Access",
    icon: "👥",
    match: (key) => key.startsWith("people.") || key.startsWith("users."),
  },
  labs: {
    label: "Laboratories & Fleet Assets",
    icon: "🚌",
    match: (key) => key.startsWith("labs.") || key.startsWith("resources.") || key.startsWith("inventory."),
  },
  schools: {
    label: "Schools & Curriculum",
    icon: "🏫",
    match: (key) => key.startsWith("schools.") || key.startsWith("curriculum."),
  },
  operations: {
    label: "Operations & Field Missions",
    icon: "🗺️",
    match: (key) => key.startsWith("operations.") || key.startsWith("field."),
  },
  security: {
    label: "Security, Audit & Platform",
    icon: "🔒",
    match: (key) => key.startsWith("security.") || key.startsWith("monitoring.") || key.startsWith("organization.") || key.startsWith("config."),
  },
};

export function RolesPermissionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Matrix";

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  // Matrix state
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [allPermissions, setAllPermissions] = useState<PermissionRecord[]>([]);
  const [assignedKeys, setAssignedKeys] = useState<Set<string>>(new Set());
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const subOptions = ["Matrix", "Roles Directory", "Permissions Dictionary"];

  // 1. Fetch all roles
  useEffect(() => {
    apiClient<{ rows: RoleRecord[] }>("/super-admin/resource/roles")
      .then((res) => {
        const rows = res.rows || [];
        setRoles(rows);
        if (rows.length > 0 && !selectedRoleId) {
          setSelectedRoleId(rows[0].id);
        }
      })
      .catch((e) => setError(e?.message || "Failed to load roles"));
  }, []);

  // 2. Fetch permissions for selected role
  useEffect(() => {
    if (!selectedRoleId) return;
    setLoading(true);
    setError("");
    setSuccess("");
    apiClient<{ role: RoleRecord; assignedKeys: string[]; allPermissions: PermissionRecord[] }>(
      `/super-admin/roles/${selectedRoleId}/permissions`
    )
      .then((res) => {
        setAllPermissions(res.allPermissions || []);
        const assigned = new Set(res.assignedKeys || []);
        setAssignedKeys(assigned);
        setSavedKeys(new Set(res.assignedKeys || []));
      })
      .catch((e) => setError(e?.message || "Failed to load role permissions"))
      .finally(() => setLoading(false));
  }, [selectedRoleId]);

  const activeRole = roles.find((r) => r.id === selectedRoleId);

  const hasUnsavedChanges = useMemo(() => {
    if (assignedKeys.size !== savedKeys.size) return true;
    for (const key of assignedKeys) {
      if (!savedKeys.has(key)) return true;
    }
    return false;
  }, [assignedKeys, savedKeys]);

  function togglePermission(key: string) {
    setAssignedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function selectAll() {
    setAssignedKeys(new Set(allPermissions.map((p) => p.key)));
  }

  function deselectAll() {
    setAssignedKeys(new Set());
  }

  function resetToSaved() {
    setAssignedKeys(new Set(savedKeys));
  }

  async function handleSavePermissions() {
    if (!selectedRoleId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const keysArray = Array.from(assignedKeys);
      await apiClient(`/super-admin/roles/${selectedRoleId}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissionKeys: keysArray }),
      });
      setSavedKeys(new Set(assignedKeys));
      setSuccess(`Permissions updated successfully for ${activeRole?.name || "role"} (${keysArray.length} active).`);
      // Update role record user/perm cache if needed
      setRoles((prev) =>
        prev.map((r) => (r.id === selectedRoleId ? { ...r, permissionKeys: keysArray } : r))
      );
    } catch (e: any) {
      setError(e?.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  }

  // Filter and group permissions
  const filteredPermissions = useMemo(() => {
    if (!filterText.trim()) return allPermissions;
    const q = filterText.toLowerCase();
    return allPermissions.filter(
      (p) => p.key.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
    );
  }, [allPermissions, filterText]);

  const grouped = useMemo(() => {
    const groups: { [cat: string]: { label: string; icon: string; items: PermissionRecord[] } } = {};
    for (const [catKey, catDef] of Object.entries(CATEGORY_MAP)) {
      groups[catKey] = { label: catDef.label, icon: catDef.icon, items: [] };
    }
    groups["other"] = { label: "Additional Platform Capabilities", icon: "⚙️", items: [] };

    for (const perm of filteredPermissions) {
      let matched = false;
      for (const [catKey, catDef] of Object.entries(CATEGORY_MAP)) {
        if (catDef.match(perm.key)) {
          groups[catKey].items.push(perm);
          matched = true;
          break;
        }
      }
      if (!matched) {
        groups["other"].items.push(perm);
      }
    }
    return Object.entries(groups).filter(([_, g]) => g.items.length > 0);
  }, [filteredPermissions]);

  return (
    <div className="portal-module">
      {/* Subnav Tabs */}
      <div className="subnav-tabs" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {subOptions.map((opt) => (
          <button
            key={opt}
            className={`ghost ${sub === opt ? "primary" : ""}`}
            onClick={() => setSub(opt)}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "4px",
              background: sub === opt ? "var(--color-primary, #6366f1)" : "rgba(255,255,255,0.05)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
            }}
          >
            {opt === "Matrix" ? "⚡ Role Permission Matrix" : opt}
          </button>
        ))}
      </div>

      {sub === "Roles Directory" && <ResourceView config={configs.roles} />}
      {sub === "Permissions Dictionary" && <ResourceView config={configs.permissions} />}

      {sub === "Matrix" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Header Banner */}
          <div
            className="surface"
            style={{
              padding: "1.25rem 1.5rem",
              borderRadius: "8px",
              background: "rgba(30, 36, 43, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <span style={{ fontSize: "11px", fontFamily: "monospace", letterSpacing: "0.08em", color: "#6366f1", textTransform: "uppercase" }}>
                  RBAC SECURITY & GOVERNANCE
                </span>
                <h2 style={{ margin: "4px 0", fontSize: "1.5rem", fontWeight: 700 }}>
                  Role Permission Matrix
                </h2>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>
                  Inspect and grant granular platform capabilities to defined system roles. Changes take effect on subsequent authenticated requests.
                </p>
              </div>

              {hasUnsavedChanges && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#f59e0b22", border: "1px solid #f59e0b", color: "#fcd34d", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                  Unsaved Changes
                </div>
              )}
            </div>

            {/* Role Selector Pills */}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
              {roles.map((r) => {
                const isSelected = r.id === selectedRoleId;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoleId(r.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 1rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      border: isSelected ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.1)",
                      background: isSelected ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.03)",
                      color: isSelected ? "#fff" : "#cbd5e1",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "13px" }}>{r.name}</span>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 6px",
                        borderRadius: "10px",
                        background: isSelected ? "#6366f1" : "rgba(255,255,255,0.1)",
                        color: "#fff",
                      }}
                    >
                      {r.userCount ?? 0} users
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notifications */}
          {error && (
            <div style={{ backgroundColor: "#ef444422", border: "1px solid #ef4444", color: "#fca5a5", padding: "0.75rem 1rem", borderRadius: "6px", fontSize: "13px" }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ backgroundColor: "#22c55e22", border: "1px solid #22c55e", color: "#86efac", padding: "0.75rem 1rem", borderRadius: "6px", fontSize: "13px" }}>
              {success}
            </div>
          )}

          {/* Action Toolbar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              background: "rgba(255,255,255,0.02)",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Filter permissions..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                style={{
                  padding: "0.45rem 0.8rem",
                  borderRadius: "6px",
                  background: "#0f172a",
                  border: "1px solid #334155",
                  color: "#fff",
                  fontSize: "13px",
                  minWidth: "220px",
                }}
              />
              <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                Active: <strong style={{ color: "#fff" }}>{assignedKeys.size}</strong> / {allPermissions.length}
              </span>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={selectAll}
                className="ghost"
                style={{ padding: "0.4rem 0.75rem", fontSize: "12px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="ghost"
                style={{ padding: "0.4rem 0.75rem", fontSize: "12px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}
              >
                Deselect All
              </button>
              {hasUnsavedChanges && (
                <button
                  type="button"
                  onClick={resetToSaved}
                  className="ghost"
                  style={{ padding: "0.4rem 0.75rem", fontSize: "12px", borderRadius: "4px", background: "transparent", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={saving || loading || !hasUnsavedChanges}
                className="primary"
                style={{
                  padding: "0.45rem 1.25rem",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: hasUnsavedChanges && !saving ? "pointer" : "not-allowed",
                  background: hasUnsavedChanges ? "#6366f1" : "rgba(99, 102, 241, 0.4)",
                  color: "#fff",
                  border: "none",
                  boxShadow: hasUnsavedChanges ? "0 2px 10px rgba(99, 102, 241, 0.4)" : "none",
                }}
              >
                {saving ? "Saving..." : `Save Permissions (${assignedKeys.size})`}
              </button>
            </div>
          </div>

          {/* Grouped Permission Categories */}
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>Loading permissions...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {grouped.map(([catKey, group]) => {
                const groupKeys = group.items.map((i) => i.key);
                const assignedInGroup = groupKeys.filter((k) => assignedKeys.has(k)).length;
                const allInGroupAssigned = assignedInGroup === groupKeys.length;

                return (
                  <div
                    key={catKey}
                    className="surface"
                    style={{
                      borderRadius: "8px",
                      background: "rgba(30, 36, 43, 0.5)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Category Header */}
                    <div
                      style={{
                        padding: "0.75rem 1.25rem",
                        background: "rgba(255, 255, 255, 0.03)",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.1rem" }}>{group.icon}</span>
                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>{group.label}</h4>
                        <span style={{ fontSize: "11px", color: "#94a3b8", background: "rgba(255,255,255,0.06)", padding: "1px 8px", borderRadius: "10px" }}>
                          {assignedInGroup} / {groupKeys.length} granted
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setAssignedKeys((prev) => {
                            const next = new Set(prev);
                            if (allInGroupAssigned) {
                              groupKeys.forEach((k) => next.delete(k));
                            } else {
                              groupKeys.forEach((k) => next.add(k));
                            }
                            return next;
                          });
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#6366f1",
                          fontSize: "12px",
                          fontWeight: 500,
                          cursor: "pointer",
                          padding: "2px 6px",
                        }}
                      >
                        {allInGroupAssigned ? "Deselect Section" : "Select Section"}
                      </button>
                    </div>

                    {/* Permissions Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                        gap: "0.75rem",
                        padding: "1rem",
                      }}
                    >
                      {group.items.map((item) => {
                        const isGranted = assignedKeys.has(item.key);
                        return (
                          <div
                            key={item.key}
                            onClick={() => togglePermission(item.key)}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "0.75rem",
                              padding: "0.75rem",
                              borderRadius: "6px",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              background: isGranted ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.02)",
                              border: isGranted ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid rgba(255, 255, 255, 0.05)",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isGranted}
                              onChange={() => {}} // handled by parent onClick
                              style={{ marginTop: "3px", cursor: "pointer", accentColor: "#6366f1" }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <code
                                  style={{
                                    fontFamily: "monospace",
                                    fontSize: "12px",
                                    color: isGranted ? "#c7d2fe" : "#94a3b8",
                                    fontWeight: 600,
                                  }}
                                >
                                  {item.key}
                                </code>
                              </div>
                              <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: isGranted ? "#e2e8f0" : "#64748b", lineHeight: 1.4 }}>
                                {item.description || "System permission key for platform API access."}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
