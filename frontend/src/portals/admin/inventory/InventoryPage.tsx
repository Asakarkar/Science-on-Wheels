import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../../services/api-client";
import { configs, csvDownload } from "../config/resources";
import { ResourceView } from "../components/ResourceView";

interface ConsumableItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  unitMetric: string;
  expiryDate?: string | null;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
  isExpired?: boolean;
}

interface EquipmentAsset {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  status: "AVAILABLE" | "ASSIGNED_TO_BUS" | "IN_MAINTENANCE" | "DAMAGED" | "MISSING";
  busId?: string | null;
  busName?: string | null;
  storageUnit?: string | null;
  purchaseDate: string;
  cost: number;
  location?: string;
}

interface StockTransaction {
  id: string;
  consumableId: string;
  busId?: string | null;
  quantity: number;
  type: string;
  referenceType?: string | null;
  referenceId?: string | null;
  performedById?: string | null;
  notes?: string | null;
  timestamp: string;
  consumable?: {
    name: string;
    category: string;
    unitMetric: string;
  };
  performedBy?: {
    name: string;
    email: string;
  };
  bus?: {
    busCode: string;
    registrationNumber: string;
  };
}

interface InventoryOverviewResponse {
  summary: {
    totalConsumableItems: number;
    totalConsumableUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiredCount: number;
    nearExpiryCount: number;
    totalEquipmentAssets: number;
    availableEquipmentCount: number;
    assignedEquipmentCount: number;
    maintenanceEquipmentCount: number;
    damagedEquipmentCount: number;
    totalEquipmentValuation: number;
    totalCategories: number;
    pendingAllocationsCount: number;
    dispatchedAllocationsCount: number;
  };
  consumables: ConsumableItem[];
  equipment: EquipmentAsset[];
  recentTransactions: StockTransaction[];
  regions: Array<{ id: string; name: string }>;
}

