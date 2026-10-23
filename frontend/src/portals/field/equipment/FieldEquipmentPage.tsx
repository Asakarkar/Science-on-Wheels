import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../../services/api-client";
import { FieldList } from "../components/FieldList";

export function FieldEquipmentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get("sub") || "Lab Details";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await apiClient<any>("/field/dashboard");
        setData(res);
      } catch (err) {
        console.error("Unable to load equipment data", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const subOptions = ["Lab Details", "Equipment Checklist", "Consumables Used"];
  const lab = data?.bus || data?.labs?.[0];
  const items = data?.inventory || [];

  if (loading) {
    return (
      <div className="loading-state small">
        <div className="loader-ring" />
        Loading equipment and laboratory assets…
      </div>
    );
  }

  return (
    <div className="portal-module">
      <div className="subnav-tabs" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {subOptions.map((opt) => (
          <button
            key={opt}
            className={`ghost ${sub === opt ? "primary" : ""}`}
            onClick={() => setSearchParams({ sub: opt })}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "4px",
              background: sub === opt ? "var(--color-primary, #10b981)" : "rgba(255,255,255,0.05)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer"
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {sub === "Lab Details" && (
        <section className="field-page">
          <div className="field-section-title">
            <span>ASSIGNED LABORATORY</span>
            <h1>Mobile Lab Profile</h1>
          </div>
          {lab ? (
            <div className="field-grid-2">
              <div className="field-card">
                <h2>{lab.busCode || lab.registrationNumber}</h2>
                <p>Registration: {lab.registrationNumber}</p>
                <p>Status: {lab.status}</p>
                <p>
                  GPS: {lab.currentLat ?? "—"}, {lab.currentLng ?? "—"}
                </p>
                <p>
                  Last GPS: {lab.lastGpsUpdate ? new Date(lab.lastGpsUpdate).toLocaleString() : "—"}
                </p>
              </div>
              <div className="field-card">
                <h2>Lab Readiness Checklist</h2>
                <p>
                  {lab.Equipment?.length || 0} equipment assets and safety apparatus are registered with this vehicle.
                </p>
                <div className="field-actions">
                  <button onClick={() => window.alert("Pre-departure checklist verified.")}>
                    Verify Checklist
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="field-empty">No mobile laboratory is currently assigned to you.</div>
          )}
        </section>
      )}

      {sub !== "Lab Details" && (
        <FieldList
          title={sub}
          items={items}
          emptyMessage="No equipment or consumables recorded for this laboratory."
          render={(x: any) => (
            <>
              <div>
                <strong>{x.consumable?.name || x.name || x.busCode || "Equipment Asset"}</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.8 }}>
                  {x.category ? `Category: ${x.category}` : "Operational Asset"} · Asset Tag: {x.assetTag || "N/A"}
                </p>
              </div>
              <em>{x.quantity ? `${x.quantity} ${x.type || "units"}` : x.status || "Available"}</em>
            </>
          )}
        />
      )}
    </div>
  );
}
