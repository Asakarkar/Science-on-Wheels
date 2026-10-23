import { useSearchParams } from "react-router-dom";
import { configs } from "../config/resources";
import { ResourceView } from "../components/ResourceView";

export function RolesPermissionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Roles";

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  const subOptions = ["Roles", "Permissions"];
  const activeConfig = sub === "Permissions" ? configs.permissions : configs.roles;

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
      <ResourceView config={activeConfig} />
    </div>
  );
}
