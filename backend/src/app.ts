import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { superAdminRouter } from "./routes/superAdmin";
import { regionalAdminRouter } from "./routes/regionalAdmin";
import { fieldRouter } from "./routes/field";
import { prisma } from "./lib/prisma";

export const app = express();

const configuredOrigins = new Set(
  [env.FRONTEND_URL, env.ALLOWED_ORIGINS]
    .filter((entry): entry is string => Boolean(entry))
    .flatMap((entry) => entry.split(","))
    .map((origin) => origin.trim().replace(/\/+$/, ""))
);

const localDevelopmentOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
];

if (env.NODE_ENV !== "production") {
  localDevelopmentOrigins.forEach((origin) => configuredOrigins.add(origin));
}

const localOriginRegex = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      const normalizedOrigin = origin.replace(/\/+$/, "");
      if (
        configuredOrigins.has(normalizedOrigin) ||
        (env.NODE_ENV !== "production" && localOriginRegex.test(normalizedOrigin))
      ) {
        return callback(null, true);
      }
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "X-Refresh-Token",
      "X-Session-Token",
    ],
    maxAge: 600,
  })
);

// Security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Science on Wheels API is running",
    status: "healthy",
  });
});

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      ok: true,
      service: "science-on-wheels-api",
      success: true,
      message: "Science on Wheels API and database are healthy",
      status: "healthy",
    });
  } catch (error) {
    console.error("[Health] Database check failed:", error);
    res.status(503).json({
      ok: false,
      service: "science-on-wheels-api",
      success: false,
      message: "Science on Wheels API database is unavailable",
      status: "unhealthy",
    });
  }
});
app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/super-admin", superAdminRouter);
app.use("/api/regional-admin", regionalAdminRouter);
app.use("/api/field", fieldRouter);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});
