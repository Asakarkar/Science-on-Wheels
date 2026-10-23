import { useState } from "react";

export function FieldInspectionsPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({
    safetyKit: true,
    fireExtinguisher: true,
    firstAid: true,
    tyrePressure: false,
    fuelAdequate: true,
    powerGenerator: true,
    cleanApparatus: true
  });
  const [submitted, setSubmitted] = useState(false);

  function toggle(key: string) {
    setChecked((p) => ({ ...p, [key]: !p[key] }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  }

  const items = [
    { key: "safetyKit", label: "Laboratory Personal Protective Equipment (PPE) & Goggles" },
    { key: "fireExtinguisher", label: "Fire Extinguisher & Emergency Safety Cut-off Verified" },
    { key: "firstAid", label: "First Aid Kit fully stocked with burn gel and antiseptic" },
    { key: "tyrePressure", label: "Tyre Pressure & Spare Tyre Inspection" },
    { key: "fuelAdequate", label: "Vehicle Fuel & Battery Charge Levels Adequate" },
    { key: "powerGenerator", label: "Auxiliary Inverter / Power Generator Operational" },
    { key: "cleanApparatus", label: "Glassware and Chemical Apparatus Sanitized and Secured" }
  ];

  return (
    <div className="portal-module">
      <div className="module-head">
        <div>
          <div className="section-kicker">VEHICLE & READINESS</div>
          <h2>Pre-Trip Vehicle & Laboratory Inspection</h2>
          <p>
            Field staff must complete and verify the safety and operational readiness checklist
            before dispatching the mobile laboratory.
          </p>
        </div>
      </div>

      <form className="surface" onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
        {submitted && (
          <div className="field-message" style={{ marginBottom: "1rem" }}>
            Vehicle and lab readiness inspection logged successfully.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {items.map((item) => (
            <label
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                cursor: "pointer",
                padding: "0.5rem 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)"
              }}
            >
              <input
                type="checkbox"
                checked={checked[item.key] || false}
                onChange={() => toggle(item.key)}
                style={{ width: "1.2rem", height: "1.2rem" }}
              />
              <span style={{ fontSize: "0.95rem" }}>{item.label}</span>
            </label>
          ))}
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <button className="primary" type="submit">
            Sign & Submit Readiness Inspection
          </button>
        </div>
      </form>
    </div>
  );
}
