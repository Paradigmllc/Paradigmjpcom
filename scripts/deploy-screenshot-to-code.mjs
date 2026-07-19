/**
 * Provision the private abi/screenshot-to-code gateway beside the main app.
 *
 * This is intentionally a separate Coolify Docker Compose service: the OSS
 * runtime needs Chromium and Python dependencies, while the Next app only
 * calls its authenticated HTTP gateway over the internal coolify network.
 */
import crypto from "node:crypto"
import { spawnSync } from "node:child_process"
import { sshArgs } from "./lib/ssh-options.mjs"
import {
  DEFAULT_APP_UUID,
  coolifyRequest,
  readCoolifyApplicationEnvs,
  updateCoolifyEnvs,
} from "./lib/coolify-env.mjs"

const SERVICE_NAME = "paradigm-screenshot-to-code"
const COMPOSE_FILE = "docker-compose.screenshot-to-code.yml"
const APP_UUID = process.env.PARADIGM_APP_UUID || DEFAULT_APP_UUID
const SSH_TARGET = process.env.PARADIGM_SCREENSHOT_TO_CODE_SSH_TARGET || "paradigm-droplet"
const REMOTE_ROOT = "/opt/paradigm-screenshot-to-code"

function serviceEnvEntries(values) {
  return Object.entries(values).map(([key, value]) => ({
    key,
    value: String(value),
    is_preview: false,
    is_literal: true,
    is_multiline: false,
    is_shown_once: false,
  }))
}

async function setServiceEnvs(serviceUuid, values) {
  const response = await coolifyRequest(`/api/v1/services/${serviceUuid}/envs/bulk`, {
    method: "PATCH",
    body: JSON.stringify({ data: serviceEnvEntries(values) }),
  })
  return response
}

async function findService() {
  const data = await coolifyRequest("/api/v1/services")
  const list = Array.isArray(data) ? data : (data?.data ?? [])
  return list.find((service) => service?.name === SERVICE_NAME) ?? null
}

function encodeEnvFile(values) {
  return Buffer.from(
    Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n",
    "utf8",
  ).toString("base64")
}

function deployOnCoolifyHost(values) {
  const envBase64 = encodeEnvFile(values)
  const script = `
set -eu
ROOT=${REMOTE_ROOT}
REPO=https://github.com/Paradigmllc/Paradigmjpcom.git
mkdir -p "$ROOT"
if [ ! -d "$ROOT/.git" ]; then
  rm -rf "$ROOT"
  git clone --depth 1 --branch main "$REPO" "$ROOT"
else
  git -C "$ROOT" fetch --depth 1 origin main
  git -C "$ROOT" checkout -B main FETCH_HEAD
fi
umask 077
printf '%s' '${envBase64}' | base64 -d > "$ROOT/.env.screenshot-to-code"
cd "$ROOT"
docker compose --env-file "$ROOT/.env.screenshot-to-code" -f "$ROOT/${COMPOSE_FILE}" up -d --build --remove-orphans
CONTAINER_ID=$(docker compose --env-file "$ROOT/.env.screenshot-to-code" -f "$ROOT/${COMPOSE_FILE}" ps -q screenshot-to-code)
test -n "$CONTAINER_ID"
docker inspect --format '{{.State.Status}}' "$CONTAINER_ID"
`
  const result = spawnSync(
    "ssh",
    [...sshArgs(SSH_TARGET, { acceptNew: true }), "bash", "-s"],
    {
      input: script,
      encoding: "utf8",
      timeout: 15 * 60 * 1000,
      maxBuffer: 1024 * 1024 * 8,
    },
  )
  if (result.error) throw new Error(`host deployment did not complete: ${result.error.message}`)
  if (result.status !== 0) {
    const detail = `${result.stderr || result.stdout || ""}`.trim()
    throw new Error(`host deployment failed: ${detail.slice(0, 600)}`)
  }
  const status = String(result.stdout || "").trim().split(/\s+/).at(-1) || "unknown"
  if (status !== "running") throw new Error(`host deployment returned unexpected status: ${status}`)
  return { mode: "coolify-host", status }
}

