import { useSearchParams } from "react-router-dom";
import { RegionalDataTable } from "../components/RegionalDataTable";

export function RegionalInventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Consumables Stock";

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  const subOptions = ["Consumables Stock", "Equipment Assets", "Transactions"];

  let resource = "consumables";
  let title = "Regional Consumables Stock";

  if (sub === "Equipment Assets") {
    resource = "equipment";
    title = "Regional Equipment Assets";
  } else if (sub === "Transactions") {
    resource = "inventory";
    title = "Regional Inventory Transactions";
  }

  return (
    <div className="portal-module">
      <div className="subnav-tabs" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
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
              cursor: "pointer"
            }}
          >
            {opt}
          </button>
        ))}
      </div>
      <RegionalDataTable
        resource={resource}
        title={title}
        description="Inventory, equipment and consumables scoped to your region and laboratories."
      />
    </div>
  );
}
