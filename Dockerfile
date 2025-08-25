# Multi-stage Dockerfile for Thumbnail Generator
# This builds both frontend and backend in a single container

FROM node:20 AS base

# Install system dependencies including FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    make \
    g++ \
    wget \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Verify FFmpeg installation (ffprobe comes with ffmpeg package)
RUN ffmpeg -version && ffprobe -version

WORKDIR /app

# Copy package files and config files
COPY package*.json ./
COPY tsconfig*.json ./
COPY next.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.mjs ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Development stage
FROM base AS development
COPY . .
EXPOSE 3000 3001
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
COPY . .

# Build both frontend and backend
RUN npm run build:frontend
RUN npm run build:backend

# Production stage
FROM node:20 AS production

# Install runtime dependencies including FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    dumb-init \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Verify FFmpeg is available (ffprobe comes with ffmpeg)
RUN ffmpeg -version && ffprobe -version

# Create app user for security
RUN groupadd -r nodejs && useradd -r -g nodejs nextjs

WORKDIR /app

# Copy built applications
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Create uploads directory
RUN mkdir -p uploads/thumbnails && \
    chown -R nextjs:nodejs uploads

# Switch to non-root user
USER nextjs

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command (can be overridden)
CMD ["node", "server.js"]
