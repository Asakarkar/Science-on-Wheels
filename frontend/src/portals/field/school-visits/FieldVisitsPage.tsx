import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../../services/api-client";
import { FieldList } from "../components/FieldList";

export function FieldVisitsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Assigned Schools";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await apiClient<any>("/field/dashboard");
      setData(res);
    } catch (err) {
      console.error("Unable to load visits", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function recordAction(path: string) {
    try {
      setMessage("");
      await apiClient(path, { method: "POST" });
      await load();
      setMessage("Status updated.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
    }
  }

  const subOptions = ["Assigned Schools", "Arrival / Departure", "History"];
  const visits = sub === "History" ? data?.upcomingVisits : data?.todayVisits;

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

      {message && <div className="field-message" style={{ marginBottom: "1rem" }}>{message}</div>}

      {loading ? (
        <div className="loading-state small">
          <div className="loader-ring" />
          Loading visits…
        </div>
      ) : (
        <FieldList
          title={sub}
          items={visits || []}
          emptyMessage="No school visits recorded in this view."
          render={(x: any) => (
            <>
              <div>
                <strong>{x.School?.name || "School"}</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.8 }}>
                  {x.address || x.eventDate?.slice?.(0, 10) || "Visit"} · {x.Bus?.busCode || "Lab"}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <em>{x.status}</em>
                {sub === "Arrival / Departure" && (
                  <div className="field-actions" style={{ margin: 0 }}>
                    <button onClick={() => recordAction(`/field/events/${x.id}/arrival`)}>
                      Arrived
                    </button>
                    <button
                      className="secondary"
                      onClick={() => recordAction(`/field/events/${x.id}/complete`)}
                    >
                      Departure
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        />
      )}
    </div>
  );
}
