/**
 * Provision the private abi/screenshot-to-code gateway beside the main app.
 *
 * This is intentionally a separate Coolify Docker Compose service: the OSS
 * runtime needs Chromium and Python dependencies, while the Next app only
 * calls its authenticated HTTP gateway over the internal coolify network.
 */
import crypto from "node:crypto"
import { DEFAULT_APP_UUID, coolifyRequest, readCoolifyApplicationEnvs, updateCoolifyEnvs } from "./lib/coolify-env.mjs"

const PROJECT_UUID = "okgoks4gwkg0o04csso0s0wg"
const SERVER_UUID = "cw84s4488k8kwc4osckkosk8"
const SERVICE_NAME = "paradigm-screenshot-to-code"
const COMPOSE_FILE = "docker-compose.screenshot-to-code.yml"
const APP_UUID = process.env.PARADIGM_APP_UUID || DEFAULT_APP_UUID

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

async function main() {
  const appEnvs = await readCoolifyApplicationEnvs(APP_UUID)
  const deepseekKey = appEnvs.DEEPSEEK_API_KEY
  if (!deepseekKey) throw new Error("DEEPSEEK_API_KEY is missing from the production application")

  const sharedSecret = appEnvs.SCREENSHOT_TO_CODE_SHARED_SECRET || crypto.randomBytes(32).toString("hex")
  const existing = await findService()
  const composeBody = {
    name: SERVICE_NAME,
    description: "Private abi/screenshot-to-code runtime for proposal demos",
    project_uuid: PROJECT_UUID,
    server_uuid: SERVER_UUID,
    docker_compose_raw: null,
    docker_compose_location: COMPOSE_FILE,
    git_repository: "git@github.com:Paradigmllc/Paradigmjpcom.git",
    git_branch: "main",
    build_pack: "dockercompose",
    ports_exposes: "7002",
    is_public: false,
    instant_deploy: false,
  }

  let service = existing
  if (!service) {
    service = await coolifyRequest("/api/v1/services", {
      method: "POST",
      body: JSON.stringify(composeBody),
    })
    console.log(`[screenshot-to-code] service created: ${service?.uuid ?? "unknown"}`)
  } else {
    await coolifyRequest(`/api/v1/services/${service.uuid}`, {
      method: "PATCH",
      body: JSON.stringify({ docker_compose_location: COMPOSE_FILE, git_branch: "main", is_public: false }),
    })
    console.log(`[screenshot-to-code] service reused: ${service.uuid}`)
  }

  if (!service?.uuid) throw new Error("Coolify did not return a service UUID")
  await setServiceEnvs(service.uuid, {
    DEEPSEEK_API_KEY: deepseekKey,
    DEEPSEEK_API_BASE: appEnvs.DEEPSEEK_API_BASE || "https://api.deepseek.com/v1",
    DEEPSEEK_MODEL: appEnvs.DEEPSEEK_MODEL || "deepseek-v4-pro",
    SCREENSHOT_TO_CODE_SHARED_SECRET: sharedSecret,
  })

  const appEnvResult = await updateCoolifyEnvs(APP_UUID, {
    SCREENSHOT_TO_CODE_URL: "http://screenshot-to-code:7002",
    SCREENSHOT_TO_CODE_SHARED_SECRET: sharedSecret,
  })
  const failed = appEnvResult.filter((result) => result.status === "failed")
  if (failed.length > 0) throw new Error(`failed to update application envs: ${failed.map((row) => row.key).join(", ")}`)

  const deploy = await coolifyRequest(`/api/v1/services/${service.uuid}/start`, { method: "POST" })
  console.log(JSON.stringify({
    ok: true,
    service: SERVICE_NAME,
    uuid: service.uuid,
    deployment: deploy?.deployment_uuid ?? null,
    appGatewayUrl: "http://screenshot-to-code:7002",
    sendingEnabled: false,
  }, null, 2))
}

main().catch((error) => {
  console.error("[screenshot-to-code] provisioning failed:", error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
