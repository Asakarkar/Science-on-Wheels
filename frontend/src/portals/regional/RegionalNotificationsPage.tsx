import { useEffect, useState } from "react";
import { apiClient } from "../../services/api-client";
import { useNavigate } from "react-router-dom";

interface NotificationItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  detail: string;
  timestamp: string;
  read?: boolean;
}

export function RegionalNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function loadData() {
    setLoading(true);
    try {
      const res = await apiClient<{ notifications: NotificationItem[] }>("/regional-admin/notifications");
      setNotifications(res.notifications || []);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function handleAction(n: NotificationItem) {
    if (n.type === "TRANSFER") {
      navigate("/regional/inventory-allocation");
    } else if (n.type === "REPORT") {
      navigate("/regional/field-reports");
    } else if (n.type === "INVENTORY" || n.type === "EQUIPMENT") {
      navigate("/regional/inventory");
    } else if (n.type === "SCHEDULE") {
      navigate("/regional/schedules");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-[#3D6B52] font-bold">
            MONITORING & ALERTS CENTER (SECTION 11)
          </div>
          <h2 className="text-xl font-bold text-charcoal">Regional Operational Notifications</h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Real-time administrative alerts for inventory shipments, pending reports, maintenance schedules, and threshold breaches.
          </p>
        </div>
        <button
          className="btn ghost font-mono text-xs px-3 py-1.5 border border-stone"
          onClick={markAllRead}
        >
          Mark All as Read
        </button>
      </div>

      <div className="surface rounded-lg border border-stone p-5">
        {loading ? (
          <div className="py-12 text-center font-mono text-xs text-charcoal-muted">
            Checking regional alert queue…
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center font-mono text-xs text-charcoal-muted">
            All regional systems normal. No active notifications.
          </div>
        ) : (
          <div className="space-y-3 font-mono text-xs">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-lg border flex items-start justify-between space-x-4 ${
                  n.severity === "error"
                    ? "bg-red-50 border-red-200 text-red-950"
                    : n.severity === "warning"
                    ? "bg-amber-50 border-amber-200 text-amber-950"
                    : "bg-blue-50 border-blue-200 text-blue-950"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-xl shrink-0">
                    {n.severity === "error" ? "🚨" : n.severity === "warning" ? "⚠️" : "📦"}
                  </span>
                  <div>
                    <strong className="text-sm font-bold block">{n.title}</strong>
                    <p className="text-xs opacity-90 font-sans mt-0.5">{n.detail}</p>
                    <span className="text-[10px] text-charcoal-subtle block mt-2">
                      Alert Timestamp: {new Date(n.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  className="btn primary text-xs px-3 py-1 shrink-0 ml-4 font-bold"
                  onClick={() => handleAction(n)}
                >
                  Take Action →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

