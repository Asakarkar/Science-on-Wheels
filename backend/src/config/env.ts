import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  FRONTEND_URL: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return url.origin === value.replace(/\/+$/, "");
    }, "must be an origin URL"),
  ALLOWED_ORIGINS: z
    .string()
    .optional()
    .refine(
      (value) =>
        !value ||
        value.split(",").every((origin) => {
          const trimmedOrigin = origin.trim();
          try {
            const url = new URL(trimmedOrigin);
            return (
              ["http:", "https:"].includes(url.protocol) &&
              url.origin === trimmedOrigin.replace(/\/+$/, "")
            );
          } catch {
            return false;
          }
        }),
      "must be a comma-separated list of origin URLs"
    ),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  SESSION_SECRET: z.string().min(32),
  BOOTSTRAP_ADMIN_NAME: z.string().min(2),
  BOOTSTRAP_ADMIN_EMAIL: z.string().email(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(12),
  SEED_DEMO_DATA: z.enum(["true", "false"]).default("false"),
  RESEND_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
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
