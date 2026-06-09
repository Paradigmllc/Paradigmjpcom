# Multi-stage Dockerfile for paradigmjp.com
# Lighter than nixpacks — avoids OOM during build on 8GB Droplet

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts 2>&1 | tail -3

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build 2>&1 | tail -10

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
