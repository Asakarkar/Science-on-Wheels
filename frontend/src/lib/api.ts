const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
export const baseUrl = (rawBaseUrl ? rawBaseUrl.replace(/\/+$/, "") : "/api");

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

export async function api<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = buildApiUrl(path);
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
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

export async function downloadCsv(path: string, filename: string): Promise<void> {
  const url = buildApiUrl(path);
  const response = await fetch(url, {
    credentials: "include",
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

