# Dockerfile for paradigm-hp
FROM node:22.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts && npm rebuild

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV PAYLOAD_READS_DISABLED_DURING_BUILD=1
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN npx payload generate:importmap
RUN npx next build --webpack

HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/ja || exit 1

EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
