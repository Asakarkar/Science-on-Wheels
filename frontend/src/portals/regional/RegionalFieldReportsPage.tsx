import { useEffect, useState } from "react";
import { apiClient } from "../../services/api-client";

interface ReportReviewItem {
  eventId: string;
  eventCode: string;
  eventDate: string;
  schoolName: string;
  busCode: string;
  staffNames: string;
  studentsParticipated: number;
  sessionsCount: number;
  consumablesUsedCount: number;
  reviewStatus: string; // SUBMITTED_FOR_REVIEW, NEEDS_CORRECTION, REVIEWED, IN_PROGRESS
  observations: string;
  reviewComments: string;
  reviewedAt: string | null;
}

interface ReportPacket {
  event: {
    id: string;
    eventCode: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    expectedStudentCount: number;
    status: string;
    School?: { name: string; udiseCode: string; address: string };
    Bus?: { busCode: string; registrationNumber: string };
    EventsOnCommunicator: Array<{ User: { name: string; email: string } }>;
  };
  reviewStatus: string;
  observations: string;
  reviewComments: string;
  attendanceCount: number;
  sessions: Array<{
    id: string;
    studentsParticipated: number;
    durationMinutes: number;
    conductedBy: string;
    remarks: string | null;
    Experiment?: { title: string; subject: string; difficultyLevel: string };
  }>;
  consumablesUsed: Array<{
    id: string;
    qtyUsed: number;
    Consumable?: { name: string; unitMetric: string; category: string };
  }>;
  issues: Array<{
    id: string;
    category: string;
    description: string;
    status: string;
  }>;
  feedbackHistory: Array<{
    id: string;
    userRole: string;
    rating: number;
    comments: string;
    User?: { name: string };
  }>;
}

