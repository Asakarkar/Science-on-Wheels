import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../../services/api-client";
import { csvDownload } from "../config/resources";

interface AuditRecord {
  id: string;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  actorUserId?: string | null;
  actorName?: string;
  actorEmail?: string | null;
  actorRole?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
  metadataFormatted?: string;
  timestamp: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  roleEnum: string;
}

export function SecurityAuditPage() {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters state
  const [search, setSearch] = useState("");
  const [categoryTab, setCategoryTab] = useState<string>("ALL");
  const [selectedUser, setSelectedUser] = useState<string>("ALL");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("ALL");

  // Inspect detail modal
  const [inspectRecord, setInspectRecord] = useState<AuditRecord | null>(null);

  const subCategories = [
    { key: "ALL", label: "All Audit Logs" },
    { key: "USER_ACTIVITY", label: "User & Login Activity" },
    { key: "INVENTORY", label: "Inventory & Stock Logs" },
    { key: "ALLOCATION", label: "Allocation & Dispatches" },
    { key: "REGIONAL_FLEET", label: "Regional & Bus Fleet" },
    { key: "SECURITY", label: "System & Permissions" }
  ];

  async function loadAuditLogs() {
    setLoading(true);
    setError("");
    try {
      const [logsRes, usersRes] = await Promise.all([
        apiClient<{ rows: AuditRecord[] }>("/super-admin/resource/auditLogs?limit=300"),
        apiClient<{ rows: UserOption[] }>("/super-admin/resource/users?limit=100")
      ]);
      setLogs(logsRes.rows || []);
      setUsers(usersRes.rows || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAuditLogs();
  }, []);

  // Filtered audit records
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Category Tab filter
      if (categoryTab === "USER_ACTIVITY") {
        const userActions = ["LOGIN", "LOGOUT", "CREATE_USER", "UPDATE_USER", "PASSWORD_RESET", "DEACTIVATE", "ASSIGN_ROLE"];
        if (!userActions.some((a) => log.action.includes(a)) && log.entity !== "User" && log.entity !== "Session") {
          return false;
        }
      } else if (categoryTab === "INVENTORY") {
        const invActions = ["STOCK_ADJUSTMENT", "CREATE_CONSUMABLE", "UPDATE_CONSUMABLE", "RECEIPT", "RETURN", "DAMAGE", "LOSS"];
        if (!invActions.some((a) => log.action.includes(a)) && log.entity !== "Consumable" && log.entity !== "Equipment") {
          return false;
        }
      } else if (categoryTab === "ALLOCATION") {
        const allocActions = ["CREATE_ALLOCATION", "DISPATCH_ALLOCATION", "RECEIVE_ALLOCATION", "CANCEL_ALLOCATION", "TRANSFER"];
        if (!allocActions.some((a) => log.action.includes(a)) && log.entity !== "InventoryAllocation") {
          return false;
        }
      } else if (categoryTab === "REGIONAL_FLEET") {
        const regActions = ["REGION", "BUS", "ASSIGN_ADMIN", "ASSIGN_STAFF", "MAINTENANCE"];
        if (!regActions.some((a) => log.action.includes(a)) && log.entity !== "Region" && log.entity !== "Bus") {
          return false;
        }
      } else if (categoryTab === "SECURITY") {
        const secActions = ["PERMISSION", "ROLE", "SECURITY", "CONFIG", "SETTINGS", "PASSWORD"];
        if (!secActions.some((a) => log.action.includes(a)) && log.entity !== "Role" && log.entity !== "Permission" && log.entity !== "SystemConfig") {
          return false;
        }
      }

      // User filter
      if (selectedUser !== "ALL" && log.actorUserId !== selectedUser) {
        return false;
      }

      // Module filter
      if (selectedModule !== "ALL") {
        if ((log.entity || "").toLowerCase() !== selectedModule.toLowerCase()) {
          return false;
        }
      }

      // Timeframe filter
      if (selectedTimeframe !== "ALL") {
        const logDate = new Date(log.timestamp).getTime();
        const now = Date.now();
        if (selectedTimeframe === "TODAY" && now - logDate > 24 * 3600 * 1000) return false;
        if (selectedTimeframe === "WEEK" && now - logDate > 7 * 24 * 3600 * 1000) return false;
        if (selectedTimeframe === "MONTH" && now - logDate > 30 * 24 * 3600 * 1000) return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const actionMatch = log.action.toLowerCase().includes(q);
        const actorMatch = (log.actorName || "").toLowerCase().includes(q);
        const emailMatch = (log.actorEmail || "").toLowerCase().includes(q);
        const entityMatch = (log.entity || "").toLowerCase().includes(q);
        const ipMatch = (log.ipAddress || "").toLowerCase().includes(q);
        if (!actionMatch && !actorMatch && !emailMatch && !entityMatch && !ipMatch) {
          return false;
        }
      }

      return true;
    });
  }, [logs, categoryTab, selectedUser, selectedModule, selectedTimeframe, search]);

  // Operational metrics
  const metrics = useMemo(() => {
    const total = logs.length;
    const logins = logs.filter((l) => l.action.includes("LOGIN") || l.action.includes("AUTH")).length;
    const inventory = logs.filter((l) => l.action.includes("STOCK") || l.entity === "Consumable" || l.entity === "InventoryAllocation").length;
    const security = logs.filter((l) => l.action.includes("PERMISSION") || l.action.includes("ROLE") || l.action.includes("DEACTIVATE") || l.action.includes("RESET")).length;
    return { total, logins, inventory, security };
  }, [logs]);

  // Map module name to clean label
  function formatModule(entity?: string | null): string {
    if (!entity) return "General Platform";
    const map: Record<string, string> = {
      User: "User Administration",
      Region: "Regional Management",
      Bus: "Bus Management",
      School: "School Management",
      Consumable: "Inventory (Consumables)",
      Equipment: "Inventory (Equipment)",
      InventoryAllocation: "Inventory Allocation",
      Role: "Role Permissions",
      Permission: "Security & Permissions",
      SystemConfig: "System Settings",
      Event: "Laboratory Operations"
    };
    return map[entity] || entity;
  }

  // Format action pill color
  function getActionBadgeStyle(action: string) {
    if (action.includes("CREATE") || action.includes("RECEIPT") || action.includes("SUCCESS")) {
      return { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" };
    }
    if (action.includes("UPDATE") || action.includes("DISPATCH") || action.includes("ASSIGN")) {
      return { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };
    }
    if (action.includes("DELETE") || action.includes("CANCEL") || action.includes("FAIL") || action.includes("DEACTIVATE")) {
      return { bg: "#fef2f2", color: "#b91c1c", border: "#fca5a5" };
    }
    return { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
  }

  return (
    <div className="portal-module" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "10px",
          padding: "1.25rem 1.5rem",
          border: "1px solid var(--stone, #e2e8f0)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "var(--charcoal-dark, #1E242B)" }}>
              Audit Logs
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "3px 8px",
                borderRadius: "12px",
                background: "rgba(16, 185, 129, 0.12)",
                color: "#059669"
              }}
            >
              Append-Only Immutable Record
            </span>
          </div>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>
            Maintain a permanent, tamper-resistant record of important administrative actions, login attempts, and stock modifications.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => csvDownload("auditLogs")}
            style={{
              padding: "0.55rem 0.9rem",
              borderRadius: "6px",
              border: "1px solid var(--stone, #cbd5e1)",
              background: "#ffffff",
              color: "#334155",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            }}
          >
            <span>📥</span> Export Audit Log (CSV)
          </button>

          <button
            type="button"
            onClick={loadAuditLogs}
            disabled={loading}
            style={{
              padding: "0.55rem 0.9rem",
              borderRadius: "6px",
              border: "none",
              background: "var(--color-primary, #6366f1)",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            }}
          >
            <span>🔄</span> Refresh Logs
          </button>
        </div>
      </div>

      {/* KPI Metrics Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem"
        }}
      >
        <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #6366f1" }}>
          <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>Total Audit Entries</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1E242B", marginTop: "4px" }}>{metrics.total}</div>
          <div style={{ fontSize: "12px", color: "#6366f1", marginTop: "2px" }}>100% Immutable System Log</div>
        </div>

        <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #10b981" }}>
          <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>Auth & Logins</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1E242B", marginTop: "4px" }}>{metrics.logins}</div>
          <div style={{ fontSize: "12px", color: "#10b981", marginTop: "2px" }}>Sign-ins and session lifecycle</div>
        </div>

        <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #f59e0b" }}>
          <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>Inventory & Allocations</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1E242B", marginTop: "4px" }}>{metrics.inventory}</div>
          <div style={{ fontSize: "12px", color: "#f59e0b", marginTop: "2px" }}>Stock adjustments & dispatches</div>
        </div>

        <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #ef4444" }}>
          <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>Security & Governance</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1E242B", marginTop: "4px" }}>{metrics.security}</div>
          <div style={{ fontSize: "12px", color: "#ef4444", marginTop: "2px" }}>Privilege & status updates</div>
        </div>
      </div>

      {/* Category Pills Navigation */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          background: "#ffffff",
          padding: "0.75rem",
          borderRadius: "8px",
          border: "1px solid var(--stone, #e2e8f0)"
        }}
      >
        {subCategories.map((cat) => {
          const isActive = categoryTab === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategoryTab(cat.key)}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "6px",
                border: isActive ? "1px solid #4f46e5" : "1px solid #e2e8f0",
                background: isActive ? "rgba(99, 102, 241, 0.1)" : "#f8fafc",
                color: isActive ? "#4f46e5" : "#334155",
                fontWeight: isActive ? 700 : 500,
                fontSize: "12.5px",
                cursor: "pointer",
                transition: "all 0.1s ease"
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Filter and Search Toolbar */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "8px",
          padding: "1rem",
          border: "1px solid var(--stone, #e2e8f0)",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center"
        }}
      >
        <div style={{ flex: 1, minWidth: "260px" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, actor name, email, IP address, or entity ID..."
            style={{ width: "100%", padding: "0.55rem 0.85rem", borderRadius: "6px", border: "1px solid var(--stone, #cbd5e1)", fontSize: "13px", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ minWidth: "160px" }}>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            style={{ width: "100%", padding: "0.55rem 0.85rem", borderRadius: "6px", border: "1px solid var(--stone, #cbd5e1)", fontSize: "13px", background: "#ffffff" }}
          >
            <option value="ALL">All Actors / Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.roleEnum})
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: "160px" }}>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            style={{ width: "100%", padding: "0.55rem 0.85rem", borderRadius: "6px", border: "1px solid var(--stone, #cbd5e1)", fontSize: "13px", background: "#ffffff" }}
          >
            <option value="ALL">All Modules</option>
            <option value="Region">Regional Management</option>
            <option value="Bus">Bus Management</option>
            <option value="School">School Management</option>
            <option value="Consumable">Inventory Management</option>
            <option value="InventoryAllocation">Inventory Allocation</option>
            <option value="User">User Administration</option>
            <option value="Role">Role Permissions</option>
            <option value="SystemConfig">System Settings</option>
          </select>
        </div>

        <div style={{ minWidth: "140px" }}>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            style={{ width: "100%", padding: "0.55rem 0.85rem", borderRadius: "6px", border: "1px solid var(--stone, #cbd5e1)", fontSize: "13px", background: "#ffffff" }}
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Last 24 Hours</option>
            <option value="WEEK">Last 7 Days</option>
            <option value="MONTH">Last 30 Days</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "6px", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid var(--stone, #e2e8f0)", overflow: "hidden" }}>
        <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--stone, #e2e8f0)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
            Audit Activity Trail ({filteredLogs.length} entries)
          </span>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Append-only security log for accountability and forensics
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading audit records...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
            No audit records match the selected filter criteria.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Date & Time</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Actor Information</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Action Performed</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Target Module</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Details Preview</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Inspection</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const style = getActionBadgeStyle(log.action);
                  return (
                    <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.75rem 1rem", color: "#64748b", fontSize: "12px" }}>
                        <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                        <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#94a3b8" }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                      </td>

                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>
                          {log.actorName || "HQ System Admin"}
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginTop: "2px" }}>
                          <span
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: "4px",
                              background: "#f1f5f9",
                              color: "#475569"
                            }}
                          >
                            {log.actorRole || "SUPER_ADMIN"}
                          </span>
                          {log.ipAddress && (
                            <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>
                              {log.ipAddress}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "4px",
                            background: style.bg,
                            color: style.color,
                            border: `1px solid ${style.border}`
                          }}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ fontWeight: 600, color: "#334155" }}>
                          {formatModule(log.entity)}
                        </div>
                        {log.entityId && (
                          <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>
                            ID: {log.entityId}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "0.75rem 1rem", color: "#475569", fontSize: "12px", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.metadataFormatted || "No additional payload"}
                      </td>

                      <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => setInspectRecord(log)}
                          style={{
                            padding: "0.35rem 0.65rem",
                            borderRadius: "5px",
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                            color: "#4f46e5",
                            fontWeight: 600,
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                        >
                          🔍 Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AUDIT INSPECT DETAIL MODAL */}
      {inspectRecord && (
        <AuditInspectModal
          record={inspectRecord}
          onClose={() => setInspectRecord(null)}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// SUBCOMPONENT: Inspect Audit Record Modal
// -------------------------------------------------------------
function AuditInspectModal({
  record,
  onClose
}: {
  record: AuditRecord;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem"
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "10px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)"
        }}
      >
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
                Audit Record Inspection
              </h3>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#10b981", background: "#f0fdf4", padding: "2px 6px", borderRadius: "4px" }}>
                ✓ Immutable Trace
              </span>
            </div>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
              Permanent transaction identifier: <code>{record.id}</code>
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#94a3b8" }}>
            ✕
          </button>
        </div>

        <div style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Summary Box */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }}>
            <div>
              <span style={{ color: "#64748b", fontSize: "12px" }}>Action:</span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{record.action}</div>
            </div>
            <div>
              <span style={{ color: "#64748b", fontSize: "12px" }}>Module / Entity:</span>
              <div style={{ fontWeight: 600, color: "#4f46e5", marginTop: "2px" }}>{record.entity || "General"}</div>
            </div>
            <div>
              <span style={{ color: "#64748b", fontSize: "12px" }}>Actor User:</span>
              <div style={{ fontWeight: 600, color: "#1e293b", marginTop: "2px" }}>{record.actorName} ({record.actorRole || "ADMIN"})</div>
            </div>
            <div>
              <span style={{ color: "#64748b", fontSize: "12px" }}>Timestamp:</span>
              <div style={{ fontWeight: 600, color: "#1e293b", marginTop: "2px" }}>{new Date(record.timestamp).toLocaleString()}</div>
            </div>
            <div>
              <span style={{ color: "#64748b", fontSize: "12px" }}>Target Entity ID:</span>
              <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#334155", marginTop: "2px" }}>{record.entityId || "—"}</div>
            </div>
            <div>
              <span style={{ color: "#64748b", fontSize: "12px" }}>Client IP & Agent:</span>
              <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#334155", marginTop: "2px" }}>{record.ipAddress || "127.0.0.1 (Local)"}</div>
            </div>
          </div>

          {/* Modification History / Payload Inspector */}
          <div>
            <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
              Modification Payload & Metadata (Old vs New Values)
            </div>
            <pre
              style={{
                background: "#0f172a",
                color: "#f8fafc",
                padding: "1rem",
                borderRadius: "8px",
                fontSize: "12px",
                fontFamily: "monospace",
                overflowX: "auto",
                maxHeight: "260px",
                margin: 0
              }}
            >
              {record.metadataFormatted || JSON.stringify(record.metadata || {}, null, 2)}
            </pre>
          </div>
        </div>

        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "0.5rem 1.2rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#334155", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
