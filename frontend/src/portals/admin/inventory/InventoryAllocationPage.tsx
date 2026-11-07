import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiClient } from "../../../services/api-client";
import { csvDownload } from "../config/resources";

interface AllocationItem {
  id: string;
  allocationNumber: string;
  status: "PENDING" | "DISPATCHED" | "RECEIVED" | "REJECTED" | "CANCELLED";
  regionId: string;
  regionName: string;
  itemType: "CONSUMABLE" | "EQUIPMENT";
  consumableId?: string;
  consumableName?: string;
  equipmentId?: string | null;
  assetTag?: string | null;
  equipmentName?: string | null;
  quantity: number;
  unit: string;
  trackingNumber?: string | null;
  carrierName?: string | null;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  createdAt: string;
  createdByName?: string;
  notes?: string;
}

interface RegionOption {
  id: string;
  name: string;
}

interface ConsumableOption {
  id: string;
  name: string;
  currentStock: number;
  unitMetric: string;
}

interface EquipmentOption {
  id: string;
  assetTag: string;
  name: string;
  status: string;
  storageUnit?: string | null;
}

export function InventoryAllocationPage() {
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [consumables, setConsumables] = useState<ConsumableOption[]>([]);
  const [equipment, setEquipment] = useState<EquipmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [regionFilter, setRegionFilter] = useState("ALL");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function loadAllocations() {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient<{
        allocations: AllocationItem[];
        regions: RegionOption[];
        consumables: ConsumableOption[];
        equipment: EquipmentOption[];
      }>("/super-admin/inventory/allocations");

      setAllocations(res.allocations || []);
      setRegions(res.regions || []);
      setConsumables(res.consumables || []);
      setEquipment(res.equipment || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load allocations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllocations();
  }, []);

  // Filtered allocations
  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (regionFilter !== "ALL" && a.regionId !== regionFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          a.allocationNumber.toLowerCase().includes(q) ||
          a.regionName.toLowerCase().includes(q) ||
          (a.consumableName || "").toLowerCase().includes(q) ||
          (a.equipmentName || "").toLowerCase().includes(q) ||
          (a.assetTag || "").toLowerCase().includes(q) ||
          (a.trackingNumber || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allocations, statusFilter, regionFilter, search]);

  // Metrics
  const metrics = useMemo(() => {
    const total = allocations.length;
    const pending = allocations.filter((a) => a.status === "PENDING").length;
    const inTransit = allocations.filter((a) => a.status === "DISPATCHED").length;
    const received = allocations.filter((a) => a.status === "RECEIVED").length;
    const cancelled = allocations.filter((a) => a.status === "CANCELLED" || a.status === "REJECTED").length;
    return { total, pending, inTransit, received, cancelled };
  }, [allocations]);

  async function handleDispatch(allocation: AllocationItem) {
    if (!confirm(`Confirm dispatch of ${allocation.allocationNumber} to "${allocation.regionName}"? Central available stock will be deducted and in-transit tracking initiated.`)) {
      return;
    }
    setActionLoadingId(allocation.id);
    try {
      await apiClient(`/super-admin/inventory/allocations/${allocation.id}/dispatch`, {
        method: "POST"
      });
      await loadAllocations();
    } catch (err: any) {
      alert("Dispatch failed: " + (err?.message || "Error"));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReceive(allocation: AllocationItem) {
    if (!confirm(`Confirm stock receipt for ${allocation.allocationNumber} at region "${allocation.regionName}"? Regional stock will be credited and in-transit status resolved.`)) {
      return;
    }
    setActionLoadingId(allocation.id);
    try {
      await apiClient(`/super-admin/inventory/allocations/${allocation.id}/receive`, {
        method: "POST"
      });
      await loadAllocations();
    } catch (err: any) {
      alert("Confirmation failed: " + (err?.message || "Error"));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCancel(allocation: AllocationItem) {
    if (!confirm(`Cancel allocation ${allocation.allocationNumber}? If dispatched, stock will be refunded to central warehouse.`)) {
      return;
    }
    setActionLoadingId(allocation.id);
    try {
      await apiClient(`/super-admin/inventory/allocations/${allocation.id}/cancel`, {
        method: "POST"
      });
      await loadAllocations();
    } catch (err: any) {
      alert("Cancellation failed: " + (err?.message || "Error"));
    } finally {
      setActionLoadingId(null);
    }
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
              Inventory Allocation
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "3px 8px",
                borderRadius: "12px",
                background: "rgba(99, 102, 241, 0.12)",
                color: "#4f46e5"
              }}
            >
              Central Distribution Engine
            </span>
          </div>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>
            Manage central-to-regional stock allocations with dispatch authorization and regional receipt confirmation.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => csvDownload("inventoryTransactions")}
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
            <span>📥</span> Export Ledger
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: "0.55rem 1.1rem",
              borderRadius: "6px",
              border: "none",
              background: "var(--color-primary, #6366f1)",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 2px 4px rgba(99, 102, 241, 0.25)"
            }}
          >
            <span>➕</span> Create New Allocation
          </button>
        </div>
      </div>

      {/* Visual Workflow Pipeline Stepper */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "8px",
          padding: "1rem 1.25rem",
          border: "1px solid var(--stone, #e2e8f0)"
        }}
      >
        <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
          SciMove Distribution Workflow & In-Transit Control
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.5rem",
            alignItems: "center"
          }}
        >
          <div style={{ padding: "0.6rem 0.8rem", borderRadius: "6px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#6366f1" }}>STEP 1: CREATION</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b", marginTop: "2px" }}>Select Region & Items</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Status: PENDING</div>
          </div>

          <div style={{ padding: "0.6rem 0.8rem", borderRadius: "6px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#f59e0b" }}>STEP 2: DISPATCH</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b", marginTop: "2px" }}>Deduct Central Stock</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Status: IN-TRANSIT</div>
          </div>

          <div style={{ padding: "0.6rem 0.8rem", borderRadius: "6px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#10b981" }}>STEP 3: REGIONAL RECEIPT</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b", marginTop: "2px" }}>Verify & Credit Region</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Status: RECEIVED</div>
          </div>

          <div style={{ padding: "0.6rem 0.8rem", borderRadius: "6px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#8b5cf6" }}>AUDIT COMPLIANCE</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b", marginTop: "2px" }}>Immutable Ledger</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Real-time Reconciled</div>
          </div>
        </div>
      </div>

      {/* Allocation Metrics KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem"
        }}
      >
        <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #6366f1" }}>
          <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>Total Allocations</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1E242B", marginTop: "4px" }}>{metrics.total}</div>
          <div style={{ fontSize: "12px", color: "#6366f1", marginTop: "2px" }}>Distribution operations initiated</div>
        </div>

        <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #3b82f6" }}>
          <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>Pending Dispatch</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: metrics.pending > 0 ? "#2563eb" : "#1E242B", marginTop: "4px" }}>{metrics.pending}</div>
          <div style={{ fontSize: "12px", color: "#2563eb", marginTop: "2px" }}>Awaiting warehouse packing</div>
        </div>

        <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #f59e0b" }}>
          <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>In-Transit to Regions</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: metrics.inTransit > 0 ? "#b45309" : "#1E242B", marginTop: "4px" }}>{metrics.inTransit}</div>
          <div style={{ fontSize: "12px", color: "#b45309", marginTop: "2px" }}>Dispatched & en route</div>
        </div>

        <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #10b981" }}>
          <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>Delivered & Confirmed</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#10b981", marginTop: "4px" }}>{metrics.received}</div>
          <div style={{ fontSize: "12px", color: "#10b981", marginTop: "2px" }}>Stock credited at destination</div>
        </div>
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
            placeholder="Search by allocation number, region, item, tracking code..."
            style={{ width: "100%", padding: "0.55rem 0.85rem", borderRadius: "6px", border: "1px solid var(--stone, #cbd5e1)", fontSize: "13px", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ minWidth: "160px" }}>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            style={{ width: "100%", padding: "0.55rem 0.85rem", borderRadius: "6px", border: "1px solid var(--stone, #cbd5e1)", fontSize: "13px", background: "#ffffff" }}
          >
            <option value="ALL">All Regions</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: "160px" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: "100%", padding: "0.55rem 0.85rem", borderRadius: "6px", border: "1px solid var(--stone, #cbd5e1)", fontSize: "13px", background: "#ffffff" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Authorization</option>
            <option value="DISPATCHED">Dispatched (In-Transit)</option>
            <option value="RECEIVED">Received & Stocked</option>
            <option value="CANCELLED">Cancelled / Rejected</option>
          </select>
        </div>

        <button
          type="button"
          onClick={loadAllocations}
          disabled={loading}
          style={{ padding: "0.55rem 0.85rem", borderRadius: "6px", border: "1px solid var(--stone, #cbd5e1)", background: "#ffffff", color: "#475569", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "6px", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Allocations Table */}
      <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid var(--stone, #e2e8f0)", overflow: "hidden" }}>
        <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--stone, #e2e8f0)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
            Regional Inventory Allocations ({filteredAllocations.length})
          </span>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Real-time multi-state distribution ledger
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading allocation ledger...</div>
        ) : filteredAllocations.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
            No inventory allocations match the selected criteria. Click &quot;Create New Allocation&quot; to initiate distribution.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Allocation #</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Destination Region</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Item & Classification</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Allocated Qty / Asset</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Status & Tracking</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Timestamps</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Workflow Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.map((a) => {
                  const isLoading = actionLoadingId === a.id;
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>
                          {a.allocationNumber}
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>Initiated by: {a.createdByName || "HQ Admin"}</div>
                      </td>

                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: "rgba(99, 102, 241, 0.1)",
                            color: "#4f46e5"
                          }}
                        >
                          🗺️ {a.regionName}
                        </span>
                      </td>

                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>
                          {a.itemType === "EQUIPMENT" ? a.equipmentName : a.consumableName}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                          {a.itemType === "EQUIPMENT" ? "🔬 Reusable Equipment Asset" : "🧪 Consumable Material"}
                        </div>
                      </td>

                      <td style={{ padding: "0.75rem 1rem" }}>
                        {a.itemType === "EQUIPMENT" ? (
                          <div>
                            <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: "#4f46e5", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                              Tag: {a.assetTag}
                            </span>
                          </div>
                        ) : (
                          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                            {a.quantity} {a.unit}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              width: "fit-content",
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: "4px",
                              background:
                                a.status === "RECEIVED"
                                  ? "#f0fdf4"
                                  : a.status === "DISPATCHED"
                                  ? "#fffbeb"
                                  : a.status === "PENDING"
                                  ? "#eff6ff"
                                  : "#fef2f2",
                              color:
                                a.status === "RECEIVED"
                                  ? "#15803d"
                                  : a.status === "DISPATCHED"
                                  ? "#b45309"
                                  : a.status === "PENDING"
                                  ? "#1d4ed8"
                                  : "#b91c1c",
                              border: `1px solid ${
                                a.status === "RECEIVED"
                                  ? "#86efac"
                                  : a.status === "DISPATCHED"
                                  ? "#fcd34d"
                                  : a.status === "PENDING"
                                  ? "#bfdbfe"
                                  : "#fca5a5"
                              }`
                            }}
                          >
                            {a.status === "DISPATCHED" ? "🚚 IN-TRANSIT" : a.status}
                          </span>
                          {a.trackingNumber && (
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              Track: <code>{a.trackingNumber}</code>
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: "0.75rem 1rem", fontSize: "12px", color: "#64748b" }}>
                        <div>Created: {new Date(a.createdAt).toLocaleDateString()}</div>
                        {a.dispatchedAt && <div>Dispatched: {new Date(a.dispatchedAt).toLocaleDateString()}</div>}
                        {a.receivedAt && <div>Received: {new Date(a.receivedAt).toLocaleDateString()}</div>}
                      </td>

                      <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                          {a.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleDispatch(a)}
                                style={{
                                  padding: "0.35rem 0.65rem",
                                  borderRadius: "5px",
                                  border: "none",
                                  background: "#f59e0b",
                                  color: "#ffffff",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  cursor: "pointer"
                                }}
                              >
                                {isLoading ? "..." : "🚚 Dispatch"}
                              </button>
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleCancel(a)}
                                style={{
                                  padding: "0.35rem 0.55rem",
                                  borderRadius: "5px",
                                  border: "1px solid #fca5a5",
                                  background: "#fef2f2",
                                  color: "#b91c1c",
                                  fontSize: "12px",
                                  cursor: "pointer"
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {a.status === "DISPATCHED" && (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleReceive(a)}
                              style={{
                                padding: "0.35rem 0.65rem",
                                borderRadius: "5px",
                                border: "none",
                                background: "#10b981",
                                color: "#ffffff",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer"
                              }}
                            >
                              {isLoading ? "..." : "✓ Confirm Receipt"}
                            </button>
                          )}

                          {a.status === "RECEIVED" && (
                            <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>
                              ✓ Completed
                            </span>
                          )}

                          {(a.status === "CANCELLED" || a.status === "REJECTED") && (
                            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                              Cancelled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE ALLOCATION MODAL */}
      {showCreateModal && (
        <CreateAllocationModal
          regions={regions}
          consumables={consumables}
          equipment={equipment}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadAllocations();
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// SUBCOMPONENT: Create Allocation Modal
// -------------------------------------------------------------
function CreateAllocationModal({
  regions,
  consumables,
  equipment,
  onClose,
  onSuccess
}: {
  regions: RegionOption[];
  consumables: ConsumableOption[];
  equipment: EquipmentOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [regionId, setRegionId] = useState(regions[0]?.id || "");
  const [itemType, setItemType] = useState<"CONSUMABLE" | "EQUIPMENT">("CONSUMABLE");
  const [consumableId, setConsumableId] = useState(consumables[0]?.id || "");
  const [equipmentId, setEquipmentId] = useState(equipment[0]?.id || "");
  const [quantity, setQuantity] = useState("25");
  const [carrierName, setCarrierName] = useState("SciMove Central Transport");
  const [trackingNumber, setTrackingNumber] = useState(`TRK-${Date.now().toString().slice(-6)}`);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeConsumable = useMemo(() => {
    return consumables.find((c) => c.id === consumableId);
  }, [consumables, consumableId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiClient("/super-admin/inventory/allocations", {
        method: "POST",
        body: JSON.stringify({
          regionId,
          itemType,
          consumableId: itemType === "CONSUMABLE" ? consumableId : undefined,
          equipmentId: itemType === "EQUIPMENT" ? equipmentId : undefined,
          quantity: itemType === "CONSUMABLE" ? parseInt(quantity, 10) : 1,
          carrierName: carrierName.trim(),
          trackingNumber: trackingNumber.trim(),
          notes: notes.trim()
        })
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to create allocation.");
    } finally {
      setSaving(false);
    }
  }

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
          maxWidth: "560px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)"
        }}
      >
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
              Initiate Regional Inventory Allocation
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
              Allocate central warehouse stock to operational regional depots.
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#94a3b8" }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {error && (
            <div style={{ padding: "0.75rem", borderRadius: "6px", background: "#fee2e2", color: "#991b1b", fontSize: "13px" }}>
              ⚠️ {error}
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              Destination Region *
            </label>
            <select
              required
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff" }}
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              Stock Classification *
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setItemType("CONSUMABLE")}
                style={{
                  padding: "0.55rem",
                  borderRadius: "6px",
                  border: itemType === "CONSUMABLE" ? "2px solid #6366f1" : "1px solid #cbd5e1",
                  background: itemType === "CONSUMABLE" ? "rgba(99, 102, 241, 0.08)" : "#ffffff",
                  color: itemType === "CONSUMABLE" ? "#4f46e5" : "#334155",
                  fontWeight: 600,
                  fontSize: "12.5px",
                  cursor: "pointer"
                }}
              >
                🧪 Consumable Material
              </button>
              <button
                type="button"
                onClick={() => setItemType("EQUIPMENT")}
                style={{
                  padding: "0.55rem",
                  borderRadius: "6px",
                  border: itemType === "EQUIPMENT" ? "2px solid #6366f1" : "1px solid #cbd5e1",
                  background: itemType === "EQUIPMENT" ? "rgba(99, 102, 241, 0.08)" : "#ffffff",
                  color: itemType === "EQUIPMENT" ? "#4f46e5" : "#334155",
                  fontWeight: 600,
                  fontSize: "12.5px",
                  cursor: "pointer"
                }}
              >
                🔬 Reusable Equipment
              </button>
            </div>
          </div>

          {itemType === "CONSUMABLE" ? (
            <>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Select Consumable Material *
                </label>
                <select
                  required
                  value={consumableId}
                  onChange={(e) => setConsumableId(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff" }}
                >
                  {consumables.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — Current Central Stock: {c.currentStock} {c.unitMetric}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Quantity to Allocate *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={activeConsumable?.currentStock || 1000}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Available: <strong>{activeConsumable?.currentStock} {activeConsumable?.unitMetric}</strong>
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Select Specific Equipment Asset *
              </label>
              <select
                required
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff" }}
              >
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} (Tag: {eq.assetTag}) — {eq.status}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Logistics Carrier
              </label>
              <input
                type="text"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Consignment / Tracking #
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontFamily: "monospace", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              Allocation Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Replenishment consignment for Q4 laboratory outreach operations"
              style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{ padding: "0.55rem 1.1rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: "0.55rem 1.3rem", borderRadius: "6px", border: "none", background: "var(--color-primary, #6366f1)", color: "#ffffff", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              {saving ? "Initiating..." : "Create Allocation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

