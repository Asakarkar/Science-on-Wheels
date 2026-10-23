import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../../services/api-client";
import { FieldList } from "../components/FieldList";

export function FieldAttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Mark Attendance";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savedCount, setSavedCount] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await apiClient<any>("/field/dashboard");
        setData(res);
      } catch (err) {
        console.error("Unable to load attendance records", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function handleRecordAttendance(id: string, count: number) {
    setSavedCount((p) => ({ ...p, [id]: count }));
    setMessage(`Attendance of ${count} students recorded for session.`);
    setTimeout(() => setMessage(""), 3000);
  }

  const subOptions = ["Mark Attendance", "Records"];
  const visits = data?.todayVisits || data?.upcomingVisits || [];

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
          Loading attendance…
        </div>
      ) : (
        <FieldList
          title={sub}
          items={visits}
          emptyMessage="No active school sessions to record attendance for."
          render={(x: any) => (
            <>
              <div>
                <strong>{x.School?.name || "School"}</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.8 }}>
                  Expected: {x.expectedStudentCount || 30} students · Status: {x.status}
                </p>
                {savedCount[x.id] && (
                  <small style={{ color: "#10b981" }}>Recorded: {savedCount[x.id]} students present</small>
                )}
              </div>
              <div className="field-actions" style={{ margin: 0, display: "flex", gap: "0.5rem" }}>
                <button
                  className="secondary"
                  onClick={() => handleRecordAttendance(x.id, x.expectedStudentCount || 30)}
                >
                  Verify ({x.expectedStudentCount || 30} present)
                </button>
              </div>
            </>
          )}
        />
      )}
    </div>
  );
}
