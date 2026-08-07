FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
COPY config/voice-runtime-requirements.txt /tmp/voice-runtime-requirements.txt
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium ffmpeg fonts-noto-cjk fonts-noto-core dumb-init espeak-ng libsndfile1 python3 python3-venv \
  && python3 -m venv /opt/voice-runtime \
  && /opt/voice-runtime/bin/python -m pip install --disable-pip-version-check --no-cache-dir --requirement /tmp/voice-runtime-requirements.txt \
  && /opt/voice-runtime/bin/python -c "import faster_whisper, kokoro_onnx, misaki, soundfile; print('voice runtime ready')" \
  && rm -f /tmp/voice-runtime-requirements.txt \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
  PORT=3000 \
  HOSTNAME=0.0.0.0 \
  CHROME_PATH=/usr/bin/chromium \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
  MEDIA_OS_VOICE_PYTHON=/opt/voice-runtime/bin/python \
  XDG_CACHE_HOME=/app/.cache \
  MEDIA_OS_WHISPER_CACHE=/app/.cache/faster-whisper \
  MEDIA_OS_WHISPER_MODELS=small,small.en

WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/next.config.ts ./next.config.ts
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/config ./config
COPY --from=build --chown=node:node /app/operations ./operations
RUN mkdir -p /data /app/renders /app/.cache && chown -R node:node /data /app/renders /app/.cache

USER node
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
