import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../../services/api-client";
import { FieldList } from "../components/FieldList";

export function FieldExperimentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Assigned Sessions";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await apiClient<any>("/field/dashboard");
      setData(res);
    } catch (err) {
      console.error("Unable to load sessions", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function completeSession(id: string) {
    try {
      setMessage("");
      await apiClient(`/field/events/${id}/complete`, { method: "POST" });
      await load();
      setMessage("Session marked complete.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Completion failed");
    }
  }

  const subOptions = ["Assigned Sessions", "Experiment Details"];
  const sessions = data?.upcomingVisits || data?.todayVisits || [];

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
          Loading science sessions…
        </div>
      ) : (
        <FieldList
          title={sub}
          items={sessions}
          emptyMessage="No science sessions currently scheduled."
          render={(x: any) => (
            <>
              <div>
                <strong>{x.School?.name || "School"}</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.8 }}>
                  {x.ExperimentSession?.[0]?.Experiment?.title || "Physics & Chemistry Demonstrations"} ·{" "}
                  {x.ExperimentSession?.[0]?.Experiment?.subject || "General Science"}
                </p>
                <small style={{ opacity: 0.6 }}>Code: {x.eventCode} · Status: {x.status}</small>
              </div>
              <div className="field-actions" style={{ margin: 0 }}>
                <button onClick={() => completeSession(x.id)}>Mark Complete</button>
              </div>
            </>
          )}
        />
      )}
    </div>
  );
}
