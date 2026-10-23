import { FormEvent, useState } from "react";
import { apiClient } from "../../../services/api-client";
import { RegionalDataTable } from "../components/RegionalDataTable";

export function RegionalSchedulesPage() {
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="portal-module stack">
      <section className="surface" style={{ marginBottom: "1.5rem" }}>
        <div className="module-head">
          <div>
            <div className="section-kicker">PLANNING & DISPATCH</div>
            <h2>Create a regional visit</h2>
            <p>
              Schedule a mobile laboratory visit. The backend validates that both the school
              and laboratory belong to your authorized regional scope.
            </p>
          </div>
          <button className="primary" onClick={() => setShowVisitForm((x) => !x)}>
            {showVisitForm ? "Close form" : "+ New visit"}
          </button>
        </div>

        {showVisitForm && (
          <VisitForm
            onDone={() => {
              setShowVisitForm(false);
              setRefreshKey((k) => k + 1);
            }}
          />
        )}
      </section>

      <RegionalDataTable
        key={refreshKey}
        resource="visits"
        title="Visits & Schedules"
        description="Planned, active, and completed school visits in your region."
      />
    </div>
  );
}

function VisitForm({ onDone }: { onDone: () => void }) {
  const [data, setData] = useState({
    eventCode: "",
    schoolId: "",
    busId: "",
    eventDate: "",
    startTime: "09:00",
    endTime: "12:00",
    expectedStudentCount: "30"
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      await apiClient("/regional-admin/visits", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          expectedStudentCount: Number(data.expectedStudentCount)
        })
      });
      onDone();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Unable to create visit");
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { key: "eventCode", label: "Event code", type: "text" },
    { key: "schoolId", label: "School ID", type: "text" },
    { key: "busId", label: "Lab ID", type: "text" },
    { key: "eventDate", label: "Event date", type: "date" },
    { key: "startTime", label: "Start time", type: "text" },
    { key: "endTime", label: "End time", type: "text" },
    { key: "expectedStudentCount", label: "Expected student count", type: "number" }
  ];

  return (
    <form className="inline-form" onSubmit={submit} style={{ marginTop: "1rem" }}>
      {fields.map((f) => (
        <label key={f.key}>
          {f.label}
          <input
            type={f.type}
            value={(data as any)[f.key]}
            onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
            required
          />
        </label>
      ))}
      {msg && <div className="error banner" style={{ width: "100%" }}>{msg}</div>}
      <button className="primary" disabled={saving} style={{ alignSelf: "flex-end" }}>
        {saving ? "Creating…" : "Save visit schedule"}
      </button>
    </form>
  );
}
