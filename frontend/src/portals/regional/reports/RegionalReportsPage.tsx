import { useEffect, useState } from "react";
import { apiClient, API_BASE_URL } from "../../../services/api-client";

interface ReportData {
  schools: any[];
  buses: any[];
  staff: any[];
  consumables: any[];
  equipment: any[];
  allocations: any[];
  visits: any[];
  regionId: string;
}

export function RegionalReportsPage() {
  const [activeReport, setActiveReport] = useState<
    | "SCHOOLS"
    | "BUSES"
    | "STAFF"
    | "INVENTORY"
    | "CONSUMABLES"
    | "EQUIPMENT"
    | "ALLOCATIONS"
    | "VISITS"
    | "PERFORMANCE"
  >("SCHOOLS");

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const res = await apiClient<ReportData>("/regional-admin/reports/data");
      setData(res);
    } catch (err) {
      console.error("Failed to load regional reports data", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function downloadCsv(type: string) {
    window.open(`${API_BASE_URL}/regional-admin/reports/${type}.csv`, "_blank");
  }

  const reportsList = [
    { key: "SCHOOLS", label: "1. School Report", icon: "🏫", desc: "Registered regional schools, student capacity & facilities" },
    { key: "BUSES", label: "2. Bus Fleet Report", icon: "🚌", desc: "Operational status, seating capacity & servicing history" },
    { key: "STAFF", label: "3. Staff Report", icon: "👥", desc: "Field communicators, bus assignments & operational status" },
    { key: "INVENTORY", label: "4. Inventory Summary", icon: "📦", desc: "Available, allocated & in-transit material balances" },
    { key: "CONSUMABLES", label: "5. Consumables Usage", icon: "🧪", desc: "Quantities, usage rates, minimum thresholds & expiries" },
    { key: "EQUIPMENT", label: "6. Equipment Assets", icon: "🔬", desc: "Asset condition, QR tags, valuation & location" },
    { key: "ALLOCATIONS", label: "7. Allocation Ledger", icon: "⇄", desc: "Transfers from HQ & school allocations with bus custody" },
    { key: "VISITS", label: "8. Visit Operations", icon: "📅", desc: "Scheduled vs completed school visits & student impact" },
    { key: "PERFORMANCE", label: "9. Regional Performance", icon: "📊", desc: "Comprehensive operational matrix & key regional metrics" },
  ];

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-[#3D6B52] font-bold">
            REGIONAL ANALYTICS & AUDIT EXPORTS (SECTION 10)
          </div>
          <h2 className="text-xl font-bold text-charcoal">Regional Operational Reports</h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Comprehensive audit reporting across 9 regional domains strictly scoped to your assigned jurisdiction.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            className="btn ghost font-mono text-xs px-3 py-1.5 border border-stone"
            onClick={() => window.print()}
          >
            🖨️ Print / PDF
          </button>
          <button
            className="btn primary font-mono text-xs px-3 py-1.5"
            onClick={() => downloadCsv(activeReport.toLowerCase())}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* 9 REPORTS NAVIGATION PILLS (Section 10) */}
      <div className="surface p-3 rounded-lg border border-stone">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2 text-xs font-mono">
          {reportsList.map((r) => {
            const isActive = activeReport === r.key;
            return (
              <button
                key={r.key}
                className={`p-2 rounded text-left transition-colors flex flex-col justify-between ${
                  isActive
                    ? "bg-[#3D6B52] text-white font-bold shadow-xs"
                    : "bg-stone-50 hover:bg-stone-100 text-charcoal"
                }`}
                onClick={() => setActiveReport(r.key as any)}
              >
                <span className="text-sm block mb-1">{r.icon}</span>
                <span className="truncate text-[11px] block">{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* REPORT CONTENT AREA */}
      <div className="surface rounded-lg border border-stone overflow-hidden p-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone mb-4 font-mono text-xs">
          <div>
            <h3 className="text-base font-bold text-charcoal">
              {reportsList.find((r) => r.key === activeReport)?.label}
            </h3>
            <span className="text-charcoal-muted text-[11px]">
              {reportsList.find((r) => r.key === activeReport)?.desc}
            </span>
          </div>
          <input
            type="search"
            placeholder="Search records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input text-xs px-3 py-1 w-52 rounded border border-stone"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center font-mono text-xs text-charcoal-muted">
            Generating regional operational report…
          </div>
        ) : !data ? (
          <div className="py-8 text-center font-mono text-xs text-red-700">
            Failed to compile report dataset.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* 1. SCHOOLS REPORT */}
            {activeReport === "SCHOOLS" && (
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone text-charcoal-muted font-mono uppercase text-[11px]">
                  <tr>
                    <th className="py-2 px-3">School Name</th>
                    <th className="py-2 px-3">UDISE Code</th>
                    <th className="py-2 px-3">District</th>
                    <th className="py-2 px-3 text-center">Students</th>
                    <th className="py-2 px-3">Science Lab</th>
                    <th className="py-2 px-3">Power</th>
                    <th className="py-2 px-3 text-right">Total Visits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone font-mono">
                  {data.schools.map((s) => (
                    <tr key={s.id} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3 font-bold text-charcoal">{s.name}</td>
                      <td className="py-2.5 px-3">{s.udiseCode}</td>
                      <td className="py-2.5 px-3">{s.District?.name || "District"}</td>
                      <td className="py-2.5 px-3 text-center">{s.totalStudents}</td>
                      <td className="py-2.5 px-3">{s.hasScienceLab ? "✓ Yes" : "✗ No"}</td>
                      <td className="py-2.5 px-3">{s.hasElectricity ? "✓ Yes" : "✗ No"}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{s._count?.Event || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 2. BUSES REPORT */}
            {activeReport === "BUSES" && (
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone text-charcoal-muted font-mono uppercase text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Bus Identifier</th>
                    <th className="py-2 px-3">Registration Plate</th>
                    <th className="py-2 px-3">Capacity</th>
                    <th className="py-2 px-3">Primary Staff</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-right">Visits Conducted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone font-mono">
                  {data.buses.map((b) => (
                    <tr key={b.id} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3 font-bold text-charcoal">{b.busCode || b.registrationNumber}</td>
                      <td className="py-2.5 px-3">{b.registrationNumber}</td>
                      <td className="py-2.5 px-3">{b.seatingCapacity} seats</td>
                      <td className="py-2.5 px-3">{b.User?.name || "Unassigned"}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {b.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">{b._count?.Event || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 3. STAFF REPORT */}
            {activeReport === "STAFF" && (
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone text-charcoal-muted font-mono uppercase text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Communicator Name</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">Phone</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-right">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone font-mono">
                  {data.staff.map((st) => (
                    <tr key={st.id} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3 font-bold text-charcoal">{st.name}</td>
                      <td className="py-2.5 px-3">{st.email}</td>
                      <td className="py-2.5 px-3">{st.phone || "—"}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {st.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-charcoal-muted">
                        {new Date(st.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 4. INVENTORY SUMMARY REPORT */}
            {activeReport === "INVENTORY" && (
              <div className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-4 bg-stone-50 border border-stone rounded">
                    <span className="block text-charcoal-muted uppercase text-[10px]">Total Consumables</span>
                    <strong className="text-xl text-charcoal font-bold">{data.consumables.length} Items</strong>
                  </div>
                  <div className="p-4 bg-stone-50 border border-stone rounded">
                    <span className="block text-charcoal-muted uppercase text-[10px]">Total Equipment Assets</span>
                    <strong className="text-xl text-charcoal font-bold">{data.equipment.length} Assets</strong>
                  </div>
                  <div className="p-4 bg-stone-50 border border-stone rounded">
                    <span className="block text-charcoal-muted uppercase text-[10px]">Total Allocations</span>
                    <strong className="text-xl text-[#3D6B52] font-bold">{data.allocations.length} Recorded</strong>
                  </div>
                </div>
              </div>
            )}

            {/* 5. CONSUMABLES USAGE REPORT */}
            {activeReport === "CONSUMABLES" && (
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone text-charcoal-muted font-mono uppercase text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Item Name</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 text-right">Available Stock</th>
                    <th className="py-2 px-3 text-right">Consumed in Field</th>
                    <th className="py-2 px-3 text-right">Min Threshold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone font-mono">
                  {data.consumables.map((c) => (
                    <tr key={c.id} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3 font-bold text-charcoal">{c.name}</td>
                      <td className="py-2.5 px-3">{c.category}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-charcoal">
                        {c.currentStock} {c.unitMetric}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                        {c.totalConsumed} {c.unitMetric}
                      </td>
                      <td className="py-2.5 px-3 text-right text-charcoal-muted">
                        {c.minimumStock} {c.unitMetric}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 6. EQUIPMENT REPORT */}
            {activeReport === "EQUIPMENT" && (
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone text-charcoal-muted font-mono uppercase text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Asset Tag</th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Location / Bus</th>
                    <th className="py-2 px-3 text-center">Condition</th>
                    <th className="py-2 px-3 text-right">Valuation (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone font-mono">
                  {data.equipment.map((eq) => (
                    <tr key={eq.id} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3 font-bold text-charcoal">{eq.assetTag}</td>
                      <td className="py-2.5 px-3">{eq.name}</td>
                      <td className="py-2.5 px-3">{eq.category}</td>
                      <td className="py-2.5 px-3">
                        {eq.Bus?.busCode ? `🚌 ${eq.Bus.busCode}` : "🏢 Depot"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {eq.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">₹{eq.cost?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 7. ALLOCATION REPORT */}
            {activeReport === "ALLOCATIONS" && (
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone text-charcoal-muted font-mono uppercase text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Transaction ID</th>
                    <th className="py-2 px-3">Item Name</th>
                    <th className="py-2 px-3 text-right">Quantity</th>
                    <th className="py-2 px-3">Physical Bus</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone font-mono">
                  {data.allocations.map((al) => (
                    <tr key={al.id} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3 font-bold text-charcoal">{al.id.slice(0, 8)}</td>
                      <td className="py-2.5 px-3">{al.consumable?.name || "Equipment Kit"}</td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        {al.quantity} {al.consumable?.unitMetric || "units"}
                      </td>
                      <td className="py-2.5 px-3">🚌 {al.bus?.busCode || "Depot"}</td>
                      <td className="py-2.5 px-3">{al.type}</td>
                      <td className="py-2.5 px-3 text-right text-charcoal-muted">
                        {new Date(al.timestamp).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 8. VISITS REPORT */}
            {activeReport === "VISITS" && (
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone text-charcoal-muted font-mono uppercase text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Event Code</th>
                    <th className="py-2 px-3">School Name</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Bus</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-right">Students Attended</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone font-mono">
                  {data.visits.map((v) => (
                    <tr key={v.id} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3 font-bold text-charcoal">{v.eventCode}</td>
                      <td className="py-2.5 px-3">{v.School?.name}</td>
                      <td className="py-2.5 px-3">{new Date(v.eventDate).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3">🚌 {v.Bus?.busCode}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {v.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">{v._count?.EventAttendance || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 9. PERFORMANCE REPORT */}
            {activeReport === "PERFORMANCE" && (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded">
                  <h4 className="text-emerald-950 font-bold uppercase text-xs mb-2">
                    Regional Operational Efficiency Index
                  </h4>
                  <p className="text-emerald-900 font-sans text-xs">
                    Overall coverage rate across schools: <strong>{data.schools.length} schools</strong> registered,{" "}
                    <strong>{data.buses.length} active mobile labs</strong>,{" "}
                    <strong>{data.staff.length} qualified science communicators</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
