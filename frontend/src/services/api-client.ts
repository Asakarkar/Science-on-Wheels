export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const baseUrl = API_BASE_URL;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    ...init
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.message || "Request failed", response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const apiClient = api;
export default api;
