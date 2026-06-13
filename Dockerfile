# syntax = docker/dockerfile:1
# ─── Multi-stage Dockerfile with BuildKit cache mounts for fast deploys ───
# build-id: telegram-revenueos-v2
# Stage 1 (deps): cached unless package.json/package-lock.json change
# Stage 2 (build): cached unless source code changes (Next.js cache persisted)
# Stage 3 (runner): minimal production image
# ─── Requires next.config.ts: output: "standalone" ───

FROM node:22.12.0-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm npm install --prefer-offline --no-audit --no-fund

FROM node:22.12.0-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/package-lock.json ./
COPY tsconfig.json next.config.ts postcss.config.mjs components.json ./
COPY payload.config.ts keystatic.config.ts ./
COPY src ./src
COPY public ./public
COPY content ./content
COPY messages ./messages
COPY scripts ./scripts
ENV NEXT_TELEMETRY_DISABLED=1
ENV PAYLOAD_CONFIG_PATH=/app/payload.config.ts
ENV PAYLOAD_DISABLE_DATABASE_DURING_BUILD=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN --mount=type=cache,target=/app/.next/cache,id=paradigm-next-cache-v2 npm run build -- --turbo

FROM node:22.12.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN apk add --no-cache curl
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/content ./content
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 CMD curl -fsS "http://127.0.0.1:${PORT:-3000}/" >/dev/null || exit 1
CMD ["node", "server.js"]
