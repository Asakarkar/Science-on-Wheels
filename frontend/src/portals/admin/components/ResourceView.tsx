import { useEffect, useState } from "react";
import { apiClient, API_BASE_URL } from "../../../services/api-client";
import type { ResourceConfig } from "../../../shared/types/admin";
import { formatValue } from "../../../shared/utils/format";
import { RecordModal } from "./RecordModal";

interface ResourceViewProps {
  config: ResourceConfig;
  onBack?: () => void;
  titleOverride?: string;
  descriptionOverride?: string;
  filterQuery?: string;
}

export function ResourceView({
  config,
  onBack,
  titleOverride,
  descriptionOverride,
  filterQuery
}: ResourceViewProps) {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [showForm, setShowForm] = useState(false);

  const activeFilter = filterQuery ?? config.filterQuery;
  const title = titleOverride || config.title;
  const description = descriptionOverride || config.description;

  async function load() {
    setLoading(true);
    setError("");
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (activeFilter) {
        const parts = activeFilter.split("&");
        for (const p of parts) {
          const [k, v] = p.split("=");
          if (k && v) queryParams.set(k, v);
        }
      }
      const data = await apiClient<{ rows: Record<string, any>[] }>(
        `/super-admin/resource/${config.key}?${queryParams.toString()}`
      );
      setRows(data.rows || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [config.key, activeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  async function remove(id: string) {
    if (!window.confirm("Delete this record? This cannot be undone.")) return;
    try {
      await apiClient(`/super-admin/resource/${config.key}/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  function csvDownload() {
    const url = `${API_BASE_URL}/super-admin/reports/${config.key}.csv`;
    window.open(url, "_blank");
  }

  return (
    <section className="module-view">
      <div className="module-head">
        <div>
          <div className="section-kicker">SUPER ADMIN / {config.key.toUpperCase()}</div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="module-actions">
          {onBack && (
            <button className="ghost" onClick={onBack}>
              ← Back
            </button>
          )}
          <button className="ghost" onClick={csvDownload}>
            Export CSV
          </button>
          {config.fields.length > 0 && (
            <button
              className="primary"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              + Add record
            </button>
          )}
        </div>
      </div>

      <div className="toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${title.toLowerCase()}…`}
        />
        <span>{rows.length} records loaded</span>
      </div>

      {error && <div className="error banner">{error}</div>}

      <div className="table-wrap">
        {loading ? (
          <div className="loading-state small">
            <div className="loader-ring" />
            Loading…
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                {config.columns.map((c) => (
                  <th key={c}>{c.replace(/([A-Z])/g, " $1")}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {config.columns.map((c) => (
                    <td key={c}>{formatValue(row[c])}</td>
                  ))}
                  <td>
                    <div className="row-actions">
                      <button
                        onClick={() => {
                          setEditing(row);
                          setShowForm(true);
                        }}
                      >
                        Edit
                      </button>
                      {config.key !== "auditLogs" && (
                        <button className="danger-link" onClick={() => remove(row.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={config.columns.length + 1}>
                    <div className="empty-table">
                      <span>∅</span>
                      <strong>No records yet</strong>
                      <small>Create your first record or change the search filter.</small>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <RecordModal
          config={config}
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            void load();
          }}
        />
      )}
    </section>
  );
}
