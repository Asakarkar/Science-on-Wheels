import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Bus, School, CheckCircle2, AlertCircle } from "lucide-react";

export interface CalendarEvent {
  id: string;
  eventCode?: string;
  title?: string;
  schoolName?: string;
  eventDate: string | Date;
  startTime?: string;
  endTime?: string;
  busCode?: string;
  status?: string; // 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  location?: string;
  communicators?: string[];
}

interface OperationalCalendarProps {
  events: CalendarEvent[];
  title?: string;
  subtitle?: string;
  onSelectEvent?: (event: CalendarEvent) => void;
  initialDate?: Date;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function OperationalCalendar({
  events,
  title = "Visit Schedule Calendar",
  subtitle = "Interactive schedule of mobile science laboratory school visits",
  onSelectEvent,
  initialDate = new Date()
}: OperationalCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper to format Date to YYYY-MM-DD
  function toDateKey(d: Date | string): string {
    const obj = typeof d === "string" ? new Date(d) : d;
    if (isNaN(obj.getTime())) return "";
    const y = obj.getFullYear();
    const m = String(obj.getMonth() + 1).padStart(2, "0");
    const day = String(obj.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // Filter events by status if requested
  const filteredEvents = useMemo(() => {
    if (statusFilter === "ALL") return events;
    return events.filter((e) => (e.status || "").toUpperCase() === statusFilter);
  }, [events, statusFilter]);

  // Group events by date key
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((ev) => {
      const key = toDateKey(ev.eventDate);
      if (key) {
        const list = map.get(key) || [];
        list.push(ev);
        map.set(key, list);
      }
    });
    return map;
  }, [filteredEvents]);

  // Calendar calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonthDays = Array.from({ length: firstDayOfWeek }, (_, i) => daysInPrevMonth - firstDayOfWeek + i + 1);
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const remainingCells = (7 - ((firstDayOfWeek + daysInMonth) % 7)) % 7;
  const nextMonthDays = Array.from({ length: remainingCells }, (_, i) => i + 1);

  const selectedKey = toDateKey(selectedDate);
  const selectedEvents = eventsByDate.get(selectedKey) || [];

  const todayKey = toDateKey(new Date());

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function jumpToToday() {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  }

  return (
    <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid var(--stone, #e2e8f0)", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CalendarIcon size={18} style={{ color: "#6366f1" }} />
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{title}</h3>
          </div>
          {subtitle && <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>{subtitle}</p>}
        </div>

        {/* Month Navigation & Filter controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Status filter pills */}
          <div style={{ display: "inline-flex", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", padding: "2px" }}>
            {["ALL", "SCHEDULED", "COMPLETED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: "3px 8px",
                  borderRadius: "4px",
                  border: "none",
                  background: statusFilter === st ? "#ffffff" : "transparent",
                  color: statusFilter === st ? "#0f172a" : "#64748b",
                  fontWeight: statusFilter === st ? 700 : 500,
                  fontSize: "11px",
                  cursor: "pointer",
                  boxShadow: statusFilter === st ? "0 1px 2px rgba(0,0,0,0.06)" : "none"
                }}
              >
                {st === "ALL" ? "All Visits" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Month selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "2px" }}>
            <button
              type="button"
              onClick={prevMonth}
              title="Previous Month"
              style={{ padding: "4px", background: "none", border: "none", cursor: "pointer", color: "#334155", borderRadius: "4px", display: "flex" }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: "13px", fontWeight: 700, minWidth: "125px", textAlign: "center", color: "#0f172a" }}>
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              title="Next Month"
              style={{ padding: "4px", background: "none", border: "none", cursor: "pointer", color: "#334155", borderRadius: "4px", display: "flex" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={jumpToToday}
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              fontSize: "12px",
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer"
            }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Main layout: Grid on left, Selected Day agenda on right */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
        {/* Calendar Grid Container */}
        <div>
          {/* Day of week labels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center", marginBottom: "6px" }}>
            {DAY_NAMES.map((d) => (
              <div key={d} style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {/* Trailing days from prev month */}
            {prevMonthDays.map((d) => (
              <div
                key={`prev-${d}`}
                style={{
                  height: "46px",
                  borderRadius: "6px",
                  background: "#f8fafc",
                  color: "#cbd5e1",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.6
                }}
              >
                {d}
              </div>
            ))}

            {/* Days of current month */}
            {currentMonthDays.map((d) => {
              const dateObj = new Date(year, month, d);
              const key = toDateKey(dateObj);
              const dayEvents = eventsByDate.get(key) || [];
              const isSelected = selectedKey === key;
              const isToday = todayKey === key;
              const hasEvents = dayEvents.length > 0;

              return (
                <div
                  key={`day-${d}`}
                  onClick={() => setSelectedDate(dateObj)}
                  style={{
                    height: "46px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    border: isSelected
                      ? "2px solid #6366f1"
                      : isToday
                      ? "1px solid #3b82f6"
                      : "1px solid #f1f5f9",
                    background: isSelected
                      ? "rgba(99, 102, 241, 0.08)"
                      : isToday
                      ? "#eff6ff"
                      : hasEvents
                      ? "#ffffff"
                      : "#fcfcfd",
                    transition: "all 0.15s ease",
                    boxShadow: isSelected ? "0 1px 3px rgba(99, 102, 241, 0.15)" : "none"
                  }}
                >
                  <span
                    style={{
                      fontSize: "12.5px",
                      fontWeight: isSelected || isToday ? 700 : 500,
                      color: isSelected ? "#4338ca" : isToday ? "#1d4ed8" : "#1e293b"
                    }}
                  >
                    {d}
                  </span>

                  {/* Event indicators */}
                  {hasEvents && (
                    <div style={{ display: "flex", gap: "2px", marginTop: "2px", alignItems: "center" }}>
                      {dayEvents.slice(0, 3).map((ev, i) => {
                        const isDone = (ev.status || "").toUpperCase() === "COMPLETED";
                        const inProg = (ev.status || "").toUpperCase() === "IN_PROGRESS";
                        const dotColor = isDone ? "#10b981" : inProg ? "#f59e0b" : "#6366f1";
                        return (
                          <span
                            key={i}
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: dotColor
                            }}
                          />
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <span style={{ fontSize: "9px", color: "#6366f1", fontWeight: 700, lineHeight: 1 }}>
                          +
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Next month days */}
            {nextMonthDays.map((d) => (
              <div
                key={`next-${d}`}
                style={{
                  height: "46px",
                  borderRadius: "6px",
                  background: "#f8fafc",
                  color: "#cbd5e1",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.6
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Color legend */}
          <div style={{ display: "flex", gap: "1rem", marginTop: "10px", fontSize: "11px", color: "#64748b", alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1" }} />
              Scheduled
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
              In Progress
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
              Completed
            </span>
          </div>
        </div>

        {/* Selected Date Agenda / Detail Drawer */}
        <div style={{ background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "1rem", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
            <div>
              <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "#64748b" }}>
                Daily Agenda
              </span>
              <h4 style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
                {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </h4>
            </div>
            <span style={{ fontSize: "12px", fontWeight: 700, color: selectedEvents.length > 0 ? "#4f46e5" : "#64748b" }}>
              {selectedEvents.length} {selectedEvents.length === 1 ? "visit" : "visits"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", overflowY: "auto", maxHeight: "250px", flex: 1 }}>
            {selectedEvents.length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "#64748b", fontSize: "12.5px" }}>
                <p style={{ margin: 0 }}>No visits scheduled on this date.</p>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Select a date with a colored indicator to view scheduled science lab visits.</span>
              </div>
            ) : (
              selectedEvents.map((ev) => {
                const isCompleted = (ev.status || "").toUpperCase() === "COMPLETED";
                const isInProgress = (ev.status || "").toUpperCase() === "IN_PROGRESS";
                const badgeColor = isCompleted
                  ? { bg: "#f0fdf4", border: "#86efac", text: "#15803d" }
                  : isInProgress
                  ? { bg: "#fffbeb", border: "#fcd34d", text: "#b45309" }
                  : { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" };

                return (
                  <div
                    key={ev.id}
                    onClick={() => onSelectEvent?.(ev)}
                    style={{
                      background: "#ffffff",
                      borderRadius: "6px",
                      padding: "0.75rem",
                      border: "1px solid #e2e8f0",
                      cursor: onSelectEvent ? "pointer" : "default",
                      transition: "box-shadow 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                      <strong style={{ fontSize: "13px", color: "#0f172a", display: "flex", alignItems: "center", gap: "4px" }}>
                        <School size={14} style={{ color: "#6366f1", flexShrink: 0 }} />
                        {ev.schoolName || ev.title || "School Visit"}
                      </strong>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: badgeColor.bg,
                          border: `1px solid ${badgeColor.border}`,
                          color: badgeColor.text,
                          textTransform: "uppercase"
                        }}
                      >
                        {ev.status || "SCHEDULED"}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "4px", fontSize: "11.5px", color: "#64748b", flexWrap: "wrap" }}>
                      {(ev.startTime || ev.endTime) && (
                        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          <Clock size={12} /> {ev.startTime || "09:00"} - {ev.endTime || "14:00"}
                        </span>
                      )}
                      {ev.busCode && (
                        <span style={{ display: "flex", alignItems: "center", gap: "3px", color: "#4f46e5", fontWeight: 600 }}>
                          <Bus size={12} /> {ev.busCode}
                        </span>
                      )}
                      {ev.location && (
                        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          <MapPin size={12} /> {ev.location}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
