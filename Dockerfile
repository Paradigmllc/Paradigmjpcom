# ─── Multi-stage Dockerfile with layer caching for fast deploys ───
# Stage 1 (deps): cached unless package.json/packages-lock.json change
# Stage 2 (build): cached unless source code changes
# Stage 3 (runner): minimal production image
# ─── Requires next.config.ts: output: "standalone" ───

FROM node:22.12.0-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --prefer-offline --no-audit --no-fund

FROM node:22.12.0-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV PAYLOAD_CONFIG_PATH=/app/payload.config.ts
ENV PAYLOAD_DISABLE_DATABASE_DURING_BUILD=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build -- --turbo

FROM node:22.12.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache curl
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/content ./content
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
