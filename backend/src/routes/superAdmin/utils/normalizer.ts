import crypto from "node:crypto";
import { dateFields } from "../config/resourceConfig";

export function newId(): string {
  return crypto.randomUUID();
}

export function normalizePayload(input: any): Record<string, any> {
  const data = { ...(input || {}) };
  delete data.id;
  for (const key of Object.keys(data)) {
    if (dateFields.has(key) && data[key]) {
      data[key] = new Date(data[key]);
    }
  }
  return data;
}

