import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { BrandLogo } from "../shared/components/BrandLogo";
import { NavIcon } from "../shared/components/NavIcon";
import { FIELD_NAVIGATION } from "../shared/constants/navigation";

export function FieldLayout() {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);

  const visibleNav = FIELD_NAVIGATION.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  const currentPath = location.pathname;
  const activeNav =
    visibleNav.find(
      (item) => currentPath === item.path || currentPath.startsWith(item.path + "/")
    ) || visibleNav[0];

  function handleSelect(path: string) {
    navigate(path);
    setMobileNav(false);
  }

  return (
    <div className="field-shell instructor-shell">
      {/* Top System Status Bar */}
      <div className="status-bar">
        <div className="status-bar-left">
          <div className="status-bar-dot" />
          <span className="status-bar-label">VIBHA · Field Operations Console</span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
          <span>Science Communicator Terminal</span>
        </div>
        <div className="status-bar-right">
          <span>Science on Wheels MIS</span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
          <span>Mobile Lab Linked</span>
        </div>
      </div>

      <div className="portal-body">
        {/* Mobile backdrop */}
        {mobileNav && (
          <div
            className="sidebar-backdrop"
            onClick={() => setMobileNav(false)}
          />
        )}

        {/* Field Sidebar */}
        <aside className={`admin-sidebar field-sidebar ${mobileNav ? "open" : ""}`}>
          {/* Brand */}
          <div className="sidebar-brand field-brand">
            <div className="brand-mark field-logo">
              <BrandLogo size={32} />
            </div>
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <div className="sidebar-brand-name">VIBHA</div>
              <div className="sidebar-brand-role">Field Operations</div>
            </div>
          </div>

          {/* Role badge */}
          <div className="command-role field-role">
            <span style={{ color: "var(--field-accent)" }}>SCIENCE COMMUNICATOR</span>
            <b>Explore · Teach · Discover</b>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
            <div className="nav-section-heading">Modules</div>
            {visibleNav.map((item) => {
              const isActive = activeNav?.key === item.key;
              return (
                <div key={item.key} className="nav-section-group field-nav-group">
                  <button
                    className={`nav-item field-nav ${isActive ? "active" : ""}`}
                    onClick={() => handleSelect(item.path)}
                  >
                    <NavIcon name={item.icon} size={17} className="nav-icon" />
                    <span>{item.label}</span>
                  </button>
                </div>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="sidebar-bottom field-bottom">
            <div className="sync-indicator">
              <span />
              Active Shift Connected
            </div>
            <button className="logout" onClick={() => void logout()}>
              <NavIcon name="LogOut" size={16} style={{ opacity: 0.8 }} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="admin-main field-main">
          {/* Top Bar */}
          <header className="admin-topbar field-top">
            <button
              className="mobile-menu field-mobile"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label="Toggle navigation menu"
            >
              <NavIcon name="Menu" size={20} />
            </button>

            <div className="breadcrumbs">
              <span>VIBHA · Science on Wheels</span>
              <span style={{ color: "var(--text-subtle)", opacity: 0.6 }}>/</span>
              <strong>{activeNav?.label || "Field"}</strong>
            </div>

            <div className="top-actions">
              <div className="profile field-user">
                <div className="avatar" style={{ backgroundColor: "var(--brand)" }}>
                  {(user?.name || "SC").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <strong style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "var(--text-primary)" }}>
                    {user?.name || "Field Officer"}
                  </strong>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-subtle)", display: "block" }}>
                    Science Communicator
                  </span>
                </div>
              </div>
            </div>
          </header>

          <div className="page-content field-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
