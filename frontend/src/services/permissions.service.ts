import type { AuthUser, Role } from "../shared/types/auth";

export const permissionsService = {
  hasRole(user: AuthUser | null, roles: Role | Role[]): boolean {
    if (!user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.role);
  },

  hasPermission(user: AuthUser | null, permission: string): boolean {
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true;
    return user.permissions.includes(permission);
  },

  hasAnyPermission(user: AuthUser | null, permissions: string[]): boolean {
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true;
    return permissions.some((perm) => user.permissions.includes(perm));
  },
};
