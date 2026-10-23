import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../../services/api-client";
import { FieldList } from "../components/FieldList";

export function FieldIncidentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Report Issue";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await apiClient<any>("/field/dashboard");
      setData(res);
    } catch (err) {
      console.error("Unable to load incident reports", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const subOptions = ["Report Issue", "My Reports & Requests"];
  const issues = data?.issues || [];

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

      {sub === "Report Issue" && <IssueForm onDone={load} />}

      {sub === "My Reports & Requests" && (
        <>
          {loading ? (
            <div className="loading-state small">
              <div className="loader-ring" />
              Loading reports…
            </div>
          ) : (
            <FieldList
              title="Submitted Incident Reports"
              items={issues}
              emptyMessage="No issues or incident reports currently logged."
              render={(x: any) => (
                <>
                  <div>
                    <strong>{x.category}</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.8 }}>
                      {x.description}
                    </p>
                    <small style={{ opacity: 0.6 }}>
                      {x.timestamp ? new Date(x.timestamp).toLocaleString() : ""}
                    </small>
                  </div>
                  <em>{x.status || "OPEN"}</em>
                </>
              )}
            />
          )}
        </>
      )}
    </div>
  );
}

function IssueForm({ onDone }: { onDone: () => Promise<void> | void }) {
  const [category, setCategory] = useState("EQUIPMENT");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await apiClient("/field/issues", {
        method: "POST",
        body: JSON.stringify({ category, description })
      });
      setDescription("");
      setMsg("Issue report submitted successfully to Regional Operations.");
      await onDone();
    } catch (x) {
      setMsg(x instanceof Error ? x.message : "Unable to submit issue");
    } finally {
      setBusy(false);
    }
  }

  const categories = [
    "EQUIPMENT",
    "INVENTORY",
    "VEHICLE",
    "SAFETY",
    "TECHNICAL",
    "SCHOOL_VISIT",
    "OTHER"
  ];

  return (
    <section className="field-page">
      <div className="field-section-title">
        <span>FIELD SUPPORT & SAFETY</span>
        <h1>Log Incident / Issue Report</h1>
      </div>
      <form className="field-card field-form" onSubmit={submit}>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="Describe the field issue, equipment defect, vehicle discrepancy or safety need in detail."
            rows={4}
          />
        </label>
        <button disabled={busy} className="primary">
          {busy ? "Submitting…" : "Submit Issue Report"}
        </button>
        {msg && <div className="field-message">{msg}</div>}
      </form>
    </section>
  );
}
