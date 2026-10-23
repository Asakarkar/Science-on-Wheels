import { Outlet } from "react-router-dom";
import { ThreeBackground } from "../shared/components/ThreeBackground";

export function AuthLayout() {
  return (
    <div className="sow-login-shell relative flex min-h-screen w-full flex-col overflow-x-hidden bg-grid-warm font-sans text-charcoal antialiased selection:bg-terracotta selection:text-white">
      {/* Three.js Interactive Scientific Blueprint Animation */}
      <ThreeBackground />

      {/* Top System Status Bar */}
      <header className="sow-login-header relative z-20 w-full shrink-0 border-b border-stone bg-porcelain/90 px-4 py-2.5 backdrop-blur-md sm:px-6 lg:px-8">
        <div className="sow-login-header-inner mx-auto flex w-full max-w-7xl items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2 font-semibold text-charcoal">
            <span className="tracking-tight">Science On Wheel</span>
          </div>

          <div className="flex items-center space-x-4 text-charcoal-muted">
            <span
              className="hidden border-l border-stone pl-3 text-[11px] text-charcoal-subtle md:inline"
              style={{ color: "#788286", borderColor: "#DDD7CD" }}
            >
              Version 1.26.1
            </span>
          </div>
        </div>
      </header>

      {/* Main Login & Hero Layout */}
      <main className="sow-login-main relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
        <Outlet />
      </main>
    </div>
  );
}