import { useEffect, useMemo, useState } from "react";
import { apiClient, API_BASE_URL } from "../../../services/api-client";
import { formatValue } from "../../../shared/utils/format";

interface RegionalDataTableProps {
  resource: string;
  title: string;
  description?: string;
}

export function RegionalDataTable({ resource, title, description }: RegionalDataTableProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await apiClient<{ rows: any[] }>(
        `/regional-admin/resource/${resource}?limit=100&search=${encodeURIComponent(search)}`
      );
      setRows(r.rows || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load regional data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [resource]);

  const columns = useMemo(() => {
    const preferred: Record<string, string[]> = {
      schools: ["name", "udiseCode", "districtId", "blockId", "totalStudents", "priorityCategory"],
      staff: ["name", "email", "roleEnum", "status", "lastLoginAt"],
      labs: ["busCode", "registrationNumber", "status", "currentLat", "currentLng", "lastGpsUpdate"],
      visits: ["eventCode", "schoolId", "busId", "eventDate", "startTime", "endTime", "status"],
      issues: ["category", "description", "status", "timestamp", "schoolId", "busId"],
      inventory: ["consumableId", "busId", "quantity", "type", "timestamp"],
      routes: ["routeCode", "routeName", "status", "totalDistanceKm", "estimatedDurationMinutes"],
      experiments: ["title", "subject", "targetGradeRange", "durationMinutes", "difficultyLevel", "riskLevel"],
      equipment: ["assetTag", "name", "category", "status", "busId", "cost"],
      consumables: ["name", "category", "currentStock", "minimumStock", "unitMetric", "expiryDate"],
      registrations: ["schoolId", "preferredDate", "expectedStudentCount", "status", "remarks"]
    };

    if (preferred[resource]) return preferred[resource];
    return rows.length
      ? Object.keys(rows[0])
          .filter((x) => !x.toLowerCase().includes("id") || x.endsWith("Id"))
          .slice(0, 7)
      : [];
  }, [rows, resource]);

  function csvExport() {
    window.open(
      `${API_BASE_URL}/regional-admin/reports/${resource}.csv`,
      "_blank"
    );
  }

  return (
    <section className="surface">
      <div className="module-head">
        <div>
          <div className="section-kicker">REGIONAL DATA</div>
          <h2>{title}</h2>
          <p>{description || "Every record is filtered by the authenticated Regional Admin's assigned region."}</p>
        </div>
        <button className="ghost" onClick={csvExport}>
          Export CSV
        </button>
      </div>

      <div className="toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search regional records…"
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
        />
        <button onClick={() => void load()}>Search</button>
      </div>

      {error && <div className="error banner">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="loader-ring" />
          Loading regional data…
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c.replace(/([A-Z])/g, " $1")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id || i}>
                  {columns.map((c) => (
                    <td key={c}>{formatValue(row[c])}</td>
                  ))}
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={Math.max(columns.length, 1)}>
                    <div className="empty-state">No records found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
