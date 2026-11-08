import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { configs } from "./resources";
import { ResourceView } from "./ResourceView";
import { apiClient } from "../../services/api-client";
import { NavIcon } from "../../shared/components/NavIcon";

interface FinanceMetrics {
  totalExpenses: number;
  fuelExpenses: number;
  maintenanceExpenses: number;
  pendingProcurement: number;
  procurementCount: number;
}

export function FinanceProcurementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Operational Expenses";

  const [metrics, setMetrics] = useState<FinanceMetrics>({
    totalExpenses: 0,
    fuelExpenses: 0,
    maintenanceExpenses: 0,
    pendingProcurement: 0,
    procurementCount: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  function setSub(newSub: string) {
    setSearchParams({ sub: newSub });
  }

  const subOptions = ["Operational Expenses", "Procurement Requisitions"];

  useEffect(() => {
    async function fetchFinanceKPIs() {
      try {
        setLoadingMetrics(true);
        // Fetch expenses & procurement lists to compute financial aggregates
        const [expRes, procRes] = await Promise.all([
          apiClient<{ rows: any[] }>("/super-admin/resource/expenses").catch(() => ({ rows: [] })),
          apiClient<{ rows: any[] }>("/super-admin/resource/procurement").catch(() => ({ rows: [] })),
        ]);

        const expenses = expRes.rows || [];
        const procurements = procRes.rows || [];

        let total = 0;
        let fuel = 0;
        let maintenance = 0;

        for (const e of expenses) {
          const amt = Number(e.amount) || 0;
          total += amt;
          if (e.category === "FUEL") fuel += amt;
          if (e.category === "MAINTENANCE") maintenance += amt;
        }

        let pendingProc = 0;
        let pCount = 0;
        for (const p of procurements) {
          pCount++;
          if (p.status === "PENDING" || !p.status) {
            pendingProc += Number(p.estimatedCost) || 0;
          }
        }

        setMetrics({
          totalExpenses: total,
          fuelExpenses: fuel,
          maintenanceExpenses: maintenance,
          pendingProcurement: pendingProc,
          procurementCount: pCount,
        });
      } catch (err) {
        console.error("Failed to calculate finance KPIs", err);
      } finally {
        setLoadingMetrics(false);
      }
    }

    void fetchFinanceKPIs();
  }, []);

  let activeConfig = configs.expenses;
  if (sub === "Procurement Requisitions") {
    activeConfig = configs.procurement;
  }

  return (
    <div className="portal-module">
      <div style={{ marginBottom: "24px" }}>
        <div className="section-kicker">FINANCIALS & PROCUREMENT</div>
        <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", margin: "4px 0 8px" }}>
          Financial Management & Material Procurement
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: 0, maxWidth: "720px", lineHeight: 1.5 }}>
          Tracking of operational disbursements, regional travel allowances (TA/DA), vehicle fuel logs, and purchase requisitions.
        </p>
      </div>

      {/* Financial KPI Cards */}
      <div className="metric-grid" style={{ marginBottom: "24px" }}>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">TOTAL OPERATIONAL EXPENDITURE</span>
            <span className="metric-icon" style={{ color: "var(--accent)" }}>
              <NavIcon name="Receipt" size={16} />
            </span>
          </div>
          <div className="metric-value">
            {loadingMetrics ? "…" : `₹${metrics.totalExpenses.toLocaleString("en-IN")}`}
          </div>
          <div className="metric-detail">Disbursed field & operations costs</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">FLEET FUEL & TRANSIT</span>
            <span className="metric-icon" style={{ color: "#0284C7" }}>
              <NavIcon name="Bus" size={16} />
            </span>
          </div>
          <div className="metric-value">
            {loadingMetrics ? "…" : `₹${metrics.fuelExpenses.toLocaleString("en-IN")}`}
          </div>
          <div className="metric-detail">Diesel, tolls & highway permits</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">LAB MAINTENANCE & SERVICE</span>
            <span className="metric-icon" style={{ color: "#D97706" }}>
              <NavIcon name="Settings" size={16} />
            </span>
          </div>
          <div className="metric-value">
            {loadingMetrics ? "…" : `₹${metrics.maintenanceExpenses.toLocaleString("en-IN")}`}
          </div>
          <div className="metric-detail">Fleet mechanical & calibration costs</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">PROCUREMENT PIPELINE</span>
            <span className="metric-icon" style={{ color: "#16A34A" }}>
              <NavIcon name="Package" size={16} />
            </span>
          </div>
          <div className="metric-value">
            {loadingMetrics ? "…" : `₹${metrics.pendingProcurement.toLocaleString("en-IN")}`}
          </div>
          <div className="metric-detail">{metrics.procurementCount} requisition line items</div>
        </div>
      </div>

      {/* Subnav Navigation */}
      <div className="subnav-tabs" style={{ marginBottom: "20px" }}>
        {subOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`subnav-tab ${sub === opt ? "active" : ""}`}
            onClick={() => setSub(opt)}
          >
            {opt === "Operational Expenses" && <NavIcon name="Receipt" size={15} />}
            {opt === "Procurement Requisitions" && <NavIcon name="Package" size={15} />}
            <span>{opt}</span>
          </button>
        ))}
      </div>

      {/* Live Data Grid */}
      <ResourceView config={activeConfig} />
    </div>
  );
}

