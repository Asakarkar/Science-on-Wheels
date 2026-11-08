import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { BrandLogo } from "../shared/components/BrandLogo";
import { NavIcon } from "../shared/components/NavIcon";
import { REGIONAL_NAV_SECTIONS, type NavSubItem, type AdminNavSection } from "../shared/constants/navigation";

export function RegionalLayout() {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    overview: true,
    "fleet-regional": true,
    "inventory-ops": true,
    "school-logistics": true,
    "field-ops": true,
    personnel: true,
    account: true,
  });

  const currentPath = location.pathname;

  let activeItem: NavSubItem | undefined;
  let activeSection: AdminNavSection | undefined;

  for (const section of REGIONAL_NAV_SECTIONS) {
    for (const item of section.items) {
      const match =
        currentPath === item.path ||
        (item.path !== "/regional/dashboard" && currentPath.startsWith(item.path));
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

  function toggleSection(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="admin-shell regional-shell">
      <div className="portal-body">
        {/* Mobile backdrop */}
        {mobileNav && (
          <div
            className="sidebar-backdrop"
            onClick={() => setMobileNav(false)}
          />
        )}

        {/* Regional Sidebar */}
        <aside className={`admin-sidebar regional-sidebar ${mobileNav ? "open" : ""}`}>
          {/* Brand */}
          <div className="sidebar-brand">
            <div className="brand-mark regional-mark">
              <BrandLogo size={34} />
            </div>
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <div className="sidebar-brand-name">VIBHA</div>
              <div className="sidebar-brand-role">Science on Wheels</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
            {REGIONAL_NAV_SECTIONS.map((section) => {
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
                        (item.path !== "/regional/dashboard" && currentPath.startsWith(item.path));
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className={`nav-item ${isActive ? "active" : ""}`}
                          onClick={() => handleSelect(item.path)}
                        >
                          <NavIcon name={item.icon} size={17} className="nav-icon" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              }

              const isExpanded = expanded[section.key] ?? true;
              const hasActiveChild = visibleItems.some(
                (item) => currentPath === item.path || currentPath.startsWith(item.path)
              );

              return (
                <div key={section.key} className="nav-section-group">
                  <button
                    type="button"
                    className={`nav-dropdown-trigger ${hasActiveChild ? "has-active" : ""}`}
                    onClick={() => toggleSection(section.key)}
                    aria-expanded={isExpanded}
                  >
                    <NavIcon name={section.icon || "ChevronDown"} size={16} className="nav-icon" />
                    <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {section.label}
                    </span>
                    <NavIcon
                      name="ChevronDown"
                      size={14}
                      style={{
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 200ms ease",
                        opacity: 0.6,
                      }}
                    />
                  </button>

                  {isExpanded && (
                    <div className="subnav">
                      {visibleItems.map((item) => {
                        const isActive =
                          currentPath === item.path ||
                          (item.path !== "/regional/dashboard" && currentPath.startsWith(item.path));
                        return (
                          <button
                            key={item.key}
                            type="button"
                            className={`nav-sub-item ${isActive ? "active" : ""}`}
                            onClick={() => handleSelect(item.path)}
                          >
                            <NavIcon name={item.icon} size={15} className="nav-icon" />
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
              <span />
              Regional Synced Data
            </div>
            <button className="logout" onClick={() => void logout()}>
              <NavIcon name="LogOut" size={16} style={{ opacity: 0.8 }} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="admin-main">
          {/* Top bar */}
          <header className="admin-topbar">
            <button
              className="mobile-menu"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label="Toggle navigation menu"
            >
              <NavIcon name="Menu" size={20} />
            </button>

            <div className="breadcrumbs">
              <span>VIBHA · Science on Wheels</span>
              <span style={{ color: "var(--text-subtle)", opacity: 0.6 }}>/</span>
              {activeSection && activeSection.type === "dropdown" && (
                <>
                  <span style={{ color: "var(--text-muted)" }}>{activeSection.label}</span>
                  <span style={{ color: "var(--text-subtle)", opacity: 0.6 }}>/</span>
                </>
              )}
              <strong>
                {activeItem?.label || "Operations"}
              </strong>
            </div>

            <div className="top-actions">
              <button
                className="top-search"
                onClick={() => navigate("/regional/schools")}
              >
                <NavIcon name="Search" size={15} />
                <span>Search regional records…</span>
                <kbd style={{ fontFamily: "var(--font-mono)", fontSize: "11px", padding: "2px 6px", border: "1px solid var(--border-strong)", borderRadius: "4px", backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}>
                  ⌘ K
                </kbd>
              </button>

              <div className="profile">
                <div className="avatar" style={{ backgroundColor: "var(--brand)" }}>
                  {(user?.name || "RA").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <strong style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "var(--text-primary)" }}>
                    {user?.name || "Regional Coordinator"}
                  </strong>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-subtle)", display: "block" }}>
                    {user?.email || "regional@scienceonwheels.com"}
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
