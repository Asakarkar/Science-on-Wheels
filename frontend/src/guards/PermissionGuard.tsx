import { useAuth } from "../app/providers/AuthProvider";

export interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  permission,
  children,
  fallback = (
    <div className="surface" style={{ padding: "24px", textAlign: "center" }}>
      <div className="section-kicker">ACCESS RESTRICTED</div>
      <h3>Permission Required</h3>
      <p>Your account role does not have the <code>{permission}</code> permission.</p>
    </div>
  ),
}: PermissionGuardProps) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
