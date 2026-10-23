import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import type { Role } from "../shared/types/auth";

export interface RoleGuardProps {
  allowedRoles: Role[];
  children?: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-state" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div className="loader-ring" />
        Checking authorization…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to user's permitted portal
    const fallbackPath =
      user.role === "SUPER_ADMIN"
        ? "/admin/dashboard"
        : user.role === "REGIONAL_ADMIN"
        ? "/regional/dashboard"
        : "/field/dashboard";

    return <Navigate to={fallbackPath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
