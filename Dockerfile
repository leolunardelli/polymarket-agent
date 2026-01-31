# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /build

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# Copy source code and config
COPY tsconfig.json ./
COPY src ./src

# Build application
RUN npx tsc

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy built application from builder
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/package*.json ./

# Copy public folder for dashboard HTML
COPY public ./public

# Install only production dependencies
RUN npm ci --prefer-offline --no-audit --production && npm cache clean --force

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (Railway assigns dynamically via PORT env)
EXPOSE 3000

# Health check - use simple curl instead of node script
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/api/status || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start dashboard server
CMD ["node", "dist/dashboard-server.js"]
