# =======================================================
# Build Stage
# =======================================================
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests
COPY package*.json tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Compile TypeScript
RUN npm run build

# Remove development dependencies to keep image small
RUN npm prune --production

# =======================================================
# Production Runtime Stage
# =======================================================
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install runtime dependencies for Sharp image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Run as non-root user
USER node

# Copy production dependencies and compiled code
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

# Create temp directory for image processing
RUN mkdir -p /app/temp

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
