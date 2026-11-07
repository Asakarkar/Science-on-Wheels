import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/api-client";

interface SystemSettingsMap {
  organization: {
    ngoName: string;
    registrationNumber: string;
    logoUrl: string;
    contactEmail: string;
    contactPhone: string;
    headquartersAddress: string;
    taxExemptNumber: string;
    establishedYear: string;
  };
  inventory: {
    defaultMinStock: number;
    autoReorderTrigger: boolean;
    supportedUnits: string[];
    supportedCategories: string[];
    cycleCountFrequencyDays: number;
    enforceStockStrictDeduction: boolean;
  };
  notifications: {
    emailAlertsEnabled: boolean;
    lowStockThresholdAlerts: boolean;
    busMaintenanceDueNoticeDays: number;
    emergencyEventCancellationAlerts: boolean;
    alertRecipientEmails: string;
    smsBroadcastEnabled: boolean;
  };
  qrConfig: {
    qrPrefix: string;
    qrVersion: string;
    errorCorrectionLevel: string;
    autoGenerateOnAssetCreation: boolean;
    includeLocationInQrPayload: boolean;
  };
  regional: {
    maxBusesPerRegion: number;
    autoAssignFieldStaffOnCreation: boolean;
    allowCrossRegionSchoolVisits: boolean;
    requireAdminTransferConfirmation: boolean;
  };
  security: {
    minPasswordLength: number;
    requireSpecialChar: boolean;
    requireDigit: boolean;
    sessionTimeoutMinutes: number;
    maxFailedLoginAttempts: number;
    lockoutDurationMinutes: number;
    enforceMfaForAdmins: boolean;
    appendOnlyAuditLogsEnforced: boolean;
  };
  backup: {
    automatedDailyBackups: boolean;
    backupScheduleTime: string;
    retentionDays: number;
    storageTarget: string;
    lastBackupTimestamp: string;
  };
  preferences: {
    defaultTimezone: string;
    dateFormat: string;
    timeFormat: string;
    defaultCurrency: string;
    defaultLanguage: string;
    systemTheme: string;
  };
}

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<string>("organization");
  const [settings, setSettings] = useState<SystemSettingsMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [error, setError] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupResult, setBackupResult] = useState<any>(null);

  const sections = [
    { key: "organization", label: "Organization Profile", icon: "🏢", desc: "NGO name, registration, logo & headquarters details" },
    { key: "roles", label: "Role Permissions", icon: "🛡️", desc: "Configure role-based access matrix & privileges" },
    { key: "inventory", label: "Inventory Settings", icon: "📦", desc: "Units, categories, min stock & replenishment rules" },
    { key: "notifications", label: "Notification Settings", icon: "🔔", desc: "Email dispatches, alert recipients & threshold triggers" },
    { key: "qrConfig", label: "QR Configuration", icon: "📱", desc: "Asset QR prefixes, encoding formats & serialization" },
    { key: "regional", label: "Regional Settings", icon: "🗺️", desc: "Regional fleet caps, boundary constraints & assignments" },
    { key: "security", label: "Security Settings", icon: "🔒", desc: "Password rules, session timeouts & lockout controls" },
    { key: "backup", label: "Backup & Recovery", icon: "💾", desc: "Automated snapshot schedules & manual exports" },
    { key: "preferences", label: "System Preferences", icon: "⚙️", desc: "Timezone, date formatting, currency & language" }
  ];

  async function loadSettings() {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient<{ settings: SystemSettingsMap }>("/super-admin/settings");
      setSettings(res.settings);
    } catch (err: any) {
      setError(err?.message || "Failed to load system settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSaveSection(sectionKey: string, e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaveSuccess("");
    setError("");

    try {
      const sectionValues = (settings as any)[sectionKey];
      await apiClient("/super-admin/settings", {
        method: "POST",
        body: JSON.stringify({
          section: sectionKey,
          values: sectionValues
        })
      });
      setSaveSuccess(`Settings for "${sectionKey}" saved and synchronized successfully.`);
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (err: any) {
      setError(err?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTriggerBackup() {
    if (!confirm("Initiate immediate PostgreSQL database snapshot export?")) return;
    setBackupLoading(true);
    try {
      const res = await apiClient<{ message: string; snapshot: any }>("/super-admin/settings/backup", {
        method: "POST"
      });
      setBackupResult(res.snapshot);
      alert(res.message);
    } catch (err: any) {
      alert("Backup initiation failed: " + (err?.message || "Error"));
    } finally {
      setBackupLoading(false);
    }
  }

  function updateField(section: keyof SystemSettingsMap, field: string, value: any) {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      };
    });
  }

  return (
    <div className="portal-module" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Module Header */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "10px",
          padding: "1.25rem 1.5rem",
          border: "1px solid var(--stone, #e2e8f0)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "var(--charcoal-dark, #1E242B)" }}>
              System Settings & Configuration
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "3px 8px",
                borderRadius: "12px",
                background: "rgba(99, 102, 241, 0.12)",
                color: "#4f46e5"
              }}
            >
              System-Wide Admin Control
            </span>
          </div>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>
            Configure the overall behavior of the SciMove platform, NGO institutional credentials, and security policies.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            type="button"
            onClick={loadSettings}
            disabled={loading}
            style={{
              padding: "0.55rem 0.9rem",
              borderRadius: "6px",
              border: "1px solid var(--stone, #cbd5e1)",
              background: "#ffffff",
              color: "#334155",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            🔄 Reload Settings
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "6px", background: "#f0fdf4", border: "1px solid #86efac", color: "#16a34a", fontSize: "13px" }}>
          ✓ {saveSuccess}
        </div>
      )}

      {error && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "6px", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Main Settings Grid: Navigation Sidebar + Configuration Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "1.25rem", alignItems: "start" }}>
        {/* Settings Navigation Menu */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "8px",
            border: "1px solid var(--stone, #e2e8f0)",
            padding: "0.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem"
          }}
        >
          {sections.map((sec) => {
            const isActive = activeSection === sec.key;
            return (
              <button
                key={sec.key}
                type="button"
                onClick={() => setActiveSection(sec.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "6px",
                  border: "none",
                  background: isActive ? "rgba(99, 102, 241, 0.1)" : "transparent",
                  color: isActive ? "#4f46e5" : "#334155",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "13px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.1s ease"
                }}
              >
                <span style={{ fontSize: "15px" }}>{sec.icon}</span>
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Configuration Panel */}
        <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid var(--stone, #e2e8f0)", padding: "1.5rem" }}>
          {loading || !settings ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading settings configuration...</div>
          ) : (
            <>
              {/* SECTION 1: ORGANIZATION PROFILE */}
              {activeSection === "organization" && (
                <form onSubmit={(e) => handleSaveSection("organization", e)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem", marginBottom: "0.5rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>Organization Institutional Profile</h3>
                    <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b" }}>Maintain legal NGO identity, official credentials and central headquarters.</p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>NGO Name *</label>
                      <input
                        type="text"
                        required
                        value={settings.organization.ngoName}
                        onChange={(e) => updateField("organization", "ngoName", e.target.value)}
                        style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Registration Number *</label>
                      <input
                        type="text"
                        required
                        value={settings.organization.registrationNumber}
                        onChange={(e) => updateField("organization", "registrationNumber", e.target.value)}
                        style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontFamily: "monospace", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Official Contact Email *</label>
                      <input
                        type="email"
                        required
                        value={settings.organization.contactEmail}
                        onChange={(e) => updateField("organization", "contactEmail", e.target.value)}
                        style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Official Contact Phone *</label>
                      <input
                        type="text"
                        required
                        value={settings.organization.contactPhone}
                        onChange={(e) => updateField("organization", "contactPhone", e.target.value)}
                        style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Central Headquarters Address *</label>
                    <textarea
                      rows={2}
                      required
                      value={settings.organization.headquartersAddress}
                      onChange={(e) => updateField("organization", "headquartersAddress", e.target.value)}
                      style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Tax Exemption Code (80G / 12A)</label>
                      <input
                        type="text"
                        value={settings.organization.taxExemptNumber}
                        onChange={(e) => updateField("organization", "taxExemptNumber", e.target.value)}
                        style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontFamily: "monospace", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Established Year</label>
                      <input
                        type="text"
                        value={settings.organization.establishedYear}
                        onChange={(e) => updateField("organization", "establishedYear", e.target.value)}
                        style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                    <button type="submit" disabled={saving} style={{ padding: "0.55rem 1.4rem", borderRadius: "6px", border: "none", background: "var(--color-primary, #6366f1)", color: "#ffffff", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                      {saving ? "Saving..." : "Save Organization Profile"}
                    </button>
                  </div>
                </form>
              )}

              {/* SECTION 2: ROLE PERMISSIONS (LINK TO MATRIX) */}
              {activeSection === "roles" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>Role Permissions & Access Matrix</h3>
                    <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b" }}>Manage system permissions assigned to Super Admin, Regional Admin, and Field Staff.</p>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>System Role Matrix</div>
                    <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                      Granular capabilities (e.g. <code>dashboard.view</code>, <code>people.manage</code>, <code>resources.manage</code>, <code>analytics.export</code>) are mapped through the Role Permissions governance suite.
                    </p>
                    <div style={{ marginTop: "1rem" }}>
                      <Link
                        to="/admin/roles-permissions"
                        style={{
                          display: "inline-block",
                          padding: "0.55rem 1.1rem",
                          borderRadius: "6px",
                          background: "#4f46e5",
                          color: "#ffffff",
                          textDecoration: "none",
                          fontWeight: 600,
                          fontSize: "13px"
                        }}
                      >
                        🛡️ Open Role Permissions Governance Console →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: INVENTORY SETTINGS */}
              {activeSection === "inventory" && (
                <form onSubmit={(e) => handleSaveSection("inventory", e)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>Central Inventory & Stock Rules</h3>
                    <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b" }}>Configure default minimum stock thresholds, auto-reorder alerts and cycle count intervals.</p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Default Minimum Stock Threshold</label>
                      <input
                        type="number"
                        min={1}
                        value={settings.inventory.defaultMinStock}
                        onChange={(e) => updateField("inventory", "defaultMinStock", parseInt(e.target.value, 10) || 10)}
                        style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Physical Inventory Cycle Count (Days)</label>
                      <input
                        type="number"
                        min={7}
                        value={settings.inventory.cycleCountFrequencyDays}
                        onChange={(e) => updateField("inventory", "cycleCountFrequencyDays", parseInt(e.target.value, 10) || 30)}
                        style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "13px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={settings.inventory.autoReorderTrigger}
                        onChange={(e) => updateField("inventory", "autoReorderTrigger", e.target.checked)}
                      />
                      <span>Enable automated low-stock warnings when inventory drops below threshold</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "13px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={settings.inventory.enforceStockStrictDeduction}
                        onChange={(e) => updateField("inventory", "enforceStockStrictDeduction", e.target.checked)}
                      />
                      <span>Enforce strict stock deduction: prevent dispatches if available central inventory is negative</span>
                    </label>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                    <button type="submit" disabled={saving} style={{ padding: "0.55rem 1.4rem", borderRadius: "6px", border: "none", background: "var(--color-primary, #6366f1)", color: "#ffffff", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                      {saving ? "Saving..." : "Save Inventory Settings"}
                    </button>
                  </div>
                </form>
              )}

              {/* SECTION 4: NOTIFICATIONS */}
              {activeSection === "notifications" && (
                <form onSubmit={(e) => handleSaveSection("notifications", e)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>Alerts & Notification Dispatch</h3>
                    <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b" }}>Configure system email alerts, bus servicing notices and recipient distributions.</p>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>System Alert Recipient Emails (comma-separated)</label>
                    <input
                      type="text"
                      value={settings.notifications.alertRecipientEmails}
                      onChange={(e) => updateField("notifications", "alertRecipientEmails", e.target.value)}
                      style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Bus Maintenance Due Notice (Days in advance)</label>
                    <input
                      type="number"
                      min={1}
                      value={settings.notifications.busMaintenanceDueNoticeDays}
                      onChange={(e) => updateField("notifications", "busMaintenanceDueNoticeDays", parseInt(e.target.value, 10) || 14)}
                      style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "13px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={settings.notifications.emailAlertsEnabled}
                        onChange={(e) => updateField("notifications", "emailAlertsEnabled", e.target.checked)}
                      />
                      <span>Enable global email dispatch services</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "13px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={settings.notifications.lowStockThresholdAlerts}
                        onChange={(e) => updateField("notifications", "lowStockThresholdAlerts", e.target.checked)}
                      />
                      <span>Dispatch alerts when consumables fall below reorder thresholds</span>
                    </label>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                    <button type="submit" disabled={saving} style={{ padding: "0.55rem 1.4rem", borderRadius: "6px", border: "none", background: "var(--color-primary, #6366f1)", color: "#ffffff", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                      {saving ? "Saving..." : "Save Notification Settings"}
                    </button>
                  </div>
                </form>
              )}

              {/* SECTION 5: QR CONFIGURATION */}
              {activeSection === "qrConfig" && (
                <form onSubmit={(e) => handleSaveSection("qrConfig", e)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>Asset QR Identification & Serialization</h3>
                    <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b" }}>Manage asset tag code format and dynamic QR badge generation standards.</p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Asset Tag Code Prefix *</label>
                      <input
                        type="text"
                        required
                        value={settings.qrConfig.qrPrefix}
                        onChange={(e) => updateField("qrConfig", "qrPrefix", e.target.value)}
                        style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontFamily: "monospace", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Error Correction Level</label>
                      <select
                        value={settings.qrConfig.errorCorrectionLevel}
                        onChange={(e) => updateField("qrConfig", "errorCorrectionLevel", e.target.value)}
                        style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff" }}
                      >
                        <option value="L (Low 7%)">L (Low 7%)</option>
                        <option value="M (Medium 15%)">M (Medium 15%)</option>
                        <option value="Q (Quartile 25%)">Q (Quartile 25%)</option>
                        <option value="H (High 30%)">H (High 30% - Recommended for Industrial QR)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "13px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={settings.qrConfig.autoGenerateOnAssetCreation}
                        onChange={(e) => updateField("qrConfig", "autoGenerateOnAssetCreation", e.target.checked)}
                      />
                      <span>Automatically generate unique QR serial code on new equipment asset registration</span>
                    </label>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                    <button type="submit" disabled={saving} style={{ padding: "0.55rem 1.4rem", borderRadius: "6px", border: "none", background: "var(--color-primary, #6366f1)", color: "#ffffff", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                      {saving ? "Saving..." : "Save QR Settings"}
                    </button>
                  </div>
                </form>
              )}

              {/* SECTION 6: REGIONAL SETTINGS */}
              {activeSection === "regional" && (
                <form onSubmit={(e) => handleSaveSection("regional", e)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>Regional Geography & Scope Preferences</h3>
                    <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b" }}>Define fleet limits per zone and regional admin jurisdiction boundaries.</p>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Maximum Mobile Labs (Buses) per Region</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={settings.regional.maxBusesPerRegion}
                      onChange={(e) => updateField("regional", "maxBusesPerRegion", parseInt(e.target.value, 10) || 12)}
                      style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "13px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={settings.regional.requireAdminTransferConfirmation}
                        onChange={(e) => updateField("regional", "requireAdminTransferConfirmation", e.target.checked)}
                      />
                      <span>Require HQ Admin confirmation before transferring school regional mapping</span>
                    </label>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                    <button type="submit" disabled={saving} style={{ padding: "0.55rem 1.4rem", borderRadius: "6px", border: "none", background: "var(--color-primary, #6366f1)", color: "#ffffff", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                      {saving ? "Saving..." : "Save Regional Settings"}
                    </button>
                  </div>
                </form>
              )}

              {/* SECTION 7: SECURITY SETTINGS */}
              {activeSection === "security" && (
                <form onSubmit={(e) => handleSaveSection("security", e)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>Security Policies & Session Governance</h3>
                    <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b" }}>Manage password rules, session timeouts, brute force lockout, and immutable audit logs.</p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Session Idle Timeout (Minutes)</label>
                      <input
                        type="number"
                        min={15}
                        max={1440}
                        value={settings.security.sessionTimeoutMinutes}
                        onChange={(e) => updateField("security", "sessionTimeoutMinutes", parseInt(e.target.value, 10) || 120)}
                        style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Max Failed Attempts Before Lockout</label>
                      <input
                        type="number"
                        min={3}
                        max={10}
                        value={settings.security.maxFailedLoginAttempts}
                        onChange={(e) => updateField("security", "maxFailedLoginAttempts", parseInt(e.target.value, 10) || 5)}
                        style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "0.85rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>🔒 Append-Only Audit Log Policy</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                      Audit logs are permanently immutable and cannot be updated or deleted by normal users, including Administrators.
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                    <button type="submit" disabled={saving} style={{ padding: "0.55rem 1.4rem", borderRadius: "6px", border: "none", background: "var(--color-primary, #6366f1)", color: "#ffffff", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                      {saving ? "Saving..." : "Save Security Policies"}
                    </button>
                  </div>
                </form>
              )}

              {/* SECTION 8: BACKUP SETTINGS */}
              {activeSection === "backup" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>Database Backup & Snapshot Archives</h3>
                    <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b" }}>Manage automated snapshot procedures and on-demand recovery dumps.</p>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>On-Demand Database Snapshot</div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        Archive full database tables, schema and seed records into encrypted storage.
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={backupLoading}
                      onClick={handleTriggerBackup}
                      style={{
                        padding: "0.55rem 1.1rem",
                        borderRadius: "6px",
                        border: "none",
                        background: "#4f46e5",
                        color: "#ffffff",
                        fontWeight: 600,
                        fontSize: "13px",
                        cursor: "pointer"
                      }}
                    >
                      {backupLoading ? "Exporting..." : "💾 Trigger Snapshot"}
                    </button>
                  </div>

                  {backupResult && (
                    <div style={{ background: "#f0fdf4", padding: "1rem", borderRadius: "8px", border: "1px solid #86efac", fontSize: "13px" }}>
                      <div style={{ fontWeight: 700, color: "#16a34a" }}>✓ Backup Snapshot Generated Successfully</div>
                      <div style={{ marginTop: "4px" }}>Snapshot ID: <code>{backupResult.id}</code></div>
                      <div>Archive Size: <strong>{backupResult.sizeHuman}</strong></div>
                      <div>Checksum: <code>{backupResult.checksum}</code></div>
                      <div>Vault Target: {backupResult.target}</div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 9: SYSTEM PREFERENCES */}
              {activeSection === "preferences" && (
                <form onSubmit={(e) => handleSaveSection("preferences", e)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>General System Preferences</h3>
                    <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b" }}>Configure locale, timezone, date formatting and currency symbols.</p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Timezone</label>
                      <input
                        type="text"
                        value={settings.preferences.defaultTimezone}
                        onChange={(e) => updateField("preferences", "defaultTimezone", e.target.value)}
                        style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Date Format</label>
                      <select
                        value={settings.preferences.dateFormat}
                        onChange={(e) => updateField("preferences", "dateFormat", e.target.value)}
                        style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff" }}
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>System Currency</label>
                      <input
                        type="text"
                        value={settings.preferences.defaultCurrency}
                        onChange={(e) => updateField("preferences", "defaultCurrency", e.target.value)}
                        style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Language</label>
                      <input
                        type="text"
                        value={settings.preferences.defaultLanguage}
                        onChange={(e) => updateField("preferences", "defaultLanguage", e.target.value)}
                        style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                    <button type="submit" disabled={saving} style={{ padding: "0.55rem 1.4rem", borderRadius: "6px", border: "none", background: "var(--color-primary, #6366f1)", color: "#ffffff", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                      {saving ? "Saving..." : "Save Preferences"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

