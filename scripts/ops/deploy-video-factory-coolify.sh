#!/usr/bin/env bash
set -euo pipefail

: "${COOLIFY_API_URL:?COOLIFY_API_URL is required}"
: "${COOLIFY_API_TOKEN:?COOLIFY_API_TOKEN is required}"
: "${PROJECT_UUID:?PROJECT_UUID is required}"
: "${SERVER_UUID:?SERVER_UUID is required}"
: "${DESTINATION_UUID:?DESTINATION_UUID is required}"
: "${MAIN_APP_UUID:?MAIN_APP_UUID is required}"
: "${VIDEO_FACTORY_BRANCH:?VIDEO_FACTORY_BRANCH is required}"

VIDEO_FACTORY_APP_NAME="${VIDEO_FACTORY_APP_NAME:-paradigm-video-factory}"
API="${COOLIFY_API_URL%/}/api/v1"

if [[ ! "${VIDEO_FACTORY_BRANCH}" =~ ^[A-Za-z0-9._/-]+$ ]]; then
  echo "VIDEO_FACTORY_BRANCH contains unsupported characters" >&2
  exit 2
fi

request() {
  local method="$1" path="$2" body="${3:-}" response_file status
  response_file="$(mktemp)"
  if [[ -n "${body}" ]]; then
    status="$(curl --silent --show-error --output "${response_file}" --write-out '%{http_code}' \
      --request "${method}" \
      --header "Authorization: Bearer ${COOLIFY_API_TOKEN}" \
      --header "Accept: application/json" \
      --header "Content-Type: application/json" \
      --data "${body}" \
      "${API}${path}" || true)"
  else
    status="$(curl --silent --show-error --output "${response_file}" --write-out '%{http_code}' \
      --request "${method}" \
      --header "Authorization: Bearer ${COOLIFY_API_TOKEN}" \
      --header "Accept: application/json" \
      "${API}${path}" || true)"
  fi
  if [[ ! "${status}" =~ ^2 ]]; then
    printf 'Coolify %s %s failed with HTTP %s:\n' "${method}" "${path}" "${status}" >&2
    if [[ -s "${response_file}" ]]; then
      head -c 4000 "${response_file}" >&2
      printf '\n' >&2
    else
      printf '<empty response body>\n' >&2
    fi
    cp "${response_file}" /tmp/video-factory-coolify-error.json 2>/dev/null || true
    rm -f "${response_file}"
    return 1
  fi
  cat "${response_file}"
  rm -f "${response_file}"
}

printf 'stage=list-applications\n'
apps="$(request GET /applications)"
app_uuid="$(printf '%s' "${apps}" | jq -r --arg name "${VIDEO_FACTORY_APP_NAME}" '[.[] | select(.name == $name)][0].uuid // empty')"

