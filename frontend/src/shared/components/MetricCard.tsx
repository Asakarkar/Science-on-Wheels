export interface MetricCardProps {
  label: string;
  value: number | string;
  detail?: string;
  tone?: string;
  accent?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function MetricCard({ label, value, detail, tone, accent, icon, onClick }: MetricCardProps) {
  const displayValue = typeof value === "number" ? value.toLocaleString() : (value ?? "—");
  const modifier = accent || tone || "";

  return (
    <article
      className={`metric-card ${modifier} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : undefined }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="metric-label">{label}</div>
          <strong
            style={{
              display: "block",
              fontSize: "30px",
              fontWeight: 800,
              color: "var(--text-primary)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              marginTop: "6px",
              fontFamily: "var(--font-sans)",
            }}
          >
            {displayValue}
          </strong>
        </div>
        {icon && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              borderRadius: "var(--r-md)",
              backgroundColor: "var(--accent-soft)",
              color: "var(--accent)",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
      </div>
      {detail && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12.5px",
            color: "var(--text-subtle)",
            lineHeight: 1.45,
            marginTop: "4px",
          }}
        >
          {detail}
        </div>
      )}
    </article>
  );
}
