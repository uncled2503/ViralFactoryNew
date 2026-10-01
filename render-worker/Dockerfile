# ==========================================
# STAGE 1: Build TypeScript into JavaScript
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install development & production dependencies
RUN npm ci

# Copy worker codebase
COPY . .

# Compile TypeScript into plain JavaScript
RUN npm run build

# ==========================================
# STAGE 2: Lightweight Production Runtime with FFmpeg
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production

# Install FFmpeg, FFprobe, and other multimedia dependencies required for video rendering
RUN apk add --no-cache ffmpeg curl font-dejavu

# Alpine's font-dejavu package installs to /usr/share/fonts/dejavu/, which isn't one of
# FontManager's checked candidate paths (those follow Debian/Ubuntu's layout). Copy it to
# a path FontManager does check so caption rendering has a default font to fall back on.
RUN mkdir -p /app/fonts && cp /usr/share/fonts/dejavu/DejaVuSans.ttf /app/fonts/DejaVuSans.ttf

# Copy compiled JavaScript and manifests from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install ONLY production dependencies (ws, dotenv, etc.)
RUN npm ci --only=production

# Verification healthcheck: ensures the worker container is running, has ffmpeg installed and reachable
HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
  CMD ffmpeg -version && node -e "require('fs').existsSync('./dist/index.js') || process.exit(1)"

# Start the compiled rendering worker
CMD ["node", "dist/index.js"]
