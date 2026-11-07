import React, { useEffect, useState } from "react";
import { apiClient } from "../../services/api-client";

interface CentralTransfer {
  id: string;
  allocationNumber: string;
  status: string; // PENDING, DISPATCHED, RECEIVED
  itemType: string;
  itemName: string;
  quantity: number;
  unit: string;
  carrierName: string;
  trackingNumber: string | null;
  dispatchedAt: string | null;
  receivedAt: string | null;
  notes: string;
}

interface SchoolOption {
  id: string;
  name: string;
}

interface BusOption {
  id: string;
  busCode: string | null;
  registrationNumber: string;
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
}

interface AllocationRecord {
  id: string;
  allocationType: string;
  beneficiary: string;
  physicalLocation: string;
  custodian: string;
  itemName: string;
  quantity: number;
  unit: string;
  purpose: string;
  allocatedAt: string;
  performedByName: string;
}

export function RegionalAllocationPage() {
  const [activeTab, setActiveTab] = useState<"RECEIVE" | "ALLOCATE_SCHOOL" | "ALLOCATION_LOG">("RECEIVE");
  const [centralTransfers, setCentralTransfers] = useState<CentralTransfer[]>([]);
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [consumables, setConsumables] = useState<ConsumableOption[]>([]);
  const [equipment, setEquipment] = useState<EquipmentOption[]>([]);
  const [loading, setLoading] = useState(true);

  // School Allocation Form
  const [allocForm, setAllocForm] = useState({
    schoolId: "",
    busId: "",
    custodianId: "",
    itemType: "CONSUMABLE" as "CONSUMABLE" | "EQUIPMENT",
    consumableId: "",
    equipmentId: "",
    quantity: 10,
    purpose: "School STEM Laboratory Kit",
    notes: "",
  });
  const [submittingAlloc, setSubmittingAlloc] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [transfersRes, allocsRes, schoolsRes, busesRes, consRes, eqRes] = await Promise.all([
        apiClient<{ rows: CentralTransfer[] }>("/regional-admin/inventory/central-transfers"),
        apiClient<{ rows: AllocationRecord[] }>("/regional-admin/inventory/allocations"),
        apiClient<{ rows: SchoolOption[] }>("/regional-admin/schools?limit=200"),
        apiClient<{ rows: BusOption[] }>("/regional-admin/buses"),
        apiClient<{ rows: ConsumableOption[] }>("/regional-admin/consumables"),
        apiClient<{ rows: EquipmentOption[] }>("/regional-admin/equipment"),
      ]);
      setCentralTransfers(transfersRes.rows || []);
      setAllocations(allocsRes.rows || []);
      setSchools(schoolsRes.rows || []);
      setBuses(busesRes.rows || []);
      setConsumables(consRes.rows || []);
      setEquipment(eqRes.rows || []);

      if (schoolsRes.rows?.length && !allocForm.schoolId) {
        setAllocForm((prev) => ({ ...prev, schoolId: schoolsRes.rows[0].id }));
      }
      if (busesRes.rows?.length && !allocForm.busId) {
        setAllocForm((prev) => ({ ...prev, busId: busesRes.rows[0].id }));
      }
      if (consRes.rows?.length && !allocForm.consumableId) {
        setAllocForm((prev) => ({ ...prev, consumableId: consRes.rows[0].id }));
      }
    } catch (err) {
      console.error("Failed to load allocation data", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleConfirmReceipt(transferId: string) {
    if (!confirm("Confirm physical delivery and receipt of items into regional depot?")) return;
    setReceivingId(transferId);
    try {
      const res = await apiClient<{ message: string }>(
        `/regional-admin/inventory/central-transfers/${transferId}/receive`,
        { method: "POST" }
      );
      alert(res.message);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to confirm receipt");
    } finally {
      setReceivingId(null);
    }
  }

  async function handleCreateSchoolAllocation(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingAlloc(true);
    try {
      const res = await apiClient<{ message: string }>("/regional-admin/inventory/allocate-school", {
        method: "POST",
        body: JSON.stringify(allocForm),
      });
      alert(res.message);
      setActiveTab("ALLOCATION_LOG");
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to allocate inventory");
    } finally {
      setSubmittingAlloc(false);
    }
  }

  const pendingCount = centralTransfers.filter((t) => t.status === "DISPATCHED").length;

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-[#3D6B52] font-bold">
            INVENTORY DISTRIBUTION ENGINE
          </div>
          <h2 className="text-xl font-bold text-charcoal">Transfers & School Allocations</h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Receive central stock shipments from HQ and allocate science kits to schools with physical custody on mobile labs.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-stone space-x-6 text-xs font-mono font-bold">
        <button
          className={`pb-2.5 flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === "RECEIVE"
              ? "border-[#3D6B52] text-[#3D6B52]"
              : "border-transparent text-charcoal-muted hover:text-charcoal"
          }`}
          onClick={() => setActiveTab("RECEIVE")}
        >
          <span>📥 Receive from ADMIN (HQ)</span>
          {pendingCount > 0 && (
            <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px]">
              {pendingCount} DISPATCHED
            </span>
          )}
        </button>

        <button
          className={`pb-2.5 flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === "ALLOCATE_SCHOOL"
              ? "border-[#3D6B52] text-[#3D6B52]"
              : "border-transparent text-charcoal-muted hover:text-charcoal"
          }`}
          onClick={() => setActiveTab("ALLOCATE_SCHOOL")}
        >
          <span>🏫 Allocate to School (Bus Custody)</span>
        </button>

        <button
          className={`pb-2.5 flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === "ALLOCATION_LOG"
              ? "border-[#3D6B52] text-[#3D6B52]"
              : "border-transparent text-charcoal-muted hover:text-charcoal"
          }`}
          onClick={() => setActiveTab("ALLOCATION_LOG")}
        >
          <span>📋 Regional Allocation Ledger</span>
          <span className="bg-stone-100 text-charcoal px-2 py-0.5 rounded text-[10px]">
            {allocations.length}
          </span>
        </button>
      </div>

      {/* TAB 1: RECEIVE CENTRAL TRANSFERS (Section 6.1) */}
      {activeTab === "RECEIVE" && (
        <div className="space-y-4">
          <div className="surface p-4 rounded-lg border border-stone bg-blue-50/50">
            <h3 className="text-xs font-bold text-blue-950 uppercase font-mono mb-1">
              Central Stock Inbound Receipts
            </h3>
            <p className="text-xs text-blue-900 font-sans">
              Transfers dispatched from Headquarters. Verify physical quantities and barcode tags before clicking Confirm Receipt. Once confirmed, stock is immediately added to your regional depot.
            </p>
          </div>

          <div className="surface rounded-lg border border-stone overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone text-charcoal-muted font-mono uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Allocation #</th>
                  <th className="py-2.5 px-3">Item Details</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3">Carrier / Tracking</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Dispatched Date</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-charcoal-muted font-mono">
                      Loading central inbound transfers…
                    </td>
                  </tr>
                ) : centralTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-charcoal-muted font-mono">
                      No central transfers allocated for this region yet.
                    </td>
                  </tr>
                ) : (
                  centralTransfers.map((tx) => (
                    <tr key={tx.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-charcoal">
                        {tx.allocationNumber}
                      </td>
                      <td className="py-3 px-3">
                        <strong className="text-charcoal block">{tx.itemName}</strong>
                        <span className="text-[10px] text-charcoal-muted font-mono">
                          Type: {tx.itemType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-sm text-charcoal">
                        {tx.quantity} {tx.unit}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span className="text-charcoal block">{tx.carrierName}</span>
                        <span className="text-charcoal-subtle">{tx.trackingNumber || "No tracking"}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            tx.status === "RECEIVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : tx.status === "DISPATCHED"
                              ? "bg-blue-100 text-blue-800 animate-pulse"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-charcoal-muted text-[11px]">
                        {tx.dispatchedAt ? new Date(tx.dispatchedAt).toLocaleDateString() : "Pending"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {tx.status === "DISPATCHED" ? (
                          <button
                            disabled={receivingId === tx.id}
                            className="btn primary text-xs px-3 py-1 font-bold"
                            onClick={() => handleConfirmReceipt(tx.id)}
                          >
                            {receivingId === tx.id ? "Confirming..." : "Confirm Receipt"}
                          </button>
                        ) : tx.status === "RECEIVED" ? (
                          <span className="text-emerald-700 font-bold text-xs">✓ In Regional Depot</span>
                        ) : (
                          <span className="text-stone-400 text-xs">Awaiting HQ Dispatch</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ALLOCATE TO SCHOOL (WITH BUS PHYSICAL CUSTODY) (Section 6.2 & Section 7) */}
      {activeTab === "ALLOCATE_SCHOOL" && (
        <div className="surface p-6 rounded-lg border border-stone max-w-2xl">
          <div className="pb-3 border-b border-stone mb-4">
            <span className="font-mono text-[10px] text-[#3D6B52] uppercase font-bold tracking-wider">
              SECTION 7 ARCHITECTURAL COMPLIANCE
            </span>
            <h3 className="text-base font-bold text-charcoal">
              School Allocation with Mobile Lab Bus Custody
            </h3>
            <p className="text-xs text-charcoal-muted mt-1 font-sans">
              School allocation maintains a dedicated school-level ledger balance, while items physically reside on the mobile laboratory bus under Field Staff custody.
            </p>
          </div>

          <form onSubmit={handleCreateSchoolAllocation} className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-charcoal font-semibold mb-1">
                  1. Beneficiary School *
                </label>
                <select
                  required
                  value={allocForm.schoolId}
                  onChange={(e) => setAllocForm({ ...allocForm, schoolId: e.target.value })}
                  className="input w-full p-2 border border-stone rounded text-xs"
                >
                  <option value="">Select School</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-charcoal-subtle block mt-0.5">
                  The logical recipient of the STEM curriculum kits.
                </span>
              </div>

              <div>
                <label className="block text-charcoal font-semibold mb-1">
                  2. Physical Storage (Mobile Lab Bus) *
                </label>
                <select
                  required
                  value={allocForm.busId}
                  onChange={(e) => setAllocForm({ ...allocForm, busId: e.target.value })}
                  className="input w-full p-2 border border-stone rounded text-xs"
                >
                  <option value="">Select Physical Laboratory Bus</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.busCode || b.registrationNumber} ({b.registrationNumber})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-charcoal-subtle block mt-0.5">
                  Actual physical location where materials are carried.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-charcoal font-semibold mb-1">Item Classification</label>
                <div className="flex space-x-4 pt-1 text-xs font-sans">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="itemType"
                      checked={allocForm.itemType === "CONSUMABLE"}
                      onChange={() => setAllocForm({ ...allocForm, itemType: "CONSUMABLE" })}
                    />
                    <span>Consumable Material</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="itemType"
                      checked={allocForm.itemType === "EQUIPMENT"}
                      onChange={() => setAllocForm({ ...allocForm, itemType: "EQUIPMENT" })}
                    />
                    <span>Reusable Equipment Asset</span>
                  </label>
                </div>
              </div>

              {allocForm.itemType === "CONSUMABLE" ? (
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Select Consumable</label>
                  <select
                    required
                    value={allocForm.consumableId}
                    onChange={(e) => setAllocForm({ ...allocForm, consumableId: e.target.value })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  >
                    <option value="">Choose item</option>
                    {consumables.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Stock: {c.currentStock} {c.unitMetric})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Select Equipment Asset</label>
                  <select
                    required
                    value={allocForm.equipmentId}
                    onChange={(e) => setAllocForm({ ...allocForm, equipmentId: e.target.value })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  >
                    <option value="">Choose asset</option>
                    {equipment.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name} ({eq.assetTag}) - {eq.status}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {allocForm.itemType === "CONSUMABLE" && (
              <div>
                <label className="block text-charcoal font-semibold mb-1">Quantity to Allocate</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={allocForm.quantity}
                  onChange={(e) => setAllocForm({ ...allocForm, quantity: Number(e.target.value) })}
                  className="input w-full max-w-xs p-2 border border-stone rounded text-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-charcoal font-semibold mb-1">Allocation Purpose / Activity</label>
              <input
                type="text"
                required
                value={allocForm.purpose}
                onChange={(e) => setAllocForm({ ...allocForm, purpose: e.target.value })}
                className="input w-full p-2 border border-stone rounded font-sans text-xs"
                placeholder="e.g. Grade 8 Chemistry Outreach Experiments"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-stone">
              <button
                type="submit"
                disabled={submittingAlloc}
                className="btn primary px-5 py-2 text-xs font-mono font-bold"
              >
                {submittingAlloc ? "Allocating Stock..." : "Record Allocation in Ledger"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: REGIONAL ALLOCATION LEDGER */}
      {activeTab === "ALLOCATION_LOG" && (
        <div className="surface rounded-lg border border-stone overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone text-charcoal-muted font-mono uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Beneficiary</th>
                <th className="py-2.5 px-3">Physical Location</th>
                <th className="py-2.5 px-3">Item Name</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3">Custodian</th>
                <th className="py-2.5 px-3">Purpose</th>
                <th className="py-2.5 px-4 text-right">Allocated At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone">
              {allocations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-charcoal-muted font-mono">
                    No regional allocations recorded yet.
                  </td>
                </tr>
              ) : (
                allocations.map((row) => (
                  <tr key={row.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <strong className="text-charcoal block">{row.beneficiary}</strong>
                      <span className="text-[10px] text-charcoal-muted font-mono uppercase">
                        {row.allocationType} ALLOCATION
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="text-[#3D6B52] font-semibold block">
                        🚌 {row.physicalLocation}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-charcoal">
                      {row.itemName}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-sm text-charcoal">
                      {row.quantity} {row.unit}
                    </td>
                    <td className="py-3 px-3 font-mono text-charcoal-muted text-[11px]">
                      {row.custodian}
                    </td>
                    <td className="py-3 px-3 text-charcoal-muted font-sans text-xs">
                      {row.purpose}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-charcoal-subtle">
                      {new Date(row.allocatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

