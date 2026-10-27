import { api, setStoredSessionToken, clearStoredSessionToken } from "./api-client";
import type { AuthUser } from "../shared/types/auth";

export interface LoginResponse {
  message?: string;
  user: AuthUser;
  token?: string;
}

export const authService = {
  async login(email: string, password: string, remember: boolean = false): Promise<LoginResponse> {
    const res = await api<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (res.token) {
      setStoredSessionToken(res.token, remember);
    }

    return res;
  },

  async logout(): Promise<void> {
    try {
      await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    } finally {
      clearStoredSessionToken();
    }
  },

  async getMe(): Promise<AuthUser> {
    return api<AuthUser>("/me");
  },
};
