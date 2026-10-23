import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
<<<<<<< HEAD
import { env } from "./config/env";
=======
import { env, getAllowedOrigins } from "./config/env";
>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5
import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { superAdminRouter } from "./routes/superAdmin";
import { regionalAdminRouter } from "./routes/regionalAdmin";
import { fieldRouter } from "./routes/field";

export const app = express();

<<<<<<< HEAD
const allowedOrigins = [
  env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];
=======
// Trust reverse proxies (Nginx, Caddy, Cloudflare, Railway, Render, etc.) for HTTPS detection and real client IPs
app.set("trust proxy", 1);

const allowedOrigins = getAllowedOrigins();
>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5

app.use(
  cors({
    origin: (origin, callback) => {
<<<<<<< HEAD
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:")) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed: " + origin));
=======
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
>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5
    },
    credentials: true,
  })
);
<<<<<<< HEAD
=======

>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "science-on-wheels-api" }));
app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/super-admin", superAdminRouter);
app.use("/api/regional-admin", regionalAdminRouter);
app.use("/api/field", fieldRouter);

<<<<<<< HEAD
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});
=======
app.use((err: any, _req: any, res: any, next: any) => {
  console.error("Unhandled server error:", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

>>>>>>> 8f0ccb838a88357dc8593492829f7083907564e5
