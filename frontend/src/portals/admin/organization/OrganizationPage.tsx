import { useSearchParams } from "react-router-dom";
import { configs } from "../config/resources";
import { ResourceView } from "../components/ResourceView";

export function OrganizationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Regions";

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  const subOptions = ["Regions", "States", "Districts", "Blocks", "Organization Settings"];

  let activeConfig = configs.regions;
  if (sub === "States" || sub === "Geography") activeConfig = configs.states;
  else if (sub === "Districts") activeConfig = configs.districts;
  else if (sub === "Blocks") activeConfig = configs.blocks;
  else if (sub === "Organization Settings") activeConfig = configs.systemConfig;

  return (
    <div className="portal-module">
      <div className="subnav-tabs" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {subOptions.map((opt) => (
          <button
            key={opt}
            className={`ghost ${sub === opt || (opt === "States" && sub === "Geography") ? "primary" : ""}`}
            onClick={() => setSub(opt)}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "4px",
              background: sub === opt || (opt === "States" && sub === "Geography") ? "var(--color-primary, #6366f1)" : "rgba(255,255,255,0.05)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer"
            }}
          >
            {opt}
          </button>
        ))}
      </div>
      <ResourceView config={activeConfig} />
    </div>
  );
}
