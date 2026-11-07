import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/api-client";

interface VisitRecord {
  id: string;
  eventCode: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  status: string;
  expectedStudentCount: number;
  readinessPercentage?: number;
  School?: {
    id: string;
    name: string;
    address?: string;
    contactPerson?: string;
    contactPhone?: string;
    email?: string;
  };
  Bus?: {
    id: string;
    registrationNumber: string;
  };
  EventReadinessCheck?: {
    isSchoolConfirmed: boolean;
    isRouteConfirmed: boolean;
    isDriverAssigned: boolean;
    isEquipmentLoaded: boolean;
    isConsumablesVerified: boolean;
    isSafetyKitChecked: boolean;
  };
  ExperimentSession?: Array<{
    id: string;
    Experiment?: {
      id: string;
      title: string;
      subject: string;
    };
  }>;
}

export function FieldVisitsPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [selectedVisit, setSelectedVisit] = useState<VisitRecord | null>(null);

  // Completion modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [actualStudentCount, setActualStudentCount] = useState<number>(0);
  const [departureNotes, setDepartureNotes] = useState("");
  const [submittingStatus, setSubmittingStatus] = useState(false);

  async function loadVisits() {
    try {
      setLoading(true);
      setError("");
      const res = await apiClient<{ rows: VisitRecord[] }>("/field/visits");
      setVisits(res.rows || []);
      if (res.rows && res.rows.length > 0 && !selectedVisit) {
        setSelectedVisit(res.rows[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load visits");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadVisits();
  }, []);

  async function handleArrival(visit: VisitRecord) {
    try {
      setActionSuccess("");
      setSubmittingStatus(true);
      // Attempt GPS capture if available
      let lat: number | undefined;
      let lng: number | undefined;

      if ("geolocation" in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // fallback without gps
        }
      }

      await apiClient(`/field/visits/${visit.id}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: "ON_SITE",
          locationLat: lat,
          locationLng: lng,
        }),
      });

      setActionSuccess(`Arrival recorded for ${visit.School?.name}. Status is now ON-SITE.`);
      await loadVisits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record arrival");
    } finally {
      setSubmittingStatus(false);
    }
  }

  async function handleCompleteSubmit() {
    if (!selectedVisit) return;
    try {
      setSubmittingStatus(true);
      setError("");
      await apiClient(`/field/visits/${selectedVisit.id}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: "COMPLETED",
          actualStudentCount: actualStudentCount || selectedVisit.expectedStudentCount,
          notes: departureNotes,
        }),
      });

      setShowCompleteModal(false);
      setActionSuccess(`Visit for ${selectedVisit.School?.name} completed successfully.`);
      await loadVisits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record visit completion");
    } finally {
      setSubmittingStatus(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="surface p-5 border border-stone rounded-xl bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] font-bold tracking-wider text-[#176B50] uppercase">
            Mobile Science Lab Execution
          </span>
          <h1 className="text-xl font-bold text-charcoal mt-0.5">School Visit Management</h1>
          <p className="text-xs text-charcoal-muted">
            Record arrival, track session execution, verify attendance, and finalize school visits
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/field/inventory"
            className="btn btn-secondary text-xs border border-stone"
          >
            🚌 Bus Inventory Hub
          </Link>
          <Link
            to="/field/reports"
            className="btn btn-primary text-xs"
            style={{ backgroundColor: "#176B50" }}
          >
            📝 Submit Visit Report
          </Link>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <span>✓ {actionSuccess}</span>
          <button onClick={() => setActionSuccess("")} className="font-bold">×</button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} className="font-bold">×</button>
        </div>
      )}

      {/* Main Execution View: Grid of Visits + Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visits List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="surface border border-stone rounded-xl bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone flex items-center justify-between">
              <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                Assigned School Visits ({visits.length})
              </h2>
              <span className="text-[11px] font-mono text-charcoal-muted">
                Select a visit to execute actions
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-charcoal-muted">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone border-t-[#176B50] mx-auto mb-2" />
                <span className="font-mono text-xs">Loading Visits...</span>
              </div>
            ) : visits.length === 0 ? (
              <div className="p-8 text-center text-charcoal-muted text-xs">
                No school visits assigned to you currently.
              </div>
            ) : (
              <div className="divide-y divide-stone">
                {visits.map((v) => {
                  const isSelected = selectedVisit?.id === v.id;
                  const dateStr = new Date(v.eventDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVisit(v)}
                      className={`p-4 cursor-pointer transition-all ${
                        isSelected ? "bg-emerald-50/50 border-l-4 border-l-[#176B50]" : "hover:bg-stone/10"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[11px] font-bold text-[#176B50]">
                              {v.eventCode}
                            </span>
                            <span className="text-[11px] text-charcoal-subtle">•</span>
                            <span className="text-xs text-charcoal-muted font-medium">{dateStr}</span>
                            <span className="text-[11px] text-charcoal-subtle font-mono">
                              ({v.startTime} - {v.endTime})
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-charcoal mt-1">
                            {v.School?.name || "School"}
                          </h3>
                          <p className="text-xs text-charcoal-muted">
                            📍 {v.School?.address || "Address"} • Bus: {v.Bus?.registrationNumber}
                          </p>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                            v.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
                            v.status === "ON_SITE" ? "bg-blue-100 text-blue-800 animate-pulse" :
                            "bg-stone/50 text-charcoal"
                          }`}>
                            {v.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Execution Action Card for Selected Visit */}
        <div>
          {selectedVisit ? (
            <div className="surface border border-stone rounded-xl bg-white shadow-xs p-5 space-y-4 sticky top-4">
              <div className="border-b border-stone pb-3">
                <span className="font-mono text-[10px] font-bold text-[#176B50] uppercase">
                  Active Visit Console
                </span>
                <h3 className="text-base font-bold text-charcoal mt-0.5">
                  {selectedVisit.School?.name}
                </h3>
                <span className="text-xs text-charcoal-muted font-mono block">
                  Code: {selectedVisit.eventCode} • Bus: {selectedVisit.Bus?.registrationNumber}
                </span>
              </div>

              {/* Status & Immediate Action Buttons */}
              <div className="p-3 bg-stone/20 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-charcoal-muted">Current Visit State:</span>
                  <span className="font-mono font-bold text-[#176B50]">{selectedVisit.status}</span>
                </div>

                {selectedVisit.status === "SCHEDULED" && (
                  <button
                    disabled={submittingStatus}
                    onClick={() => handleArrival(selectedVisit)}
                    className="btn btn-primary w-full text-xs font-bold py-2.5"
                    style={{ backgroundColor: "#176B50" }}
                  >
                    📍 Record Arrival (Mark On-Site)
                  </button>
                )}

                {selectedVisit.status === "ON_SITE" && (
                  <button
                    onClick={() => {
                      setActualStudentCount(selectedVisit.expectedStudentCount);
                      setShowCompleteModal(true);
                    }}
                    className="btn bg-emerald-700 text-white hover:bg-emerald-800 w-full text-xs font-bold py-2.5"
                  >
                    🏁 Complete Visit & Record Attendance
                  </button>
                )}

                {selectedVisit.status === "COMPLETED" && (
                  <Link
                    to="/field/reports"
                    className="btn btn-secondary w-full text-xs font-bold py-2 text-center border border-stone text-[#176B50]"
                  >
                    📝 Submit / View Visit Report
                  </Link>
                )}
              </div>

              {/* Session Experiments Checklist */}
              {selectedVisit.ExperimentSession && selectedVisit.ExperimentSession.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-charcoal block uppercase tracking-wider">
                    STEM Activities Checklist
                  </span>
                  <div className="space-y-1.5">
                    {selectedVisit.ExperimentSession.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 border border-stone rounded-md text-xs flex items-center justify-between"
                      >
                        <div>
                          <strong className="text-charcoal">{item.Experiment?.title}</strong>
                          <span className="text-[10px] text-charcoal-muted block">
                            Subject: {item.Experiment?.subject}
                          </span>
                        </div>
                        <span className="text-emerald-700 text-xs">🔬</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Readiness Checks Summary */}
              {selectedVisit.EventReadinessCheck && (
                <div className="space-y-1.5 pt-2 border-t border-stone">
                  <span className="text-xs font-bold text-charcoal block uppercase tracking-wider">
                    Readiness Verification
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-charcoal-muted">
                    <div className="p-1.5 border border-stone rounded flex items-center justify-between">
                      <span>School Confirmed</span>
                      <span>{selectedVisit.EventReadinessCheck.isSchoolConfirmed ? "✓" : "—"}</span>
                    </div>
                    <div className="p-1.5 border border-stone rounded flex items-center justify-between">
                      <span>Equipment Loaded</span>
                      <span>{selectedVisit.EventReadinessCheck.isEquipmentLoaded ? "✓" : "—"}</span>
                    </div>
                    <div className="p-1.5 border border-stone rounded flex items-center justify-between">
                      <span>Stock Verified</span>
                      <span>{selectedVisit.EventReadinessCheck.isConsumablesVerified ? "✓" : "—"}</span>
                    </div>
                    <div className="p-1.5 border border-stone rounded flex items-center justify-between">
                      <span>Safety Kit Checked</span>
                      <span>{selectedVisit.EventReadinessCheck.isSafetyKitChecked ? "✓" : "—"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Jump Links */}
              <div className="pt-2 border-t border-stone flex gap-2">
                <Link
                  to="/field/inventory"
                  className="btn btn-sm btn-secondary w-full text-center text-xs border border-stone"
                >
                  Log Bus Materials
                </Link>
                <Link
                  to="/field/issues"
                  className="btn btn-sm btn-secondary w-full text-center text-xs border border-stone text-rose-700"
                >
                  Report Issue
                </Link>
              </div>
            </div>
          ) : (
            <div className="surface p-6 border border-stone rounded-xl text-center text-charcoal-muted text-xs">
              Select a visit from the list to view operational controls.
            </div>
          )}
        </div>
      </div>

      {/* Visit Completion Modal */}
      {showCompleteModal && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-xs p-4">
          <div className="surface bg-white border border-stone rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div>
              <span className="font-mono text-[10px] font-bold text-emerald-800 uppercase">
                Visit Wrap-Up & Departure
              </span>
              <h2 className="text-lg font-bold text-charcoal mt-0.5">
                Complete Visit at {selectedVisit.School?.name}
              </h2>
              <p className="text-xs text-charcoal-muted">
                Record the final student attendance headcount and session remarks
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-charcoal block mb-1">
                  Actual Student Headcount
                </label>
                <input
                  type="number"
                  min="0"
                  value={actualStudentCount}
                  onChange={(e) => setActualStudentCount(Number(e.target.value))}
                  className="w-full p-2 border border-stone rounded-lg text-xs font-mono"
                  placeholder="e.g. 45"
                />
                <span className="text-[10px] text-charcoal-subtle">
                  Expected cohort: {selectedVisit.expectedStudentCount} students
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-charcoal block mb-1">
                  Departure Remarks / Observations (Optional)
                </label>
                <textarea
                  rows={3}
                  value={departureNotes}
                  onChange={(e) => setDepartureNotes(e.target.value)}
                  className="w-full p-2 border border-stone rounded-lg text-xs"
                  placeholder="Notes on session conclusion, teacher response, or next visit arrangements..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone">
              <button
                disabled={submittingStatus}
                onClick={() => setShowCompleteModal(false)}
                className="btn btn-secondary text-xs border border-stone"
              >
                Cancel
              </button>
              <button
                disabled={submittingStatus}
                onClick={handleCompleteSubmit}
                className="btn btn-primary text-xs"
                style={{ backgroundColor: "#176B50" }}
              >
                {submittingStatus ? "Finalizing..." : "Confirm & Complete Visit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
