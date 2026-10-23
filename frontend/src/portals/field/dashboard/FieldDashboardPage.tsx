import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../services/api-client";
import { BrandLogo } from "../../../shared/components/BrandLogo";

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="field-stat">
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
    </div>
  );
}

export function FieldDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  async function load() {
    try {
      setLoading(true);
      const res = await apiClient<any>("/field/dashboard");
      setData(res);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to load field data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function recordEventAction(path: string) {
    try {
      setMessage("");
      await apiClient(path, { method: "POST" });
      await load();
      setMessage("Action recorded successfully.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
    }
  }

  if (loading || !data) {
    return (
      <div className="loading-state">
        <div className="loader-ring" />
        Loading field dashboard…
      </div>
    );
  }

  const currentEvents = data.todayVisits || [];
  const nextVisit = currentEvents[0];
  const lab = data.labs?.[0] || data.bus;

  return (
    <section className="field-page">
      <div className="command-hero">
        <div>
          <div className="eyebrow">EXPLORE / TEACH / EXPERIMENT / DISCOVER</div>
          <h2>Science in motion.</h2>
          <p>
            Everything you need to prepare, travel, conduct and record today's assigned science
            sessions.
          </p>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit one" />
          <div className="hero-orbit two" />
          <div className="hero-node node-a" />
          <div className="hero-node node-b" />
          <div className="hero-node node-c" />
          <div className="hero-core">
            <BrandLogo />
          </div>
        </div>
      </div>

      <div className="field-stats">
        <Stat label="Today's Visits" value={data.kpis?.todayVisits} />
        <Stat label="Upcoming" value={data.kpis?.upcomingVisits} />
        <Stat label="Open Issues" value={data.kpis?.openIssues} />
        <Stat label="Assigned Labs" value={data.labs?.length || (data.bus ? 1 : 0)} />
      </div>

      <div className="field-grid-2">
        <div className="field-card">
          <div className="field-card-head">
            <div>
              <span>NEXT FIELD SESSION</span>
              <h2>{nextVisit?.School?.name || "No visit assigned"}</h2>
            </div>
            <b>{nextVisit?.status || "—"}</b>
          </div>
          {nextVisit ? (
            <>
              <p>
                {nextVisit.startTime} · {nextVisit.Bus?.busCode || nextVisit.Bus?.registrationNumber || "Lab"}
              </p>
              <p>
                {nextVisit.ExperimentSession?.[0]?.Experiment?.title || "Assigned experiment"} ·{" "}
                {nextVisit.ExperimentSession?.[0]?.Experiment?.subject || "Science"}
              </p>
              <div className="field-actions">
                <button onClick={() => recordEventAction(`/field/events/${nextVisit.id}/arrival`)}>
                  Arrived at school
                </button>
                <button
                  className="secondary"
                  onClick={() => recordEventAction(`/field/events/${nextVisit.id}/start`)}
                >
                  Start session
                </button>
                <button
                  className="secondary"
                  onClick={() => recordEventAction(`/field/events/${nextVisit.id}/complete`)}
                >
                  Complete
                </button>
              </div>
            </>
          ) : (
            <p>You have no active school visits scheduled for right now.</p>
          )}
        </div>

        <div className="field-card">
          <div className="field-card-head">
            <div>
              <span>LAB READINESS</span>
              <h2>{lab?.busCode || lab?.registrationNumber || "Assigned laboratory"}</h2>
            </div>
            <b>{lab?.status || "—"}</b>
          </div>
          <p>Equipment, consumables and checklist information for your assigned laboratory.</p>
          <div className="field-actions">
            <button className="secondary" onClick={() => navigate("/field/equipment")}>
              Equipment
            </button>
            <button className="secondary" onClick={() => navigate("/field/equipment?tab=consumables")}>
              Consumables
            </button>
            <button className="secondary" onClick={() => navigate("/field/inspections")}>
              Checklist
            </button>
          </div>
        </div>
      </div>

      {message && <div className="field-message">{message}</div>}
    </section>
  );
}
