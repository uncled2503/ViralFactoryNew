# ==========================================
# STAGE 1: Build the Frontend and Backend
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for compiling)
RUN npm ci

# Copy full application codebase
COPY . .

# Vite bakes these into the static JS bundle at build time (they're not readable
# at container runtime), so they must arrive as build args, not just env vars.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build the React static frontend and compile the Express backend bundle via esbuild
RUN npm run build

# ==========================================
# STAGE 2: Production Lightweight Runtime
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Install system-level curl for container health check probes
RUN apk add --no-cache curl

# Copy build artifacts and package manifests from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public

# Install ONLY production dependencies to keep image footprint small
RUN npm ci --only=production

# Expose the standard communication port
EXPOSE 3000

# Implement Docker native Healthcheck pointing to the custom endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the bundled Express / WebSocket Coordinator
CMD ["node", "dist/server.cjs"]