printf 'stage=resolve-environment\n'
environments="$(request GET "/projects/${PROJECT_UUID}/environments")"
environment_uuid="$(printf '%s' "${environments}" | jq -er '
  if type == "array" then
    ([.[] | select((.name // "" | ascii_downcase) == "production")][0].uuid // .[0].uuid)
  elif (.environments | type) == "array" then
    ([.environments[] | select((.name // "" | ascii_downcase) == "production")][0].uuid // .environments[0].uuid)
  else empty end
')"
environment_name="$(printf '%s' "${environments}" | jq -r --arg uuid "${environment_uuid}" '
  if type == "array" then ([.[] | select(.uuid == $uuid)][0].name // "production")
  else ([.environments[] | select(.uuid == $uuid)][0].name // "production") end
')"

# Coolify's public-Git creation route is not available on this installation.
# Create a Dockerfile-only application instead. The Dockerfile clones the
# selected public branch at build time, and build cache is disabled so every
# production deployment consumes the current branch contents.
factory_dockerfile="$(cat <<'DOCKERFILE'
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
      gosu \
      python3 \
      python3-pip \
      python3-venv \
      rclone \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv "$VIRTUAL_ENV" \
    && pip install --no-cache-dir --upgrade pip setuptools wheel

WORKDIR /app
RUN git clone --depth 1 --branch "__VIDEO_FACTORY_BRANCH__" \
      https://github.com/Paradigmllc/Paradigmjpcom.git /tmp/paradigm \
    && cp -a /tmp/paradigm/services/video-factory/. /app/ \
    && rm -rf /tmp/paradigm

RUN pip install --no-cache-dir '.[api,orchestrator]'
RUN npm install --global "hyperframes@${HYPERFRAMES_VERSION}"
RUN npm --prefix ./tools/playwright-capture install --omit=dev

RUN useradd --create-home --uid 10001 factory \
    && mkdir -p /data/video-factory \
    && chown -R factory:factory /app /data/video-factory \
    && install -m 0755 docker-entrypoint.sh /usr/local/bin/video-factory-entrypoint

EXPOSE 8080
ENTRYPOINT ["video-factory-entrypoint"]
CMD ["uvicorn", "video_factory.web:app", "--host", "0.0.0.0", "--port", "8080"]
DOCKERFILE
)"
factory_dockerfile="${factory_dockerfile//__VIDEO_FACTORY_BRANCH__/${VIDEO_FACTORY_BRANCH}}"
dockerfile_b64="$(printf '%s' "${factory_dockerfile}" | base64 | tr -d '\n')"

application_payload="$(jq -cn \
  --arg project_uuid "${PROJECT_UUID}" \
  --arg server_uuid "${SERVER_UUID}" \
  --arg destination_uuid "${DESTINATION_UUID}" \
  --arg environment_uuid "${environment_uuid}" \
  --arg environment_name "${environment_name}" \
  --arg dockerfile "${dockerfile_b64}" \
  --arg name "${VIDEO_FACTORY_APP_NAME}" \
  '{
    project_uuid: $project_uuid,
    server_uuid: $server_uuid,
    destination_uuid: $destination_uuid,
    environment_uuid: $environment_uuid,
    environment_name: $environment_name,
    dockerfile: $dockerfile,
    build_pack: "dockerfile",
    ports_exposes: "8080",
    name: $name,
    description: "Browser-operated Paradigm VaaS production console",
    is_auto_deploy_enabled: false,
    is_force_https_enabled: true,
    autogenerate_domain: true,
    connect_to_docker_network: true,
    disable_build_cache: true,
    health_check_enabled: true,
    health_check_path: "/health",
    health_check_port: 8080,
    health_check_host: "localhost",
    health_check_method: "GET",
    health_check_return_code: 200,
    health_check_scheme: "http",
    health_check_interval: 10,
    health_check_timeout: 5,
    health_check_retries: 12,
    health_check_start_period: 90,
    force_domain_override: false,
    instant_deploy: false
  }')"

if [[ -z "${app_uuid}" ]]; then
  printf 'stage=create-dockerfile-application\n'
  created="$(request POST /applications/dockerfile "${application_payload}")"
  app_uuid="$(printf '%s' "${created}" | jq -er '.uuid')"
fi

# The Dockerfile-only create endpoint in some Coolify versions derives the
# exposed port from the still-base64 request body and may fall back to port 80.
# Apply the canonical runtime configuration after both create and update.
printf 'stage=normalize-application\n'
update_payload="$(printf '%s' "${application_payload}" | jq 'del(.project_uuid,.server_uuid,.destination_uuid,.environment_uuid,.environment_name,.dockerfile,.autogenerate_domain)')"
request PATCH "/applications/${app_uuid}" "${update_payload}" >/dev/null

printf 'stage=ensure-persistent-storage\n'
storages="$(request GET "/applications/${app_uuid}/storages")"
if ! printf '%s' "${storages}" | jq -e '.[] | select(.mount_path == "/data/video-factory")' >/dev/null; then
  storage_payload='{"type":"persistent","name":"video-factory-data","mount_path":"/data/video-factory","host_path":null}'
  request POST "/applications/${app_uuid}/storages" "${storage_payload}" >/dev/null
fi

printf 'stage=read-existing-admin-credential\n'
main_envs="$(request GET "/applications/${MAIN_APP_UUID}/envs")"
factory_key="$(printf '%s' "${main_envs}" | jq -er '
  [
    .[]
    | select(.is_preview != true)
    | select(.key == "ADMIN_PASSWORD" or .key == "ADMIN_SCRIPT_SECRET")
    | {priority: (if .key == "ADMIN_PASSWORD" then 0 else 1 end), value: (.real_value // .value)}
    | select(.value != null and .value != "")
  ]
  | sort_by(.priority)
  | .[0].value
')"
[[ -n "${factory_key}" ]]

printf 'stage=update-environment\n'
env_payload="$(jq -cn \
  --arg factory_key "${factory_key}" \
  '{data: [
    {key:"VIDEO_FACTORY_ENVIRONMENT", value:"production", is_preview:false, is_literal:true, is_multiline:false},
    {key:"VIDEO_FACTORY_API_KEY", value:$factory_key, is_preview:false, is_literal:true, is_multiline:false, is_shown_once:true},
    {key:"VIDEO_FACTORY_WORKSPACE", value:"/data/video-factory", is_preview:false, is_literal:true, is_multiline:false},
    {key:"VIDEO_FACTORY_QUEUE_BACKEND", value:"local", is_preview:false, is_literal:true, is_multiline:false},
    {key:"VIDEO_FACTORY_LOCAL_QUEUE_WORKERS", value:"1", is_preview:false, is_literal:true, is_multiline:false},
    {key:"VIDEO_FACTORY_MASTER_COMPOSITOR", value:"hyperframes", is_preview:false, is_literal:true, is_multiline:false},
    {key:"VIDEO_FACTORY_ALLOW_FFMPEG_COMPOSITOR_FALLBACK", value:"false", is_preview:false, is_literal:true, is_multiline:false},
    {key:"HYPERFRAMES_VERSION", value:"0.7.77", is_preview:false, is_literal:true, is_multiline:false},
    {key:"HYPERFRAMES_NPX", value:"npx", is_preview:false, is_literal:true, is_multiline:false},
    {key:"HYPERFRAMES_RENDER_QUALITY", value:"draft", is_preview:false, is_literal:true, is_multiline:false},
    {key:"COMFYUI_WORKFLOW_ROOT", value:"/app/workflows/comfyui", is_preview:false, is_literal:true, is_multiline:false},
    {key:"COMFYUI_WORKFLOW_REGISTRY", value:"/app/workflows/comfyui/registry.yaml", is_preview:false, is_literal:true, is_multiline:false},
    {key:"COMFYUI_ALLOW_UNREGISTERED_WORKFLOWS", value:"false", is_preview:false, is_literal:true, is_multiline:false},
    {key:"VIDEO_FACTORY_MODEL_REGISTRY", value:"/app/config/model-registry.yaml", is_preview:false, is_literal:true, is_multiline:false},
    {key:"VIDEO_FACTORY_PRODUCTION_REGION", value:"JP", is_preview:false, is_literal:true, is_multiline:false},
    {key:"PLAYWRIGHT_NODE", value:"node", is_preview:false, is_literal:true, is_multiline:false},
    {key:"PLAYWRIGHT_CAPTURE_SCRIPT", value:"/app/tools/playwright-capture/capture.mjs", is_preview:false, is_literal:true, is_multiline:false},
    {key:"PLAYWRIGHT_CHROMIUM_EXECUTABLE", value:"/usr/bin/chromium", is_preview:false, is_literal:true, is_multiline:false},
    {key:"PLAYWRIGHT_ALLOWED_HOSTS", value:"paradigmjp.com,www.paradigmjp.com", is_preview:false, is_literal:true, is_multiline:false},
    {key:"VAST_API_BASE_URL", value:"https://console.vast.ai/api", is_preview:false, is_literal:true, is_multiline:false},
    {key:"VAST_MAX_HOURLY_PRICE", value:"1.00", is_preview:false, is_literal:true, is_multiline:false}
  ]}')"
request PATCH "/applications/${app_uuid}/envs/bulk" "${env_payload}" >/dev/null

printf '%s' "${factory_key}" > /tmp/video-factory-api-key
chmod 600 /tmp/video-factory-api-key
printf 'app_uuid=%s\n' "${app_uuid}" >> "${GITHUB_OUTPUT:-/dev/stdout}"
printf 'application_uuid=%s\n' "${app_uuid}"
