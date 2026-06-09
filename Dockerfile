# ─── Stage 1: Dependencies (cached unless package.json changes) ───
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 2: Build ───
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV PAYLOAD_READS_DISABLED_DURING_BUILD=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# ─── Stage 3: Runtime (production-only, minimal) ───
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Copy only production node_modules (pruned from full install)
COPY --from=builder /app/node_modules ./node_modules
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
