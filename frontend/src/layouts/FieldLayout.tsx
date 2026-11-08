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
    <div className="field-shell instructor-shell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* System status bar */}
      <div className="status-bar">
        <div className="status-bar-left">
          <div className="status-bar-dot" />
          <span className="status-bar-label">Field Operations</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "10px" }}>·</span>
          <span style={{ fontSize: "10px" }}>Science Communicator Portal</span>
        </div>
        <div className="status-bar-right">
          <span>Science on Wheels MIS</span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
          <span>v1.26</span>
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

        {/* Sidebar */}
        <aside className={`admin-sidebar field-sidebar ${mobileNav ? "open" : ""}`}>
          {/* Brand */}
          <div className="sidebar-brand field-brand">
            <div className="brand-mark field-logo" style={{ backgroundColor: "var(--accent)" }}>
              <BrandLogo size={20} color="#fff" />
            </div>
            <div className="sidebar-brand-text" style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <div className="sidebar-brand-name">Science on Wheels</div>
              <div className="sidebar-brand-role">Field Operations</div>
            </div>
          </div>

          {/* Role tag */}
          <div className="command-role field-role" style={{ borderColor: "var(--accent-soft)", backgroundColor: "var(--accent-light)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Science Communicator
            </span>
            <b style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 400 }}>
              Explore · Teach · Discover
            </b>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
            <div className="nav-section-heading">Navigation</div>
            {visibleNav.map((item) => {
              const isActive = activeNav?.key === item.key;
              return (
                <div key={item.key} className="nav-section-group field-nav-group">
                  <button
                    className={`nav-item field-nav ${isActive ? "active" : ""}`}
                    onClick={() => handleSelect(item.path)}
                    style={{ "--active-color": "var(--accent)" } as React.CSSProperties}
                  >
                    <NavIcon name={item.icon} size={15} className="nav-icon" />
                    <span>{item.label}</span>
                  </button>
                </div>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="sidebar-bottom field-bottom">
            <div className="sync-indicator">
              <span style={{ backgroundColor: "var(--success)" }} />
              Active Field Shift
            </div>
            <button className="logout" onClick={() => void logout()}>
              <NavIcon name="LogOut" size={14} style={{ opacity: 0.65 }} />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="admin-main field-main">
          {/* Top bar */}
          <header className="admin-topbar field-top">
            <button
              className="mobile-menu field-mobile"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label="Toggle navigation menu"
            >
              <NavIcon name="Menu" size={18} />
            </button>

            <div className="breadcrumbs">
              <span>Science on Wheels</span>
              <span style={{ color: "var(--text-disabled)" }}>›</span>
              <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                {activeNav?.label || "Field"}
              </strong>
            </div>

            <div className="top-actions">
              <div className="profile field-user">
                <div className="avatar" style={{ backgroundColor: "var(--accent)" }}>
                  {(user?.name || "SC").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <strong style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {user?.name || "Field User"}
                  </strong>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-subtle)", display: "block" }}>
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
