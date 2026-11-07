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
  onRowClick,
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
      {(title || actions || onExportCsv || onRefresh) && (
        <div className="module-head">
          <div>
            <div className="section-kicker">DATA VIEW</div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            {onRefresh && (
              <button className="ghost font-mono text-xs" onClick={onRefresh} title="Reload records">
                ↻ Refresh
              </button>
            )}
            {onExportCsv && (
              <button className="ghost font-mono text-xs" onClick={onExportCsv}>
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
          {onSearchSubmit && (
            <button className="primary font-mono text-xs" onClick={onSearchSubmit}>
              Search
            </button>
          )}
        </div>
      )}

      {error && <div className="error-banner mb-4">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="loader-ring" />
          Loading data…
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
                <tr
                  key={row.id || i}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={onRowClick ? "cursor-pointer hover:bg-slate-50 transition-colors" : ""}
                >
                  {columns.map((c) => (
                    <td key={c}>{formatValue(row[c])}</td>
                  ))}
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={Math.max(columns.length, 1)}>
                    <div className="empty-state py-8 text-center text-charcoal-muted font-mono text-xs">
                      {emptyMessage}
                    </div>
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
