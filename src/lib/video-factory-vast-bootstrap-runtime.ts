import "server-only"

import { createHash, randomBytes } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import {
  readBootstrapState,
  removeBootstrapKeyMaterial,
  type VastBootstrapState,
  writeBootstrapState,
} from "@/lib/video-factory-vast-bootstrap"
import {
  isJsonRecord,
  jsonArray,
  jsonNumber,
  jsonRecord,
  jsonString,
  type JsonRecord,
} from "@/lib/video-factory-vast-json"

const INTERNAL_ORIGIN = process.env.VIDEO_FACTORY_INTERNAL_URL?.trim()
  || "http://127.0.0.1:8080"
const WORKSPACE = process.env.VIDEO_FACTORY_WORKSPACE?.trim() || "/data/video-factory"
const SMOKE_ROOT = path.join(WORKSPACE, "bootstrap-smoke")

function internalApiKey(): string {
  const value = process.env.VIDEO_FACTORY_INTERNAL_API_KEY
    || process.env.ADMIN_SCRIPT_SECRET
    || process.env.ADMIN_PASSWORD
  if (!value?.trim()) throw new Error("Video Factory internal API key is unavailable")
  return value.trim()
}

function parseJson(text: string, label: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch (error) {
    console.error(`[vast-bootstrap] ${label} returned invalid JSON`, error)
    throw new Error(`${label} returned invalid JSON`)
  }
}

