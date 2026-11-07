import React, { useEffect, useState } from "react";
import { apiClient } from "../../services/api-client";

interface VisitEvent {
  id: string;
  eventCode: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  expectedStudentCount: number;
  status: string;
  School?: { id: string; name: string; udiseCode: string; principalName?: string; contactPhone: string };
  Bus?: { id: string; busCode: string; registrationNumber: string };
  EventsOnCommunicator: Array<{ User: { id: string; name: string; email: string; phone?: string } }>;
  ExperimentSession: Array<{ id: string; Experiment?: { title: string; subject: string } }>;
  _count?: { EventAttendance: number; FeedbackRecord: number };
}

interface SchoolOption {
  id: string;
  name: string;
  totalStudents: number;
}

interface BusOption {
  id: string;
  busCode: string | null;
  registrationNumber: string;
  status: string;
}

interface StaffOption {
  id: string;
  name: string;
  email: string;
}

export function RegionalSchedulesPage() {
  const [events, setEvents] = useState<VisitEvent[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Schedule Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<VisitEvent | null>(null);

  // Form
  const [form, setForm] = useState({
    schoolId: "",
    busId: "",
    eventDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    startTime: "09:00",
    endTime: "15:00",
    expectedStudentCount: 60,
    staffUserIds: [] as string[],
    force: false,
  });

  // Conflict State
  const [conflictChecking, setConflictChecking] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [eventsRes, schoolsRes, busesRes, staffRes] = await Promise.all([
        apiClient<{ rows: VisitEvent[] }>("/regional-admin/schedules"),
        apiClient<{ rows: SchoolOption[] }>("/regional-admin/schools?limit=200"),
        apiClient<{ rows: BusOption[] }>("/regional-admin/buses"),
        apiClient<{ rows: StaffOption[] }>("/regional-admin/staff?limit=100"),
      ]);
      setEvents(eventsRes.rows || []);
      setSchools(schoolsRes.rows || []);
      setBuses(busesRes.rows || []);
      setStaff(staffRes.rows || []);

      if (schoolsRes.rows?.length && !form.schoolId) {
        setForm((prev) => ({ ...prev, schoolId: schoolsRes.rows[0].id }));
      }
      if (busesRes.rows?.length && !form.busId) {
        setForm((prev) => ({ ...prev, busId: busesRes.rows[0].id }));
      }
    } catch (err) {
      console.error("Failed to load schedules", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  // Pre-flight conflict check whenever date, bus, or staff changes
  useEffect(() => {
    if (!form.busId || !form.eventDate) return;
    let isCancelled = false;

    async function checkConflict() {
      setConflictChecking(true);
      setConflictWarning(null);
      try {
        const res = await apiClient<{
          hasConflict: boolean;
          busConflict?: string;
          staffConflicts?: Array<{ staffName: string; conflictingEvent: string }>;
        }>("/regional-admin/schedules/check-conflict", {
          method: "POST",
          body: JSON.stringify({
            eventDate: form.eventDate,
            busId: form.busId,
            staffUserIds: form.staffUserIds,
          }),
        });

        if (!isCancelled && res.hasConflict) {
          const warnings: string[] = [];
          if (res.busConflict) warnings.push(res.busConflict);
          if (res.staffConflicts?.length) {
            res.staffConflicts.forEach((sc) =>
              warnings.push(`Staff member '${sc.staffName}' already booked on ${sc.conflictingEvent}`)
            );
          }
          setConflictWarning(warnings.join(" | "));
        }
      } catch {
        // ignore
      } finally {
        if (!isCancelled) setConflictChecking(false);
      }
    }

    const timer = setTimeout(() => {
      void checkConflict();
    }, 400);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [form.eventDate, form.busId, form.staffUserIds]);

  function toggleStaffSelection(staffId: string) {
    setForm((prev) => {
      const exists = prev.staffUserIds.includes(staffId);
      return {
        ...prev,
        staffUserIds: exists
          ? prev.staffUserIds.filter((id) => id !== staffId)
          : [...prev.staffUserIds, staffId],
      };
    });
  }

  async function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      await apiClient("/regional-admin/schedules", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setShowScheduleModal(false);
      setConflictWarning(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to schedule visit");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      !search ||
      ev.eventCode.toLowerCase().includes(search.toLowerCase()) ||
      (ev.School?.name && ev.School.name.toLowerCase().includes(search.toLowerCase())) ||
      (ev.Bus?.busCode && ev.Bus.busCode.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = !statusFilter || ev.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-[#3D6B52] font-bold">
            FIELD OPERATIONS SCHEDULING
          </div>
          <h2 className="text-xl font-bold text-charcoal">School Visit Schedules & Dispatch</h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Coordinate mobile laboratory visits, assign multiple science communicators, and prevent vehicle and staff scheduling conflicts.
          </p>
        </div>
        <button
          className="btn primary font-mono text-xs px-4 py-2 shrink-0 flex items-center space-x-2"
          onClick={() => {
            setShowScheduleModal(true);
            setErrorMsg("");
            setConflictWarning(null);
          }}
        >
          <span>＋</span>
          <span>Schedule School Visit</span>
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="surface p-4 rounded-lg border border-stone flex flex-wrap gap-3 items-center justify-between text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <input
            type="search"
            placeholder="Search by event code, school name, bus..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input text-xs px-3 py-1.5 w-64 rounded border border-stone"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-xs px-3 py-1.5 rounded border border-stone"
          >
            <option value="">All Visit Statuses</option>
            <option value="SCHEDULED">SCHEDULED (Upcoming)</option>
            <option value="ON_SITE">ON_SITE (Conducting Experiments)</option>
            <option value="COMPLETED">COMPLETED (Report Ready)</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
        <div className="text-charcoal-muted font-mono">
          Showing <strong>{filteredEvents.length}</strong> of {events.length} visits
        </div>
      </div>

      {/* SCHEDULES TABLE */}
      <div className="surface rounded-lg border border-stone overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-50 border-b border-stone text-charcoal-muted font-mono uppercase text-[11px]">
            <tr>
              <th className="py-2.5 px-4">Visit Code</th>
              <th className="py-2.5 px-3">School Name</th>
              <th className="py-2.5 px-3">Date & Time</th>
              <th className="py-2.5 px-3">Assigned Lab</th>
              <th className="py-2.5 px-3">Field Communicators</th>
              <th className="py-2.5 px-3 text-center">Expected Students</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-charcoal-muted font-mono">
                  Loading school visit schedules…
                </td>
              </tr>
            ) : filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-charcoal-muted font-mono">
                  No visits scheduled yet.
                </td>
              </tr>
            ) : (
              filteredEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-charcoal">
                    {ev.eventCode}
                  </td>
                  <td className="py-3 px-3">
                    <strong className="text-charcoal font-semibold block">{ev.School?.name || "School"}</strong>
                    <span className="text-[10px] text-charcoal-muted font-mono">
                      UDISE: {ev.School?.udiseCode || "—"}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono">
                    <span className="text-charcoal font-semibold block">
                      {new Date(ev.eventDate).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-charcoal-muted">
                      {ev.startTime} - {ev.endTime}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-charcoal">
                    {ev.Bus ? (
                      <span className="text-[#3D6B52] font-semibold">
                        🚌 {ev.Bus.busCode || ev.Bus.registrationNumber}
                      </span>
                    ) : (
                      <span className="text-red-700">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-charcoal">
                    {ev.EventsOnCommunicator.length > 0 ? (
                      ev.EventsOnCommunicator.map((st) => st.User.name).join(", ")
                    ) : (
                      <span className="text-stone-400 italic">None assigned</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-charcoal">
                    {ev.expectedStudentCount}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        ev.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800"
                          : ev.status === "ON_SITE"
                          ? "bg-purple-100 text-purple-800 animate-pulse"
                          : ev.status === "SCHEDULED"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-stone-200 text-stone-700"
                      }`}
                    >
                      {ev.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <button
                      className="text-xs text-[#3D6B52] hover:underline font-semibold"
                      onClick={() => setSelectedEvent(ev)}
                    >
                      View Card →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* SCHEDULE SCHOOL VISIT MODAL (Section 8.1 & 8.2 with Conflict Validation) */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="surface w-full max-w-xl p-6 rounded-lg border border-stone shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone mb-4">
              <div>
                <span className="font-mono text-[10px] text-[#3D6B52] uppercase font-bold">
                  REGIONAL FIELD PLANNING
                </span>
                <h3 className="text-base font-bold text-charcoal">Schedule School STEM Visit</h3>
              </div>
              <button
                className="font-mono text-sm text-charcoal-muted hover:text-charcoal"
                onClick={() => setShowScheduleModal(false)}
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 mb-4 bg-red-50 text-red-800 border border-red-200 rounded text-xs font-mono">
                {errorMsg}
              </div>
            )}

            {/* CONFLICT VALIDATION ALERT BANNER (Section 8.2) */}
            {conflictChecking ? (
              <div className="p-2.5 mb-4 bg-stone-50 border border-stone rounded text-xs font-mono text-charcoal-muted animate-pulse">
                Checking bus & staff scheduling conflicts…
              </div>
            ) : conflictWarning ? (
              <div className="p-3 mb-4 bg-red-50 border border-red-300 rounded text-xs font-mono text-red-900">
                <strong className="block mb-1 font-bold">⚠️ Scheduling Conflict Detected:</strong>
                <span>{conflictWarning}</span>
                <div className="mt-2">
                  <label className="flex items-center space-x-2 text-[11px] font-sans text-red-950 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.force}
                      onChange={(e) => setForm({ ...form, force: e.target.checked })}
                    />
                    <span>Force schedule anyway (Override conflict warning)</span>
                  </label>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Target School *</label>
                  <select
                    required
                    value={form.schoolId}
                    onChange={(e) => {
                      const sc = schools.find((s) => s.id === e.target.value);
                      setForm({
                        ...form,
                        schoolId: e.target.value,
                        expectedStudentCount: sc ? sc.totalStudents || 60 : 60,
                      });
                    }}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  >
                    <option value="">Select School</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.totalStudents} students)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-charcoal font-semibold mb-1">Mobile Lab Bus *</label>
                  <select
                    required
                    value={form.busId}
                    onChange={(e) => setForm({ ...form, busId: e.target.value })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  >
                    <option value="">Select Laboratory Bus</option>
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.busCode || b.registrationNumber} ({b.registrationNumber}) - {b.status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Visit Date *</label>
                  <input
                    type="date"
                    required
                    value={form.eventDate}
                    onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="input w-full p-2 border border-stone rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-charcoal font-semibold mb-1">Expected Student Count</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.expectedStudentCount}
                  onChange={(e) => setForm({ ...form, expectedStudentCount: Number(e.target.value) })}
                  className="input w-full max-w-xs p-2 border border-stone rounded text-xs"
                />
              </div>

              {/* MULTIPLE FIELD STAFF ASSIGNMENT (Section 8.1 & 8.2) */}
              <div>
                <label className="block text-charcoal font-semibold mb-1">
                  Assign Field Communicators (Select One or More)
                </label>
                <div className="border border-stone rounded p-3 max-h-40 overflow-y-auto space-y-1.5 bg-stone-50">
                  {staff.map((st) => {
                    const isSelected = form.staffUserIds.includes(st.id);
                    return (
                      <label
                        key={st.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          isSelected ? "bg-emerald-50 border border-emerald-300" : "bg-white hover:bg-stone-100"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleStaffSelection(st.id)}
                          />
                          <span className="text-charcoal font-semibold">{st.name}</span>
                        </div>
                        <span className="text-[10px] text-charcoal-muted font-mono">{st.email}</span>
                      </label>
                    );
                  })}
                  {staff.length === 0 && (
                    <div className="text-charcoal-muted text-center py-2">
                      No field staff registered in region.
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-charcoal-subtle block mt-1">
                  Selected: {form.staffUserIds.length} staff member(s). Multiple staff may facilitate together.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone">
                <button
                  type="button"
                  className="btn ghost px-4 py-1.5 text-xs font-mono"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (Boolean(conflictWarning) && !form.force)}
                  className={`btn px-4 py-1.5 text-xs font-mono font-bold ${
                    conflictWarning && !form.force ? "bg-stone-300 cursor-not-allowed" : "primary"
                  }`}
                >
                  {submitting ? "Publishing..." : "Schedule Visit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVENT DETAIL CARD MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="surface w-full max-w-lg p-6 rounded-lg border border-stone shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone mb-4">
              <div>
                <span className="font-mono text-[10px] text-[#3D6B52] uppercase font-bold">
                  SCHOOL VISIT RECORD
                </span>
                <h3 className="text-base font-bold text-charcoal">{selectedEvent.eventCode}</h3>
              </div>
              <button
                className="font-mono text-sm text-charcoal-muted hover:text-charcoal"
                onClick={() => setSelectedEvent(null)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 bg-stone-50 border border-stone rounded">
                <strong className="text-sm font-bold text-charcoal block mb-1">
                  {selectedEvent.School?.name}
                </strong>
                <div className="text-charcoal-muted space-y-0.5">
                  <div>UDISE: {selectedEvent.School?.udiseCode}</div>
                  <div>Principal: {selectedEvent.School?.principalName || "Not set"}</div>
                  <div>Phone: {selectedEvent.School?.contactPhone}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-stone-50 border border-stone rounded">
                  <span className="text-[10px] text-charcoal-muted uppercase block">Mobile Lab</span>
                  <strong className="text-charcoal block font-bold">
                    {selectedEvent.Bus?.busCode || selectedEvent.Bus?.registrationNumber}
                  </strong>
                  <span className="text-[10px] text-charcoal-subtle">{selectedEvent.Bus?.registrationNumber}</span>
                </div>
                <div className="p-3 bg-stone-50 border border-stone rounded">
                  <span className="text-[10px] text-charcoal-muted uppercase block">Schedule</span>
                  <strong className="text-charcoal block font-bold">
                    {new Date(selectedEvent.eventDate).toLocaleDateString()}
                  </strong>
                  <span className="text-[10px] text-charcoal-subtle">
                    {selectedEvent.startTime} - {selectedEvent.endTime}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-stone-50 border border-stone rounded">
                <span className="text-[10px] text-charcoal-muted uppercase block mb-1">
                  Assigned Communicators ({selectedEvent.EventsOnCommunicator.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.EventsOnCommunicator.map((st) => (
                    <span
                      key={st.User.id}
                      className="bg-white border border-stone px-2 py-1 rounded text-charcoal font-semibold"
                    >
                      {st.User.name}
                    </span>
                  ))}
                  {selectedEvent.EventsOnCommunicator.length === 0 && (
                    <span className="text-charcoal-subtle italic">No communicators assigned</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-stone mt-4">
              <button
                className="btn ghost text-xs font-mono px-4 py-1.5"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
