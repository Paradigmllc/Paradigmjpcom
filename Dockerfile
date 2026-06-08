# Dockerfile for paradigm-hp (paradigmjp.com)
# Multi-stage: deps install → build → runner
# Node 22.12 Alpine, standalone output
#
# Usage: docker build -t paradigm-hp . && docker run -p 3000:3000 paradigm-hp

FROM node:22.12-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat curl

# ── Dependencies ──
FROM base AS deps
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev --ignore-scripts

# ── Builder ──
FROM base AS builder
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV PAYLOAD_READS_DISABLED_DURING_BUILD=1
ENV SKIP_ENV_VALIDATION=1
ENV NODE_ENV=production

RUN npx payload generate:importmap
RUN npx next build --webpack

# ── Runner ──
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_MANUAL_SIG_HANDLE=true

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/payload.config.ts ./payload.config.ts
COPY --from=builder /app/.next/payload ./payload

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
