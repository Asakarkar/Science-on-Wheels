import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { BrandLogo } from "../shared/components/BrandLogo";
import { NavIcon } from "../shared/components/NavIcon";
import { ADMIN_NAV_SECTIONS, type AdminNavSection, type NavSubItem } from "../shared/constants/navigation";

export function AdminLayout() {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    organization: true,
    "inventory-ops": true,
    monitoring: true,
  });

  const currentPath = location.pathname;

  let activeItem: NavSubItem | undefined;
  let activeSection: AdminNavSection | undefined;

  for (const section of ADMIN_NAV_SECTIONS) {
    for (const item of section.items) {
      const match =
        currentPath === item.path ||
        (item.path !== "/admin/dashboard" && currentPath.startsWith(item.path));
      if (match) {
        activeItem = item;
        activeSection = section;
        break;
      }
    }
    if (activeItem) break;
  }

  function handleSelect(path: string) {
    navigate(path);
    setMobileNav(false);
  }

  return (
    <div className="admin-shell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* System status bar */}
      <div className="status-bar">
        <div className="status-bar-left">
          <div className="status-bar-dot" />
          <span className="status-bar-label">Central Command</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "10px" }}>·</span>
          <span style={{ fontSize: "10px" }}>Super Administrator Portal</span>
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
        <aside className={`admin-sidebar ${mobileNav ? "open" : ""}`}>
          {/* Brand */}
          <div className="sidebar-brand">
            <div className="brand-mark" style={{ backgroundColor: "var(--brand)" }}>
              <BrandLogo size={20} color="#fff" />
            </div>
            <div className="sidebar-brand-text" style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <div className="sidebar-brand-name">Science on Wheels</div>
              <div className="sidebar-brand-role">Administration</div>
            </div>
          </div>

          {/* Role tag */}
          <div className="command-role">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", fontWeight: 600, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Super Admin
            </span>
            <b style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 400 }}>
              Control · Manage · Analyse
            </b>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
            {ADMIN_NAV_SECTIONS.map((section) => {
              const visibleItems = section.items.filter(
                (item) => !item.permission || hasPermission(item.permission)
              );
              if (visibleItems.length === 0) return null;

              if (section.type === "heading") {
                return (
                  <div key={section.key} className="nav-section-group">
                    <div className="nav-section-heading">{section.label}</div>
                    {visibleItems.map((item) => {
                      const isActive =
                        currentPath === item.path ||
                        (item.path !== "/admin/dashboard" && currentPath.startsWith(item.path));
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className={`nav-item ${isActive ? "active" : ""}`}
                          onClick={() => handleSelect(item.path)}
                        >
                          <NavIcon name={item.icon} size={15} className="nav-icon" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              }

              const isExpanded = expanded[section.key] ?? true;
              const hasActiveChild = visibleItems.some(
                (item) =>
                  currentPath === item.path ||
                  (item.path !== "/admin/dashboard" && currentPath.startsWith(item.path))
              );

              return (
                <div key={section.key} className="nav-section-group">
                  <button
                    type="button"
                    className={`nav-dropdown-trigger ${hasActiveChild ? "has-active" : ""}`}
                    onClick={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [section.key]: !isExpanded,
                      }))
                    }
                    aria-expanded={isExpanded}
                  >
                    <NavIcon name={section.icon || "ChevronDown"} size={14} className="nav-icon" />
                    <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "9.5px", fontWeight: 600, letterSpacing: "0.08em" }}>
                      {section.label}
                    </span>
                    <NavIcon
                      name="ChevronDown"
                      size={13}
                      className="nav-chevron"
                      style={{
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 180ms ease",
                        opacity: 0.5,
                      }}
                    />
                  </button>

                  {isExpanded && (
                    <div className="subnav">
                      {visibleItems.map((item) => {
                        const isActive =
                          currentPath === item.path ||
                          (item.path !== "/admin/dashboard" && currentPath.startsWith(item.path));
                        return (
                          <button
                            key={item.key}
                            type="button"
                            className={`nav-sub-item ${isActive ? "active" : ""}`}
                            onClick={() => handleSelect(item.path)}
                          >
                            <NavIcon name={item.icon} size={13} className="nav-icon" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="sidebar-bottom">
            <div className="sync-indicator">
              <span style={{ backgroundColor: "var(--success)" }} />
              Authenticated workspace
            </div>
            <button className="logout" onClick={() => void logout()}>
              <NavIcon name="LogOut" size={14} style={{ opacity: 0.65 }} />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="admin-main">
          {/* Top bar */}
          <header className="admin-topbar">
            <button
              className="mobile-menu"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label="Toggle navigation menu"
            >
              <NavIcon name="Menu" size={18} />
            </button>

            <div className="breadcrumbs">
              <span>Science on Wheels</span>
              <span style={{ color: "var(--text-disabled)" }}>›</span>
              {activeSection && activeSection.type === "dropdown" && (
                <>
                  <span style={{ color: "var(--text-muted)" }}>{activeSection.label}</span>
                  <span style={{ color: "var(--text-disabled)" }}>›</span>
                </>
              )}
              <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                {activeItem?.label || "Dashboard"}
              </strong>
            </div>

            <div className="top-actions">
              <button
                className="top-search"
                onClick={() => navigate("/admin/inventory")}
              >
                <NavIcon name="Search" size={13} />
                <span>Search modules…</span>
                <kbd style={{ fontFamily: "var(--font-mono)", fontSize: "9px", padding: "1px 4px", border: "1px solid var(--border-strong)", borderRadius: "3px", backgroundColor: "var(--surface-2)", color: "var(--text-subtle)" }}>
                  ⌘ K
                </kbd>
              </button>

              <div className="profile">
                <div className="avatar" style={{ backgroundColor: "var(--brand)" }}>
                  {(user?.name || "SA").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <strong style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {user?.name || "Super Admin"}
                  </strong>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-subtle)", display: "block" }}>
                    {user?.email || "admin@sow.org"}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <div className="page-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
