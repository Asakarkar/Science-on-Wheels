import { useEffect, useMemo, useState } from "react";
import { apiClient, API_BASE_URL } from "../../services/api-client";

interface AdvancedReportData {
  category: string;
  filters: { regionId?: string; schoolId?: string };
  metrics: {
    totalRegions: number;
    totalSchools: number;
    totalBuses: number;
    totalEvents: number;
    totalStudents: number;
    totalConsumableStock: number;
    totalEquipmentCount: number;
    totalEquipmentValuation: number;
    lowStockItems: number;
  };
  regionalComparison: Array<{
    id: string;
    name: string;
    schoolCount: number;
    busCount: number;
    districtCount: number;
    totalStudents: number;
    totalEvents: number;
    completedEvents: number;
    performanceScore: number;
  }>;
  consumablesBreakdown: Array<{
    id: string;
    name: string;
    category: string;
    currentStock: number;
    minimumStock: number;
    unit: string;
    status: string;
  }>;
  equipmentCondition: Record<string, number>;
  allocationsHistory: Array<{
    id: string;
    allocationNumber: string;
    status: string;
    itemType: string;
    itemName: string;
    quantity: number;
    regionName: string;
    timestamp: string;
  }>;
  schoolsReport: Array<{
    id: string;
    name: string;
    udiseCode: string;
    regionName: string;
    districtName: string;
    students: number;
    visitsHosted: number;
    hasScienceLab: boolean;
    priority: string;
  }>;
  busesReport: Array<{
    id: string;
    busCode: string;
    registrationNumber: string;
    regionName: string;
    status: string;
    equipmentCount: number;
    maintenanceCount: number;
    tripsCount: number;
  }>;
  eventsReport: Array<{
    id: string;
    eventCode: string;
    eventDate: string;
    schoolName: string;
    busCode: string;
    status: string;
    attendance: number;
    consumablesUsed: number;
  }>;
  generatedAt: string;
}

interface RegionOption {
  id: string;
  name: string;
}

