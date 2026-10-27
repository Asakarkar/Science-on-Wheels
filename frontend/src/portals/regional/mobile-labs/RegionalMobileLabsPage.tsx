import { useSearchParams } from "react-router-dom";
import { RegionalDataTable } from "../components/RegionalDataTable";

export function RegionalMobileLabsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Assigned Labs";

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  const subOptions = ["Assigned Labs", "Live Status", "Telemetry"];

  return (
    <div className="portal-module">
      <div className="subnav-tabs" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
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
      <RegionalDataTable
        resource="labs"
        title="Mobile Laboratories"
        description="Mobile science laboratories assigned to and operating inside your region."
      />
    </div>
  );
}
