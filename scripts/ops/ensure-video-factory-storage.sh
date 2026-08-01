#!/usr/bin/env bash
set -euo pipefail

: "${COOLIFY_API_URL:?COOLIFY_API_URL is required}"
: "${COOLIFY_API_TOKEN:?COOLIFY_API_TOKEN is required}"
: "${PARADIGM_APP_UUID:?PARADIGM_APP_UUID is required}"

API="${COOLIFY_API_URL%/}/api/v1"

request() {
  local method="$1" path="$2" body="${3:-}" output status
  output="$(mktemp)"
  if [[ -n "${body}" ]]; then
    status="$(curl --silent --show-error --output "${output}" --write-out '%{http_code}' \
      --request "${method}" \
      --header "Authorization: Bearer ${COOLIFY_API_TOKEN}" \
      --header "Accept: application/json" \
      --header "Content-Type: application/json" \
      --data "${body}" \
      "${API}${path}" || true)"
  else
    status="$(curl --silent --show-error --output "${output}" --write-out '%{http_code}' \
      --request "${method}" \
      --header "Authorization: Bearer ${COOLIFY_API_TOKEN}" \
      --header "Accept: application/json" \
      "${API}${path}" || true)"
  fi
  if [[ ! "${status}" =~ ^2 ]]; then
    printf 'Coolify %s %s failed with HTTP %s:\n' "${method}" "${path}" "${status}" >&2
    head -c 3000 "${output}" >&2 || true
    printf '\n' >&2
    rm -f "${output}"
    return 1
  fi
  cat "${output}"
  rm -f "${output}"
}

storages="$(request GET "/applications/${PARADIGM_APP_UUID}/storages")"

ensure_persistent_storage() {
  local name="$1" mount_path="$2" host_path="${3:-}" existing current_host payload created
  existing="$(printf '%s' "${storages}" | jq -r --arg mount "${mount_path}" '
    [.. | objects | select(.mount_path? == $mount)][0].uuid // empty
  ')"
  if [[ -n "${existing}" ]]; then
    current_host="$(printf '%s' "${storages}" | jq -r --arg mount "${mount_path}" '
      [.. | objects | select(.mount_path? == $mount)][0].host_path // empty
    ')"
    if [[ -n "${host_path}" && "${current_host}" != "${host_path}" ]]; then
      payload="$(jq -cn \
        --arg uuid "${existing}" \
        --arg mount "${mount_path}" \
        --arg host "${host_path}" \
        '{type:"persistent",uuid:$uuid,mount_path:$mount,host_path:$host}')"
      request PATCH "/applications/${PARADIGM_APP_UUID}/storages" "${payload}" >/dev/null
      printf 'Updated storage %s: %s -> %s\n' "${existing}" "${mount_path}" "${host_path}"
    else
      printf 'Storage already present: %s (%s)\n' "${existing}" "${mount_path}"
    fi
    return 0
  fi

  if [[ -n "${host_path}" ]]; then
    payload="$(jq -cn \
      --arg name "${name}" \
      --arg mount "${mount_path}" \
      --arg host "${host_path}" \
      '{type:"persistent",name:$name,mount_path:$mount,host_path:$host}')"
  else
    payload="$(jq -cn \
      --arg name "${name}" \
      --arg mount "${mount_path}" \
      '{type:"persistent",name:$name,mount_path:$mount}')"
  fi
  created="$(request POST "/applications/${PARADIGM_APP_UUID}/storages" "${payload}")"
  printf '%s' "${created}" | jq '{uuid,name,mount_path,host_path}'
}

# Persistent projects, credentials, generated assets, and delivery evidence.
ensure_persistent_storage \
  "paradigm-video-factory-data" \
  "/data/video-factory"

# The legacy file-provider route predates the Coolify-managed Docker routers and
# points at a timestamped container IP. Mount only the proxy dynamic directory
# so the new healthy container can atomically refresh its own upstream after a
# rolling deployment, without broad Docker-socket or host access.
ensure_persistent_storage \
  "paradigm-traefik-dynamic" \
  "/mnt/coolify-proxy-dynamic" \
  "/data/coolify/proxy/dynamic"
