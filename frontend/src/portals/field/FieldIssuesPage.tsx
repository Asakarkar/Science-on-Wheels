import { useEffect, useState } from "react";
import { apiClient } from "../../services/api-client";

interface OperationalIssue {
  id: string;
  category: string;
  description: string;
  location?: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  bus?: { id: string; registrationNumber: string };
  school?: { id: string; name: string };
}

export function FieldIssuesPage() {
  const [issues, setIssues] = useState<OperationalIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // New Issue form state
  const [category, setCategory] = useState<string>("EQUIPMENT");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadIssues() {
    try {
      setLoading(true);
      setError("");
      const res = await apiClient<{ rows: OperationalIssue[] }>("/field/issues");
      setIssues(res.rows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load issues");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadIssues();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please describe the issue in detail.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccessMsg("");

      const res = await apiClient<any>("/field/issues", {
        method: "POST",
        body: JSON.stringify({
          category,
          description,
          location: location || undefined,
          evidenceUrl: evidenceUrl || undefined,
        }),
      });

      setSuccessMsg(res.message || "Issue reported to Regional Administrator.");
      setDescription("");
      setLocation("");
      setEvidenceUrl("");
      await loadIssues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to report issue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="surface p-5 border border-stone rounded-xl bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] font-bold tracking-wider text-rose-700 uppercase">
            Field Incident & Support Desk
          </span>
          <h1 className="text-xl font-bold text-charcoal mt-0.5">Report an Issue</h1>
          <p className="text-xs text-charcoal-muted">
            Report vehicle breakdowns, damaged laboratory assets, material shortages, or safety concerns directly to Regional HQ
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="font-bold">×</button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} className="font-bold">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issue Submission Form */}
        <div className="surface border border-stone rounded-xl bg-white shadow-xs p-6 space-y-4">
          <div className="border-b border-stone pb-3">
            <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider">
              Submit Incident or Defect Report
            </h2>
            <p className="text-xs text-charcoal-muted">
              Immediate escalation to Regional Operations Manager
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-charcoal block mb-1">
                Issue Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border border-stone rounded-lg font-mono text-xs"
              >
                <option value="EQUIPMENT">EQUIPMENT (Damaged or Missing Assets)</option>
                <option value="INVENTORY">INVENTORY (Material Shortage / Spillage)</option>
                <option value="VEHICLE">VEHICLE (Bus Mechanical / Maintenance)</option>
                <option value="SAFETY">SAFETY (Hazard / First Aid / Incident)</option>
                <option value="TECHNICAL">TECHNICAL (GPS Telemetry / Tablet Issue)</option>
                <option value="SCHOOL_VISIT">SCHOOL VISIT (Access / Coordination Conflict)</option>
                <option value="OTHER">OTHER (General Operational Support)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-charcoal block mb-1">
                Detailed Description & Impact (Required)
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what occurred, any affected laboratory equipment, and immediate action taken..."
                className="w-full p-2 border border-stone rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-charcoal block mb-1">
                Specific Location / Route Landmark (Optional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Near ZP School, Highway 48 Bypass"
                className="w-full p-2 border border-stone rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-charcoal block mb-1">
                Evidence / Photo Link (Optional)
              </label>
              <input
                type="text"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://... or photo file name"
                className="w-full p-2 border border-stone rounded-lg font-mono text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full text-xs font-bold py-2.5 mt-2"
              style={{ backgroundColor: "#176B50" }}
            >
              {submitting ? "Submitting..." : "⚠️ Escalate to Regional HQ"}
            </button>
          </form>
        </div>

        {/* History of Reported Issues */}
        <div className="lg:col-span-2 surface border border-stone rounded-xl bg-white shadow-xs p-6 space-y-4">
          <div className="border-b border-stone pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider">
                My Reported Issues & Resolution Status
              </h2>
              <span className="text-xs text-charcoal-muted">
                Track status updates and resolution remarks from Regional Admin
              </span>
            </div>
            <span className="text-[11px] font-mono text-charcoal-subtle">
              {issues.length} total
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-charcoal-muted">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone border-t-[#176B50] mx-auto mb-2" />
              <span className="font-mono text-xs">Loading Issues History...</span>
            </div>
          ) : issues.length === 0 ? (
            <div className="p-8 text-center text-xs text-charcoal-muted">
              No issues currently logged by your account.
            </div>
          ) : (
            <div className="divide-y divide-stone">
              {issues.map((item) => {
                const isResolved = item.status === "RESOLVED" || item.status === "CLOSED";

                return (
                  <div key={item.id} className="py-4 space-y-2 first:pt-0 last:pb-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone/30 text-charcoal">
                          {item.category}
                        </span>
                        <span className="text-xs text-charcoal-subtle">•</span>
                        <span className="text-xs font-mono text-charcoal-muted">
                          {new Date(item.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                        isResolved ? "bg-emerald-100 text-emerald-800" :
                        item.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                        "bg-rose-100 text-rose-800"
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <p className="text-xs text-charcoal">{item.description}</p>

                    {item.location && (
                      <span className="text-[11px] text-charcoal-muted block">
                        📍 Location: {item.location}
                      </span>
                    )}

                    {item.resolution && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 mt-1">
                        <strong>Regional HQ Resolution:</strong> {item.resolution}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
