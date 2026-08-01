# syntax = docker/dockerfile:1
# Paradigm public site and the admin-only Video Factory share one Coolify
# application, but run as isolated processes on ports 3000 and 8080.

FROM node:22.23.1-alpine3.24 AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm npm install --prefer-offline --no-audit --no-fund

FROM node:22.23.1-alpine3.24 AS builder
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
ENV NEXT_BUILD_BUNDLER=webpack
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN --mount=type=cache,target=/app/.next/cache,id=paradigm-next-cache-webpack-v1 npm run build -- --webpack

FROM python:3.13.14-alpine3.24 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV VIDEO_FACTORY_INTERNAL_URL=http://127.0.0.1:8080
ENV VIDEO_FACTORY_ROOT=/opt/video-factory
ENV VIDEO_FACTORY_WORKSPACE=/data/video-factory
ENV VIDEO_FACTORY_QUEUE_BACKEND=local
ENV VIDEO_FACTORY_LOCAL_QUEUE_WORKERS=1
ENV VIDEO_FACTORY_GPU_LIFECYCLE_ENABLED=true
ENV VIDEO_FACTORY_GPU_START_TIMEOUT_SECONDS=900
ENV VIDEO_FACTORY_GPU_STOP_TIMEOUT_SECONDS=180
ENV VIDEO_FACTORY_GPU_POLL_SECONDS=5
ENV VIDEO_FACTORY_OPERATOR_EVENT_URL=http://127.0.0.1:3000/api/video-factory/events
ENV VIDEO_FACTORY_MASTER_COMPOSITOR=hyperframes
ENV VIDEO_FACTORY_ALLOW_FFMPEG_COMPOSITOR_FALLBACK=false
ENV HYPERFRAMES_VERSION=0.7.87
ENV HYPERFRAMES_RENDER_QUALITY=high
ENV HYPERFRAMES_BROWSER_PATH=/usr/bin/chromium
ENV PRODUCER_BROWSER_GPU_MODE=software
ENV PRODUCER_PUPPETEER_PROTOCOL_TIMEOUT_MS=900000
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/vast-ai-jupyter-root.crt
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

RUN apk add --no-cache curl \
      ca-certificates \
      chromium \
      ffmpeg \
      font-noto-cjk \
      git \
      libstdc++ \
      rclone \
      su-exec \
      tini

COPY --from=deps /usr/local/bin/node /usr/local/bin/node
COPY --from=deps /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && ln -s node /usr/local/bin/nodejs \
    && test "$(node --version)" = "v22.23.1" \
    && test "$(python3 --version)" = "Python 3.13.14"

COPY services/video-factory/config/vast-ai-jupyter-root.crt \
  /usr/local/share/ca-certificates/vast-ai-jupyter-root.crt
RUN update-ca-certificates

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/content ./content
COPY --chown=nextjs:nodejs services/openclaw-pipeline ./openclaw-pipeline

COPY services/video-factory /opt/video-factory
RUN python3 -m venv /opt/video-factory/.venv \
    && /opt/video-factory/.venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel \
    && cd /opt/video-factory \
    && /opt/video-factory/.venv/bin/pip install --no-cache-dir '.[api]' \
    && npm install --global "hyperframes@${HYPERFRAMES_VERSION}" --no-audit --no-fund \
    && npm --prefix /opt/video-factory/tools/playwright-capture install --omit=dev --no-audit --no-fund \
    && mkdir -p /data/video-factory \
    && chown -R nextjs:nodejs /opt/video-factory /data/video-factory

COPY docker-entrypoint.sh /usr/local/bin/paradigm-entrypoint
RUN chmod 0755 /usr/local/bin/paradigm-entrypoint

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 CMD curl -fsS "http://127.0.0.1:${PORT:-3000}/api/ready" >/dev/null || exit 1
ENTRYPOINT ["/sbin/tini", "-g", "--"]
CMD ["/usr/local/bin/paradigm-entrypoint"]
