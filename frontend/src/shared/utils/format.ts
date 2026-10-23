export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  if (/\d{4}-\d{2}-\d{2}T/.test(text)) {
    try {
      return new Date(text).toLocaleString();
    } catch {
      return text;
    }
  }
  return text.replaceAll("_", " ");
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return String(dateStr);
  }
}
