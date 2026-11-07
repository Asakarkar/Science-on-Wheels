import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { BrandLogo } from "../shared/components/BrandLogo";
import { REGIONAL_NAV_SECTIONS, NavSubItem, AdminNavSection } from "../shared/constants/navigation";

export function RegionalLayout() {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "regional-management": true,
    "inventory-ops": true,
    "field-ops": true,
    monitoring: true,
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
    <div className="admin-shell regional-shell bg-grid-warm">
      {/* Top System Status Bar */}
      <header className="sow-login-header relative z-20 w-full shrink-0 border-b border-stone px-4 py-1.5 backdrop-blur-md sm:px-6 lg:px-8">
        <div className="sow-login-header-inner mx-auto flex w-full max-w-7xl items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 font-semibold text-charcoal">
              <span
                className="inline-block h-2 w-2 rounded-xs"
                style={{ backgroundColor: "#176B50" }}
              />
              <span className="tracking-tight">REGIONAL OPERATIONS COMMAND</span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-charcoal-muted">
            <span className="hidden border-l border-stone pl-3 text-[11px] text-charcoal-subtle md:inline">
              Regional Operations Manager v1.26
            </span>
          </div>
        </div>
      </header>

      <div className="portal-body flex flex-1 overflow-hidden relative">
        {/* Mobile backdrop */}
        {mobileNav && (
          <div
            className="sidebar-backdrop fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-xs lg:hidden"
            onClick={() => setMobileNav(false)}
          />
        )}

        {/* Regional Sidebar */}
        <aside className={`admin-sidebar regional-sidebar ${mobileNav ? "open" : ""}`}>
          <div className="sidebar-brand">
            <div className="brand-mark regional-mark" style={{ backgroundColor: "#176B50" }}>
              <BrandLogo />
            </div>
            <div>
              <strong className="font-sans text-sm font-bold text-charcoal">Science on Wheels</strong>
              <span className="font-mono text-[10px] text-charcoal-muted uppercase tracking-wider">
                Regional Operations
              </span>
            </div>
          </div>

          <div className="command-role regional-role">
            <span className="font-mono text-[9px] font-bold tracking-widest text-[#176B50]">
              REGIONAL ADMIN
            </span>
            <b className="font-mono text-[8px] text-charcoal-subtle uppercase">
              PLAN / ASSIGN / COORDINATE / MONITOR
            </b>
          </div>

          <nav>
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
                          <i>{item.icon}</i>
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              }

              // Dropdown collapsible section
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
                    <i>{section.icon}</i>
                    <span>{section.label}</span>
                    <b className="font-mono text-xs">{isExpanded ? "▾" : "▸"}</b>
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
                            <i>{item.icon}</i>
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

          <div className="sidebar-bottom">
            <div className="sync-indicator font-mono text-[10px]">
              <span style={{ backgroundColor: "#176B50" }} /> Region-scoped live data
            </div>
            <button className="logout font-mono text-xs" onClick={() => void logout()}>
              ↪ Sign out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="admin-main">
          <header className="admin-topbar">
            <button
              className="mobile-menu"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label="Toggle navigation menu"
            >
              ☰
            </button>
            <div className="breadcrumbs font-mono text-xs">
              <span>Science on Wheels</span>
              <b className="text-stone">›</b>
              {activeSection && activeSection.type === "dropdown" && (
                <>
                  <span className="text-charcoal-muted">{activeSection.label}</span>
                  <b className="text-stone">›</b>
                </>
              )}
              <strong className="text-charcoal font-semibold">{activeItem?.label || "Operations"}</strong>
            </div>

            <div className="top-actions">
              <button
                className="top-search font-mono text-xs"
                onClick={() => navigate("/regional/schools")}
              >
                ⌕ <span>Search regional...</span>
                <kbd className="font-mono text-[9px]">⌘ K</kbd>
              </button>

              <div className="profile">
                <div className="avatar font-mono" style={{ backgroundColor: "#176B50" }}>
                  {(user?.name || "RA").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <strong className="text-xs text-charcoal font-medium">
                    {user?.name || "Regional Operations Admin"}
                  </strong>
                  <span className="font-mono text-[10px] text-charcoal-subtle">
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
