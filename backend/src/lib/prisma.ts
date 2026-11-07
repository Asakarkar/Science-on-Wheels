import { PrismaClient } from "@prisma/client";
import dns from "node:dns";

// Ensure Node.js resolves IPv4 first for Supabase pooler compatibility
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore on older Node runtimes
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
