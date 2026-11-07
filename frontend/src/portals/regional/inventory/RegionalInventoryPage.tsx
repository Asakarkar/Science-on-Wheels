import React, { useEffect, useState } from "react";
import { apiClient } from "../../../services/api-client";

interface ConsumableItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  unitMetric: string;
  expiryDate: string | null;
}

interface EquipmentItem {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  status: string;
  busId: string | null;
  cost: number;
  purchaseDate: string;
  storageUnit: string | null;
  Bus?: { id: string; busCode: string; registrationNumber: string } | null;
}

interface BusOption {
  id: string;
  busCode: string | null;
  registrationNumber: string;
}

export function RegionalInventoryPage() {
  const [activeTab, setActiveTab] = useState<"CONSUMABLES" | "EQUIPMENT">("CONSUMABLES");
  const [consumables, setConsumables] = useState<ConsumableItem[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Modals
  const [showAddConsumable, setShowAddConsumable] = useState(false);
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [editingConsumable, setEditingConsumable] = useState<ConsumableItem | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentItem | null>(null);
  const [viewingQrAsset, setViewingQrAsset] = useState<EquipmentItem | null>(null);

  // Forms
  const [consumableForm, setConsumableForm] = useState({
    name: "",
    category: "Chemistry",
    currentStock: 50,
    minimumStock: 10,
    unitMetric: "pieces",
    expiryDate: "",
    busId: "",
  });

  const [equipmentForm, setEquipmentForm] = useState({
    assetTag: "",
    name: "",
    category: "Physics",
    busId: "",
    cost: 1500,
    status: "AVAILABLE",
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [conRes, eqRes, busRes] = await Promise.all([
        apiClient<{ rows: ConsumableItem[] }>("/regional-admin/consumables?limit=250"),
        apiClient<{ rows: EquipmentItem[] }>("/regional-admin/equipment?limit=250"),
        apiClient<{ rows: BusOption[] }>("/regional-admin/buses"),
      ]);
      setConsumables(conRes.rows || []);
      setEquipment(eqRes.rows || []);
      setBuses(busRes.rows || []);
    } catch (err) {
      console.error("Failed to load regional inventory", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleAddConsumable(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      await apiClient("/regional-admin/consumables", {
        method: "POST",
        body: JSON.stringify(consumableForm),
      });
      setShowAddConsumable(false);
      setConsumableForm({
        name: "",
        category: "Chemistry",
        currentStock: 50,
        minimumStock: 10,
        unitMetric: "pieces",
        expiryDate: "",
        busId: "",
      });
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || "Failed to add consumable");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddEquipment(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      await apiClient("/regional-admin/equipment", {
        method: "POST",
        body: JSON.stringify(equipmentForm),
      });
      setShowAddEquipment(false);
      setEquipmentForm({
        assetTag: "",
        name: "",
        category: "Physics",
        busId: "",
        cost: 1500,
        status: "AVAILABLE",
      });
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || "Failed to add equipment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateConsumable(e: React.FormEvent) {
    e.preventDefault();
    if (!editingConsumable) return;
    setSubmitting(true);
    try {
      await apiClient(`/regional-admin/consumables/${editingConsumable.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          currentStock: editingConsumable.currentStock,
          minimumStock: editingConsumable.minimumStock,
          unitMetric: editingConsumable.unitMetric,
        }),
      });
      setEditingConsumable(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to update stock");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateEquipment(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEquipment) return;
    setSubmitting(true);
    try {
      await apiClient(`/regional-admin/equipment/${editingEquipment.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: editingEquipment.status,
          busId: editingEquipment.busId || null,
        }),
      });
      setEditingEquipment(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to update equipment");
    } finally {
      setSubmitting(false);
    }
  }

  // Categories
  const categories = Array.from(
    new Set(
      activeTab === "CONSUMABLES"
        ? consumables.map((c) => c.category)
        : equipment.map((e) => e.category)
    )
  );

  const filteredConsumables = consumables.filter((c) => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !categoryFilter || c.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const filteredEquipment = equipment.filter((e) => {
    const matchesSearch =
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.assetTag.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !categoryFilter || e.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-[#3D6B52] font-bold">
            REGIONAL INVENTORY CONTROL
          </div>
          <h2 className="text-xl font-bold text-charcoal">Consumables & Laboratory Equipment</h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Quantity-based tracking for consumable materials and individual asset identification for reusable science kits.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {activeTab === "CONSUMABLES" ? (
            <button
              className="btn primary font-mono text-xs px-4 py-2 flex items-center space-x-1"
              onClick={() => setShowAddConsumable(true)}
            >
              <span>＋</span>
              <span>Register Consumable</span>
            </button>
          ) : (
            <button
              className="btn primary font-mono text-xs px-4 py-2 flex items-center space-x-1"
              onClick={() => {
                setEquipmentForm({
                  ...equipmentForm,
                  assetTag: `EQ-${Date.now().toString().slice(-6)}`,
                });
                setShowAddEquipment(true);
              }}
            >
              <span>＋</span>
              <span>Add Equipment Asset</span>
            </button>
          )}
        </div>
      </div>

      {/* CLASSIFICATION TABS (Section 5) */}
      <div className="flex border-b border-stone space-x-6 text-xs font-mono font-bold">
        <button
          className={`pb-2.5 flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === "CONSUMABLES"
              ? "border-[#3D6B52] text-[#3D6B52]"
              : "border-transparent text-charcoal-muted hover:text-charcoal"
          }`}
          onClick={() => {
            setActiveTab("CONSUMABLES");
            setCategoryFilter("");
          }}
        >
          <span>🧪 Consumables Stock</span>
          <span className="bg-stone-100 text-charcoal px-2 py-0.5 rounded text-[10px]">
            {consumables.length}
          </span>
        </button>

        <button
          className={`pb-2.5 flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === "EQUIPMENT"
              ? "border-[#3D6B52] text-[#3D6B52]"
              : "border-transparent text-charcoal-muted hover:text-charcoal"
          }`}
          onClick={() => {
            setActiveTab("EQUIPMENT");
            setCategoryFilter("");
          }}
        >
          <span>🔬 Reusable Equipment Assets</span>
          <span className="bg-stone-100 text-charcoal px-2 py-0.5 rounded text-[10px]">
            {equipment.length}
          </span>
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="surface p-4 rounded-lg border border-stone flex flex-wrap gap-3 items-center justify-between text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <input
            type="search"
            placeholder={
              activeTab === "CONSUMABLES"
                ? "Search consumables by name..."
                : "Search equipment by asset tag, name..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input text-xs px-3 py-1.5 w-64 rounded border border-stone"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input text-xs px-3 py-1.5 rounded border border-stone"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="text-charcoal-muted font-mono">
          Showing{" "}
          <strong>
            {activeTab === "CONSUMABLES" ? filteredConsumables.length : filteredEquipment.length}
          </strong>{" "}
          items
        </div>
      </div>

      {/* CONSUMABLES TABLE */}
      {activeTab === "CONSUMABLES" && (
        <div className="surface rounded-lg border border-stone overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone text-charcoal-muted font-mono uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Item Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Available Stock</th>
                <th className="py-2.5 px-3 text-right">Min Threshold</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Expiry Date</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-charcoal-muted font-mono">
                    Loading consumables stock records…
                  </td>
                </tr>
              ) : filteredConsumables.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-charcoal-muted font-mono">
                    No consumables found.
                  </td>
                </tr>
              ) : (
                filteredConsumables.map((item) => {
                  const isLow = (item.currentStock || 0) <= (item.minimumStock || 0);
                  const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
                  return (
                    <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <strong className="text-charcoal font-semibold block">{item.name}</strong>
                        <span className="text-[10px] text-charcoal-subtle font-mono">{item.id}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-charcoal">{item.category}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-sm text-charcoal">
                        {item.currentStock} {item.unitMetric}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-charcoal-muted">
                        {item.minimumStock} {item.unitMetric}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isExpired ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-800 uppercase">
                            EXPIRED
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 uppercase">
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 uppercase">
                            IN STOCK
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-charcoal-muted text-[11px]">
                        {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "Non-perishable"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <button
                          className="text-xs text-[#3D6B52] hover:underline font-semibold"
                          onClick={() => setEditingConsumable(item)}
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* EQUIPMENT ASSETS TABLE */}
      {activeTab === "EQUIPMENT" && (
        <div className="surface rounded-lg border border-stone overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone text-charcoal-muted font-mono uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Asset Tag / QR</th>
                <th className="py-2.5 px-3">Equipment Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Location / Bus</th>
                <th className="py-2.5 px-3 text-center">Condition</th>
                <th className="py-2.5 px-3 text-right">Valuation (₹)</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-charcoal-muted font-mono">
                    Loading equipment assets…
                  </td>
                </tr>
              ) : filteredEquipment.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-charcoal-muted font-mono">
                    No equipment assets found.
                  </td>
                </tr>
              ) : (
                filteredEquipment.map((eq) => (
                  <tr key={eq.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-charcoal">{eq.assetTag}</span>
                        <button
                          className="text-[10px] bg-stone-100 hover:bg-stone-200 text-charcoal px-1.5 py-0.5 rounded"
                          onClick={() => setViewingQrAsset(eq)}
                          title="View QR Code"
                        >
                          QR
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <strong className="text-charcoal font-semibold block">{eq.name}</strong>
                    </td>
                    <td className="py-3 px-3 font-mono text-charcoal-muted">{eq.category}</td>
                    <td className="py-3 px-3 font-mono text-charcoal">
                      {eq.Bus ? (
                        <span className="text-[#3D6B52] font-semibold">
                          🚌 {eq.Bus.busCode || eq.Bus.registrationNumber}
                        </span>
                      ) : (
                        <span className="text-stone-500">🏢 Regional Depot</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          eq.status === "DAMAGED"
                            ? "bg-red-100 text-red-800"
                            : eq.status === "IN_MAINTENANCE"
                            ? "bg-amber-100 text-amber-800"
                            : eq.status === "ASSIGNED_TO_BUS"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {eq.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-charcoal">
                      ₹{eq.cost?.toLocaleString() || "0"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <button
                        className="text-xs text-[#3D6B52] hover:underline font-semibold"
                        onClick={() => setEditingEquipment(eq)}
                      >
                        Update Condition
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD CONSUMABLE MODAL */}
      {showAddConsumable && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="surface w-full max-w-md p-6 rounded-lg border border-stone shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone mb-4">
              <h3 className="text-base font-bold text-charcoal">Register Consumable Item</h3>
              <button
                className="font-mono text-sm text-charcoal-muted hover:text-charcoal"
                onClick={() => setShowAddConsumable(false)}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 bg-red-50 text-red-800 border border-red-200 rounded text-xs font-mono">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddConsumable} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-charcoal font-semibold mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={consumableForm.name}
                  onChange={(e) => setConsumableForm({ ...consumableForm, name: e.target.value })}
                  className="input w-full p-2 border border-stone rounded font-sans text-xs"
                  placeholder="e.g. Copper Sulfate Powder"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Category</label>
                  <select
                    value={consumableForm.category}
                    onChange={(e) => setConsumableForm({ ...consumableForm, category: e.target.value })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  >
                    <option value="Chemistry">Chemistry</option>
                    <option value="Physics">Physics</option>
                    <option value="Biology">Biology</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Stationery">Stationery</option>
                    <option value="Safety">Safety / First Aid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Unit Metric</label>
                  <input
                    type="text"
                    required
                    value={consumableForm.unitMetric}
                    onChange={(e) => setConsumableForm({ ...consumableForm, unitMetric: e.target.value })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                    placeholder="e.g. grams, bottles, pieces"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min={0}
                    value={consumableForm.currentStock}
                    onChange={(e) => setConsumableForm({ ...consumableForm, currentStock: Number(e.target.value) })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Min Threshold</label>
                  <input
                    type="number"
                    min={0}
                    value={consumableForm.minimumStock}
                    onChange={(e) => setConsumableForm({ ...consumableForm, minimumStock: Number(e.target.value) })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-charcoal font-semibold mb-1">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={consumableForm.expiryDate}
                  onChange={(e) => setConsumableForm({ ...consumableForm, expiryDate: e.target.value })}
                  className="input w-full p-2 border border-stone rounded text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone">
                <button
                  type="button"
                  className="btn ghost px-4 py-1.5 text-xs font-mono"
                  onClick={() => setShowAddConsumable(false)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn primary px-4 py-1.5 text-xs font-mono">
                  {submitting ? "Saving..." : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD EQUIPMENT MODAL */}
      {showAddEquipment && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="surface w-full max-w-md p-6 rounded-lg border border-stone shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone mb-4">
              <h3 className="text-base font-bold text-charcoal">Add Reusable Equipment Asset</h3>
              <button
                className="font-mono text-sm text-charcoal-muted hover:text-charcoal"
                onClick={() => setShowAddEquipment(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEquipment} className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Asset Tag *</label>
                  <input
                    type="text"
                    required
                    value={equipmentForm.assetTag}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, assetTag: e.target.value })}
                    className="input w-full p-2 border border-stone rounded font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Category</label>
                  <select
                    value={equipmentForm.category}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, category: e.target.value })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Astronomy">Astronomy</option>
                    <option value="Robotics">Robotics</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-charcoal font-semibold mb-1">Equipment Name *</label>
                <input
                  type="text"
                  required
                  value={equipmentForm.name}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
                  className="input w-full p-2 border border-stone rounded font-sans text-xs"
                  placeholder="e.g. Monocular Compound Microscope 1000x"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Initial Location</label>
                  <select
                    value={equipmentForm.busId}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, busId: e.target.value })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  >
                    <option value="">Regional Depot</option>
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.busCode || b.registrationNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Valuation Cost (₹)</label>
                  <input
                    type="number"
                    value={equipmentForm.cost}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, cost: Number(e.target.value) })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone">
                <button
                  type="button"
                  className="btn ghost px-4 py-1.5 text-xs font-mono"
                  onClick={() => setShowAddEquipment(false)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn primary px-4 py-1.5 text-xs font-mono">
                  {submitting ? "Saving..." : "Add Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST CONSUMABLE STOCK MODAL */}
      {editingConsumable && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="surface w-full max-w-sm p-6 rounded-lg border border-stone shadow-xl">
            <h3 className="text-base font-bold text-charcoal mb-2">Adjust Consumable Stock</h3>
            <p className="text-xs text-charcoal-muted mb-4 font-mono">{editingConsumable.name}</p>

            <form onSubmit={handleUpdateConsumable} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-charcoal font-semibold mb-1">Current Stock Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={editingConsumable.currentStock}
                  onChange={(e) =>
                    setEditingConsumable({ ...editingConsumable, currentStock: Number(e.target.value) })
                  }
                  className="input w-full p-2 border border-stone rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-charcoal font-semibold mb-1">Minimum Alert Threshold</label>
                <input
                  type="number"
                  min={0}
                  value={editingConsumable.minimumStock}
                  onChange={(e) =>
                    setEditingConsumable({ ...editingConsumable, minimumStock: Number(e.target.value) })
                  }
                  className="input w-full p-2 border border-stone rounded text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone">
                <button
                  type="button"
                  className="btn ghost px-3 py-1.5 text-xs font-mono"
                  onClick={() => setEditingConsumable(null)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn primary px-3 py-1.5 text-xs font-mono">
                  {submitting ? "Saving..." : "Update Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE EQUIPMENT CONDITION MODAL */}
      {editingEquipment && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="surface w-full max-w-sm p-6 rounded-lg border border-stone shadow-xl">
            <h3 className="text-base font-bold text-charcoal mb-2">Update Asset Condition</h3>
            <p className="text-xs text-charcoal-muted mb-4 font-mono">
              {editingEquipment.name} ({editingEquipment.assetTag})
            </p>

            <form onSubmit={handleUpdateEquipment} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-charcoal font-semibold mb-1">Condition Status</label>
                <select
                  value={editingEquipment.status}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, status: e.target.value })}
                  className="input w-full p-2 border border-stone rounded text-xs"
                >
                  <option value="AVAILABLE">AVAILABLE (Operational)</option>
                  <option value="ASSIGNED_TO_BUS">ASSIGNED_TO_BUS</option>
                  <option value="IN_MAINTENANCE">IN_MAINTENANCE (Repair required)</option>
                  <option value="DAMAGED">DAMAGED</option>
                  <option value="MISSING">MISSING / LOST</option>
                </select>
              </div>

              <div>
                <label className="block text-charcoal font-semibold mb-1">Assigned Vehicle</label>
                <select
                  value={editingEquipment.busId || ""}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, busId: e.target.value || null })}
                  className="input w-full p-2 border border-stone rounded text-xs"
                >
                  <option value="">Regional Depot (Unassigned)</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.busCode || b.registrationNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone">
                <button
                  type="button"
                  className="btn ghost px-3 py-1.5 text-xs font-mono"
                  onClick={() => setEditingEquipment(null)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn primary px-3 py-1.5 text-xs font-mono">
                  {submitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE VIEWER MODAL */}
      {viewingQrAsset && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="surface w-full max-w-xs p-6 rounded-lg border border-stone shadow-xl text-center">
            <h3 className="text-base font-bold text-charcoal mb-1">{viewingQrAsset.name}</h3>
            <span className="font-mono text-xs text-charcoal-muted block mb-4">
              Asset Tag: {viewingQrAsset.assetTag}
            </span>

            {/* QR Visual */}
            <div className="p-4 bg-white border border-stone rounded inline-block mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                  `SCIMOVE-ASSET:${viewingQrAsset.assetTag}:${viewingQrAsset.id}`
                )}`}
                alt="Asset QR Code"
                className="w-36 h-36 mx-auto"
              />
            </div>

            <div className="text-[11px] font-mono text-charcoal-subtle mb-4">
              Scan with mobile scanner during lab inspections.
            </div>

            <button
              className="btn ghost w-full text-xs font-mono py-1.5"
              onClick={() => setViewingQrAsset(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
