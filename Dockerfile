# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /build

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Build application
RUN npm run build

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
COPY --from=builder /build/.env.example ./.env.example

# Install only production dependencies
RUN npm ci --prefer-offline --no-audit --production && npm cache clean --force

# Copy health check script
COPY docker-healthcheck.sh /app/healthcheck.sh
RUN chmod +x /app/healthcheck.sh

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node /app/healthcheck.sh || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]
