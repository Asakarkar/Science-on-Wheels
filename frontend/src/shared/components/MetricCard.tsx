export interface MetricCardProps {
  label: string;
  value: number | string;
  detail?: string;
  tone?: string;
  accent?: string;
}

export function MetricCard({ label, value, detail, tone, accent }: MetricCardProps) {
  const displayValue = typeof value === "number" ? value.toLocaleString() : value ?? "—";

  if (accent) {
    return (
      <div className={`kpi-card ${accent}`}>
        <span className="font-mono text-[10px] uppercase tracking-wider text-charcoal-muted">
          {label}
        </span>
        <strong className="font-sans text-2xl font-bold tracking-tight text-charcoal">
          {displayValue}
        </strong>
        {detail && <small className="mt-1 block font-mono text-[10px] text-charcoal-subtle">{detail}</small>}
      </div>
    );
  }

  return (
    <article className={`metric-card ${tone || ""}`}>
      <div className="metric-label font-mono text-[10px] uppercase tracking-wider text-charcoal-muted">
        {label}
      </div>
      <strong className="font-sans text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
        {displayValue}
      </strong>
      {detail && <small className="font-mono text-[10px] text-charcoal-subtle">{detail}</small>}
      <div className="metric-spark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
    </article>
  );
}