export function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Consumables Stock";

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  const subOptions = [
    "Consumables Stock",
    "Equipment Assets",
    "Stock Adjustments",
    "Reorder Alerts",
    "Stock History",
    "Invoice Imports"
  ];

  // Data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<InventoryOverviewResponse | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [conditionFilter, setConditionFilter] = useState("ALL");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<"CONSUMABLE" | "EQUIPMENT">("CONSUMABLE");
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTargetConsumable, setAdjustTargetConsumable] = useState<ConsumableItem | null>(null);
  const [qrModalAsset, setQrModalAsset] = useState<EquipmentAsset | null>(null);

  async function loadInventory() {
    setLoading(true);
    setError("");
    try {
      const data = await apiClient<InventoryOverviewResponse>("/super-admin/inventory/overview");
      setOverview(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load inventory data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sub !== "Invoice Imports") {
      loadInventory();
    }
  }, [sub]);

  // Derived filtered consumables
  const filteredConsumables = useMemo(() => {
    if (!overview?.consumables) return [];
    return overview.consumables.filter((item) => {
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
      if (sub === "Reorder Alerts" && !item.isLowStock && !item.isOutOfStock) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [overview?.consumables, categoryFilter, search, sub]);

  // Derived filtered equipment
  const filteredEquipment = useMemo(() => {
    if (!overview?.equipment) return [];
    return overview.equipment.filter((item) => {
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
      if (conditionFilter !== "ALL" && item.status !== conditionFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.assetTag.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.location || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [overview?.equipment, categoryFilter, conditionFilter, search]);

  // Distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    overview?.consumables.forEach((c) => set.add(c.category));
    overview?.equipment.forEach((e) => set.add(e.category));
    return Array.from(set).sort();
  }, [overview]);

  async function updateEquipmentStatus(assetId: string, status: string) {
    try {
      await apiClient(`/super-admin/resource/equipment/${assetId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setOverview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          equipment: prev.equipment.map((e) => (e.id === assetId ? { ...e, status: status as any } : e))
        };
      });
    } catch (err: any) {
      alert("Failed to update equipment condition: " + (err?.message || "Error"));
    }
  }

  return (
    <div className="portal-module" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Subnavigation Bar */}
      <div
        className="subnav-tabs"
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          borderBottom: "1px solid var(--stone, #e2e8f0)",
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
                color: isActive ? "#ffffff" : "var(--charcoal, #334155)",
                border: isActive ? "1px solid var(--charcoal-dark, #1E242B)" : "1px solid var(--stone, #cbd5e1)",
                fontWeight: isActive ? 700 : 500,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {sub === "Invoice Imports" ? (
        <ResourceView config={configs.inventoryInvoiceLines} />
      ) : (
        <>
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
                  Inventory Management
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
                  Global Central Stock
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>
                Manage the NGO&apos;s central inventory catalogue, quantity-based consumables, and reusable equipment assets.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => csvDownload(sub === "Equipment Assets" ? "equipment" : "consumables")}
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
                <span>📥</span> Export CSV
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdjustTargetConsumable(null);
                  setShowAdjustModal(true);
                }}
                style={{
                  padding: "0.55rem 0.9rem",
                  borderRadius: "6px",
                  border: "1px solid var(--stone, #cbd5e1)",
                  background: "#ffffff",
                  color: "#4f46e5",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}
              >
                <span>⚖️</span> Stock Adjustment
              </button>

              <button
                type="button"
                onClick={() => {
                  setAddModalType(sub === "Equipment Assets" ? "EQUIPMENT" : "CONSUMABLE");
                  setShowAddModal(true);
                }}
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
                <span>➕</span> Add Item to Catalogue
              </button>
            </div>
          </div>

          {/* Global Inventory Metrics KPI Cards */}
          {overview && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem"
              }}
            >
              <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #6366f1" }}>
                <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>
                  Consumables Catalogue
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1E242B", marginTop: "4px" }}>
                  {overview.summary.totalConsumableItems} items
                </div>
                <div style={{ fontSize: "12px", color: "#6366f1", marginTop: "2px" }}>
                  {(overview.summary.totalConsumableUnits || 0).toLocaleString()} units on hand
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #10b981" }}>
                <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>
                  Reusable Equipment
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1E242B", marginTop: "4px" }}>
                  {overview.summary.totalEquipmentAssets} assets
                </div>
                <div style={{ fontSize: "12px", color: "#10b981", marginTop: "2px" }}>
                  {overview.summary.availableEquipmentCount} available at warehouse
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #f59e0b" }}>
                <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>
                  Reorder Threshold Alerts
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: overview.summary.lowStockCount > 0 ? "#b45309" : "#1E242B", marginTop: "4px" }}>
                  {overview.summary.lowStockCount} items
                </div>
                <div style={{ fontSize: "12px", color: "#b45309", marginTop: "2px" }}>
                  {overview.summary.outOfStockCount} completely out of stock
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #ef4444" }}>
                <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>
                  Expiry Management
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: overview.summary.expiredCount > 0 ? "#dc2626" : "#1E242B", marginTop: "4px" }}>
                  {overview.summary.expiredCount} expired
                </div>
                <div style={{ fontSize: "12px", color: "#ef4444", marginTop: "2px" }}>
                  {overview.summary.nearExpiryCount} expiring within 90 days
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #8b5cf6" }}>
                <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>
                  Asset Valuation
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1E242B", marginTop: "4px" }}>
                  ₹{(overview.summary.totalEquipmentValuation || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: "12px", color: "#8b5cf6", marginTop: "2px" }}>
                  Total equipment capital value
                </div>
              </div>
            </div>
          )}

          {/* Filtering Toolbar */}
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
                placeholder="Search items by name, category, asset tag, location..."
                style={{
                  width: "100%",
                  padding: "0.55rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--stone, #cbd5e1)",
                  fontSize: "13px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ minWidth: "160px" }}>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--stone, #cbd5e1)",
                  fontSize: "13px",
                  background: "#ffffff"
                }}
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {sub === "Equipment Assets" && (
              <div style={{ minWidth: "160px" }}>
                <select
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.85rem",
                    borderRadius: "6px",
                    border: "1px solid var(--stone, #cbd5e1)",
                    fontSize: "13px",
                    background: "#ffffff"
                  }}
                >
                  <option value="ALL">All Conditions</option>
                  <option value="AVAILABLE">Available (Warehouse)</option>
                  <option value="ASSIGNED_TO_BUS">Assigned to Bus</option>
                  <option value="IN_MAINTENANCE">In Maintenance</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="MISSING">Missing</option>
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={loadInventory}
              disabled={loading}
              style={{
                padding: "0.55rem 0.85rem",
                borderRadius: "6px",
                border: "1px solid var(--stone, #cbd5e1)",
                background: "#ffffff",
                color: "#475569",
                fontSize: "13px",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              🔄 Refresh
            </button>
          </div>

          {error && (
            <div style={{ padding: "0.75rem 1rem", borderRadius: "6px", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", fontSize: "13px" }}>
              ⚠️ {error}
            </div>
          )}

          {/* TAB 1 & 4: Consumables Stock & Reorder Alerts */}
          {(sub === "Consumables Stock" || sub === "Reorder Alerts") && (
            <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid var(--stone, #e2e8f0)", overflow: "hidden" }}>
              <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--stone, #e2e8f0)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                  {sub === "Reorder Alerts" ? "⚠️ Items Requiring Restock" : "Chemicals, Reagents & Consumable Materials"} ({filteredConsumables.length})
                </span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Quantity-based materials tracked across central stock
                </span>
              </div>

              {loading ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading consumables...</div>
              ) : filteredConsumables.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                  No consumable items matched the selected filters.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Material Name</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Category</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Current Stock</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Min Threshold</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Expiry Status</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Stock Status</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredConsumables.map((c) => {
                        const isLow = (c.currentStock || 0) <= (c.minimumStock || 0);
                        const isOut = (c.currentStock || 0) <= 0;
                        return (
                          <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "0.75rem 1rem" }}>
                              <div style={{ fontWeight: 600, color: "#0f172a" }}>{c.name}</div>
                              <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>ID: {c.id}</div>
                            </td>
                            <td style={{ padding: "0.75rem 1rem" }}>
                              <span style={{ fontSize: "11.5px", padding: "2px 7px", borderRadius: "10px", background: "#f1f5f9", color: "#334155", fontWeight: 600 }}>
                                {c.category}
                              </span>
                            </td>
                            <td style={{ padding: "0.75rem 1rem" }}>
                              <span style={{ fontSize: "14px", fontWeight: 700, color: isOut ? "#dc2626" : isLow ? "#d97706" : "#0f172a" }}>
                                {c.currentStock} {c.unitMetric}
                              </span>
                            </td>
                            <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>
                              {c.minimumStock} {c.unitMetric}
                            </td>
                            <td style={{ padding: "0.75rem 1rem" }}>
                              {c.expiryDate ? (
                                <div>
                                  <div style={{ fontSize: "12px", color: c.isExpired ? "#dc2626" : "#334155", fontWeight: c.isExpired ? 700 : 500 }}>
                                    {c.isExpired ? "⚠️ Expired" : new Date(c.expiryDate).toLocaleDateString()}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: "12px" }}>Non-expiring</span>
                              )}
                            </td>
                            <td style={{ padding: "0.75rem 1rem" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  background: isOut ? "#fef2f2" : isLow ? "#fffbeb" : "#f0fdf4",
                                  color: isOut ? "#b91c1c" : isLow ? "#b45309" : "#15803d",
                                  border: `1px solid ${isOut ? "#fca5a5" : isLow ? "#fcd34d" : "#86efac"}`
                                }}
                              >
                                {isOut ? "OUT OF STOCK" : isLow ? "LOW STOCK" : "OPTIMAL"}
                              </span>
                            </td>
                            <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setAdjustTargetConsumable(c);
                                  setShowAdjustModal(true);
                                }}
                                style={{
                                  padding: "0.35rem 0.65rem",
                                  borderRadius: "5px",
                                  border: "1px solid #cbd5e1",
                                  background: "#ffffff",
                                  color: "#4f46e5",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  cursor: "pointer"
                                }}
                              >
                                ⚖️ Correct Stock
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
          )}

          {/* TAB 2: Equipment Assets */}
          {sub === "Equipment Assets" && (
            <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid var(--stone, #e2e8f0)", overflow: "hidden" }}>
              <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--stone, #e2e8f0)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                  Microscopes, Science Kits & Reusable Equipment ({filteredEquipment.length})
                </span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Unique serialized assets with QR codes and condition tracking
                </span>
              </div>

              {loading ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading equipment assets...</div>
              ) : filteredEquipment.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                  No equipment assets match the selected filters.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Asset Tag & QR</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Equipment Name</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Category</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Condition / Status</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Current Location</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Cost (₹)</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Update Condition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEquipment.map((e) => (
                        <tr key={e.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <button
                                type="button"
                                onClick={() => setQrModalAsset(e)}
                                title="View QR Code & Asset Tag"
                                style={{
                                  background: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "4px",
                                  padding: "2px 6px",
                                  cursor: "pointer",
                                  fontSize: "12px"
                                }}
                              >
                                📱 QR
                              </button>
                              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>
                                {e.assetTag}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <div style={{ fontWeight: 600, color: "#0f172a" }}>{e.name}</div>
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <span style={{ fontSize: "11.5px", padding: "2px 7px", borderRadius: "10px", background: "#f1f5f9", color: "#334155", fontWeight: 600 }}>
                              {e.category}
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: "4px",
                                background:
                                  e.status === "AVAILABLE"
                                    ? "#f0fdf4"
                                    : e.status === "ASSIGNED_TO_BUS"
                                    ? "#eff6ff"
                                    : e.status === "IN_MAINTENANCE"
                                    ? "#fffbeb"
                                    : "#fef2f2",
                                color:
                                  e.status === "AVAILABLE"
                                    ? "#15803d"
                                    : e.status === "ASSIGNED_TO_BUS"
                                    ? "#1d4ed8"
                                    : e.status === "IN_MAINTENANCE"
                                    ? "#b45309"
                                    : "#b91c1c",
                                border: `1px solid ${
                                  e.status === "AVAILABLE"
                                    ? "#86efac"
                                    : e.status === "ASSIGNED_TO_BUS"
                                    ? "#bfdbfe"
                                    : e.status === "IN_MAINTENANCE"
                                    ? "#fcd34d"
                                    : "#fca5a5"
                                }`
                              }}
                            >
                              {e.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <div style={{ color: "#334155", fontSize: "12.5px" }}>
                              📍 {e.location || "Central Warehouse (HQ)"}
                            </div>
                          </td>
                          <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#0f172a" }}>
                            ₹{(e.cost || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                            <select
                              value={e.status}
                              onChange={(ev) => updateEquipmentStatus(e.id, ev.target.value)}
                              style={{
                                padding: "0.25rem 0.5rem",
                                borderRadius: "4px",
                                border: "1px solid #cbd5e1",
                                fontSize: "12px",
                                background: "#ffffff"
                              }}
                            >
                              <option value="AVAILABLE">Good / Available</option>
                              <option value="ASSIGNED_TO_BUS">Assigned to Bus</option>
                              <option value="IN_MAINTENANCE">Under Repair / Service</option>
                              <option value="DAMAGED">Damaged</option>
                              <option value="MISSING">Missing</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3 & 5: Stock Adjustments & Stock History */}
          {(sub === "Stock Adjustments" || sub === "Stock History") && (
            <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid var(--stone, #e2e8f0)", overflow: "hidden" }}>
              <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--stone, #e2e8f0)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                  Global Stock Transaction Ledger ({overview?.recentTransactions.length || 0})
                </span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Complete audit trail of receipts, issues, adjustments, and losses
                </span>
              </div>

              {loading ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading transactions...</div>
              ) : !overview?.recentTransactions || overview.recentTransactions.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                  No stock transactions recorded yet.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Timestamp</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Transaction Type</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Item Name</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Quantity</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Authorized By</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Notes / Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.recentTransactions.map((tx) => (
                        <tr key={tx.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "0.75rem 1rem", color: "#64748b", fontSize: "12px" }}>
                            {new Date(tx.timestamp).toLocaleString()}
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: "4px",
                                background:
                                  tx.type === "RECEIPT"
                                    ? "#f0fdf4"
                                    : tx.type === "RETURN"
                                    ? "#eff6ff"
                                    : tx.type === "DAMAGE" || tx.type === "LOSS"
                                    ? "#fef2f2"
                                    : "#f8fafc",
                                color:
                                  tx.type === "RECEIPT"
                                    ? "#16a34a"
                                    : tx.type === "RETURN"
                                    ? "#2563eb"
                                    : tx.type === "DAMAGE" || tx.type === "LOSS"
                                    ? "#dc2626"
                                    : "#475569"
                              }}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#0f172a" }}>
                            {tx.consumable?.name || tx.consumableId}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0f172a" }}>
                            {tx.quantity} {tx.consumable?.unitMetric || "units"}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: "#334155" }}>
                            {tx.performedBy?.name || "System Administrator"}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: "#64748b", fontSize: "12px" }}>
                            {tx.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL 1: Add Consumable or Equipment Item */}
      {showAddModal && (
        <AddItemModal
          initialType={addModalType}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadInventory();
          }}
        />
      )}

      {/* MODAL 2: Stock Adjustment Modal */}
      {showAdjustModal && (
        <StockAdjustmentModal
          consumables={overview?.consumables || []}
          initialConsumable={adjustTargetConsumable}
          onClose={() => setShowAdjustModal(false)}
          onSuccess={() => {
            setShowAdjustModal(false);
            loadInventory();
          }}
        />
      )}

      {/* MODAL 3: QR Code Generator & Identifier */}
      {qrModalAsset && (
        <QrAssetModal
          asset={qrModalAsset}
          onClose={() => setQrModalAsset(null)}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// SUBCOMPONENT: Add Item to Catalogue Modal
// -------------------------------------------------------------
function AddItemModal({
  initialType,
  onClose,
  onSuccess
}: {
  initialType: "CONSUMABLE" | "EQUIPMENT";
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [itemType, setItemType] = useState<"CONSUMABLE" | "EQUIPMENT">(initialType);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Physics");
  const [unitMetric, setUnitMetric] = useState("pieces");
  const [currentStock, setCurrentStock] = useState("100");
  const [minimumStock, setMinimumStock] = useState("20");
  const [expiryDate, setExpiryDate] = useState("");
  const [assetTag, setAssetTag] = useState(`AST-${Math.floor(100000 + Math.random() * 900000)}`);
  const [cost, setCost] = useState("5000");
  const [storageUnit, setStorageUnit] = useState("Central Warehouse Rack A-1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const categories = ["Physics", "Chemistry", "Biology", "Mathematics", "Robotics", "General"];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (itemType === "CONSUMABLE") {
        await apiClient("/super-admin/resource/consumables", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            category,
            currentStock: parseInt(currentStock, 10) || 0,
            minimumStock: parseInt(minimumStock, 10) || 0,
            unitMetric,
            expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null
          })
        });
      } else {
        await apiClient("/super-admin/resource/equipment", {
          method: "POST",
          body: JSON.stringify({
            assetTag: assetTag.trim(),
            name: name.trim(),
            category,
            status: "AVAILABLE",
            storageUnit: storageUnit.trim(),
            purchaseDate: new Date().toISOString(),
            cost: parseFloat(cost) || 0
          })
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to add item to catalogue.");
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
              Add Catalogue Item
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
              Register new consumable material or reusable equipment asset.
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

          {/* Classification Selector */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              Classification *
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setItemType("CONSUMABLE")}
                style={{
                  padding: "0.6rem",
                  borderRadius: "6px",
                  border: itemType === "CONSUMABLE" ? "2px solid #6366f1" : "1px solid #cbd5e1",
                  background: itemType === "CONSUMABLE" ? "rgba(99, 102, 241, 0.08)" : "#ffffff",
                  color: itemType === "CONSUMABLE" ? "#4f46e5" : "#334155",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                🧪 Consumable (Chemicals, Supplies)
              </button>
              <button
                type="button"
                onClick={() => setItemType("EQUIPMENT")}
                style={{
                  padding: "0.6rem",
                  borderRadius: "6px",
                  border: itemType === "EQUIPMENT" ? "2px solid #6366f1" : "1px solid #cbd5e1",
                  background: itemType === "EQUIPMENT" ? "rgba(99, 102, 241, 0.08)" : "#ffffff",
                  color: itemType === "EQUIPMENT" ? "#4f46e5" : "#334155",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                🔬 Equipment (Asset, Instrument)
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              Item Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={itemType === "CONSUMABLE" ? "e.g. Copper Sulphate Crystals" : "e.g. Compound Monocular Microscope"}
              style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Subject / Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff" }}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {itemType === "CONSUMABLE" ? (
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Measurement Unit
                </label>
                <input
                  type="text"
                  value={unitMetric}
                  onChange={(e) => setUnitMetric(e.target.value)}
                  placeholder="bottles, kg, pieces..."
                  style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>
            ) : (
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Asset Tag Code *
                </label>
                <input
                  type="text"
                  required
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontFamily: "monospace", boxSizing: "border-box" }}
                />
              </div>
            )}
          </div>

          {itemType === "CONSUMABLE" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Initial Stock *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Min Threshold *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={minimumStock}
                  onChange={(e) => setMinimumStock(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Asset Cost (INR)
                </label>
                <input
                  type="number"
                  min={0}
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Storage Location
                </label>
                <input
                  type="text"
                  value={storageUnit}
                  onChange={(e) => setStorageUnit(e.target.value)}
                  placeholder="e.g. Rack B-3, HQ Warehouse"
                  style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>
            </div>
          )}

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
              {saving ? "Registering..." : "Add to Catalogue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUBCOMPONENT: Stock Adjustment Modal
// -------------------------------------------------------------
function StockAdjustmentModal({
  consumables,
  initialConsumable,
  onClose,
  onSuccess
}: {
  consumables: ConsumableItem[];
  initialConsumable: ConsumableItem | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedConsumableId, setSelectedConsumableId] = useState(initialConsumable?.id || (consumables[0]?.id || ""));
  const [type, setType] = useState("RECEIPT");
  const [quantity, setQuantity] = useState("10");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeConsumable = useMemo(() => {
    return consumables.find((c) => c.id === selectedConsumableId);
  }, [consumables, selectedConsumableId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiClient("/super-admin/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          consumableId: selectedConsumableId,
          type,
          quantity: parseInt(quantity, 10) || 0,
          notes: notes.trim()
        })
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to adjust stock.");
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
          maxWidth: "520px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)"
        }}
      >
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
              Authorized Stock Correction
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
              Audit-compliant inventory balance adjustments with mandatory reasoning.
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
              Target Consumable Item *
            </label>
            <select
              required
              value={selectedConsumableId}
              onChange={(e) => setSelectedConsumableId(e.target.value)}
              style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff" }}
            >
              {consumables.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.currentStock} {c.unitMetric} in stock)
                </option>
              ))}
            </select>
          </div>

          <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#64748b" }}>Current Stock on Record:</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
              {activeConsumable?.currentStock} {activeConsumable?.unitMetric}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Adjustment Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff" }}
              >
                <option value="RECEIPT">RECEIPT (Add inbound stock)</option>
                <option value="RETURN">RETURN (Returned from field)</option>
                <option value="ADJUSTMENT">ADJUSTMENT (Cycle count gain)</option>
                <option value="ISSUE">ISSUE (Manual issuance)</option>
                <option value="DAMAGE">DAMAGE (Spilled / Damaged)</option>
                <option value="LOSS">LOSS (Discrepancy write-off)</option>
                <option value="CONSUMPTION">CONSUMPTION (Field experiment use)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Quantity to Adjust *
              </label>
              <input
                type="number"
                required
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
              Reason for Adjustment *
            </label>
            <textarea
              required
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Physical inventory count reconciliation; supplier consignment batch #492"
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
              {saving ? "Processing..." : "Commit Correction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUBCOMPONENT: Asset QR Code Modal
// -------------------------------------------------------------
function QrAssetModal({
  asset,
  onClose
}: {
  asset: EquipmentAsset;
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
          maxWidth: "420px",
          textAlign: "center",
          padding: "2rem 1.5rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#6366f1", letterSpacing: "0.05em" }}>
            Asset QR Identification
          </span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94a3b8" }}>
            ✕
          </button>
        </div>

        {/* QR Code SVG preview badge */}
        <div
          style={{
            margin: "0 auto",
            width: "160px",
            height: "160px",
            background: "#f8fafc",
            border: "2px dashed #cbd5e1",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "0.5rem"
          }}
        >
          <div style={{ fontSize: "3rem" }}>🔲</div>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>QR: {asset.assetTag}</span>
        </div>

        <h3 style={{ margin: "1rem 0 0 0", fontSize: "1.1rem", color: "#0f172a" }}>{asset.name}</h3>
        <div style={{ fontFamily: "monospace", fontSize: "13px", color: "#4f46e5", fontWeight: 700, marginTop: "4px" }}>
          Tag: {asset.assetTag}
        </div>

        <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", marginTop: "1rem", textAlign: "left", fontSize: "12px" }}>
          <div>Category: <strong>{asset.category}</strong></div>
          <div style={{ marginTop: "2px" }}>Status: <strong>{asset.status}</strong></div>
          <div style={{ marginTop: "2px" }}>Location: <strong>{asset.location || "Central Warehouse (HQ)"}</strong></div>
          <div style={{ marginTop: "2px" }}>Value: <strong>₹{(asset.cost || 0).toLocaleString()}</strong></div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem" }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ flex: 1, padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#334155", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
          >
            🖨️ Print Label
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ flex: 1, padding: "0.5rem", borderRadius: "6px", border: "none", background: "var(--color-primary, #6366f1)", color: "#ffffff", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
