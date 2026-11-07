import { useEffect, useState } from "react";
import { apiClient } from "../../services/api-client";

interface VisitReportSummary {
  eventId: string;
  eventCode: string;
  schoolName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  status: string;
  reviewStatus: "NOT_STARTED" | "DRAFT" | "SUBMITTED_FOR_REVIEW" | "REVIEWED" | "NEEDS_CORRECTION";
  reviewComments?: string;
  submittedAt?: string | null;
  studentsParticipated: number;
  curriculumCovered?: string;
  challenges?: string;
  observations: string;
  activitiesConducted?: string[];
  materialsUsedCount: number;
}

export function FieldReportsPage() {
  const [reports, setReports] = useState<VisitReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Report editor modal
  const [selectedReport, setSelectedReport] = useState<VisitReportSummary | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [studentsCount, setStudentsCount] = useState<number>(0);
  const [curriculum, setCurriculum] = useState("");
  const [activitiesInput, setActivitiesInput] = useState("");
  const [observations, setObservations] = useState("");
  const [challenges, setChallenges] = useState("");
  const [teacherFeedback, setTeacherFeedback] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  async function loadReports() {
    try {
      setLoading(true);
      setError("");
      const res = await apiClient<{ rows: VisitReportSummary[] }>("/field/reports");
      setReports(res.rows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load visit reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
  }, []);

  function openEditor(item: VisitReportSummary) {
    setSelectedReport(item);
    setStudentsCount(item.studentsParticipated || 40);
    setCurriculum(item.curriculumCovered || "");
    setActivitiesInput((item.activitiesConducted || []).join(", "));
    setObservations(item.observations || "");
    setChallenges(item.challenges || "");
    setTeacherFeedback("");
    setEvidenceUrl("");
    setShowEditor(true);
  }

  async function handleSubmit(status: "DRAFT" | "SUBMITTED_FOR_REVIEW") {
    if (!selectedReport) return;
    if (!observations.trim()) {
      setError("Please provide observations and session highlights.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccessMsg("");

      const acts = activitiesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await apiClient<any>("/field/reports", {
        method: "POST",
        body: JSON.stringify({
          eventId: selectedReport.eventId,
          studentsParticipated: Number(studentsCount),
          activitiesConducted: acts,
          curriculumCovered: curriculum,
          observations,
          challenges,
          teacherFeedback,
          evidenceUrl,
          status,
        }),
      });

      setSuccessMsg(res.message || "Report submitted successfully.");
      setShowEditor(false);
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="surface p-5 border border-stone rounded-xl bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] font-bold tracking-wider text-[#176B50] uppercase">
            Operational Reporting & Accountability
          </span>
          <h1 className="text-xl font-bold text-charcoal mt-0.5">Visit Reports Portal</h1>
          <p className="text-xs text-charcoal-muted">
            Document student participation, curriculum delivery, challenges, and submit for Regional Admin sign-off
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

      {/* Reports List */}
      <div className="surface border border-stone rounded-xl bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone flex items-center justify-between">
          <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider">
            Assigned Visit Reports ({reports.length})
          </h2>
          <span className="text-[11px] font-mono text-charcoal-muted">
            Approved reports become immutable permanent records
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-charcoal-muted">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone border-t-[#176B50] mx-auto mb-2" />
            <span className="font-mono text-xs">Loading Visit Reports...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-xs text-charcoal-muted">
            No visits or reports found in your assigned schedule.
          </div>
        ) : (
          <div className="divide-y divide-stone">
            {reports.map((item) => {
              const isApproved = item.reviewStatus === "REVIEWED";
              const needsCorrection = item.reviewStatus === "NEEDS_CORRECTION";
              const isPending = item.reviewStatus === "SUBMITTED_FOR_REVIEW";
              const dateStr = new Date(item.eventDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div key={item.eventId} className="p-5 hover:bg-stone/10 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-[#176B50]">
                          {item.eventCode}
                        </span>
                        <span className="text-charcoal-subtle">•</span>
                        <span className="text-xs text-charcoal-muted">{dateStr}</span>
                        <span className="text-[11px] font-mono text-charcoal-subtle">
                          ({item.startTime} - {item.endTime})
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-charcoal mt-1">
                        {item.schoolName}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                        isApproved ? "bg-emerald-100 text-emerald-800" :
                        needsCorrection ? "bg-rose-100 text-rose-800 animate-pulse" :
                        isPending ? "bg-amber-100 text-amber-800" :
                        "bg-stone/50 text-charcoal"
                      }`}>
                        {item.reviewStatus === "NOT_STARTED" ? "REPORT PENDING" : item.reviewStatus}
                      </span>

                      {!isApproved && (
                        <button
                          onClick={() => openEditor(item)}
                          className={`btn btn-sm text-xs font-bold ${
                            needsCorrection
                              ? "btn-primary bg-rose-700 hover:bg-rose-800"
                              : "btn-primary"
                          }`}
                          style={needsCorrection ? {} : { backgroundColor: "#176B50" }}
                        >
                          {needsCorrection ? "Resubmit Corrections →" :
                           item.reviewStatus === "DRAFT" ? "Edit Draft →" :
                           item.reviewStatus === "SUBMITTED_FOR_REVIEW" ? "Update Report" : "Submit Report →"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-charcoal-muted bg-stone/20 p-3 rounded-lg">
                    <div>
                      <span className="text-[10px] uppercase text-charcoal-subtle block">Students Headcount</span>
                      <strong className="text-charcoal">{item.studentsParticipated} Participated</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-charcoal-subtle block">Curriculum</span>
                      <strong className="text-charcoal">{item.curriculumCovered || "General Science"}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-charcoal-subtle block">Materials Used</span>
                      <strong className="text-charcoal">{item.materialsUsedCount} Recorded</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-charcoal-subtle block">Submitted At</span>
                      <strong className="text-charcoal">
                        {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : "—"}
                      </strong>
                    </div>
                  </div>

                  {item.observations && (
                    <p className="text-xs text-charcoal-muted">
                      <strong>Observations:</strong> {item.observations}
                    </p>
                  )}

                  {/* Regional Admin Feedback banner */}
                  {item.reviewComments && (
                    <div className={`p-3 rounded-lg text-xs ${
                      needsCorrection ? "bg-rose-50 border border-rose-200 text-rose-900" :
                      "bg-emerald-50 border border-emerald-200 text-emerald-900"
                    }`}>
                      <strong>Regional Administrator Notes:</strong> {item.reviewComments}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {showEditor && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="surface bg-white border border-stone rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4 my-8">
            <div className="border-b border-stone pb-3">
              <span className="font-mono text-[10px] font-bold text-[#176B50] uppercase">
                Visit Report Submission
              </span>
              <h2 className="text-lg font-bold text-charcoal mt-0.5">
                {selectedReport.schoolName}
              </h2>
              <p className="text-xs text-charcoal-muted font-mono">
                Code: {selectedReport.eventCode} • Visit Date: {new Date(selectedReport.eventDate).toLocaleDateString()}
              </p>
            </div>

            {selectedReport.reviewComments && selectedReport.reviewStatus === "NEEDS_CORRECTION" && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-lg">
                <strong>Regional Admin Correction Notice:</strong> {selectedReport.reviewComments}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-charcoal block mb-1">
                    Student Attendees Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={studentsCount}
                    onChange={(e) => setStudentsCount(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2 border border-stone rounded-lg font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-charcoal block mb-1">
                    Curriculum / Grade Level
                  </label>
                  <input
                    type="text"
                    value={curriculum}
                    onChange={(e) => setCurriculum(e.target.value)}
                    placeholder="e.g. Grade 7 Physics & Chemistry"
                    className="w-full p-2 border border-stone rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-charcoal block mb-1">
                  Experiments / Activities Conducted (comma-separated)
                </label>
                <input
                  type="text"
                  value={activitiesInput}
                  onChange={(e) => setActivitiesInput(e.target.value)}
                  placeholder="e.g. Microscopy of Plant Cells, Density Column, Electric Circuit"
                  className="w-full p-2 border border-stone rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-charcoal block mb-1">
                  Key Session Observations & Student Response (Required)
                </label>
                <textarea
                  rows={3}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Summarize student engagement, comprehension, and practical experiments performed..."
                  className="w-full p-2 border border-stone rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-charcoal block mb-1">
                  Challenges / Operational Bottlenecks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={challenges}
                  onChange={(e) => setChallenges(e.target.value)}
                  placeholder="e.g. Classroom power socket issue, limited table space..."
                  className="w-full p-2 border border-stone rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-charcoal block mb-1">
                  School / Headmaster Feedback (Optional)
                </label>
                <textarea
                  rows={2}
                  value={teacherFeedback}
                  onChange={(e) => setTeacherFeedback(e.target.value)}
                  placeholder="Remarks received from school coordinator or headmaster..."
                  className="w-full p-2 border border-stone rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone">
              <button
                disabled={submitting}
                onClick={() => setShowEditor(false)}
                className="btn btn-secondary text-xs border border-stone"
              >
                Cancel
              </button>

              <div className="flex items-center space-x-2">
                <button
                  disabled={submitting}
                  onClick={() => handleSubmit("DRAFT")}
                  className="btn btn-secondary text-xs border border-stone"
                >
                  Save Draft
                </button>
                <button
                  disabled={submitting}
                  onClick={() => handleSubmit("SUBMITTED_FOR_REVIEW")}
                  className="btn btn-primary text-xs font-bold"
                  style={{ backgroundColor: "#176B50" }}
                >
                  {submitting ? "Submitting..." : "Submit for Sign-Off →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
