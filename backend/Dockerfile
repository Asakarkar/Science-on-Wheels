# =========================================================================
# Science on Wheels - Production Dockerfile (Multi-stage)
# Compatible with x86_64 and ARM64.
# =========================================================================

# --- Stage 1: Build Dependencies & Compile ---
FROM node:22-bookworm-slim AS builder

RUN apt-get update \
  && apt-get install --no-install-recommends -y openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy the Prisma schema before compiling.
COPY prisma ./prisma

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# --- Stage 2: Production Runner ---
FROM node:22-bookworm-slim AS runner

RUN apt-get update \
  && apt-get install --no-install-recommends -y openssl dumb-init curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

# Copy package manifests
COPY package*.json ./

# Install production-only dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled assets and Prisma client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/prisma/migrations ./prisma/migrations

# Create non-root user for security
RUN chown -R node:node /app
USER node

EXPOSE 10000

# Health check to monitor backend uptime
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f "http://localhost:${PORT}/api/health" || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/server.js"]

