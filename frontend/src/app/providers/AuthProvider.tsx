import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authService } from "../../services/auth.service";
import { permissionsService } from "../../services/permissions.service";
import type { AuthUser, Role } from "../../shared/types/auth";

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roles: Role | Role[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshUser() {
    try {
      setLoading(true);
      setError(null);
      const me = await authService.getMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshUser();
  }, []);

  async function login(email: string, password: string): Promise<AuthUser> {
    setError(null);
    const res = await authService.login(email, password);
    setUser(res.user);
    return res.user;
  }

  async function logout(): Promise<void> {
    await authService.logout();
    setUser(null);
    window.location.assign("/login");
  }

  function hasRole(roles: Role | Role[]): boolean {
    return permissionsService.hasRole(user, roles);
  }

  function hasPermission(permission: string): boolean {
    return permissionsService.hasPermission(user, permission);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        refreshUser,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
