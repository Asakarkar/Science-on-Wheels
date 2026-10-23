import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { BrandLogo } from "../shared/components/BrandLogo";
import { FIELD_NAVIGATION } from "../shared/constants/navigation";

export function FieldLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    assignments: true,
    experiments: true,
  });

  const currentPath = location.pathname;
  const activeNav =
    FIELD_NAVIGATION.find(
      (item) => currentPath === item.path || currentPath.startsWith(item.path + "/")
    ) || FIELD_NAVIGATION[0];

  function handleSelect(path: string, childKey?: string) {
    navigate(childKey ? `${path}?sub=${encodeURIComponent(childKey)}` : path);
    setMobileNav(false);
  }

  return (
    <div className="field-shell instructor-shell bg-grid-warm">

      {/* Top System Status Bar matching login aesthetic */}
      <header className="sow-login-header relative z-20 w-full shrink-0 border-b border-stone bg-porcelain/90 px-4 py-1.5 backdrop-blur-md sm:px-6 lg:px-8">
        <div className="sow-login-header-inner mx-auto flex w-full max-w-7xl items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 font-semibold text-charcoal">
              <span
                className="inline-block h-2 w-2 rounded-xs"
                style={{ backgroundColor: "#B45309" }}
              />
              <span className="tracking-tight">FIELD OPERATIONS</span>
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

        {/* Field Operations Sidebar */}
        <aside className={`field-sidebar ${mobileNav ? "open" : ""}`}>
          <div className="field-brand">
            <div className="field-logo instructor">
              <BrandLogo />
            </div>
            <div>
              <strong className="font-sans text-sm font-bold text-charcoal">Science on Wheels</strong>
              <span className="font-mono text-[10px] text-charcoal-muted uppercase tracking-wider">
                Field Operations
              </span>
            </div>
          </div>

          <div className="field-role instructor">
            <span className="font-mono text-[9px] font-bold tracking-widest text-charcoal">
              SCIENCE COMMUNICATOR
            </span>
            <b className="font-mono text-[8px] text-charcoal-subtle uppercase">
              EXPLORE / TEACH / EXPERIMENT / DISCOVER
            </b>
          </div>

          <nav>
            {FIELD_NAVIGATION.map((item) => {
              const isActive = activeNav.key === item.key;
              return (
                <div key={item.key} className="field-nav-group">
                  <button
                    className={`field-nav ${isActive ? "active" : ""}`}
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
                    <div className="field-subnav">
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

          <div className="field-bottom">
            <span className="font-mono text-[10px]">● Active Field Shift</span>
            <button className="font-mono text-xs" onClick={() => void logout()}>
              ↪ Sign out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="field-main">
          <header className="field-top">
            <button className="field-mobile" onClick={() => setMobileNav(!mobileNav)}>
              ☰
            </button>
            <div className="breadcrumbs font-mono text-xs">
              <span>Science on Wheels</span>
              <b className="text-stone">›</b>
              <strong className="text-charcoal font-semibold">{activeNav?.label}</strong>
            </div>

            <div className="field-user">
              <div className="avatar font-mono" style={{ backgroundColor: "#1E242B" }}>
                {(user?.name || "SC").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <span className="text-xs text-charcoal font-medium">{user?.name || "Field User"}</span>
                <small className="block font-mono text-[9px] text-charcoal-subtle">
                  SCIENCE COMMUNICATOR
                </small>
              </div>
            </div>
          </header>

          <div className="field-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
