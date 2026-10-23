import { API_BASE_URL } from "../../../services/api-client";

export function RegionalDocumentsPage() {
  function downloadSample(_docType: string) {
    const url = `${API_BASE_URL}/regional-admin/reports/visits.csv`;
    window.open(url, "_blank");
  }

  const docs = [
    { title: "Regional Safety Protocol Checklist", format: "PDF / Template" },
    { title: "Lab Operating Procedures (SOP)", format: "PDF / Guideline" },
    { title: "School Visit Permission Slip Template", format: "DOCX / Form" },
    { title: "Chemical & Hazardous Material Handling Guide", format: "PDF / Safety" },
    { title: "Incident and Emergency Contact Directory", format: "PDF / Directory" }
  ];

  return (
    <div className="portal-module">
      <div className="module-head">
        <div>
          <div className="section-kicker">REGIONAL COMPLIANCE & GOVERNANCE</div>
          <h2>Regional Documents & Operational Guidelines</h2>
          <p>Official templates, compliance guidelines and field documentation for regional operations.</p>
        </div>
      </div>

      <div className="surface">
        <div className="report-grid">
          {docs.map((d) => (
            <button key={d.title} onClick={() => downloadSample(d.title)}>
              <div>
                <strong>{d.title}</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.7 }}>{d.format}</p>
              </div>
              <span>Open →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
