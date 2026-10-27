import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RegionalDataTable } from "../components/RegionalDataTable";
import { RegionalInventoryModal } from "./RegionalInventoryModal";
import { EditInventoryModal } from "./EditInventoryModal";

export function RegionalInventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Consumables Stock";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  const subOptions = ["Consumables Stock", "Equipment Assets", "Transactions"];

  let resource = "consumables";
  let title = "Regional Consumables Stock";
  let defaultTab: "transaction" | "consumable" | "equipment" = "consumable";

  if (sub === "Equipment Assets") {
    resource = "equipment";
    title = "Regional Equipment Assets";
    defaultTab = "equipment";
  } else if (sub === "Transactions") {
    resource = "inventory";
    title = "Regional Inventory Transactions";
    defaultTab = "transaction";
  }

  return (
    <div className="portal-module">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div className="subnav-tabs" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {subOptions.map((opt) => {
            const isActive = sub === opt;
            return (
              <button
                key={opt}
                type="button"
                className={`ghost ${isActive ? "primary" : ""}`}
                onClick={() => setSub(opt)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  background: isActive ? "#f1f5f9" : "#ffffff",
                  color: "#000000",
                  border: isActive ? "2px solid #000000" : "1px solid #cbd5e1",
                  fontWeight: isActive ? 700 : 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: isActive ? "0 2px 4px rgba(0,0,0,0.08)" : "0 1px 2px rgba(0,0,0,0.04)",
                  transition: "all 0.15s ease",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="primary"
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            background: "#be755f",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            boxShadow: "0 2px 8px rgba(190, 117, 95, 0.3)"
          }}
        >
          <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>+</span> Add / Record Inventory
        </button>
      </div>

      <RegionalDataTable
        resource={resource}
        title={title}
        description="Inventory, equipment and consumables scoped to your region and laboratories."
        refreshTrigger={refreshTrigger}
        onEdit={(record) => setEditingRecord(record)}
      />

      {isModalOpen && (
        <RegionalInventoryModal
          initialTab={defaultTab}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => {
            setIsModalOpen(false);
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}

      {editingRecord && (
        <EditInventoryModal
          resource={resource}
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSaved={() => {
            setEditingRecord(null);
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}
    </div>
  );
}
