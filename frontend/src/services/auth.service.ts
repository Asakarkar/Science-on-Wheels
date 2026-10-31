import {
  api,
  setStoredSessionToken,
  clearStoredSessionToken,
  getStoredRefreshToken,
} from "./api-client";
import type { AuthUser } from "../shared/types/auth";

export interface LoginResponse {
  message?: string;
  user: AuthUser;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
}

export const authService = {
  async login(
    email: string,
    password: string,
    remember: boolean = false
  ): Promise<LoginResponse> {
    const res = await api<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const token = res.accessToken || res.token;
    if (token) {
      setStoredSessionToken(token, res.refreshToken, remember);
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

  async refreshToken(): Promise<LoginResponse> {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const res = await api<LoginResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });

    const token = res.accessToken || res.token;
    if (token) {
      setStoredSessionToken(token, res.refreshToken);
    }

    return res;
  },
};
