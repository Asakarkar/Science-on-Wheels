import { useEffect, useState } from "react";
import { apiClient } from "../../services/api-client";

interface ConsumableItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  unitMetric: string;
  busStock: number;
}

interface EquipmentItem {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  status: "AVAILABLE" | "ASSIGNED_TO_BUS" | "IN_MAINTENANCE" | "DAMAGED" | "MISSING";
  storageUnit?: string;
}

interface TransactionItem {
  id: string;
  quantity: number;
  type: string;
  notes?: string;
  timestamp: string;
  consumable?: {
    name: string;
    unitMetric: string;
  };
}

interface BusInventoryData {
  bus: {
    id: string;
    registrationNumber: string;
    model?: string;
    status: string;
  } | null;
  consumables: ConsumableItem[];
  equipment: EquipmentItem[];
  recentTransactions: TransactionItem[];
}

export function FieldInventoryPage() {
  const [activeTab, setActiveTab] = useState<"opening" | "consumption" | "equipment" | "closing">("opening");
  const [data, setData] = useState<BusInventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Tab 1: Opening verification form state
  const [openingCounts, setOpeningCounts] = useState<Record<string, { physical: number; reason: string }>>({});

  // Tab 2: Consumption form state
  const [selectedConsumableId, setSelectedConsumableId] = useState("");
  const [consumeQty, setConsumeQty] = useState<number>(1);
  const [consumeActivity, setConsumeActivity] = useState("");
  const [consumeNotes, setConsumeNotes] = useState("");

  // Tab 3: Equipment verification form state
  const [equipmentStage, setEquipmentStage] = useState<"PRE_VISIT" | "POST_VISIT">("PRE_VISIT");
  const [equipmentStatusMap, setEquipmentStatusMap] = useState<Record<string, { status: any; notes: string }>>({});

  // Tab 4: Closing reconciliation form state
  const [closingCounts, setClosingCounts] = useState<Record<string, { physical: number; reason: string }>>({});

  async function loadInventory() {
    try {
      setLoading(true);
      setError("");
      const res = await apiClient<BusInventoryData>("/field/inventory/bus");
      setData(res);

      // Initialize opening counts with current busStock
      const initialOpening: Record<string, { physical: number; reason: string }> = {};
      const initialClosing: Record<string, { physical: number; reason: string }> = {};
      (res.consumables || []).forEach((c: ConsumableItem) => {
        initialOpening[c.id] = { physical: c.busStock, reason: "" };
        initialClosing[c.id] = { physical: c.busStock, reason: "" };
      });
      setOpeningCounts(initialOpening);
      setClosingCounts(initialClosing);

      // Initialize equipment verification map
      const initialEquip: Record<string, { status: any; notes: string }> = {};
      (res.equipment || []).forEach((eq: EquipmentItem) => {
        initialEquip[eq.id] = { status: eq.status, notes: "" };
      });
      setEquipmentStatusMap(initialEquip);

      if (res.consumables && res.consumables.length > 0 && !selectedConsumableId) {
        setSelectedConsumableId(res.consumables[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load bus inventory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInventory();
  }, []);

  // Submit Tab 1: Opening Verification
  async function submitOpeningVerification() {
    if (!data?.bus) return;
    try {
      setSubmitting(true);
      setError("");
      setSuccessMsg("");

      const items = (data.consumables || []).map((c) => ({
        consumableId: c.id,
        expectedStock: c.busStock,
        physicalCount: openingCounts[c.id]?.physical ?? c.busStock,
        discrepancyReason: openingCounts[c.id]?.reason || undefined,
      }));

      // Validate: if variance != 0, reason required
      for (const item of items) {
        if (item.physicalCount !== item.expectedStock && (!item.discrepancyReason || item.discrepancyReason.trim().length === 0)) {
          setError(`Justification reason is required for any stock count mismatch.`);
          setSubmitting(false);
          return;
        }
      }

      const res = await apiClient<any>("/field/inventory/opening-verification", {
        method: "POST",
        body: JSON.stringify({
          busId: data.bus.id,
          items,
        }),
      });

      setSuccessMsg(res.message || "Opening stock verified successfully.");
      await loadInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opening verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  // Submit Tab 2: Material Consumption
  async function submitConsumption() {
    if (!data?.bus || !selectedConsumableId) return;
    try {
      setSubmitting(true);
      setError("");
      setSuccessMsg("");

      const res = await apiClient<any>("/field/inventory/consumption", {
        method: "POST",
        body: JSON.stringify({
          busId: data.bus.id,
          consumableId: selectedConsumableId,
          quantity: consumeQty,
          activityName: consumeActivity,
          notes: consumeNotes,
        }),
      });

      setSuccessMsg(res.message || "Consumption recorded successfully.");
      setConsumeQty(1);
      setConsumeNotes("");
      setConsumeActivity("");
      await loadInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record consumption");
    } finally {
      setSubmitting(false);
    }
  }

  // Submit Tab 3: Equipment Verification
  async function submitEquipmentVerification() {
    if (!data?.bus) return;
    try {
      setSubmitting(true);
      setError("");
      setSuccessMsg("");

      const items = (data.equipment || []).map((eq) => ({
        equipmentId: eq.id,
        status: equipmentStatusMap[eq.id]?.status || eq.status,
        notes: equipmentStatusMap[eq.id]?.notes || undefined,
      }));

      const res = await apiClient<any>("/field/inventory/equipment-verification", {
        method: "POST",
        body: JSON.stringify({
          busId: data.bus.id,
          stage: equipmentStage,
          items,
        }),
      });

      setSuccessMsg(res.message || "Equipment check recorded successfully.");
      await loadInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Equipment verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  // Submit Tab 4: Closing Reconciliation
  async function submitClosingVerification() {
    if (!data?.bus) return;
    try {
      setSubmitting(true);
      setError("");
      setSuccessMsg("");

      const items = (data.consumables || []).map((c) => {
        const opening = c.busStock;
        const physical = closingCounts[c.id]?.physical ?? opening;
        return {
          consumableId: c.id,
          openingCount: opening,
          consumedCount: 0,
          physicalClosingCount: physical,
          discrepancyReason: closingCounts[c.id]?.reason || undefined,
        };
      });

      for (const item of items) {
        if (item.physicalClosingCount !== item.openingCount && (!item.discrepancyReason || item.discrepancyReason.trim().length === 0)) {
          setError(`Please provide a reason for closing stock discrepancy.`);
          setSubmitting(false);
          return;
        }
      }

      const res = await apiClient<any>("/field/inventory/closing-verification", {
        method: "POST",
        body: JSON.stringify({
          busId: data.bus.id,
          items,
        }),
      });

      setSuccessMsg(res.message || "Closing reconciliation saved.");
      await loadInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Closing reconciliation failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="surface p-5 border border-stone rounded-xl bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] font-bold tracking-wider text-[#176B50] uppercase">
            Mobile Science Lab Fleet
          </span>
          <h1 className="text-xl font-bold text-charcoal mt-0.5">
            Bus Inventory & Reconciliation Hub
          </h1>
          <p className="text-xs text-charcoal-muted">
            {data?.bus
              ? `Vehicle: ${data.bus.registrationNumber} • Status: ${data.bus.status}`
              : "Verifying physical custody and consumption"}
          </p>
        </div>

        {/* 4 Tabs Selector */}
        <div className="flex flex-wrap items-center gap-1 border border-stone rounded-lg p-1 bg-stone/20 text-xs">
          {[
            { id: "opening", label: "A. Opening Stock" },
            { id: "consumption", label: "B. Log Consumption" },
            { id: "equipment", label: "C. Equipment Check" },
            { id: "closing", label: "D. Closing Reconciliation" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setError("");
                setSuccessMsg("");
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors text-xs font-mono uppercase ${
                activeTab === tab.id
                  ? "bg-white text-charcoal font-bold shadow-xs"
                  : "text-charcoal-muted hover:text-charcoal"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="font-bold">×</button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} className="font-bold">×</button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-charcoal-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone border-t-[#176B50] mb-3" />
          <span className="font-mono text-xs">Loading Bus Inventory Data...</span>
        </div>
      ) : !data?.bus ? (
        <div className="surface p-8 text-center border border-stone rounded-xl bg-white text-xs text-charcoal-muted">
          No mobile laboratory bus currently assigned to your account. Please consult your Regional Administrator.
        </div>
      ) : (
        <div>
          {/* TAB 1: OPENING STOCK VERIFICATION */}
          {activeTab === "opening" && (
            <div className="surface border border-stone rounded-xl bg-white shadow-xs p-6 space-y-4">
              <div className="border-b border-stone pb-3">
                <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider">
                  Step A: Pre-Visit Opening Physical Count
                </h2>
                <p className="text-xs text-charcoal-muted">
                  Perform a mandatory physical count before departing for schools. If any material count does not match the expected stock, explain the discrepancy for Regional Admin review.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone text-charcoal-subtle uppercase text-[10px] font-mono">
                      <th className="py-2 px-3">Consumable Material</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Expected Stock</th>
                      <th className="py-2 px-3">Physical Count</th>
                      <th className="py-2 px-3">Variance</th>
                      <th className="py-2 px-3">Discrepancy Justification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone">
                    {data.consumables.map((item) => {
                      const countData = openingCounts[item.id] || { physical: item.busStock, reason: "" };
                      const variance = countData.physical - item.busStock;
                      const hasDiscrepancy = variance !== 0;

                      return (
                        <tr key={item.id} className={hasDiscrepancy ? "bg-amber-50/50" : ""}>
                          <td className="py-2.5 px-3 font-semibold text-charcoal">
                            {item.name}
                            <span className="text-[10px] text-charcoal-subtle block font-normal">
                              Unit: {item.unitMetric}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-charcoal-muted">
                            {item.category}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-charcoal">
                            {item.busStock} {item.unitMetric}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="0"
                              value={countData.physical}
                              onChange={(e) =>
                                setOpeningCounts({
                                  ...openingCounts,
                                  [item.id]: {
                                    ...countData,
                                    physical: Math.max(0, Number(e.target.value)),
                                  },
                                })
                              }
                              className="w-24 p-1.5 border border-stone rounded font-mono text-xs"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold">
                            {variance === 0 ? (
                              <span className="text-emerald-700">0</span>
                            ) : variance > 0 ? (
                              <span className="text-blue-700">+{variance}</span>
                            ) : (
                              <span className="text-rose-700">{variance}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              disabled={!hasDiscrepancy}
                              value={countData.reason}
                              onChange={(e) =>
                                setOpeningCounts({
                                  ...openingCounts,
                                  [item.id]: {
                                    ...countData,
                                    reason: e.target.value,
                                  },
                                })
                              }
                              placeholder={hasDiscrepancy ? "Mandatory reason for difference..." : "No discrepancy"}
                              className={`w-full p-1.5 border rounded text-xs ${
                                hasDiscrepancy
                                  ? "border-amber-400 bg-white"
                                  : "border-stone/40 bg-stone/10 text-charcoal-subtle cursor-not-allowed"
                              }`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 border-t border-stone flex items-center justify-between">
                <span className="text-[11px] text-charcoal-muted">
                  Note: Discrepancies are permanently recorded in the ledger and automatically trigger an alert for your Regional Admin.
                </span>
                <button
                  disabled={submitting}
                  onClick={submitOpeningVerification}
                  className="btn btn-primary text-xs font-bold px-6 py-2"
                  style={{ backgroundColor: "#176B50" }}
                >
                  {submitting ? "Verifying..." : "Confirm Opening Stock"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: RECORD CONSUMPTION */}
          {activeTab === "consumption" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Consumption Logger Form */}
              <div className="surface border border-stone rounded-xl bg-white shadow-xs p-6 space-y-4">
                <div className="border-b border-stone pb-3">
                  <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider">
                    Log Material Consumption
                  </h2>
                  <p className="text-xs text-charcoal-muted">
                    Record materials used during science demonstrations and student practicals
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-charcoal block mb-1">
                      Select Consumable Material
                    </label>
                    <select
                      value={selectedConsumableId}
                      onChange={(e) => setSelectedConsumableId(e.target.value)}
                      className="w-full p-2 border border-stone rounded-lg font-mono text-xs"
                    >
                      {data.consumables.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Stock: {c.busStock} {c.unitMetric})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-charcoal block mb-1">
                      Quantity Consumed
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={consumeQty}
                      onChange={(e) => setConsumeQty(Math.max(1, Number(e.target.value)))}
                      className="w-full p-2 border border-stone rounded-lg font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-charcoal block mb-1">
                      Activity / STEM Demonstration (Optional)
                    </label>
                    <input
                      type="text"
                      value={consumeActivity}
                      onChange={(e) => setConsumeActivity(e.target.value)}
                      placeholder="e.g. Acid-Base Neutralization Titration"
                      className="w-full p-2 border border-stone rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-charcoal block mb-1">
                      Notes / Remarks (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={consumeNotes}
                      onChange={(e) => setConsumeNotes(e.target.value)}
                      placeholder="e.g. Batch shared across 4 student groups"
                      className="w-full p-2 border border-stone rounded-lg text-xs"
                    />
                  </div>

                  <button
                    disabled={submitting}
                    onClick={submitConsumption}
                    className="btn btn-primary w-full text-xs font-bold py-2.5 mt-2"
                    style={{ backgroundColor: "#176B50" }}
                  >
                    {submitting ? "Logging..." : "✓ Log Material Consumption"}
                  </button>
                </div>
              </div>

              {/* Recent Consumption Ledger */}
              <div className="lg:col-span-2 surface border border-stone rounded-xl bg-white shadow-xs p-6 space-y-4">
                <div className="border-b border-stone pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider">
                      Bus Inventory Transactions Ledger
                    </h2>
                    <span className="text-xs text-charcoal-muted">
                      Audit trail of consumptions, returns, and adjustments
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-charcoal-subtle">
                    {data.recentTransactions.length} records
                  </span>
                </div>

                {data.recentTransactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-charcoal-muted">
                    No recent inventory transactions recorded on this mobile laboratory bus.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-stone text-charcoal-subtle uppercase text-[10px] font-mono">
                          <th className="py-2 px-3">Date & Time</th>
                          <th className="py-2 px-3">Item</th>
                          <th className="py-2 px-3">Quantity</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone">
                        {data.recentTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-stone/10">
                            <td className="py-2.5 px-3 font-mono text-[11px] text-charcoal-muted">
                              {new Date(tx.timestamp).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-charcoal">
                              {tx.consumable?.name || "Consumable"}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-charcoal">
                              {tx.quantity} {tx.consumable?.unitMetric || "units"}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                                tx.type === "CONSUMPTION" ? "bg-blue-100 text-blue-800" :
                                tx.type === "ADJUSTMENT" ? "bg-amber-100 text-amber-800" :
                                "bg-emerald-100 text-emerald-800"
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-charcoal-muted text-[11px]">
                              {tx.notes || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: EQUIPMENT VERIFICATION */}
          {activeTab === "equipment" && (
            <div className="surface border border-stone rounded-xl bg-white shadow-xs p-6 space-y-4">
              <div className="border-b border-stone pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider">
                    Step C: Laboratory Equipment Inspection
                  </h2>
                  <p className="text-xs text-charcoal-muted">
                    Inspect microscopes, electronic kits, glassware and science apparatus on the bus
                  </p>
                </div>

                <div className="flex items-center space-x-1 border border-stone rounded-lg p-1 bg-stone/20 text-xs">
                  <button
                    onClick={() => setEquipmentStage("PRE_VISIT")}
                    className={`px-3 py-1 rounded text-xs font-mono font-semibold ${
                      equipmentStage === "PRE_VISIT" ? "bg-white text-charcoal shadow-xs" : "text-charcoal-muted"
                    }`}
                  >
                    Pre-Visit Check
                  </button>
                  <button
                    onClick={() => setEquipmentStage("POST_VISIT")}
                    className={`px-3 py-1 rounded text-xs font-mono font-semibold ${
                      equipmentStage === "POST_VISIT" ? "bg-white text-charcoal shadow-xs" : "text-charcoal-muted"
                    }`}
                  >
                    Post-Visit Check
                  </button>
                </div>
              </div>

              {data.equipment.length === 0 ? (
                <div className="p-8 text-center text-xs text-charcoal-muted">
                  No reusable equipment assets currently tagged to this vehicle.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone text-charcoal-subtle uppercase text-[10px] font-mono">
                        <th className="py-2 px-3">Asset Tag</th>
                        <th className="py-2 px-3">Equipment Name</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Current Condition Status</th>
                        <th className="py-2 px-3">Defect / Damage Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone">
                      {data.equipment.map((eq) => {
                        const current = equipmentStatusMap[eq.id] || { status: eq.status, notes: "" };
                        const isProblem = ["DAMAGED", "MISSING", "IN_MAINTENANCE"].includes(current.status);

                        return (
                          <tr key={eq.id} className={isProblem ? "bg-rose-50/50" : ""}>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#176B50]">
                              {eq.assetTag}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-charcoal">
                              {eq.name}
                              {eq.storageUnit && (
                                <span className="text-[10px] text-charcoal-subtle block font-normal">
                                  Cabinet: {eq.storageUnit}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-charcoal-muted font-mono text-[11px]">
                              {eq.category}
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={current.status}
                                onChange={(e) =>
                                  setEquipmentStatusMap({
                                    ...equipmentStatusMap,
                                    [eq.id]: {
                                      ...current,
                                      status: e.target.value as any,
                                    },
                                  })
                                }
                                className={`p-1.5 border rounded font-mono text-xs font-semibold ${
                                  isProblem
                                    ? "border-rose-400 bg-rose-50 text-rose-800"
                                    : "border-stone bg-white text-charcoal"
                                }`}
                              >
                                <option value="AVAILABLE">AVAILABLE / GOOD</option>
                                <option value="ASSIGNED_TO_BUS">ASSIGNED TO BUS</option>
                                <option value="DAMAGED">DAMAGED</option>
                                <option value="MISSING">MISSING</option>
                                <option value="IN_MAINTENANCE">IN MAINTENANCE</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={current.notes}
                                onChange={(e) =>
                                  setEquipmentStatusMap({
                                    ...equipmentStatusMap,
                                    [eq.id]: {
                                      ...current,
                                      notes: e.target.value,
                                    },
                                  })
                                }
                                placeholder={isProblem ? "Required notes describing issue..." : "Optional notes..."}
                                className="w-full p-1.5 border border-stone rounded text-xs"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pt-4 border-t border-stone flex items-center justify-between">
                <span className="text-[11px] text-charcoal-muted">
                  Note: Marking equipment as DAMAGED or MISSING automatically generates an incident alert for the Regional Administrator.
                </span>
                <button
                  disabled={submitting}
                  onClick={submitEquipmentVerification}
                  className="btn btn-primary text-xs font-bold px-6 py-2"
                  style={{ backgroundColor: "#176B50" }}
                >
                  {submitting ? "Saving..." : `Confirm ${equipmentStage === "PRE_VISIT" ? "Pre-Visit" : "Post-Visit"} Equipment`}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: CLOSING RECONCILIATION */}
          {activeTab === "closing" && (
            <div className="surface border border-stone rounded-xl bg-white shadow-xs p-6 space-y-4">
              <div className="border-b border-stone pb-3">
                <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider">
                  Step D: Post-Visit Closing Stock Reconciliation
                </h2>
                <p className="text-xs text-charcoal-muted">
                  Conduct physical count at the end of the shift or school visit. Expected closing = Opening stock - Consumed.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone text-charcoal-subtle uppercase text-[10px] font-mono">
                      <th className="py-2 px-3">Material</th>
                      <th className="py-2 px-3">Expected Stock</th>
                      <th className="py-2 px-3">Physical Closing Count</th>
                      <th className="py-2 px-3">Variance</th>
                      <th className="py-2 px-3">Discrepancy Justification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone">
                    {data.consumables.map((item) => {
                      const countData = closingCounts[item.id] || { physical: item.busStock, reason: "" };
                      const variance = countData.physical - item.busStock;
                      const hasDiscrepancy = variance !== 0;

                      return (
                        <tr key={item.id} className={hasDiscrepancy ? "bg-amber-50/50" : ""}>
                          <td className="py-2.5 px-3 font-semibold text-charcoal">
                            {item.name}
                            <span className="text-[10px] text-charcoal-subtle block font-normal">
                              {item.category} • Unit: {item.unitMetric}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-charcoal">
                            {item.busStock} {item.unitMetric}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="0"
                              value={countData.physical}
                              onChange={(e) =>
                                setClosingCounts({
                                  ...closingCounts,
                                  [item.id]: {
                                    ...countData,
                                    physical: Math.max(0, Number(e.target.value)),
                                  },
                                })
                              }
                              className="w-24 p-1.5 border border-stone rounded font-mono text-xs"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold">
                            {variance === 0 ? (
                              <span className="text-emerald-700">0</span>
                            ) : (
                              <span className="text-rose-700">{variance > 0 ? `+${variance}` : variance}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              disabled={!hasDiscrepancy}
                              value={countData.reason}
                              onChange={(e) =>
                                setClosingCounts({
                                  ...closingCounts,
                                  [item.id]: {
                                    ...countData,
                                    reason: e.target.value,
                                  },
                                })
                              }
                              placeholder={hasDiscrepancy ? "Required justification..." : "Reconciled"}
                              className={`w-full p-1.5 border rounded text-xs ${
                                hasDiscrepancy
                                  ? "border-amber-400 bg-white"
                                  : "border-stone/40 bg-stone/10 text-charcoal-subtle cursor-not-allowed"
                              }`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 border-t border-stone flex items-center justify-between">
                <span className="text-[11px] text-charcoal-muted">
                  Note: Final closing reconciliation reconciles the bus stock ledger. Any unexplained shrinkage is reported to Regional Admin.
                </span>
                <button
                  disabled={submitting}
                  onClick={submitClosingVerification}
                  className="btn btn-primary text-xs font-bold px-6 py-2"
                  style={{ backgroundColor: "#176B50" }}
                >
                  {submitting ? "Finalizing..." : "Submit Closing Reconciliation"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