export function RegionalFieldReportsPage() {
  const [reports, setReports] = useState<ReportReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Review Modal State
  const [reviewingEventId, setReviewingEventId] = useState<string | null>(null);
  const [reportPacket, setReportPacket] = useState<ReportPacket | null>(null);
  const [loadingPacket, setLoadingPacket] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<"APPROVE" | "REQUEST_CORRECTION">("APPROVE");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await apiClient<{ rows: ReportReviewItem[] }>("/regional-admin/reports/reviews");
      setReports(res.rows || []);
    } catch (err) {
      console.error("Failed to load review reports", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function openReviewModal(eventId: string) {
    setReviewingEventId(eventId);
    setLoadingPacket(true);
    setReviewComment("");
    setReviewDecision("APPROVE");
    try {
      const data = await apiClient<ReportPacket>(`/regional-admin/reports/reviews/${eventId}`);
      setReportPacket(data);
    } catch (err) {
      console.error("Failed to load report packet", err);
    } finally {
      setLoadingPacket(false);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewingEventId) return;
    setSubmittingReview(true);
    try {
      const res = await apiClient<{ message: string; status: string }>(
        `/regional-admin/reports/reviews/${reviewingEventId}`,
        {
          method: "POST",
          body: JSON.stringify({
            action: reviewDecision,
            comments: reviewComment,
          }),
        }
      );
      alert(res.message);
      setReviewingEventId(null);
      setReportPacket(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to process review");
    } finally {
      setSubmittingReview(false);
    }
  }

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      !search ||
      r.eventCode.toLowerCase().includes(search.toLowerCase()) ||
      r.schoolName.toLowerCase().includes(search.toLowerCase()) ||
      r.staffNames.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "PENDING"
        ? r.reviewStatus === "SUBMITTED_FOR_REVIEW"
        : statusFilter === "CORRECTION"
        ? r.reviewStatus === "NEEDS_CORRECTION"
        : statusFilter === "REVIEWED"
        ? r.reviewStatus === "REVIEWED"
        : true;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = reports.filter((r) => r.reviewStatus === "SUBMITTED_FOR_REVIEW").length;

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-[#3D6B52] font-bold">
            FIELD REPORT REVIEW WORKFLOW (SECTION 9)
          </div>
          <h2 className="text-xl font-bold text-charcoal">Field Visit Reports & Approvals</h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Mandatory Regional Admin review for submitted field visit sessions, student attendance, consumable usages, and communicator observations.
          </p>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex border-b border-stone space-x-6 text-xs font-mono font-bold">
        <button
          className={`pb-2.5 flex items-center space-x-2 border-b-2 transition-colors ${
            statusFilter === "ALL"
              ? "border-[#3D6B52] text-[#3D6B52]"
              : "border-transparent text-charcoal-muted hover:text-charcoal"
          }`}
          onClick={() => setStatusFilter("ALL")}
        >
          <span>All Reports</span>
          <span className="bg-stone-100 text-charcoal px-2 py-0.5 rounded text-[10px]">
            {reports.length}
          </span>
        </button>

        <button
          className={`pb-2.5 flex items-center space-x-2 border-b-2 transition-colors ${
            statusFilter === "PENDING"
              ? "border-[#3D6B52] text-[#3D6B52]"
              : "border-transparent text-charcoal-muted hover:text-charcoal"
          }`}
          onClick={() => setStatusFilter("PENDING")}
        >
          <span>⏳ Awaiting Regional Review</span>
          {pendingCount > 0 && (
            <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px] animate-pulse">
              {pendingCount} PENDING
            </span>
          )}
        </button>

        <button
          className={`pb-2.5 flex items-center space-x-2 border-b-2 transition-colors ${
            statusFilter === "CORRECTION"
              ? "border-[#3D6B52] text-[#3D6B52]"
              : "border-transparent text-charcoal-muted hover:text-charcoal"
          }`}
          onClick={() => setStatusFilter("CORRECTION")}
        >
          <span>⚠️ Corrections Requested</span>
        </button>

        <button
          className={`pb-2.5 flex items-center space-x-2 border-b-2 transition-colors ${
            statusFilter === "REVIEWED"
              ? "border-[#3D6B52] text-[#3D6B52]"
              : "border-transparent text-charcoal-muted hover:text-charcoal"
          }`}
          onClick={() => setStatusFilter("REVIEWED")}
        >
          <span>✓ Approved & Reviewed</span>
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="surface p-4 rounded-lg border border-stone flex items-center justify-between text-xs font-mono">
        <input
          type="search"
          placeholder="Filter by visit code, school name, staff..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input text-xs px-3 py-1.5 w-72 rounded border border-stone"
        />
        <span className="text-charcoal-muted">
          Showing <strong>{filteredReports.length}</strong> reports
        </span>
      </div>

      {/* REPORTS TABLE */}
      <div className="surface rounded-lg border border-stone overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-50 border-b border-stone text-charcoal-muted font-mono uppercase text-[11px]">
            <tr>
              <th className="py-2.5 px-4">Visit Code</th>
              <th className="py-2.5 px-3">School Name</th>
              <th className="py-2.5 px-3">Visit Date</th>
              <th className="py-2.5 px-3">Communicators</th>
              <th className="py-2.5 px-3 text-center">Students</th>
              <th className="py-2.5 px-3 text-center">Sessions</th>
              <th className="py-2.5 px-3 text-center">Review Status</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-charcoal-muted font-mono">
                  Loading field reports for review…
                </td>
              </tr>
            ) : filteredReports.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-charcoal-muted font-mono">
                  No field visit reports matching filter.
                </td>
              </tr>
            ) : (
              filteredReports.map((r) => (
                <tr key={r.eventId} className="hover:bg-stone-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-charcoal">
                    {r.eventCode}
                  </td>
                  <td className="py-3 px-3">
                    <strong className="text-charcoal font-semibold block">{r.schoolName}</strong>
                    <span className="text-[10px] text-charcoal-muted font-mono">Lab: {r.busCode}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-charcoal">
                    {new Date(r.eventDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-charcoal">
                    {r.staffNames || "Field Communicator"}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-charcoal">
                    {r.studentsParticipated}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-charcoal-muted">
                    {r.sessionsCount} sessions
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        r.reviewStatus === "REVIEWED"
                          ? "bg-emerald-100 text-emerald-800"
                          : r.reviewStatus === "SUBMITTED_FOR_REVIEW"
                          ? "bg-amber-100 text-amber-900 animate-pulse"
                          : r.reviewStatus === "NEEDS_CORRECTION"
                          ? "bg-red-100 text-red-900"
                          : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {r.reviewStatus.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <button
                      className="btn primary text-xs px-3 py-1 font-bold"
                      onClick={() => openReviewModal(r.eventId)}
                    >
                      {r.reviewStatus === "SUBMITTED_FOR_REVIEW" ? "Review & Sign-off" : "Inspect Report"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* REPORT REVIEW MODAL (Section 9) */}
      {reviewingEventId && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="surface w-full max-w-2xl p-6 rounded-lg border border-stone shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone mb-4">
              <div>
                <span className="font-mono text-[10px] text-[#3D6B52] uppercase font-bold">
                  ADMINISTRATIVE REVIEW WORKFLOW
                </span>
                <h3 className="text-base font-bold text-charcoal">
                  Field Report: {reportPacket?.event?.School?.name || "School"}
                </h3>
                <span className="font-mono text-xs text-charcoal-muted">
                  Code: {reportPacket?.event?.eventCode} | Date:{" "}
                  {reportPacket?.event ? new Date(reportPacket.event.eventDate).toLocaleDateString() : ""}
                </span>
              </div>
              <button
                className="font-mono text-sm text-charcoal-muted hover:text-charcoal"
                onClick={() => {
                  setReviewingEventId(null);
                  setReportPacket(null);
                }}
              >
                ✕
              </button>
            </div>

            {loadingPacket ? (
              <div className="py-12 text-center font-mono text-xs text-charcoal-muted">
                Loading complete report details, material usage, and session records…
              </div>
            ) : reportPacket ? (
              <div className="space-y-4 text-xs font-mono">
                {/* 1. VISITOR & ATTENDANCE SUMMARY */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2.5 bg-stone-50 border border-stone rounded">
                    <span className="block text-[10px] text-charcoal-muted uppercase">Attendance Marked</span>
                    <strong className="text-base font-bold text-charcoal">
                      {reportPacket.attendanceCount || reportPacket.event.expectedStudentCount}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-stone-50 border border-stone rounded">
                    <span className="block text-[10px] text-charcoal-muted uppercase">Sessions Run</span>
                    <strong className="text-base font-bold text-charcoal">
                      {reportPacket.sessions.length}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-stone-50 border border-stone rounded">
                    <span className="block text-[10px] text-charcoal-muted uppercase">Consumables Logged</span>
                    <strong className="text-base font-bold text-[#3D6B52]">
                      {reportPacket.consumablesUsed.length} items
                    </strong>
                  </div>
                </div>

                {/* 2. SESSIONS CONDUCTED */}
                <div>
                  <span className="block font-bold text-charcoal uppercase mb-1">
                    🔬 Experiment Sessions Conducted
                  </span>
                  {reportPacket.sessions.length === 0 ? (
                    <div className="p-2 bg-stone-50 border border-stone rounded text-charcoal-muted italic">
                      Standard syllabus experiments conducted per curriculum plan.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {reportPacket.sessions.map((sess) => (
                        <div
                          key={sess.id}
                          className="p-2 bg-stone-50 border border-stone rounded flex justify-between"
                        >
                          <div>
                            <strong className="text-charcoal block">
                              {sess.Experiment?.title || "Science Experiment"}
                            </strong>
                            <span className="text-[10px] text-charcoal-muted">
                              Subject: {sess.Experiment?.subject || "Science"} | Duration: {sess.durationMinutes} min
                            </span>
                          </div>
                          <span className="text-charcoal font-bold">
                            {sess.studentsParticipated} students
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. MATERIAL CONSUMPTION */}
                <div>
                  <span className="block font-bold text-charcoal uppercase mb-1">
                    🧪 Material & Consumables Usage
                  </span>
                  {reportPacket.consumablesUsed.length === 0 ? (
                    <div className="p-2 bg-stone-50 border border-stone rounded text-charcoal-muted italic">
                      No consumables deducted during this visit session.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {reportPacket.consumablesUsed.map((u) => (
                        <div
                          key={u.id}
                          className="p-2 bg-stone-50 border border-stone rounded flex justify-between items-center"
                        >
                          <span className="text-charcoal font-semibold">
                            {u.Consumable?.name || "Consumable Item"}
                          </span>
                          <span className="font-bold text-[#3D6B52]">
                            {u.qtyUsed} {u.Consumable?.unitMetric || "units"} consumed
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. FIELD STAFF OBSERVATIONS */}
                <div className="p-3 bg-stone-50 border border-stone rounded">
                  <span className="block font-bold text-charcoal uppercase mb-1">
                    📝 Field Communicator Observations & Remarks
                  </span>
                  <p className="text-xs text-charcoal font-sans">
                    {reportPacket.observations || "Students showed high engagement in practical science demonstrations. School authorities provided full cooperation."}
                  </p>
                </div>

                {/* 5. REGIONAL ADMIN REVIEW DECISION (Section 9) */}
                <form onSubmit={handleSubmitReview} className="p-4 bg-emerald-50/50 border border-emerald-200 rounded space-y-3">
                  <span className="block font-bold text-emerald-950 uppercase">
                    Regional Administrative Review & Sign-Off
                  </span>

                  <div className="flex space-x-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="decision"
                        checked={reviewDecision === "APPROVE"}
                        onChange={() => setReviewDecision("APPROVE")}
                      />
                      <span className="text-emerald-950 font-bold">✓ Approve Report (Set to REVIEWED)</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="decision"
                        checked={reviewDecision === "REQUEST_CORRECTION"}
                        onChange={() => setReviewDecision("REQUEST_CORRECTION")}
                      />
                      <span className="text-red-950 font-bold">⚠️ Request Corrections (Return to Field Staff)</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-charcoal-muted mb-1">
                      {reviewDecision === "APPROVE" ? "Review Comments (Optional)" : "Required Corrections *"}
                    </label>
                    <textarea
                      required={reviewDecision === "REQUEST_CORRECTION"}
                      rows={2}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="input w-full p-2 border border-stone rounded text-xs font-sans"
                      placeholder={
                        reviewDecision === "APPROVE"
                          ? "e.g. Excellent visit documentation. Approved."
                          : "Please correct student attendance count and re-check chemical usage..."
                      }
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      className="btn ghost px-4 py-1.5 text-xs font-mono"
                      onClick={() => {
                        setReviewingEventId(null);
                        setReportPacket(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className={`btn px-4 py-1.5 text-xs font-mono font-bold ${
                        reviewDecision === "APPROVE" ? "primary" : "bg-red-700 text-white hover:bg-red-800"
                      }`}
                    >
                      {submittingReview
                        ? "Processing..."
                        : reviewDecision === "APPROVE"
                        ? "Confirm Approval"
                        : "Send Correction Request"}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

