import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../../services/api-client";
import { FieldList } from "../components/FieldList";

export function FieldAssignmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Today's Visits";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await apiClient<any>("/field/dashboard");
        setData(res);
      } catch (err) {
        console.error("Unable to load assignments", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const subOptions = ["Today's Visits", "Upcoming Visits"];
  const visits = sub === "Upcoming Visits" ? data?.upcomingVisits : data?.todayVisits;

  return (
    <div className="portal-module">
      <div className="subnav-tabs" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {subOptions.map((opt) => (
          <button
            key={opt}
            className={`ghost ${sub === opt ? "primary" : ""}`}
            onClick={() => setSearchParams({ sub: opt })}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "4px",
              background: sub === opt ? "var(--color-primary, #10b981)" : "rgba(255,255,255,0.05)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer"
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-state small">
          <div className="loader-ring" />
          Loading assignments…
        </div>
      ) : (
        <FieldList
          title={sub}
          items={visits || []}
          emptyMessage="No school visits assigned in this category."
          render={(x: any) => (
            <>
              <div>
                <strong>{x.School?.name || "School"}</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.8 }}>
                  {x.eventCode} · {x.startTime} - {x.endTime} · {x.Bus?.busCode || "Lab"}
                </p>
              </div>
              <em>{x.status}</em>
            </>
          )}
        />
      )}
    </div>
  );
}
