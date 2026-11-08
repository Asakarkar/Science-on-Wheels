import { Outlet } from "react-router-dom";
import { BrandLogo } from "../shared/components/BrandLogo";
import { NavIcon } from "../shared/components/NavIcon";

const FEATURES = [
  "Multi-region mobile science laboratory dispatch",
  "Real-time GPS bus tracking & telemetry",
  "Automated school visit scheduling & monitoring",
  "Standardized STEM curriculum delivery tracking",
];

export function AuthLayout() {
  return (
    <div className="auth-shell">
      {/* Left Creative Animated STEM Universe Panel (visible on desktop) */}
      <div className="auth-panel">
        <div className="auth-panel-bg" />
        <div className="auth-panel-grid" />

        {/* Top Branding */}
        <div className="auth-panel-logo">
          <div className="auth-panel-logo-mark">
            <BrandLogo size={24} color="#FFFFFF" />
          </div>
          <div>
            <div className="auth-panel-logo-text">Science on Wheels</div>
            <div className="auth-panel-logo-sub">Operations & Management System</div>
          </div>
        </div>

        {/* Center: 3D Orbital STEM Simulation */}
        <div className="auth-stem-stage">
          {/* Orbital Rings */}
          <div className="auth-orbit-ring auth-orbit-1" />
          <div className="auth-orbit-ring auth-orbit-2" />
          <div className="auth-orbit-ring auth-orbit-3" />

          {/* Central Pulsing Energy Core */}
          <div className="auth-atom-core">
            <NavIcon name="Microscope" size={26} color="#FFFFFF" />
          </div>

          {/* Floating Orbiting STEM Badges */}
          <div className="auth-float-node pos-a">
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#38BDF8" }} />
            <span>120+ Active Mobile Labs</span>
          </div>

          <div className="auth-float-node pos-b">
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#34D399" }} />
            <span>10,000+ Students Reached</span>
          </div>
        </div>

        {/* Text & Mission */}
        <div>
          <h1 className="auth-panel-heading">
            Empowering curious minds through mobile science
          </h1>
          <p className="auth-panel-desc">
            Centralized intelligent coordination platform connecting regional hubs, field communicators, and rural schools across India.
          </p>

          <div className="auth-panel-features">
            {FEATURES.map((feature) => (
              <div key={feature} className="auth-panel-feature">
                <div className="auth-panel-feature-dot" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="auth-panel-footer">
          Science on Wheels · Enterprise Operations Platform · v3.0
        </div>
      </div>

      {/* Right Login Area */}
      <div className="auth-form-panel">
        <Outlet />
      </div>
    </div>
  );
}
