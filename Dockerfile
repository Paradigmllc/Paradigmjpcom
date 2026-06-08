# Dockerfile for paradigm-hp
# Node 22.12, single-stage (mirrors nixpacks build flow)
FROM node:22.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl wget && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts && npm rebuild

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV PAYLOAD_READS_DISABLED_DURING_BUILD=1
ENV NODE_ENV=production

RUN npx payload generate:importmap
RUN npx next build --webpack

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000
CMD ["npx", "next", "start"]
