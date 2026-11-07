import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/api-client";

interface NotificationItem {
  id: string;
  type: "SCHEDULE" | "REPORT" | "ISSUE" | "INVENTORY";
  severity: "info" | "warning" | "error" | "success";
  title: string;
  detail: string;
  timestamp: string;
}

export function FieldNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNotifications() {
    try {
      setLoading(true);
      setError("");
      const res = await apiClient<{ notifications: NotificationItem[]; unreadCount: number }>("/field/notifications");
      setNotifications(res.notifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  const filtered = filter === "ALL"
    ? notifications
    : notifications.filter((n) => n.type === filter);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="surface p-5 border border-stone rounded-xl bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] font-bold tracking-wider text-[#176B50] uppercase">
            Operational Alerts & Updates
          </span>
          <h1 className="text-xl font-bold text-charcoal mt-0.5">Field Notifications</h1>
          <p className="text-xs text-charcoal-muted">
            Visit assignments, schedule revisions, report reviews, and vehicle equipment alerts
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1 border border-stone rounded-lg p-1 bg-stone/20 text-xs">
          {["ALL", "SCHEDULE", "REPORT", "INVENTORY", "ISSUE"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                filter === item ? "bg-white text-charcoal shadow-xs" : "text-charcoal-muted hover:text-charcoal"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* Notifications List */}
      <div className="surface border border-stone rounded-xl bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone flex items-center justify-between">
          <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider">
            Alert Feed ({filtered.length})
          </h2>
          <button
            onClick={() => void loadNotifications()}
            className="text-xs text-[#176B50] font-semibold hover:underline"
          >
            Refresh Feed
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-charcoal-muted">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone border-t-[#176B50] mx-auto mb-2" />
            <span className="font-mono text-xs">Loading Notifications...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-charcoal-muted">
            No notifications matching the selected filter ({filter}).
          </div>
        ) : (
          <div className="divide-y divide-stone">
            {filtered.map((item) => {
              const dateStr = new Date(item.timestamp).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              const severityColors = {
                info: "bg-blue-50 border-blue-200 text-blue-900",
                warning: "bg-amber-50 border-amber-200 text-amber-900",
                error: "bg-rose-50 border-rose-200 text-rose-900",
                success: "bg-emerald-50 border-emerald-200 text-emerald-900",
              };

              const typeBadge = {
                SCHEDULE: "📅 SCHEDULE",
                REPORT: "📝 REPORT",
                INVENTORY: "🚌 INVENTORY",
                ISSUE: "⚠️ ISSUE",
              };

              return (
                <div key={item.id} className="p-4 hover:bg-stone/10 transition-colors flex items-start space-x-3">
                  <span className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${
                    item.severity === "error" ? "bg-rose-500" :
                    item.severity === "warning" ? "bg-amber-500" :
                    item.severity === "success" ? "bg-emerald-500" : "bg-blue-500"
                  }`} />

                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-stone/20 text-charcoal">
                          {typeBadge[item.type] || item.type}
                        </span>
                        <h3 className="text-xs font-bold text-charcoal">{item.title}</h3>
                      </div>
                      <span className="font-mono text-[10px] text-charcoal-subtle">{dateStr}</span>
                    </div>

                    <p className="text-xs text-charcoal-muted">{item.detail}</p>

                    {item.type === "REPORT" && (
                      <Link to="/field/reports" className="text-[11px] font-semibold text-[#176B50] hover:underline inline-block mt-1">
                        Go to Visit Reports →
                      </Link>
                    )}
                    {item.type === "SCHEDULE" && (
                      <Link to="/field/schedule" className="text-[11px] font-semibold text-[#176B50] hover:underline inline-block mt-1">
                        View Schedule →
                      </Link>
                    )}
                    {item.type === "INVENTORY" && (
                      <Link to="/field/inventory" className="text-[11px] font-semibold text-[#176B50] hover:underline inline-block mt-1">
                        Open Bus Inventory Hub →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
