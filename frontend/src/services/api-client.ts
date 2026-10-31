export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const baseUrl = API_BASE_URL.replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

// User & Tab Session Isolation:
// We use sessionStorage as the authoritative storage for the active session tokens.
// Each browser tab / window context gets its own completely isolated storage,
// ensuring User A in Tab 1 and User B in Tab 2 never overwrite or cross-pollinate tokens.
const ACCESS_TOKEN_KEY = "sow_access_token";
const REFRESH_TOKEN_KEY = "sow_refresh_token";
const LEGACY_TOKEN_KEY = "sow_session_token";

export function getStoredSessionToken(): string | null {
  try {
    return (
      sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
      sessionStorage.getItem(LEGACY_TOKEN_KEY)
    );
  } catch {
    return null;
  }
}

export function getStoredRefreshToken(): string | null {
  try {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredSessionToken(
  token: string,
  refreshToken?: string,
  _remember: boolean = false
): void {
  try {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    sessionStorage.setItem(LEGACY_TOKEN_KEY, token);
    if (refreshToken) {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export function clearStoredSessionToken(): void {
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // Ignore
  }
}

// In-flight refresh promise to deduplicate concurrent refresh requests within the tab
let refreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        clearStoredSessionToken();
        return null;
      }

      const data = await response.json();
      const newAccessToken = data.accessToken || data.token;
      const newRefreshToken = data.refreshToken;

      if (newAccessToken) {
        setStoredSessionToken(newAccessToken, newRefreshToken);
        return newAccessToken;
      }

      clearStoredSessionToken();
      return null;
    } catch {
      clearStoredSessionToken();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function api<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> || {})
  };

  const token = getStoredSessionToken();
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    credentials: "include",
    headers,
    ...init
  });

  // Handle automatic token refresh on HTTP 401 Unauthorized
  if (
    response.status === 401 &&
    !path.startsWith("/auth/login") &&
    !path.startsWith("/auth/refresh") &&
    getStoredRefreshToken()
  ) {
    const newAccessToken = await attemptTokenRefresh();
    if (newAccessToken) {
      // Retry original request with newly issued access token
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${newAccessToken}`,
      };

      const retryResponse = await fetch(`${baseUrl}${path}`, {
        credentials: "include",
        headers: retryHeaders,
        ...init,
      });

      if (!retryResponse.ok) {
        const body = await retryResponse.json().catch(() => ({}));
        throw new ApiError(body.message || "Request failed", retryResponse.status);
      }

      if (retryResponse.status === 204) {
        return undefined as T;
      }

      return retryResponse.json();
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.message || "Request failed", response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export async function downloadCsv(path: string, filename: string): Promise<void> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${cleanPath}`;
  const token = getStoredSessionToken();

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.message || "Unable to download report", response.status);
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export const apiClient = api;
export default api;