async function restartApplication() {
  try {
    return await coolifyRequest(`/api/v1/applications/${APP_UUID}/restart`, { method: "POST" })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[screenshot-to-code] application restart endpoint unavailable: ${message}; queuing deploy`)
    return coolifyRequest(`/api/v1/deploy?uuid=${APP_UUID}&force=false`, { method: "POST" })
  }
}

async function waitForApplicationReady() {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      const response = await fetch("https://paradigmjp.com/api/ready", {
        signal: AbortSignal.timeout(15_000),
        headers: { "Cache-Control": "no-cache" },
      })
      if (response.ok) return response.status
    } catch (error) {
      if (attempt === 20) {
        console.error("[screenshot-to-code] readiness check failed", error)
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000))
  }
  throw new Error("application did not become ready after screenshot-to-code environment update")
}

async function main() {
  const appEnvs = await readCoolifyApplicationEnvs(APP_UUID)
  const deepseekKey = appEnvs.DEEPSEEK_API_KEY
  if (!deepseekKey) throw new Error("DEEPSEEK_API_KEY is missing from the production application")

  const sharedSecret = appEnvs.SCREENSHOT_TO_CODE_SHARED_SECRET || crypto.randomBytes(32).toString("hex")
  const existing = await findService()
  const composeBody = {
    name: SERVICE_NAME,
    description: "Private abi/screenshot-to-code runtime for proposal demos",
    docker_compose_raw: null,
    docker_compose_location: COMPOSE_FILE,
    git_repository: "git@github.com:Paradigmllc/Paradigmjpcom.git",
    git_branch: "main",
    build_pack: "dockercompose",
    ports_exposes: "7002",
    is_public: false,
    instant_deploy: false,
  }

  const runtimeEnv = {
    DEEPSEEK_API_KEY: deepseekKey,
    DEEPSEEK_API_BASE: appEnvs.DEEPSEEK_API_BASE || "https://api.deepseek.com/v1",
    DEEPSEEK_MODEL: appEnvs.DEEPSEEK_MODEL || "deepseek-v4-pro",
    // DeepSeek-only production contract: never copy a separately billed
    // Vision credential into the sidecar. DOM/CSS evidence is the visual input.
    GEMINI_API_KEY: "",
    GEMINI_VISION_MODEL: "",
    VISION_API_KEY: "",
    VISION_API_BASE: "",
    VISION_MODEL: "",
    SCREENSHOT_TO_CODE_SHARED_SECRET: sharedSecret,
    SCREENSHOT_TO_CODE_VISUAL_MODE: "metadata-text",
    SCREENSHOT_TO_CODE_REQUIRE_VISION: "false",
  }

  let runtime
  if (existing?.uuid) {
    try {
      await setServiceEnvs(existing.uuid, runtimeEnv)
      await coolifyRequest(`/api/v1/services/${existing.uuid}/start`, { method: "POST" })
      runtime = { mode: "coolify-service", status: "started", uuid: existing.uuid }
      console.log(`[screenshot-to-code] service reused: ${existing.uuid}`)
    } catch (error) {
      console.warn(`[screenshot-to-code] existing service could not start: ${error instanceof Error ? error.message : String(error)}`)
      runtime = deployOnCoolifyHost(runtimeEnv)
    }
  } else {
    try {
      const service = await coolifyRequest("/api/v1/services", {
        method: "POST",
        body: JSON.stringify(composeBody),
      })
      if (!service?.uuid) throw new Error("Coolify did not return a service UUID")
      await setServiceEnvs(service.uuid, runtimeEnv)
      await coolifyRequest(`/api/v1/services/${service.uuid}/start`, { method: "POST" })
      runtime = { mode: "coolify-service", status: "started", uuid: service.uuid }
      console.log(`[screenshot-to-code] service created: ${service.uuid}`)
    } catch (error) {
      console.warn(`[screenshot-to-code] Coolify service API unavailable: ${error instanceof Error ? error.message : String(error)}; using managed host fallback`)
      runtime = deployOnCoolifyHost(runtimeEnv)
    }
  }

  const appEnvResult = await updateCoolifyEnvs(APP_UUID, {
    SCREENSHOT_TO_CODE_URL: "http://screenshot-to-code:7002",
    SCREENSHOT_TO_CODE_SHARED_SECRET: sharedSecret,
  })
  const failed = appEnvResult.filter((result) => result.status === "failed")
  if (failed.length > 0) throw new Error(`failed to update application envs: ${failed.map((row) => row.key).join(", ")}`)

  const restart = await restartApplication()
  const readyStatus = await waitForApplicationReady()
  console.log(JSON.stringify({
    ok: true,
    service: SERVICE_NAME,
    runtime,
    deployment: restart?.deployment_uuid ?? null,
    readiness: readyStatus,
    appGatewayUrl: "http://screenshot-to-code:7002",
    sendingEnabled: false,
  }, null, 2))
}

main().catch((error) => {
  console.error("[screenshot-to-code] provisioning failed:", error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