export async function factory(pathname: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(new URL(pathname, INTERNAL_ORIGIN), {
    ...init,
    headers: {
      "X-Api-Key": internalApiKey(),
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Factory ${pathname} -> HTTP ${response.status}: ${text.slice(0, 1000)}`)
  }
  return parseJson(text, `Factory ${pathname}`)
}

export function safeState(
  state: VastBootstrapState = readBootstrapState(),
): Record<string, unknown> {
  return {
    configured_at: state.configured_at || null,
    scoped_key_created: Boolean(state.scoped_key_created),
    scoped_key_id: state.scoped_key_id || null,
    original_key_fingerprint: state.original_key_fingerprint || null,
    instance_id: state.instance_id || null,
    template_hash: state.template_hash || null,
    offer_id: state.offer_id || null,
    gpu_name: state.gpu_name || null,
    hourly_price: state.hourly_price ?? null,
    provision_started_at: state.provision_started_at || null,
    comfyui_base_url: state.comfyui_base_url || null,
    workflow_id: state.workflow_id || null,
    smoke_prompt_id: state.smoke_prompt_id || null,
    smoke_started_at: state.smoke_started_at || null,
    smoke_output_path: state.smoke_output_path || null,
    smoke_sha256: state.smoke_sha256 || null,
    smoke_size_bytes: state.smoke_size_bytes ?? null,
    completed_at: state.completed_at || null,
    failed_at: state.failed_at || null,
    last_error: state.last_error || null,
    proxy_key_configured: Boolean(state.proxy_key),
  }
}

function mappedPort(value: unknown, names: string[]): string | null {
  const instance = jsonRecord(value)
  const ports = jsonRecord(instance?.ports) || {}
  for (const name of names) {
    const mappings = ports[name]
    const value = Array.isArray(mappings) ? mappings[0] : mappings
    const mapping = jsonRecord(value)
    const port = jsonString(mapping?.HostPort)
      || jsonString(mapping?.host_port)
      || jsonString(mapping?.port)
      || jsonNumber(mapping?.HostPort)
      || jsonNumber(mapping?.host_port)
      || jsonNumber(mapping?.port)
    if (port) return String(port)
  }
  return null
}

function comfyHeaders(key: string): HeadersInit {
  return {
    Authorization: `Bearer ${key}`,
    "X-API-Key": key,
    Accept: "application/json",
  }
}

async function fetchProvisionManifest(
  baseUrl: string,
  proxyKey: string,
): Promise<JsonRecord> {
  const response = await fetch(`${baseUrl}/__video_factory/status`, {
    headers: comfyHeaders(proxyKey),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`ComfyUI bootstrap -> HTTP ${response.status}: ${text.slice(0, 800)}`)
  }
  const manifest = parseJson(text, "ComfyUI bootstrap")
  if (!isJsonRecord(manifest)) {
    throw new Error("ComfyUI bootstrap returned an invalid manifest")
  }
  return manifest
}

async function registerBootstrapAssets(
  baseUrl: string,
  proxyKey: string,
): Promise<JsonRecord> {
  const manifest = await fetchProvisionManifest(baseUrl, proxyKey)
  if (manifest.ready !== true) return manifest

  for (const model of jsonArray(manifest.models).filter(isJsonRecord)) {
    await factory("/v1/registry/models", {
      method: "POST",
      body: JSON.stringify({
        id: model.id,
        engine: "comfyui",
        model_family: model.model_family,
        exact_artifact: model.exact_artifact,
        sha256: model.sha256,
        code_license: model.code_license,
        model_license: model.model_license,
        commercial_use: "approved",
        regions: ["JP"],
        approved_workflows: model.approved_workflows,
        reviewed_by: "Owner-delegated official-source bootstrap",
        source_url: model.source_url,
        notes: model.notes,
        confirm_license_review: true,
      }),
    })
  }

  const workflows = jsonRecord(manifest.workflows)
  for (const workflowId of ["abstract-broll-t2v", "pet-memory-i2v"] as const) {
    const workflow = jsonRecord(workflows?.[workflowId])
    if (!workflow?.workflow_json) {
      throw new Error(`Provisioned instance did not expose ${workflowId}`)
    }
    await factory(`/v1/registry/workflows/${workflowId}/bind`, {
      method: "POST",
      body: JSON.stringify({
        workflow_json: workflow.workflow_json,
        reviewed_by: "Owner-delegated official-source bootstrap",
        model_bindings: workflow.model_bindings,
        confirm_license_review: true,
      }),
    })
  }
  return manifest
}

function replacePlaceholders(
  value: unknown,
  bindings: Record<string, string | number>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => replacePlaceholders(item, bindings))
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replacePlaceholders(item, bindings),
      ]),
    )
  }
  if (typeof value === "string" && value.startsWith("{{") && value.endsWith("}}")) {
    const key = value.slice(2, -2).trim()
    return Object.hasOwn(bindings, key) ? bindings[key] : value
  }
  return value
}

function findOutputs(history: unknown): JsonRecord[] {
  const files: JsonRecord[] = []
  const outputs = jsonRecord(jsonRecord(history)?.outputs) || {}
  for (const node of Object.values(outputs)) {
    if (!isJsonRecord(node)) continue
    for (const key of ["videos", "gifs", "images", "audio"]) {
      files.push(
        ...jsonArray(node[key]).filter(
          (item): item is JsonRecord => isJsonRecord(item) && "filename" in item,
        ),
      )
    }
  }
  return files
}

async function submitSmoke(
  baseUrl: string,
  proxyKey: string,
  manifest: JsonRecord,
): Promise<string> {
  const workflows = jsonRecord(manifest.workflows)
  const workflowManifest = jsonRecord(workflows?.["abstract-broll-t2v"])
  const template = workflowManifest?.workflow_json
  if (!template) throw new Error("Smoke workflow is unavailable")
  const workflow = jsonRecord(replacePlaceholders(template, {
    prompt: "clean cinematic abstract technology waves, deep navy background, subtle emerald light, premium B2B software advertising, smooth camera motion, no text, no logos",
    negative_prompt: "text, logo, watermark, human face, hands, distortion, low quality, flicker",
    seed: 20260729,
    width: 480,
    height: 272,
  }))
  if (!workflow) throw new Error("Smoke workflow JSON is invalid")
  for (const value of Object.values(workflow)) {
    const node = jsonRecord(value)
    const inputs = jsonRecord(node?.inputs)
    if (!node || !inputs) continue
    if (node.class_type === "Wan22ImageToVideoLatent") {
      inputs.width = 480
      inputs.height = 272
      inputs.length = 33
    }
    if (node.class_type === "KSampler") {
      inputs.steps = 10
      inputs.cfg = 4.0
    }
    if (node.class_type === "CreateVideo") inputs.fps = 16.0
    if (node.class_type === "SaveVideo") {
      inputs.filename_prefix = "video/ParadigmBootstrap"
    }
  }
  const response = await fetch(`${baseUrl}/prompt`, {
    method: "POST",
    headers: { ...comfyHeaders(proxyKey), "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: workflow,
      client_id: randomBytes(16).toString("hex"),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`ComfyUI smoke submission failed: HTTP ${response.status}: ${text.slice(0, 1000)}`)
  }
  const body = parseJson(text, "ComfyUI smoke submission") as Record<string, unknown> | null
  if (!body?.prompt_id) {
    throw new Error("ComfyUI smoke submission returned no prompt ID")
  }
  return String(body.prompt_id)
}

async function pollSmoke(
  baseUrl: string,
  proxyKey: string,
  promptId: string,
): Promise<null | { path: string; sha256: string; size: number }> {
  const response = await fetch(`${baseUrl}/history/${encodeURIComponent(promptId)}`, {
    headers: comfyHeaders(proxyKey),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok) {
    throw new Error(`ComfyUI smoke history failed: HTTP ${response.status}`)
  }
  const payload: unknown = await response.json()
  const history = jsonRecord(jsonRecord(payload)?.[promptId])
  if (!history) return null
  const outputs = findOutputs(history)
  if (!outputs.length) {
    const status = jsonRecord(history.status)
    if (status?.status_str === "error" || status?.completed === true) {
      throw new Error(
        `ComfyUI smoke completed without an output: ${JSON.stringify(status).slice(0, 800)}`,
      )
    }
    return null
  }
  const item = outputs[0]
  const query = new URLSearchParams({
    filename: String(item.filename),
    subfolder: String(item.subfolder || ""),
    type: String(item.type || "output"),
  })
  const media = await fetch(`${baseUrl}/view?${query.toString()}`, {
    headers: comfyHeaders(proxyKey),
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  })
  if (!media.ok) {
    throw new Error(`ComfyUI smoke download failed: HTTP ${media.status}`)
  }
  const bytes = Buffer.from(await media.arrayBuffer())
  if (bytes.length < 10_000) {
    throw new Error(`ComfyUI smoke output is unexpectedly small: ${bytes.length}`)
  }
  fs.mkdirSync(SMOKE_ROOT, { recursive: true, mode: 0o700 })
  const output = path.join(SMOKE_ROOT, "wan22-smoke.mp4")
  fs.writeFileSync(output, bytes, { mode: 0o600 })
  return {
    path: output,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: bytes.length,
  }
}

export async function cleanupInstance(
  instanceId: number | null | undefined,
): Promise<void> {
  if (!instanceId) return
  try {
    await factory(`/v1/vast/instances/${instanceId}`, { method: "DELETE" })
  } catch (error) {
    console.warn(
      "[vast-bootstrap] cleanup failed",
      error instanceof Error ? error.message : String(error),
    )
  }
}

export async function advanceBootstrap(): Promise<Record<string, unknown>> {
  const state = readBootstrapState()
  if (state.completed_at) return { ok: true, phase: "ready", ...safeState(state) }
  if (!state.instance_id) {
    return {
      ok: true,
      phase: state.configured_at ? "configured" : "unconfigured",
      ...safeState(state),
    }
  }

  const list = jsonRecord(await factory("/v1/vast/instances"))
  const instance = jsonArray(list?.instances).filter(isJsonRecord).find(
    (item) => (
      jsonNumber(item.id) || jsonNumber(item.instance_id)
    ) === Number(state.instance_id),
  )
  if (!instance) {
    return { ok: true, phase: "instance-not-visible-yet", ...safeState(state) }
  }

  const instanceStatus = String(
    jsonString(instance.actual_status)
      || jsonString(instance.status)
      || jsonString(instance.cur_state)
      || "unknown",
  )
  const host = jsonString(instance.public_ipaddr)
    || jsonString(instance.public_ip)
    || jsonString(instance.ssh_host)
  const port = mappedPort(instance, ["18189/tcp", "8189/tcp"])
  if (/destroy|exit|fail|error/i.test(instanceStatus)) {
    throw new Error(`Vast.ai instance entered terminal state: ${instanceStatus}`)
  }
  if (!host || !port || instanceStatus !== "running") {
    return {
      ok: true,
      phase: "instance-starting",
      instance_status: instanceStatus,
      host_ready: Boolean(host),
      port_ready: Boolean(port),
      ...safeState(state),
    }
  }
  if (!state.proxy_key) throw new Error("ComfyUI proxy key is unavailable")
  const baseUrl = `https://${host}:${port}`
  await factory("/v1/runtime", {
    method: "PUT",
    body: JSON.stringify({ comfyui_base_url: baseUrl }),
  })
  writeBootstrapState({ comfyui_base_url: baseUrl })

  let manifest: JsonRecord
  try {
    manifest = await registerBootstrapAssets(baseUrl, state.proxy_key)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error("[vast-bootstrap] asset registration failed", error)
    writeBootstrapState({ last_error: detail })
    return {
      ok: true,
      phase: "provisioning",
      instance_status: instanceStatus,
      comfyui_base_url: baseUrl,
      detail,
      ...safeState(),
    }
  }
  if (manifest.ready !== true) {
    return {
      ok: true,
      phase: "provisioning",
      instance_status: instanceStatus,
      comfyui_base_url: baseUrl,
      manifest,
      ...safeState(),
    }
  }

  const refreshed = readBootstrapState()
  let promptId = refreshed.smoke_prompt_id
  if (!promptId) {
    promptId = await submitSmoke(baseUrl, state.proxy_key, manifest)
    writeBootstrapState({
      workflow_id: "abstract-broll-t2v",
      smoke_prompt_id: promptId,
      smoke_started_at: new Date().toISOString(),
      last_error: null,
    })
    return {
      ok: true,
      phase: "smoke-running",
      instance_status: instanceStatus,
      comfyui_base_url: baseUrl,
      ...safeState(),
    }
  }

  const smoke = await pollSmoke(baseUrl, state.proxy_key, promptId)
  if (!smoke) {
    return {
      ok: true,
      phase: "smoke-running",
      instance_status: instanceStatus,
      comfyui_base_url: baseUrl,
      ...safeState(),
    }
  }

  const completed = writeBootstrapState({
    workflow_id: "abstract-broll-t2v",
    smoke_output_path: smoke.path,
    smoke_sha256: smoke.sha256,
    smoke_size_bytes: smoke.size,
    completed_at: new Date().toISOString(),
    proxy_key: null,
    last_error: null,
    failed_at: null,
  })
  removeBootstrapKeyMaterial()
  return {
    ok: true,
    phase: "ready",
    instance_status: instanceStatus,
    comfyui_base_url: baseUrl,
    workflow: "abstract-broll-t2v",
    ...safeState(completed),
  }
}
