export interface MetricCardProps {
  label: string;
  value: number | string;
  detail?: string;
  tone?: string;
  accent?: string;
  onClick?: () => void;
}

export function MetricCard({ label, value, detail, tone, accent, onClick }: MetricCardProps) {
  const displayValue = typeof value === "number" ? value.toLocaleString() : value ?? "—";
  const modifier = accent || tone || "";

  return (
    <article
      className={`metric-card ${modifier} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div>
        <div className="metric-label font-mono text-[10px] uppercase tracking-wider text-charcoal-muted">
          {label}
        </div>
        <strong className="font-sans text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          {displayValue}
        </strong>
      </div>
      {detail && <small className="font-mono text-[10px] text-charcoal-subtle block mt-1">{detail}</small>}
    </article>
  );
}
