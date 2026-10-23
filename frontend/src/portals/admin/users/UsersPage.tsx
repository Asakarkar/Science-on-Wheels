import { useSearchParams } from "react-router-dom";
import { configs } from "../config/resources";
import { ResourceView } from "../components/ResourceView";
import type { ResourceConfig } from "../../../shared/types/admin";

export function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "All Users";

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  const subOptions = ["All Users", "Regional Administrators", "Field Staff"];

  let baseConfig = configs.users;
  let customConfig: ResourceConfig = { ...baseConfig };

  if (sub === "Regional Administrators") {
    customConfig = {
      ...baseConfig,
      title: "Regional Administrators",
      description: "Create and manage Regional Admin accounts. Each account is permanently scoped to its assigned region.",
      filterQuery: "roleEnum=REGIONAL_ADMIN",
      fields: baseConfig.fields.map((f) =>
        f.key === "roleEnum"
          ? { ...f, options: ["REGIONAL_ADMIN"], required: true }
          : f.key === "regionId"
          ? { ...f, required: true }
          : f
      )
    };
  } else if (sub === "Field Staff") {
    customConfig = {
      ...baseConfig,
      title: "Field Staff",
      description: "Science Communicators and field personnel.",
      filterQuery: "roleEnum=SCIENCE_COMMUNICATOR",
      fields: baseConfig.fields.map((f) =>
        f.key === "roleEnum"
          ? { ...f, options: ["SCIENCE_COMMUNICATOR"], required: true }
          : f
      )
    };
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
      <ResourceView config={customConfig} />
    </div>
  );
}
