import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { BrandLogo } from "../shared/components/BrandLogo";
import { ADMIN_NAVIGATION } from "../shared/constants/navigation";

export function AdminLayout() {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    organization: true,
    people: true,
  });

  const visibleNav = ADMIN_NAVIGATION.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  const currentPath = location.pathname;
  const activeNav =
    visibleNav.find(
      (item) => currentPath === item.path || currentPath.startsWith(item.path + "/")
    ) || visibleNav[0];

  function handleSelect(path: string, childKey?: string) {
    navigate(childKey ? `${path}?sub=${encodeURIComponent(childKey)}` : path);
    setMobileNav(false);
  }

  return (
    <div className="admin-shell bg-grid-warm">

      {/* Top System Status Bar matching login aesthetic */}
      <header className="sow-login-header relative z-20 w-full shrink-0 border-b border-stone bg-porcelain/90 px-4 py-1.5 backdrop-blur-md sm:px-6 lg:px-8">
        <div className="sow-login-header-inner mx-auto flex w-full max-w-7xl items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 font-semibold text-charcoal">
              <span
                className="inline-block h-2 w-2 rounded-xs"
                style={{ backgroundColor: "#BE755F" }}
              />
              <span className="tracking-tight">CENTRAL COMMAND</span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-charcoal-muted">
            <span className="hidden border-l border-stone pl-3 text-[11px] text-charcoal-subtle md:inline">
              Version 1.26.1
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

        {/* Sidebar */}
        <aside className={`admin-sidebar ${mobileNav ? "open" : ""}`}>
          <div className="sidebar-brand">
            <div className="brand-mark">
              <BrandLogo />
            </div>
            <div>
              <strong className="font-sans text-sm font-bold text-charcoal">Science on Wheels</strong>
              <span className="font-mono text-[10px] text-charcoal-muted uppercase tracking-wider">
                Super Administrator
              </span>
            </div>
          </div>

          <div className="command-role">
            <span className="font-mono text-[9px] font-bold tracking-widest text-charcoal">
              SUPER ADMIN
            </span>
            <b className="font-mono text-[8px] text-charcoal-subtle uppercase">
              COMMAND / CONTROL / ANALYSE
            </b>
          </div>

          <nav>
            {visibleNav.map((item) => {
              const isActive = activeNav?.key === item.key;
              return (
                <div key={item.key} className="nav-group">
                  <button
                    className={`nav-item ${isActive ? "active" : ""}`}
                    onClick={() => {
                      if (item.children && item.children.length > 0) {
                        setExpanded((p) => ({ ...p, [item.key]: !p[item.key] }));
                      }
                      handleSelect(item.path);
                    }}
                  >
                    <i>{item.icon}</i>
                    <span>{item.label}</span>
                    {item.children && item.children.length > 0 && (
                      <b className="font-mono text-xs">{expanded[item.key] ? "−" : "+"}</b>
                    )}
                  </button>
                  {expanded[item.key] && item.children && item.children.length > 0 && (
                    <div className="subnav">
                      {item.children.map((c) => (
                        <button
                          key={c}
                          className={location.search.includes(encodeURIComponent(c)) ? "selected" : ""}
                          onClick={() => handleSelect(item.path, c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="sidebar-bottom">
            <div className="sync-indicator font-mono text-[10px]">
              <span /> Authenticated workspace
            </div>
            <button className="logout font-mono text-xs" onClick={() => void logout()}>
              ↪ Sign out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="admin-main">
          <header className="admin-topbar">
            <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}>
              ☰
            </button>
            <div className="breadcrumbs font-mono text-xs">
              <span>Science on Wheels</span>
              <b className="text-stone">›</b>
              <strong className="text-charcoal font-semibold">{activeNav?.label}</strong>
            </div>

            <div className="top-actions">
              <button className="top-search font-mono text-xs">
                ⌕ <span>Search modules...</span>
                <kbd className="font-mono text-[9px]">⌘ K</kbd>
              </button>

              <div className="profile">
                <div className="avatar font-mono">
                  {(user?.name || "SA").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <strong className="text-xs text-charcoal font-medium">
                    {user?.name || "Super Admin"}
                  </strong>
                  <span className="font-mono text-[10px] text-charcoal-subtle">
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
