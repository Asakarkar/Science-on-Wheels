import { FormEvent, useEffect, useState } from "react";
import { apiClient } from "../../../services/api-client";

interface RegionalInventoryModalProps {
  initialTab?: "transaction" | "consumable" | "equipment";
  onClose: () => void;
  onSaved: () => void;
}

export function RegionalInventoryModal({
  initialTab = "transaction",
  onClose,
  onSaved,
}: RegionalInventoryModalProps) {
  const [tab, setTab] = useState<"transaction" | "consumable" | "equipment">(initialTab);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [labs, setLabs] = useState<any[]>([]);
  const [consumables, setConsumables] = useState<any[]>([]);

  // Transaction form
  const [txConsumableId, setTxConsumableId] = useState("");
  const [txBusId, setTxBusId] = useState("");
  const [txType, setTxType] = useState<string>("RECEIPT");
  const [txQuantity, setTxQuantity] = useState<number>(10);
  const [txNotes, setTxNotes] = useState("");

  // Consumable form
  const [conName, setConName] = useState("");
  const [conCategory, setConCategory] = useState("Chemistry Reagents");
  const [conStock, setConStock] = useState<number>(50);
  const [conMinStock, setConMinStock] = useState<number>(10);
  const [conUnit, setConUnit] = useState("units");
  const [conExpiry, setConExpiry] = useState("");
  const [conBusId, setConBusId] = useState("");

  // Equipment form
  const [eqAssetTag, setEqAssetTag] = useState("");
  const [eqName, setEqName] = useState("");
  const [eqCategory, setEqCategory] = useState("Physics & Demonstration");
  const [eqBusId, setEqBusId] = useState("");
  const [eqCost, setEqCost] = useState<number>(5000);
  const [eqPurchaseDate, setEqPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [eqStatus, setEqStatus] = useState("ASSIGNED_TO_BUS");

  useEffect(() => {
    // Load regional labs
    apiClient<{ rows: any[] }>("/regional-admin/labs?limit=50")
      .then((res) => {
        const rows = res.rows || [];
        setLabs(rows);
        if (rows.length > 0) {
          setTxBusId(rows[0].id);
          setConBusId(rows[0].id);
          setEqBusId(rows[0].id);
        }
      })
      .catch(() => undefined);

    // Load regional consumables
    apiClient<{ rows: any[] }>("/regional-admin/consumables?limit=100")
      .then((res) => {
        const rows = res.rows || [];
        setConsumables(rows);
        if (rows.length > 0) {
          setTxConsumableId(rows[0].id);
        }
      })
      .catch(() => undefined);
  }, []);

  async function handleTransactionSubmit(e: FormEvent) {
    e.preventDefault();
    if (!txConsumableId || !txBusId) {
      setError("Please select both a consumable and a mobile lab");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiClient("/regional-admin/inventory", {
        method: "POST",
        body: JSON.stringify({
          consumableId: txConsumableId,
          busId: txBusId,
          type: txType,
          quantity: Number(txQuantity),
          notes: txNotes.trim() || undefined,
        }),
      });
      setSuccess("Inventory transaction recorded successfully!");
      setTimeout(() => {
        onSaved();
      }, 500);
    } catch (err: any) {
      setError(err?.message || "Failed to record inventory transaction");
    } finally {
      setSaving(false);
    }
  }

  async function handleConsumableSubmit(e: FormEvent) {
    e.preventDefault();
    if (!conName.trim()) {
      setError("Consumable item name is required");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiClient("/regional-admin/consumables", {
        method: "POST",
        body: JSON.stringify({
          name: conName.trim(),
          category: conCategory.trim(),
          currentStock: Number(conStock),
          minimumStock: Number(conMinStock),
          unitMetric: conUnit.trim() || "units",
          expiryDate: conExpiry || null,
          busId: conBusId || undefined,
        }),
      });
      setSuccess("Consumable registered and stocked successfully!");
      setTimeout(() => {
        onSaved();
      }, 500);
    } catch (err: any) {
      setError(err?.message || "Failed to add consumable");
    } finally {
      setSaving(false);
    }
  }

  async function handleEquipmentSubmit(e: FormEvent) {
    e.preventDefault();
    if (!eqAssetTag.trim() || !eqName.trim() || !eqBusId) {
      setError("Asset Tag, Name, and Mobile Lab are required");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiClient("/regional-admin/equipment", {
        method: "POST",
        body: JSON.stringify({
          assetTag: eqAssetTag.trim(),
          name: eqName.trim(),
          category: eqCategory.trim(),
          busId: eqBusId,
          cost: Number(eqCost),
          purchaseDate: eqPurchaseDate || undefined,
          status: eqStatus,
        }),
      });
      setSuccess("Equipment asset registered and assigned!");
      setTimeout(() => {
        onSaved();
      }, 500);
    } catch (err: any) {
      setError(err?.message || "Failed to register equipment asset");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal surface"
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "#1e242b",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          color: "#f1f5f9",
          padding: "1.5rem",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div>
            <span style={{ fontSize: "11px", fontFamily: "monospace", letterSpacing: "0.1em", color: "#be755f", textTransform: "uppercase" }}>
              REGIONAL INVENTORY MANAGEMENT
            </span>
            <h3 style={{ margin: "4px 0 0 0", fontSize: "1.25rem", fontWeight: 700 }}>
              {tab === "transaction" && "Record Stock Movement"}
              {tab === "consumable" && "Register New Consumable Item"}
              {tab === "equipment" && "Register New Equipment Asset"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "1.5rem",
              lineHeight: 1,
              cursor: "pointer",
              padding: "4px",
            }}
          >
            ×
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.75rem" }}>
          <button
            type="button"
            className={`ghost ${tab === "transaction" ? "primary" : ""}`}
            onClick={() => { setTab("transaction"); setError(""); }}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              background: tab === "transaction" ? "#be755f" : "rgba(255,255,255,0.06)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            ± Stock Movement
          </button>
          <button
            type="button"
            className={`ghost ${tab === "consumable" ? "primary" : ""}`}
            onClick={() => { setTab("consumable"); setError(""); }}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              background: tab === "consumable" ? "#be755f" : "rgba(255,255,255,0.06)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            + New Consumable
          </button>
          <button
            type="button"
            className={`ghost ${tab === "equipment" ? "primary" : ""}`}
            onClick={() => { setTab("equipment"); setError(""); }}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              background: tab === "equipment" ? "#be755f" : "rgba(255,255,255,0.06)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            + New Equipment
          </button>
        </div>

        {/* Error / Success Messages */}
        {error && (
          <div style={{ backgroundColor: "#ef444422", border: "1px solid #ef4444", color: "#fca5a5", padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem", fontSize: "13px" }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ backgroundColor: "#22c55e22", border: "1px solid #22c55e", color: "#86efac", padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem", fontSize: "13px" }}>
            {success}
          </div>
        )}

        {/* 1. Transaction Form */}
        {tab === "transaction" && (
          <form onSubmit={handleTransactionSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                Consumable Item *
              </label>
              <select
                value={txConsumableId}
                onChange={(e) => setTxConsumableId(e.target.value)}
                required
                style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
              >
                {consumables.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Stock: {c.currentStock} {c.unitMetric})
                  </option>
                ))}
                {consumables.length === 0 && <option value="">No consumables found</option>}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                  Assigned Mobile Lab *
                </label>
                <select
                  value={txBusId}
                  onChange={(e) => setTxBusId(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                >
                  {labs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.busCode || b.registrationNumber} ({b.registrationNumber})
                    </option>
                  ))}
                  {labs.length === 0 && <option value="">No labs assigned</option>}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                  Movement Type *
                </label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                >
                  <option value="RECEIPT">Stock Receipt / Inflow (+)</option>
                  <option value="RETURN">Unused Return (+)</option>
                  <option value="ISSUE">Lab Allocation / Outflow (-)</option>
                  <option value="CONSUMPTION">Session Consumption (-)</option>
                  <option value="ADJUSTMENT">Audit Count Adjustment (+)</option>
                  <option value="DAMAGE">Damaged / Discarded (-)</option>
                  <option value="LOSS">Loss in Transit (-)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                value={txQuantity}
                onChange={(e) => setTxQuantity(Number(e.target.value))}
                required
                style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                Notes / Reference
              </label>
              <textarea
                value={txNotes}
                onChange={(e) => setTxNotes(e.target.value)}
                placeholder="Reason, invoice reference, or school visit session ID..."
                rows={2}
                style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px", resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button type="button" onClick={onClose} className="ghost" style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "transparent", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="primary" style={{ padding: "0.5rem 1.25rem", borderRadius: "6px", background: "#be755f", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}>
                {saving ? "Recording..." : "Record Transaction"}
              </button>
            </div>
          </form>
        )}

        {/* 2. Consumable Form */}
        {tab === "consumable" && (
          <form onSubmit={handleConsumableSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                Consumable Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Sodium Hydroxide Pellets (NaOH)"
                value={conName}
                onChange={(e) => setConName(e.target.value)}
                required
                style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                  Category *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chemical Reagents"
                  value={conCategory}
                  onChange={(e) => setConCategory(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                  Unit of Metric *
                </label>
                <input
                  type="text"
                  placeholder="e.g. grams, bottles, strips, units"
                  value={conUnit}
                  onChange={(e) => setConUnit(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                  Initial Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={conStock}
                  onChange={(e) => setConStock(Number(e.target.value))}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                  Minimum Alert Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={conMinStock}
                  onChange={(e) => setConMinStock(Number(e.target.value))}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                  Target Regional Lab
                </label>
                <select
                  value={conBusId}
                  onChange={(e) => setConBusId(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                >
                  {labs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.busCode || b.registrationNumber}
                    </option>
                  ))}
                  {labs.length === 0 && <option value="">No lab selected</option>}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={conExpiry}
                  onChange={(e) => setConExpiry(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button type="button" onClick={onClose} className="ghost" style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "transparent", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="primary" style={{ padding: "0.5rem 1.25rem", borderRadius: "6px", background: "#be755f", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}>
                {saving ? "Saving..." : "Add Consumable"}
              </button>
            </div>
          </form>
        )}

        {/* 3. Equipment Form */}
        {tab === "equipment" && (
          <form onSubmit={handleEquipmentSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                  Asset Tag *
                </label>
                <input
                  type="text"
                  placeholder="e.g. SOW-EQ-007"
                  value={eqAssetTag}
                  onChange={(e) => setEqAssetTag(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                  Equipment Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Digital Spectrophotometer"
                  value={eqName}
                  onChange={(e) => setEqName(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                  Category *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physics / Optics"
                  value={eqCategory}
                  onChange={(e) => setEqCategory(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                  Assigned Mobile Lab *
                </label>
                <select
                  value={eqBusId}
                  onChange={(e) => setEqBusId(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                >
                  {labs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.busCode || b.registrationNumber}
                    </option>
                  ))}
                  {labs.length === 0 && <option value="">No lab available</option>}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                  Cost (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={eqCost}
                  onChange={(e) => setEqCost(Number(e.target.value))}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={eqPurchaseDate}
                  onChange={(e) => setEqPurchaseDate(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button type="button" onClick={onClose} className="ghost" style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "transparent", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="primary" style={{ padding: "0.5rem 1.25rem", borderRadius: "6px", background: "#be755f", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}>
                {saving ? "Registering..." : "Add Equipment Asset"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
