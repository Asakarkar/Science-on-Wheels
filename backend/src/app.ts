import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env, getAllowedOrigins } from "./config/env";
import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { superAdminRouter } from "./routes/superAdmin";
import { regionalAdminRouter } from "./routes/regionalAdmin";
import { fieldRouter } from "./routes/field";

export const app = express();

// Trust reverse proxies (Nginx, Caddy, Cloudflare, Railway, Render, etc.) for HTTPS detection and real client IPs
app.set("trust proxy", 1);

const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile apps, curl, server-to-server) with no origin
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/+$/, "");
      if (
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(normalized) ||
        (env.NODE_ENV !== "production" &&
          (normalized.startsWith("http://localhost") || normalized.startsWith("http://127.0.0.1")))
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "science-on-wheels-api" }));
app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/super-admin", superAdminRouter);
app.use("/api/regional-admin", regionalAdminRouter);
app.use("/api/field", fieldRouter);

app.use((err: any, _req: any, res: any, next: any) => {
  console.error("Unhandled server error:", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

