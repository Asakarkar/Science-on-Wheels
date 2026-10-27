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
    // Determine the safe destination portal for the user's role without infinite loops
    let destination = "/login";
    if (user.role === "SUPER_ADMIN") {
      destination = "/admin/dashboard";
    } else if (user.role === "REGIONAL_ADMIN") {
      destination = "/regional/dashboard";
    } else if (user.role === "SCIENCE_COMMUNICATOR") {
      destination = "/field/dashboard";
    }

    return <Navigate to={destination} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
