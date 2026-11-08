import React, { useState } from "react";

// =========================================================================
// 1. AREA / TREND LINE CHART (SVG)
// =========================================================================
export interface TrendDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface AreaTrendChartProps {
  data: TrendDataPoint[];
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  height?: number;
  color?: string;
  secondaryColor?: string;
}

export function AreaTrendChart({
  data,
  title,
  subtitle,
  primaryLabel = "Visits Conducted",
  secondaryLabel = "Students (x100)",
  height = 200,
  color = "#6366f1",
  secondaryColor = "#10b981"
}: AreaTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "13px" }}>
        No trend data available.
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const paddingX = 40;
  const paddingY = 24;
  const chartWidth = 500;
  const chartHeight = height;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const points = data.map((d, i) => {
    const x = paddingX + (i / Math.max(data.length - 1, 1)) * usableWidth;
    const y = paddingY + usableHeight - (d.value / maxValue) * usableHeight;
    return { x, y, ...d };
  });

  const linePath = points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  return (
    <div style={{ width: "100%", background: "#ffffff", borderRadius: "10px", padding: "1.25rem", border: "1px solid var(--stone, #e2e8f0)" }}>
      {(title || subtitle) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            {title && <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{title}</h4>}
            {subtitle && <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>{subtitle}</p>}
          </div>
          <div style={{ display: "flex", gap: "1rem", fontSize: "12px", color: "#475569" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
              {primaryLabel}
            </span>
            {data.some((d) => d.secondaryValue !== undefined) && (
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: secondaryColor }} />
                {secondaryLabel}
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ position: "relative", width: "100%" }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: "100%", height: "auto", overflow: "visible" }}
        >
          <defs>
            <linearGradient id={`areaGrad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = paddingY + usableHeight * (1 - pct);
            const val = Math.round(maxValue * pct);
            return (
              <g key={pct}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  fontSize="10"
                  textAnchor="end"
                  fill="#94a3b8"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Shaded Area */}
          <path d={areaPath} fill={`url(#areaGrad-${color.replace("#", "")})`} />

          {/* Main Trend Line */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p, i) => {
            const isHover = hoverIndex === i;
            return (
              <g
                key={i}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHover ? 6 : 4}
                  fill="#ffffff"
                  stroke={color}
                  strokeWidth={isHover ? 3 : 2}
                  style={{ transition: "all 0.15s ease" }}
                />
                {/* X-axis label */}
                <text
                  x={p.x}
                  y={chartHeight - 6}
                  fontSize="11"
                  textAnchor="middle"
                  fill="#64748b"
                  fontWeight={isHover ? 600 : 400}
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoverIndex !== null && points[hoverIndex] && (
          <div
            style={{
              position: "absolute",
              top: `${(points[hoverIndex].y / chartHeight) * 100}%`,
              left: `${(points[hoverIndex].x / chartWidth) * 100}%`,
              transform: "translate(-50%, -120%)",
              background: "#1e293b",
              color: "#ffffff",
              padding: "4px 8px",
              borderRadius: "5px",
              fontSize: "11px",
              fontWeight: 600,
              pointerEvents: "none",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              zIndex: 10
            }}
          >
            <div>{points[hoverIndex].label}</div>
            <div style={{ color: "#a5b4fc" }}>{primaryLabel}: {points[hoverIndex].value}</div>
            {points[hoverIndex].secondaryValue !== undefined && (
              <div style={{ color: "#6ee7b7" }}>{secondaryLabel}: {points[hoverIndex].secondaryValue}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// 2. DONUT / METRIC DISTRIBUTION CHART (SVG)
// =========================================================================
export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  title?: string;
  subtitle?: string;
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

export function DonutChart({
  data,
  title,
  subtitle,
  size = 180,
  thickness = 22,
  centerLabel,
  centerValue
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div style={{ background: "#ffffff", borderRadius: "10px", padding: "1.25rem", border: "1px solid var(--stone, #e2e8f0)", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
      {(title || subtitle) && (
        <div style={{ marginBottom: "1rem" }}>
          {title && <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{title}</h4>}
          {subtitle && <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>{subtitle}</p>}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap", flex: 1 }}>
        <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
            {/* Background track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={thickness}
            />

            {/* Segments */}
            {data.map((seg, i) => {
              if (total === 0 || seg.value === 0) return null;
              const percent = seg.value / total;
              const strokeDasharray = `${percent * circumference} ${circumference}`;
              const strokeDashoffset = -(accumulatedPercent * circumference);
              accumulatedPercent += percent;

              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={thickness}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: "stroke-dashoffset 0.4s ease, stroke-dasharray 0.4s ease" }}
                />
              );
            })}
          </svg>

          {/* Center info */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none"
            }}
          >
            <span style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
              {centerValue !== undefined ? centerValue : total}
            </span>
            {centerLabel && (
              <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", marginTop: "4px" }}>
                {centerLabel}
              </span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: "120px" }}>
          {data.map((seg, i) => {
            const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", fontSize: "12.5px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color }} />
                  <span style={{ color: "#334155" }}>{seg.label}</span>
                </div>
                <span style={{ fontWeight: 600, color: "#0f172a", fontFamily: "monospace" }}>
                  {seg.value} <span style={{ color: "#94a3b8", fontSize: "11px" }}>({pct}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 3. HORIZONTAL BAR COMPARISON CHART
// =========================================================================
export interface BarItem {
  label: string;
  value: number;
  total?: number;
  color?: string;
  detail?: string;
}

interface HorizontalBarChartProps {
  data: BarItem[];
  title?: string;
  subtitle?: string;
}

export function HorizontalBarChart({ data, title, subtitle }: HorizontalBarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.total || d.value), 1);

  return (
    <div style={{ background: "#ffffff", borderRadius: "10px", padding: "1.25rem", border: "1px solid var(--stone, #e2e8f0)", height: "100%", boxSizing: "border-box" }}>
      {(title || subtitle) && (
        <div style={{ marginBottom: "1rem" }}>
          {title && <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{title}</h4>}
          {subtitle && <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>{subtitle}</p>}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        {data.map((item, i) => {
          const pct = Math.min(Math.round((item.value / (item.total || maxVal)) * 100), 100);
          const barColor = item.color || "#6366f1";
          return (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px", marginBottom: "4px" }}>
                <span style={{ fontWeight: 600, color: "#1e293b" }}>{item.label}</span>
                <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#475569" }}>
                  <strong>{item.value}</strong>
                  {item.total ? ` / ${item.total}` : ""} {item.detail ? `(${item.detail})` : ""}
                </span>
              </div>
              <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: barColor,
                    borderRadius: "4px",
                    transition: "width 0.4s ease"
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

