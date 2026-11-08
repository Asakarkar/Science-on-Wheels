import { useSearchParams } from "react-router-dom";
import { configs } from "./resources";
import { ResourceView } from "./ResourceView";

export function GeographyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "States";

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  const subOptions = ["States", "Districts", "Blocks"];

  let activeConfig = configs.states;
  if (sub === "Districts") activeConfig = configs.districts;
  else if (sub === "Blocks") activeConfig = configs.blocks;

  return (
    <div className="portal-module">
      <div className="subnav-tabs" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", borderBottom: "1px solid var(--stone, #e2e8f0)", paddingBottom: "0.75rem" }}>
        {subOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`ghost ${sub === opt ? "primary" : ""}`}
            onClick={() => setSub(opt)}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "6px",
              background: sub === opt ? "var(--charcoal-dark, #1E242B)" : "#ffffff",
              color: sub === opt ? "#ffffff" : "var(--charcoal, #334155)",
              border: sub === opt ? "1px solid var(--charcoal-dark, #1E242B)" : "1px solid var(--stone, #cbd5e1)",
              fontWeight: sub === opt ? 700 : 500,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s ease"
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
