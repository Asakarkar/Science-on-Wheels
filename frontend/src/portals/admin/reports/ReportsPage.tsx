import { API_BASE_URL } from "../../../services/api-client";

export function ReportsPage() {
  function csvDownload(res: string) {
    const url = `${API_BASE_URL}/super-admin/reports/${res}.csv`;
    window.open(url, "_blank");
  }

  const reports = [
    { title: "Organization Report", res: "regions", description: "Regional structure and footprint" },
    { title: "Regional Hierarchy Report", res: "regions", description: "State, regional, district and block summaries" },
    { title: "Mobile Laboratories Fleet", res: "labs", description: "Fleet status, fitness, insurance and assignments" },
    { title: "Schools Master Registry", res: "schools", description: "Schools, facilities, and priority ratings" },
    { title: "Session & Event History", res: "events", description: "Field sessions completed, pending, and scheduled" },
    { title: "Student Reach Report", res: "students", description: "Demographics, participation, and roll numbers" },
    { title: "Experiment Content Master", res: "experiments", description: "Curriculum alignment and safety protocols" },
    { title: "Equipment Assets Inventory", res: "equipment", description: "Asset tags, lab assignments, and condition" },
    { title: "Consumables Stock Report", res: "consumables", description: "Stock on hand, reorder thresholds, and expiries" },
    { title: "Staff Directory & Access", res: "users", description: "User accounts, role assignments, and region scope" }
  ];

  return (
    <div className="portal-module">
      <div className="module-head">
        <div>
          <div className="section-kicker">ORGANIZATION-WIDE REPORTING</div>
          <h2>Data Exports & Reports</h2>
          <p>Generate and export organization-wide CSV datasets directly from the live database.</p>
        </div>
      </div>

      <div className="surface analytics-panel">
        <div className="report-grid">
          {reports.map((r) => (
            <button key={r.title} onClick={() => csvDownload(r.res)}>
              <div>
                <strong>{r.title}</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.7 }}>{r.description}</p>
              </div>
              <span>CSV →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
