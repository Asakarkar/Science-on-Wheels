import { useSearchParams } from "react-router-dom";
import { RegionalDataTable } from "../components/RegionalDataTable";

export function RegionalSchoolsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "School Directory";

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  const subOptions = ["School Directory", "Registrations", "Priority"];
  const resource = sub === "Registrations" ? "registrations" : "schools";
  const title =
    sub === "Registrations"
      ? "School Registration Requests"
      : sub === "Priority"
      ? "School Outreach Priority"
      : "Regional School Directory";

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
        description="Schools and registration requests belonging exclusively to your assigned region."
      />
    </div>
  );
}
