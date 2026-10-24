import { FormEvent, useEffect, useState } from "react";
import { apiClient } from "../../../services/api-client";

interface EditInventoryModalProps {
  resource: string;
  record: any;
  onClose: () => void;
  onSaved: () => void;
}

export function EditInventoryModal({
  resource,
  record,
  onClose,
  onSaved,
}: EditInventoryModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [labs, setLabs] = useState<any[]>([]);

  // Consumable fields
  const [conName, setConName] = useState(record?.name || "");
  const [conCategory, setConCategory] = useState(record?.category || "");
  const [conStock, setConStock] = useState<number>(record?.currentStock ?? 0);
  const [conMinStock, setConMinStock] = useState<number>(record?.minimumStock ?? 0);
  const [conUnit, setConUnit] = useState(record?.unitMetric || "units");
  const [conExpiry, setConExpiry] = useState(
    record?.expiryDate ? new Date(record.expiryDate).toISOString().slice(0, 10) : ""
  );

  // Equipment fields
  const [eqName, setEqName] = useState(record?.name || "");
  const [eqCategory, setEqCategory] = useState(record?.category || "");
  const [eqStatus, setEqStatus] = useState(record?.status || "ASSIGNED_TO_BUS");
  const [eqBusId, setEqBusId] = useState(record?.busId || "");
  const [eqCost, setEqCost] = useState<number>(record?.cost ?? 0);
  const [eqPurchaseDate, setEqPurchaseDate] = useState(
    record?.purchaseDate ? new Date(record.purchaseDate).toISOString().slice(0, 10) : ""
  );

  // Transaction fields
  const [txQuantity, setTxQuantity] = useState<number>(record?.quantity ?? 0);
  const [txNotes, setTxNotes] = useState(record?.notes || "");

  // Fetch labs if editing equipment
  useEffect(() => {
    if (resource === "equipment") {
      apiClient<{ rows: any[] }>("/regional-admin/labs?limit=50")
        .then((res) => setLabs(res.rows || []))
        .catch(() => undefined);
    }
  }, [resource]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      let body: any = {};
      if (resource === "consumables") {
        body = {
          name: conName.trim(),
          category: conCategory.trim(),
          currentStock: Number(conStock),
          minimumStock: Number(conMinStock),
          unitMetric: conUnit.trim() || "units",
          expiryDate: conExpiry || null,
        };
      } else if (resource === "equipment") {
        body = {
          name: eqName.trim(),
          category: eqCategory.trim(),
          status: eqStatus,
          busId: eqBusId || undefined,
          cost: Number(eqCost),
          purchaseDate: eqPurchaseDate || undefined,
        };
      } else if (resource === "inventory") {
        body = {
          quantity: Number(txQuantity),
          notes: txNotes.trim() || undefined,
        };
      }

      await apiClient(`/regional-admin/resource/${resource}/${record.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      onSaved();
    } catch (err: any) {
      setError(err?.message || "Failed to update record");
    } finally {
      setSaving(false);
    }
  }

  const title =
    resource === "consumables"
      ? "Edit Consumable Item"
      : resource === "equipment"
      ? "Edit Equipment Asset"
      : "Edit Inventory Transaction";

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
          maxWidth: "560px",
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <span style={{ fontSize: "11px", fontFamily: "monospace", letterSpacing: "0.1em", color: "#be755f", textTransform: "uppercase" }}>
              REGIONAL INVENTORY / EDIT
            </span>
            <h3 style={{ margin: "4px 0 0 0", fontSize: "1.25rem", fontWeight: 700 }}>{title}</h3>
            {record?.id && (
              <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>ID: {record.id}</span>
            )}
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

        {error && (
          <div style={{ backgroundColor: "#ef444422", border: "1px solid #ef4444", color: "#fca5a5", padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* 1. Consumable Fields */}
          {resource === "consumables" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                  Consumable Name *
                </label>
                <input
                  type="text"
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
                    Current Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={conStock}
                    onChange={(e) => setConStock(Number(e.target.value))}
                    required
                    style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                    Minimum Alert Threshold *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={conMinStock}
                    onChange={(e) => setConMinStock(Number(e.target.value))}
                    required
                    style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                  />
                </div>
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
            </>
          )}

          {/* 2. Equipment Fields */}
          {resource === "equipment" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                    Asset Tag (Read-only)
                  </label>
                  <input
                    type="text"
                    value={record?.assetTag || ""}
                    disabled
                    style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a88", border: "1px solid #334155", borderRadius: "6px", color: "#94a3b8", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                    Equipment Name *
                  </label>
                  <input
                    type="text"
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
                    value={eqCategory}
                    onChange={(e) => setEqCategory(e.target.value)}
                    required
                    style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                    Status *
                  </label>
                  <select
                    value={eqStatus}
                    onChange={(e) => setEqStatus(e.target.value)}
                    required
                    style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="ASSIGNED_TO_BUS">Assigned to Bus</option>
                    <option value="IN_MAINTENANCE">In Maintenance</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="MISSING">Missing</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "4px" }}>
                    Assigned Mobile Lab
                  </label>
                  <select
                    value={eqBusId}
                    onChange={(e) => setEqBusId(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                  >
                    <option value="">Unassigned</option>
                    {labs.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.busCode || b.registrationNumber}
                      </option>
                    ))}
                  </select>
                </div>

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
            </>
          )}

          {/* 3. Transaction Fields */}
          {resource === "inventory" && (
            <>
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
                  rows={3}
                  style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#fff", fontSize: "13px", resize: "vertical" }}
                />
              </div>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.75rem" }}>
            <button
              type="button"
              onClick={onClose}
              className="ghost"
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                background: "transparent",
                color: "#94a3b8",
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="primary"
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "6px",
                background: "#be755f",
                color: "#fff",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