export function ReportsPage() {
  const [activeCategory, setActiveCategory] = useState<string>("regional");
  const [selectedRegionId, setSelectedRegionId] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<string>("ALL_TIME");
  const [search, setSearch] = useState("");
  const [reportData, setReportData] = useState<AdvancedReportData | null>(null);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const categories = [
    { key: "regional", label: "Regional Reports", icon: "🗺️", description: "Region-wise operations & performance matrix" },
    { key: "buses", label: "Bus Reports", icon: "🚐", description: "Mobile lab fleet status, trips & maintenance" },
    { key: "schools", label: "School Reports", icon: "🏫", description: "School visits, student reach & lab facilities" },
    { key: "inventory", label: "Inventory Reports", icon: "📦", description: "Global stock balances & asset valuations" },
    { key: "consumables", label: "Consumable Reports", icon: "🧪", description: "Material consumption, burn rate & alerts" },
    { key: "equipment", label: "Equipment Reports", icon: "🔬", description: "Asset allocation, condition & service health" },
    { key: "allocations", label: "Allocation Reports", icon: "⇄", description: "Central-to-regional stock transfers & transit" },
    { key: "users", label: "User Reports", icon: "👥", description: "Staff activity, roles & assignment scopes" },
    { key: "activities", label: "Activity Reports", icon: "🔬", description: "Experiment sessions & student attendance" }
  ];

  async function loadReport() {
    setLoading(true);
    setError("");
    try {
      const regionParam = selectedRegionId !== "ALL" ? `&regionId=${selectedRegionId}` : "";
      const [res, regRes] = await Promise.all([
        apiClient<AdvancedReportData>(`/super-admin/reports/advanced?category=${activeCategory}${regionParam}`),
        apiClient<{ rows: RegionOption[] }>("/super-admin/resource/regions?limit=100")
      ]);
      setReportData(res);
      setRegions(regRes.rows || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load report analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [activeCategory, selectedRegionId]);

  function csvDownload(res: string) {
    const url = `${API_BASE_URL}/super-admin/reports/${res}.csv`;
    window.open(url, "_blank");
  }

  // Filtered rows for current category
  const filteredRegionalRows = useMemo(() => {
    if (!reportData?.regionalComparison) return [];
    return reportData.regionalComparison.filter((r) => {
      if (selectedRegionId !== "ALL" && r.id !== selectedRegionId) return false;
      if (search.trim()) return r.name.toLowerCase().includes(search.toLowerCase());
      return true;
    });
  }, [reportData?.regionalComparison, selectedRegionId, search]);

  const filteredSchoolRows = useMemo(() => {
    if (!reportData?.schoolsReport) return [];
    return reportData.schoolsReport.filter((s) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.udiseCode.toLowerCase().includes(q) || s.districtName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [reportData?.schoolsReport, search]);

  const filteredBusRows = useMemo(() => {
    if (!reportData?.busesReport) return [];
    return reportData.busesReport.filter((b) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return b.busCode.toLowerCase().includes(q) || b.registrationNumber.toLowerCase().includes(q) || b.regionName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [reportData?.busesReport, search]);

  const filteredConsumableRows = useMemo(() => {
    if (!reportData?.consumablesBreakdown) return [];
    return reportData.consumablesBreakdown.filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [reportData?.consumablesBreakdown, search]);

  const filteredAllocationRows = useMemo(() => {
    if (!reportData?.allocationsHistory) return [];
    return reportData.allocationsHistory.filter((a) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return a.allocationNumber.toLowerCase().includes(q) || a.regionName.toLowerCase().includes(q) || a.itemName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [reportData?.allocationsHistory, search]);

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
              Reports & Analytics
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
              Organization-Wide Intelligence
            </span>
          </div>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>
            Generate cross-regional reports, compare operational footprints, and monitor central inventory consumption patterns.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: "0.55rem 0.9rem",
              borderRadius: "6px",
              border: "1px solid var(--stone, #cbd5e1)",
              background: "#ffffff",
              color: "#334155",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            }}
          >
            <span>🖨️</span> Print / PDF
          </button>

          <button
            type="button"
            onClick={() => {
              const resMap: Record<string, string> = {
                regional: "regions",
                buses: "labs",
                schools: "schools",
                inventory: "consumables",
                consumables: "consumables",
                equipment: "equipment",
                allocations: "inventoryTransactions",
                users: "users",
                activities: "events"
              };
              csvDownload(resMap[activeCategory] || "regions");
            }}
            style={{
              padding: "0.55rem 1.1rem",
              borderRadius: "6px",
              border: "none",
              background: "var(--color-primary, #6366f1)",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 2px 4px rgba(99, 102, 241, 0.25)"
            }}
          >
            <span>📥</span> Export Category to CSV / Excel
          </button>
        </div>
      </div>

      {/* Global Executive KPI Summary */}
      {reportData && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "1rem"
          }}
        >
          <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #6366f1" }}>
            <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>Operational Regions</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1E242B", marginTop: "4px" }}>{reportData.metrics.totalRegions}</div>
            <div style={{ fontSize: "12px", color: "#6366f1", marginTop: "2px" }}>Active geographic zones</div>
          </div>

          <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #10b981" }}>
            <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>Registered Schools</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1E242B", marginTop: "4px" }}>{reportData.metrics.totalSchools}</div>
            <div style={{ fontSize: "12px", color: "#10b981", marginTop: "2px" }}>{(reportData.metrics.totalStudents || 0).toLocaleString()} students reached</div>
          </div>

          <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #3b82f6" }}>
            <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>Mobile Laboratories</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1E242B", marginTop: "4px" }}>{reportData.metrics.totalBuses} buses</div>
            <div style={{ fontSize: "12px", color: "#3b82f6", marginTop: "2px" }}>{reportData.metrics.totalEvents} visits conducted</div>
          </div>

          <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #f59e0b" }}>
            <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>Central Inventory Units</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1E242B", marginTop: "4px" }}>{(reportData.metrics.totalConsumableStock || 0).toLocaleString()}</div>
            <div style={{ fontSize: "12px", color: "#b45309", marginTop: "2px" }}>{reportData.metrics.lowStockItems} low-stock alerts</div>
          </div>

          <div style={{ background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #8b5cf6" }}>
            <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>Equipment Assets</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1E242B", marginTop: "4px" }}>{reportData.metrics.totalEquipmentCount}</div>
            <div style={{ fontSize: "12px", color: "#8b5cf6", marginTop: "2px" }}>₹{(reportData.metrics.totalEquipmentValuation || 0).toLocaleString()} asset valuation</div>
          </div>
        </div>
      )}

      {/* Category Navigation Pills */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          background: "#ffffff",
          padding: "0.75rem",
          borderRadius: "8px",
          border: "1px solid var(--stone, #e2e8f0)"
        }}
      >
        {categories.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 0.9rem",
                borderRadius: "6px",
                border: isActive ? "1px solid #4f46e5" : "1px solid #e2e8f0",
                background: isActive ? "rgba(99, 102, 241, 0.1)" : "#f8fafc",
                color: isActive ? "#4f46e5" : "#334155",
                fontWeight: isActive ? 700 : 500,
                fontSize: "12.5px",
                cursor: "pointer",
                transition: "all 0.1s ease"
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report Filter Toolbar */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "8px",
          padding: "1rem",
          border: "1px solid var(--stone, #e2e8f0)",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center"
        }}
      >
        <div style={{ flex: 1, minWidth: "260px" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Filter ${activeCategory} data by keyword, name, or code...`}
            style={{ width: "100%", padding: "0.55rem 0.85rem", borderRadius: "6px", border: "1px solid var(--stone, #cbd5e1)", fontSize: "13px", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ minWidth: "180px" }}>
          <select
            value={selectedRegionId}
            onChange={(e) => setSelectedRegionId(e.target.value)}
            style={{ width: "100%", padding: "0.55rem 0.85rem", borderRadius: "6px", border: "1px solid var(--stone, #cbd5e1)", fontSize: "13px", background: "#ffffff" }}
          >
            <option value="ALL">All Operational Regions</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: "160px" }}>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={{ width: "100%", padding: "0.55rem 0.85rem", borderRadius: "6px", border: "1px solid var(--stone, #cbd5e1)", fontSize: "13px", background: "#ffffff" }}
          >
            <option value="ALL_TIME">All-Time Cumulative</option>
            <option value="THIS_YEAR">Annual Report (2026)</option>
            <option value="THIS_QUARTER">Quarterly Report (Q4)</option>
            <option value="THIS_MONTH">Monthly Report (Current)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={loadReport}
          disabled={loading}
          style={{ padding: "0.55rem 0.85rem", borderRadius: "6px", border: "1px solid var(--stone, #cbd5e1)", background: "#ffffff", color: "#475569", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "6px", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* CATEGORY 1: REGIONAL REPORTS & PERFORMANCE MATRIX */}
      {activeCategory === "regional" && (
        <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid var(--stone, #e2e8f0)", overflow: "hidden" }}>
          <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--stone, #e2e8f0)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
              Regional Performance & Operational Footprint Matrix ({filteredRegionalRows.length})
            </span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Compare schools, bus fleet, student reach and performance ratings across regions
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Region Name</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Participating Schools</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Assigned Fleet</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Districts Covered</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Student Reach</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Visits Completed</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Performance Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegionalRows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0f172a" }}>
                      🗺️ {r.name}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#334155" }}>
                      {r.schoolCount} schools
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#4f46e5", fontWeight: 600 }}>
                      🚐 {r.busCount} buses
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>
                      {r.districtCount} districts
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0f172a" }}>
                      {(r.totalStudents || 0).toLocaleString()} students
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#10b981", fontWeight: 600 }}>
                      {r.completedEvents} / {r.totalEvents} visits
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: "60px", background: "#e2e8f0", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${r.performanceScore}%`, background: "#10b981", height: "100%" }} />
                        </div>
                        <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "12px" }}>
                          {r.performanceScore}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CATEGORY 2: BUS FLEET REPORTS */}
      {activeCategory === "buses" && (
        <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid var(--stone, #e2e8f0)", overflow: "hidden" }}>
          <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--stone, #e2e8f0)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>Mobile Laboratory Fleet Activity ({filteredBusRows.length})</span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Status, on-board equipment and service records</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Bus Code</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Registration #</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Operational Region</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Fleet Status</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Onboard Equipment</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Trips & Maintenance</th>
                </tr>
              </thead>
              <tbody>
                {filteredBusRows.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0f172a" }}>{b.busCode}</td>
                    <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace" }}>{b.registrationNumber}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#4f46e5" }}>{b.regionName}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px", background: b.status === "AVAILABLE" ? "#f0fdf4" : "#eff6ff", color: b.status === "AVAILABLE" ? "#16a34a" : "#2563eb" }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{b.equipmentCount} assets assigned</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>{b.tripsCount} trips &bull; {b.maintenanceCount} services</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CATEGORY 3: SCHOOL REPORTS */}
      {activeCategory === "schools" && (
        <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid var(--stone, #e2e8f0)", overflow: "hidden" }}>
          <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--stone, #e2e8f0)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>School Master Reach & Facilities ({filteredSchoolRows.length})</span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>UDISE registration, students enrolled, and science lab infrastructure</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>School & UDISE</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Region & District</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Student Population</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Lab Visits Hosted</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Science Lab</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Priority Category</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchoolRows.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{s.name}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>{s.udiseCode}</div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>{s.regionName} &bull; {s.districtName}</td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>{(s.students || 0).toLocaleString()}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#10b981", fontWeight: 600 }}>{s.visitsHosted} visits</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", background: s.hasScienceLab ? "#f0fdf4" : "#fef2f2", color: s.hasScienceLab ? "#16a34a" : "#dc2626" }}>
                        {s.hasScienceLab ? "✓ Has Lab" : "✗ Needs Mobile Lab"}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#334155" }}>{s.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CATEGORY 4 & 5: INVENTORY & CONSUMABLES REPORTS */}
      {(activeCategory === "inventory" || activeCategory === "consumables") && (
        <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid var(--stone, #e2e8f0)", overflow: "hidden" }}>
          <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--stone, #e2e8f0)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>Consumable Materials & Stock Balances ({filteredConsumableRows.length})</span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Stock levels, minimum thresholds and replenishment status</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Item Name</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Category</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Current Stock</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Min Threshold</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsumableRows.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#0f172a" }}>{c.name}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>{c.category}</td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0f172a" }}>{c.currentStock} {c.unit}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>{c.minimumStock} {c.unit}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "4px",
                          background: c.status === "OUT_OF_STOCK" ? "#fef2f2" : c.status === "LOW_STOCK" ? "#fffbeb" : "#f0fdf4",
                          color: c.status === "OUT_OF_STOCK" ? "#b91c1c" : c.status === "LOW_STOCK" ? "#b45309" : "#15803d"
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CATEGORY 6: EQUIPMENT REPORTS & CONDITION MATRIX */}
      {activeCategory === "equipment" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
            {Object.entries(reportData?.equipmentCondition || {}).map(([cond, count]) => (
              <div key={cond} style={{ background: "#ffffff", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>{cond.replace(/_/g, " ")}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{count}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid var(--stone, #e2e8f0)", padding: "1.25rem" }}>
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#0f172a" }}>Equipment Health & Asset Valuation Overview</h4>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
              Total equipment valuation: <strong>₹{(reportData?.metrics.totalEquipmentValuation || 0).toLocaleString()}</strong> across <strong>{reportData?.metrics.totalEquipmentCount}</strong> registered instruments and kits. Reusable assets are monitored for maintenance and wear.
            </p>
          </div>
        </div>
      )}

      {/* CATEGORY 7: ALLOCATION REPORTS */}
      {activeCategory === "allocations" && (
        <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid var(--stone, #e2e8f0)", overflow: "hidden" }}>
          <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--stone, #e2e8f0)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>Central-to-Regional Stock Allocations ({filteredAllocationRows.length})</span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Distribution history, transit status and consignment audit records</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Allocation Code</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Destination Region</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Material / Asset</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Quantity</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocationRows.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", fontWeight: 700 }}>{a.allocationNumber}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#4f46e5" }}>{a.regionName}</td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{a.itemName}</td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>{a.quantity}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px", background: a.status === "RECEIVED" ? "#f0fdf4" : "#eff6ff", color: a.status === "RECEIVED" ? "#16a34a" : "#2563eb" }}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b", fontSize: "12px" }}>{new Date(a.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CATEGORY 8 & 9: USERS & ACTIVITIES REPORTS */}
      {(activeCategory === "users" || activeCategory === "activities") && (
        <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid var(--stone, #e2e8f0)", padding: "1.5rem" }}>
          <h4 style={{ margin: "0 0 0.5rem 0", color: "#0f172a" }}>Field Sessions & Staff Operation Records</h4>
          <p style={{ margin: "0 0 1rem 0", fontSize: "13px", color: "#64748b" }}>
            Total experiments demonstrated across <strong>{reportData?.metrics.totalEvents}</strong> sessions with science communicators and students.
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={() => csvDownload(activeCategory === "users" ? "users" : "events")}
              style={{
                padding: "0.55rem 1.1rem",
                borderRadius: "6px",
                border: "none",
                background: "var(--color-primary, #6366f1)",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              📥 Download Full {activeCategory === "users" ? "Staff Directory" : "Event History"} Dataset (CSV)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
