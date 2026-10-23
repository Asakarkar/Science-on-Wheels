import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";

export function AuthGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-state" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div className="loader-ring" />
        Authenticating session…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
