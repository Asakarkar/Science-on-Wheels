import { Outlet } from "react-router-dom";
import { InteractiveScienceBlueprint } from "../shared/components/InteractiveScienceBlueprint";

export function AuthLayout() {
  return (
    <div className="login-shell bg-grid-warm">
      {/* Three.js Interactive Science Blueprint Background Scene */}
      <InteractiveScienceBlueprint />

      {/* Top System Status Bar */}
      <header className="login-system-header" data-purpose="system-header">
        <div className="login-system-header-inner">
          <div className="login-header-left">
            <div className="login-header-brand">
              <span className="login-status-indicator-sq" />
              <span className="login-status-title">Science on Wheels</span>
            </div>
          </div>

          <div className="login-header-right">
            <span className="login-header-version">Version 1.26.1</span>
          </div>
        </div>
      </header>

      {/* Main Centered Login Terminal Container */}
      <main className="login-main-container" data-purpose="login-container">
        <Outlet />
      </main>

      {/* Bottom Baseline Bar */}
      <footer className="login-footer">
        VIBHA · Science on Wheels Mobile Laboratory Platform
      </footer>
    </div>
  );
}
