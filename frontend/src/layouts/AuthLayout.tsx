import { Outlet } from "react-router-dom";
import { BrandLogo } from "../shared/components/BrandLogo";

const FEATURES = [
  "Multi-region mobile laboratory coordination",
  "Real-time bus & inventory tracking",
  "Field staff scheduling & visit management",
  "STEM curriculum delivery reporting",
];

export function AuthLayout() {
  return (
    <div className="auth-shell">
      {/* Left decorative panel (hidden on mobile) */}
      <div className="auth-panel">
        <div className="auth-panel-bg" />
        <div className="auth-panel-grid" />

        {/* Logo */}
        <div className="auth-panel-logo">
          <div className="auth-panel-logo-mark">
            <BrandLogo size={22} color="#fff" />
          </div>
          <div>
            <div className="auth-panel-logo-text">Science on Wheels</div>
            <div className="auth-panel-logo-sub">Operations Platform</div>
          </div>
        </div>

        {/* Content */}
        <div className="auth-panel-content">
          <h1 className="auth-panel-heading">
            Bringing STEM education to every school
          </h1>
          <p className="auth-panel-desc">
            A unified platform for managing mobile science laboratories, field staff, regional operations, and educational outcomes across India.
          </p>
          <div className="auth-panel-features">
            {FEATURES.map((f) => (
              <div key={f} className="auth-panel-feature">
                <div className="auth-panel-feature-dot" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="auth-panel-footer">
          Science on Wheels NGO · Operations Management System · v1.26
        </div>
      </div>

      {/* Right: login form */}
      <div className="auth-form-panel">
        <Outlet />
      </div>
    </div>
  );
}
