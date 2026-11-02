# Production Dockerfile for HS Group Attendance & Payroll Management System
FROM node:20-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy project source
COPY . .

# Expose server port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Start server
CMD ["npm", "start"]
