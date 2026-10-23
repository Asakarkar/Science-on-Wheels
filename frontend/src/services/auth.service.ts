import { api } from "./api-client";
import type { AuthUser } from "../shared/types/auth";

export interface LoginResponse {
  message: string;
  user: AuthUser;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    return api<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async logout(): Promise<void> {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
  },

  async getMe(): Promise<AuthUser> {
    return api<AuthUser>("/me");
  },
};
