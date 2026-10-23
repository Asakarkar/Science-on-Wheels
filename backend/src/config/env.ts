import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
<<<<<<< HEAD
  FRONTEND_URL: z.string().url(),
=======
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).optional(),
  COOKIE_SECURE: z.coerce.boolean().optional(),
  COOKIE_DOMAIN: z.string().optional(),
>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  BOOTSTRAP_ADMIN_NAME: z.string().min(2),
  BOOTSTRAP_ADMIN_EMAIL: z.string().email(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(12),
  RESEND_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
<<<<<<< HEAD
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
=======
>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5
  // Optional integration configuration. These values do not enable a feature
  // unless the corresponding service integration is implemented and deployed.
  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  GEOAPIFY_API_KEY: z.string().optional(),
  TRACCAR_BASE_URL: z.string().optional(),
  TRACCAR_USERNAME: z.string().optional(),
  TRACCAR_PASSWORD: z.string().optional(),
  TRACKING_ENABLED: z.enum(["true", "false"]).default("false"),
  TRACKING_POLICY: z.string().default("active_trip_only"),
  TRACKING_PRIMARY_SOURCE: z.string().default("device"),
  TRACKING_FALLBACK_SOURCE: z.string().default("phone"),
  LIVE_LOCATION_STALE_AFTER_SECONDS: z.coerce.number().default(60),
  PHONE_LOCATION_UPDATE_INTERVAL_SECONDS: z.coerce.number().default(10),
  PHONE_LOCATION_MAX_AGE_SECONDS: z.coerce.number().default(30),
  LOCATION_HISTORY_RETENTION_DAYS: z.coerce.number().default(30),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_WEB_API_KEY: z.string().optional(),
  FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  FIREBASE_APP_ID: z.string().optional(),
  FIREBASE_VAPID_KEY: z.string().optional()
});

export const env = schema.parse(process.env);
<<<<<<< HEAD
=======

export function getAllowedOrigins(): string[] {
  return env.FRONTEND_URL.split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}
>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5
