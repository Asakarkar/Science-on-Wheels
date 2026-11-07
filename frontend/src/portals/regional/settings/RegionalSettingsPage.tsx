import React, { useState } from "react";

export function RegionalSettingsPage() {
  const [settings, setSettings] = useState({
    autoConflictCheck: true,
    emailAlertsOnDispatch: true,
    requirePhotoEvidence: false,
    maxStudentsPerSession: 80,
    notificationThresholdDays: 7,
  });
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <div className="font-mono text-xs uppercase tracking-wider text-[#3D6B52] font-bold">
          OPERATIONAL PREFERENCES
        </div>
        <h2 className="text-xl font-bold text-charcoal">Regional Settings & Policies</h2>
        <p className="text-xs text-charcoal-muted mt-0.5">
          Configure regional scheduling constraints, notification preferences, and reporting rules.
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded font-mono text-xs">
          ✓ Regional preferences saved successfully.
        </div>
      )}

      <form onSubmit={handleSave} className="surface p-6 rounded-lg border border-stone space-y-4 font-mono text-xs">
        <div className="space-y-3 pb-4 border-b border-stone">
          <span className="block font-bold text-charcoal uppercase">Scheduling Validation Policies</span>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoConflictCheck}
              onChange={(e) => setSettings({ ...settings, autoConflictCheck: e.target.checked })}
            />
            <span className="text-charcoal font-sans">
              Strictly prevent double-booking of mobile labs & field communicators on same date
            </span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.requirePhotoEvidence}
              onChange={(e) => setSettings({ ...settings, requirePhotoEvidence: e.target.checked })}
            />
            <span className="text-charcoal font-sans">
              Require field photos before communicators can submit visit reports for review
            </span>
          </label>
        </div>

        <div className="space-y-3 pb-4 border-b border-stone">
          <span className="block font-bold text-charcoal uppercase">Dispatch & Operational Alerts</span>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.emailAlertsOnDispatch}
              onChange={(e) => setSettings({ ...settings, emailAlertsOnDispatch: e.target.checked })}
            />
            <span className="text-charcoal font-sans">
              Notify Regional Admin immediately when central HQ dispatches inventory shipments
            </span>
          </label>

          <div className="pt-2">
            <label className="block text-charcoal-muted mb-1">
              Upcoming Visit Notification Horizon (Days in Advance)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={settings.notificationThresholdDays}
              onChange={(e) => setSettings({ ...settings, notificationThresholdDays: Number(e.target.value) })}
              className="input w-32 p-2 border border-stone rounded"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="btn primary px-4 py-2 text-xs font-bold font-mono">
            Save Operational Preferences
          </button>
        </div>
      </form>
    </div>
  );
}

