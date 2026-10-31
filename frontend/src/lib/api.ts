export {
  API_BASE_URL,
  ApiError,
  api,
  apiClient,
  downloadCsv,
  getStoredSessionToken,
  setStoredSessionToken,
  clearStoredSessionToken,
} from "../services/api-client";

export { api as default } from "../services/api-client";

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
export const baseUrl = (rawBaseUrl ? rawBaseUrl.replace(/\/+$/, "") : "http://localhost:5000/api");

export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
