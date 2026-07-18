FROM python:3.12-slim-bookworm

ARG SCREENSHOT_TO_CODE_COMMIT=9df864afbf7de0ca0baa0cdc5cb9a3a1c04d43e7

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VERSION=1.8.0 \
    PYTHONPATH=/app:/opt/screenshot-to-code/backend

RUN apt-get update \
  && apt-get install -y --no-install-recommends git curl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && pip install --no-cache-dir "poetry==${POETRY_VERSION}"

WORKDIR /opt
RUN git clone --depth 1 https://github.com/abi/screenshot-to-code.git screenshot-to-code \
  && cd screenshot-to-code \
  && git fetch --depth 1 origin "${SCREENSHOT_TO_CODE_COMMIT}" \
  && git checkout --detach "${SCREENSHOT_TO_CODE_COMMIT}"

WORKDIR /opt/screenshot-to-code/backend
RUN poetry config virtualenvs.create false \
  && poetry install --only main --no-interaction --no-ansi \
  && playwright install --with-deps chromium

WORKDIR /app
COPY gateway.py deepseek_provider.py sitecustomize.py upstream_license.txt ./

ENV SCREENSHOT_TO_CODE_UPSTREAM_PORT=7001 \
    SCREENSHOT_TO_CODE_PORT=7002 \
    SCREENSHOT_TO_CODE_UPSTREAM_COMMIT=${SCREENSHOT_TO_CODE_COMMIT}

EXPOSE 7002
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
  CMD curl -fsS "http://127.0.0.1:${SCREENSHOT_TO_CODE_PORT}/health" >/dev/null || exit 1

CMD ["python", "gateway.py"]
