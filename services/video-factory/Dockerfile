FROM node:22-bookworm-slim

ARG HYPERFRAMES_VERSION=0.7.77

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    VIRTUAL_ENV=/opt/venv \
    PATH=/opt/venv/bin:$PATH \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      chromium \
      curl \
      ffmpeg \
      fonts-noto-cjk \
      git \
      python3 \
      python3-pip \
      python3-venv \
      rclone \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv "$VIRTUAL_ENV" \
    && pip install --no-cache-dir --upgrade pip setuptools wheel

WORKDIR /app

COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install --no-cache-dir '.[api,orchestrator]'

RUN npm install --global "hyperframes@${HYPERFRAMES_VERSION}"
COPY tools/playwright-capture/package.json ./tools/playwright-capture/package.json
RUN npm --prefix ./tools/playwright-capture install --omit=dev

COPY . .

RUN useradd --create-home --uid 10001 factory \
    && mkdir -p /data/video-factory \
    && chown -R factory:factory /app /data/video-factory

USER factory

EXPOSE 8080
ENTRYPOINT ["video-factory"]
CMD ["api", "--host", "0.0.0.0", "--port", "8080"]
