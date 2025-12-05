# Stage 1: Install dependencies (smaller final image)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Install ONLY production dependencies
RUN npm ci --only=production --no-optional && npm cache clean --force

# Stage 2: Production runtime
FROM node:20-alpine AS runtime
WORKDIR /app

# Copy only production node_modules and source code
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create non-root user for security (no password prompt)
RUN addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D nextjs && \
    chown -R nextjs:nodejs /app && \
    chown -R nextjs:nodejs /app/node_modules

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 5000

# Health check (optional - create healthcheck.js if needed)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Run the app
CMD ["npm", "start"]
