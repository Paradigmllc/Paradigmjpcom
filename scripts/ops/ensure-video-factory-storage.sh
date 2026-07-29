#!/usr/bin/env bash
set -euo pipefail

: "${COOLIFY_API_URL:?COOLIFY_API_URL is required}"
: "${COOLIFY_API_TOKEN:?COOLIFY_API_TOKEN is required}"
: "${PARADIGM_APP_UUID:?PARADIGM_APP_UUID is required}"

API="${COOLIFY_API_URL%/}/api/v1"
MOUNT_PATH="/data/video-factory"
VOLUME_NAME="paradigm-video-factory-data"

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
existing="$(printf '%s' "${storages}" | jq -r --arg mount "${MOUNT_PATH}" '[.[] | select(.mount_path == $mount)][0].uuid // empty')"
if [[ -n "${existing}" ]]; then
  printf 'Video Factory storage already present: %s\n' "${existing}"
  exit 0
fi

payload="$(jq -cn \
  --arg name "${VOLUME_NAME}" \
  --arg mount "${MOUNT_PATH}" \
  '{type:"persistent",name:$name,mount_path:$mount}')"
created="$(request POST "/applications/${PARADIGM_APP_UUID}/storages" "${payload}")"
printf '%s' "${created}" | jq '{uuid,name,mount_path}'
