import { useMemo } from "react";
import { formatValue } from "../utils/format";

export interface DataTableProps<T = Record<string, unknown>> {
  title?: string;
  description?: string;
  rows: T[];
  columns?: string[];
  loading?: boolean;
  error?: string;
  search?: string;
  onSearchChange?: (val: string) => void;
  onSearchSubmit?: () => void;
  onRefresh?: () => void;
  onExportCsv?: () => void;
  actions?: React.ReactNode;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  title,
  description,
  rows,
  columns: customColumns,
  loading = false,
  error,
  search,
  onSearchChange,
  onSearchSubmit,
  onRefresh,
  onExportCsv,
  actions,
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  const columns = useMemo(() => {
    if (customColumns && customColumns.length > 0) return customColumns;
    if (rows && rows.length > 0) {
      return Object.keys(rows[0])
        .filter((k) => k !== "passwordHash" && !k.startsWith("__"))
        .slice(0, 8);
    }
    return [];
  }, [customColumns, rows]);

  return (
    <section className="surface">
      {(title || actions || onExportCsv) && (
        <div className="module-head">
          <div>
            <div className="section-kicker">DATA VIEW</div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {actions}
            {onRefresh && (
              <button className="ghost" onClick={onRefresh} title="Reload records">
                ↻ Refresh
              </button>
            )}
            {onExportCsv && (
              <button className="ghost" onClick={onExportCsv}>
                Export CSV
              </button>
            )}
          </div>
        </div>
      )}

      {onSearchChange && (
        <div className="toolbar">
          <input
            value={search || ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search records…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && onSearchSubmit) {
                onSearchSubmit();
              }
            }}
          />
          {onSearchSubmit && <button onClick={onSearchSubmit}>Search</button>}
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading-state">Loading data…</div>
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
                    <div className="empty-state">{emptyMessage}</div>
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
