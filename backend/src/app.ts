import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { superAdminRouter } from "./routes/superAdmin";
import { regionalAdminRouter } from "./routes/regionalAdmin";
import { fieldRouter } from "./routes/field";

export const app = express();

const allowedOrigins = [
  env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:")) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed: " + origin));
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

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});
