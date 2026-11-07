import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/api-client";

interface VisitSchedule {
  id: string;
  eventCode: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  status: string;
  expectedStudentCount: number;
  reportStatus?: string | null;
  reviewComments?: string | null;
  notes?: string;
  experiments?: string[];
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
    status: string;
  };
}

export function FieldSchedulePage() {
  const [filter, setFilter] = useState<"all" | "today" | "upcoming" | "past">("all");
  const [visits, setVisits] = useState<VisitSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSchedule() {
    try {
      setLoading(true);
      setError("");
      const res = await apiClient<{ rows: VisitSchedule[] }>(`/field/schedule?filter=${filter}`);
      setVisits(res.rows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load schedule");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSchedule();
  }, [filter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="surface p-5 border border-stone rounded-xl bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] font-bold tracking-wider text-[#176B50] uppercase">
            Field Operations Calendar
          </span>
          <h1 className="text-xl font-bold text-charcoal mt-0.5">My Assigned Schedule</h1>
          <p className="text-xs text-charcoal-muted">
            All mobile laboratory visits assigned to you by the Regional Operations Manager
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 border border-stone rounded-lg p-1 bg-stone/20 text-xs">
          {(["all", "today", "upcoming", "past"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors uppercase text-[11px] font-mono ${
                filter === tab
                  ? "bg-white text-charcoal font-bold shadow-xs"
                  : "text-charcoal-muted hover:text-charcoal"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* Schedule Items List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-charcoal-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone border-t-[#176B50] mb-3" />
          <span className="font-mono text-xs">Loading Assigned Visits...</span>
        </div>
      ) : visits.length === 0 ? (
        <div className="surface p-12 text-center border border-stone rounded-xl bg-white text-charcoal-muted">
          <div className="text-3xl mb-2">📅</div>
          <h3 className="text-sm font-bold text-charcoal">No visits found</h3>
          <p className="text-xs text-charcoal-subtle mt-1">
            No mobile laboratory visits match your selected filter ({filter}).
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visits.map((item) => {
            const dateStr = new Date(item.eventDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const isToday =
              new Date(item.eventDate).toDateString() === new Date().toDateString();

            return (
              <div
                key={item.id}
                className="surface border border-stone rounded-xl bg-white shadow-xs p-5 hover:border-[#176B50]/40 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#176B50] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {item.eventCode}
                      </span>
                      {isToday && (
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-100 text-amber-800 rounded-full animate-pulse">
                          TODAY
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                        item.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
                        item.status === "ON_SITE" ? "bg-blue-100 text-blue-800" :
                        "bg-stone/50 text-charcoal"
                      }`}>
                        {item.status}
                      </span>

                      {item.reportStatus && (
                        <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                          item.reportStatus === "REVIEWED" ? "bg-emerald-100 text-emerald-800" :
                          item.reportStatus === "NEEDS_CORRECTION" ? "bg-rose-100 text-rose-800" :
                          "bg-amber-100 text-amber-800"
                        }`}>
                          REPORT: {item.reportStatus}
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-bold text-charcoal">
                      {item.School?.name || "School"}
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-charcoal-muted">
                      <div>
                        <span className="text-charcoal-subtle block text-[10px] uppercase">Date & Timing</span>
                        <strong className="text-charcoal">
                          {dateStr} ({item.startTime} – {item.endTime})
                        </strong>
                      </div>
                      <div>
                        <span className="text-charcoal-subtle block text-[10px] uppercase">Assigned Bus</span>
                        <strong className="text-charcoal">
                          {item.Bus?.registrationNumber || "Unassigned Bus"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-charcoal-subtle block text-[10px] uppercase">Target Cohort</span>
                        <strong className="text-charcoal">
                          {item.expectedStudentCount} Registered Students
                        </strong>
                      </div>
                    </div>

                    {item.School?.address && (
                      <p className="text-xs text-charcoal-muted">
                        📍 <strong>Location:</strong> {item.School.address}
                        {item.School.contactPerson && ` • Contact: ${item.School.contactPerson} (${item.School.contactPhone || ""})`}
                      </p>
                    )}

                    {/* Planned STEM Experiments */}
                    {item.experiments && item.experiments.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] font-semibold text-charcoal block mb-1">
                          🔬 Planned Activities:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.experiments.map((exp, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-stone/20 text-charcoal text-[11px] rounded-md font-mono"
                            >
                              {exp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Regional Admin Notes */}
                    {item.notes && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 mt-2">
                        <strong>Regional Admin Instructions:</strong> {item.notes}
                      </div>
                    )}

                    {item.reviewComments && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 mt-2">
                        <strong>Review Remarks:</strong> {item.reviewComments}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col items-center gap-2 shrink-0 w-full md:w-auto">
                    <Link
                      to="/field/visits"
                      className="btn btn-sm btn-primary text-xs w-full text-center"
                      style={{ backgroundColor: "#176B50" }}
                    >
                      Conduct Visit →
                    </Link>
                    <Link
                      to="/field/reports"
                      className="btn btn-sm btn-secondary text-xs w-full text-center border border-stone"
                    >
                      Visit Reports
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
