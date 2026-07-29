import { NextRequest, NextResponse } from "next/server"
import { createHash, randomBytes } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import {
  bootstrapIsComplete,
  decryptVastKey,
  fingerprintSecret,
  publicKeyPem,
  readBootstrapState,
  removeBootstrapKeyMaterial,
  tokenIsValid,
  type VastBootstrapState,
  writeBootstrapState,
} from "@/lib/video-factory-vast-bootstrap"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

const INTERNAL_ORIGIN = process.env.VIDEO_FACTORY_INTERNAL_URL?.trim() || "http://127.0.0.1:8080"
const VAST_ORIGIN = "https://console.vast.ai/api"
const PROVISIONING_SCRIPT = "https://raw.githubusercontent.com/Paradigmllc/Paradigmjpcom/main/scripts/vast/provision-video-factory-wan22.sh"
const WORKSPACE = process.env.VIDEO_FACTORY_WORKSPACE?.trim() || "/data/video-factory"
const SMOKE_ROOT = path.join(WORKSPACE, "bootstrap-smoke")

function responseJson(body: object, status = 200): NextResponse {
  const response = NextResponse.json(body, { status })
  response.headers.set("Cache-Control", "private, no-store, max-age=0")
  response.headers.set("Pragma", "no-cache")
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  return response
}

function internalApiKey(): string {
  const value = process.env.VIDEO_FACTORY_INTERNAL_API_KEY
    || process.env.ADMIN_SCRIPT_SECRET
    || process.env.ADMIN_PASSWORD
  if (!value?.trim()) throw new Error("Video Factory internal API key is unavailable")
  return value.trim()
}

async function factory(pathname: string, init: RequestInit = {}): Promise<any> {
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
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch {}
  if (!response.ok) {
    throw new Error(`Factory ${pathname} -> HTTP ${response.status}: ${text.slice(0, 1000)}`)
  }
  return data
}

async function vast(key: string, pathname: string, init: RequestInit = {}): Promise<any> {
  const response = await fetch(`${VAST_ORIGIN}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  })
  const text = await response.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch {}
  if (!response.ok) {
    throw new Error(`Vast ${pathname} -> HTTP ${response.status}: ${text.slice(0, 1000)}`)
  }
  return data
}

function safeState(state: VastBootstrapState = readBootstrapState()): Record<string, unknown> {
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

function requireToken(request: NextRequest): NextResponse | null {
  if (!tokenIsValid(request.nextUrl.searchParams.get("token"))) {
    return responseJson({ ok: false, error: "Invalid bootstrap token" }, 403)
  }
  return null
}

function templateScore(item: any): number {
  const text = `${item?.name || ""} ${item?.desc || ""} ${item?.image || ""}`.toLowerCase()
  let score = 0
  if (/\bcomfyui\b/.test(text)) score += 200
  if (item?.recommended === true || /recommended/.test(text)) score += 50
  if (/jupyter|ssh/.test(text)) score += 20
  if (/serverless/.test(text)) score -= 100
  return score + Number(item?.count_created || 0) / 1000
}

function offerScore(item: any): number {
  const price = Math.max(Number(item?.dph_total || item?.min_bid || 99), 0.001)
  const dlperf = Math.max(Number(item?.dlperf || 0), 0.1)
  const reliability = Math.max(Number(item?.reliability || 0), 0.5)
  const inet = Math.min(Math.max(Number(item?.inet_down || 0), 0), 2000) / 2000
  const disk = Math.min(Math.max(Number(item?.disk_bw || 0), 0), 5000) / 5000
  return (dlperf / price) * reliability * (1 + inet * 0.1 + disk * 0.05)
}

async function discoverTemplates(): Promise<any[]> {
  const attempts = [
    "/v1/vast/templates?query=ComfyUI&recommended_only=true&ssh_only=true",
    "/v1/vast/templates?query=ComfyUI&recommended_only=false&ssh_only=true",
    "/v1/vast/templates?query=ComfyUI&recommended_only=false&ssh_only=false",
  ]
  for (const pathname of attempts) {
    const body = await factory(pathname)
    const templates = Array.isArray(body?.templates) ? body.templates : []
    const ranked = templates
      .filter((item: any) => item?.hash_id || item?.hash)
      .sort((a: any, b: any) => templateScore(b) - templateScore(a))
    if (ranked.length) return ranked
  }
  return []
}

async function discoverOffers(): Promise<any[]> {
  const searches = [
    { gpu_names: ["RTX 4090"], min_gpu_ram_gb: 24, max_hourly_price: 0.9 },
    { gpu_names: ["RTX 3090", "RTX A6000"], min_gpu_ram_gb: 24, max_hourly_price: 0.75 },
    { gpu_names: ["A40", "L40S"], min_gpu_ram_gb: 40, max_hourly_price: 1.2 },
  ]
  const byId = new Map<number, any>()
  for (const query of searches) {
    const body = await factory("/v1/vast/offers/search", {
      method: "POST",
      body: JSON.stringify({
        ...query,
        min_reliability: 0.99,
        verified: true,
        instance_type: "on-demand",
        limit: 50,
      }),
    })
    for (const offer of Array.isArray(body?.offers) ? body.offers : []) {
      const id = Number(offer?.id || offer?.ask_contract_id)
      if (id > 0) byId.set(id, offer)
    }
    if (byId.size >= 12) break
  }
  return [...byId.values()].sort((a, b) => offerScore(b) - offerScore(a))
}

async function discover() {
  const [templates, offers] = await Promise.all([discoverTemplates(), discoverOffers()])
  return {
    templates: templates.slice(0, 10).map((item: any) => ({
      hash_id: item.hash_id || item.hash,
      name: item.name || item.image || "ComfyUI",
      image: item.image || null,
      recommended: Boolean(item.recommended),
      score: templateScore(item),
    })),
    offers: offers.slice(0, 20).map((item: any) => ({
      offer_id: Number(item.id || item.ask_contract_id),
      gpu_name: item.gpu_name || null,
      gpu_ram_gb: Number(item.gpu_ram || 0) / 1024,
      hourly_price: Number(item.dph_total || item.min_bid || 0),
      reliability: Number(item.reliability || 0),
      dlperf: Number(item.dlperf || 0),
      geolocation: item.geolocation || item.country || null,
      score: offerScore(item),
    })),
  }
}

async function createScopedKey(original: string): Promise<{ key: string; id: number | null; created: boolean }> {
  try {
    const result = await vast(original, "/v0/auth/apikeys/", {
      method: "POST",
      body: JSON.stringify({
        name: `paradigm-video-factory-${new Date().toISOString().slice(0, 10)}`,
        permissions: {
          api: {
            misc: {},
            user_read: {},
            instance_read: {},
            instance_write: {},
          },
        },
      }),
    })
    const key = String(result?.key || result?.api_key || "").trim()
    if (key) return { key, id: Number(result?.id) || null, created: true }
  } catch (error) {
    console.warn(
      "[vast-bootstrap] scoped key creation unavailable; retaining supplied scoped key",
      error instanceof Error ? error.message : String(error),
    )
  }
  return { key: original, id: null, created: false }
}

function mappedPort(instance: any, names: string[]): string | null {
  const ports = instance?.ports && typeof instance.ports === "object" ? instance.ports : {}
  for (const name of names) {
    const mappings = ports[name]
    const value = Array.isArray(mappings) ? mappings[0] : mappings
    const port = value?.HostPort || value?.host_port || value?.port
    if (port) return String(port)
  }
  return null
}

function comfyHeaders(key: string): HeadersInit {
  return { Authorization: `Bearer ${key}`, "X-API-Key": key, Accept: "application/json" }
}

async function fetchProvisionManifest(baseUrl: string, proxyKey: string): Promise<any> {
  const response = await fetch(`${baseUrl}/__video_factory/status`, {
    headers: comfyHeaders(proxyKey),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  })
  const text = await response.text()
  let manifest: any = null
  try { manifest = text ? JSON.parse(text) : null } catch {}
  if (!response.ok) {
    throw new Error(`ComfyUI bootstrap -> HTTP ${response.status}: ${text.slice(0, 800)}`)
  }
  return manifest || { ready: false }
}

async function registerBootstrapAssets(baseUrl: string, proxyKey: string): Promise<any> {
  const manifest = await fetchProvisionManifest(baseUrl, proxyKey)
  if (!manifest?.ready) return manifest

  for (const model of Array.isArray(manifest.models) ? manifest.models : []) {
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

  const workflow = manifest?.workflows?.["abstract-broll-t2v"]
  if (!workflow?.workflow_json) {
    throw new Error("Provisioned instance did not expose abstract-broll-t2v")
  }
  await factory("/v1/registry/workflows/abstract-broll-t2v/bind", {
    method: "POST",
    body: JSON.stringify({
      workflow_json: workflow.workflow_json,
      reviewed_by: "Owner-delegated official-source bootstrap",
      model_bindings: workflow.model_bindings,
      confirm_license_review: true,
    }),
  })
  return manifest
}

function replacePlaceholders(value: any, bindings: Record<string, string | number>): any {
  if (Array.isArray(value)) return value.map((item) => replacePlaceholders(item, bindings))
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replacePlaceholders(item, bindings)]))
  }
  if (typeof value === "string" && value.startsWith("{{") && value.endsWith("}}")) {
    const key = value.slice(2, -2).trim()
    return Object.hasOwn(bindings, key) ? bindings[key] : value
  }
  return value
}

function findOutputs(history: any): Array<Record<string, any>> {
  const files: Array<Record<string, any>> = []
  for (const node of Object.values(history?.outputs || {})) {
    if (!node || typeof node !== "object") continue
    for (const key of ["videos", "gifs", "images", "audio"]) {
      const values = (node as any)[key]
      if (Array.isArray(values)) {
        files.push(...values.filter((item) => item && typeof item === "object" && item.filename))
      }
    }
  }
  return files
}

async function submitSmoke(baseUrl: string, proxyKey: string, manifest: any): Promise<string> {
  const template = manifest?.workflows?.["abstract-broll-t2v"]?.workflow_json
  if (!template) throw new Error("Smoke workflow is unavailable")
  const workflow = replacePlaceholders(template, {
    prompt: "clean cinematic abstract technology waves, deep navy background, subtle emerald light, premium B2B software advertising, smooth camera motion, no text, no logos",
    negative_prompt: "text, logo, watermark, human face, hands, distortion, low quality, flicker",
    seed: 20260729,
    width: 480,
    height: 272,
  })
  for (const node of Object.values(workflow) as any[]) {
    if (node?.class_type === "Wan22ImageToVideoLatent") {
      node.inputs.width = 480
      node.inputs.height = 272
      node.inputs.length = 33
    }
    if (node?.class_type === "KSampler") {
      node.inputs.steps = 10
      node.inputs.cfg = 4.0
    }
    if (node?.class_type === "CreateVideo") node.inputs.fps = 16.0
    if (node?.class_type === "SaveVideo") node.inputs.filename_prefix = "video/ParadigmBootstrap"
  }
  const response = await fetch(`${baseUrl}/prompt`, {
    method: "POST",
    headers: { ...comfyHeaders(proxyKey), "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: randomBytes(16).toString("hex") }),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  })
  const text = await response.text()
  let body: any = null
  try { body = text ? JSON.parse(text) : null } catch {}
  if (!response.ok || !body?.prompt_id) {
    throw new Error(`ComfyUI smoke submission failed: HTTP ${response.status}: ${text.slice(0, 1000)}`)
  }
  return String(body.prompt_id)
}

async function pollSmoke(baseUrl: string, proxyKey: string, promptId: string): Promise<null | {
  path: string
  sha256: string
  size: number
}> {
  const response = await fetch(`${baseUrl}/history/${encodeURIComponent(promptId)}`, {
    headers: comfyHeaders(proxyKey),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok) throw new Error(`ComfyUI smoke history failed: HTTP ${response.status}`)
  const payload = await response.json()
  const history = payload?.[promptId]
  if (!history) return null
  const outputs = findOutputs(history)
  if (!outputs.length) {
    const status = history?.status
    if (status?.status_str === "error" || status?.completed === true) {
      throw new Error(`ComfyUI smoke completed without an output: ${JSON.stringify(status).slice(0, 800)}`)
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
  if (!media.ok) throw new Error(`ComfyUI smoke download failed: HTTP ${media.status}`)
  const bytes = Buffer.from(await media.arrayBuffer())
  if (bytes.length < 10_000) throw new Error(`ComfyUI smoke output is unexpectedly small: ${bytes.length}`)
  fs.mkdirSync(SMOKE_ROOT, { recursive: true, mode: 0o700 })
  const output = path.join(SMOKE_ROOT, "wan22-smoke.mp4")
  fs.writeFileSync(output, bytes, { mode: 0o600 })
  return {
    path: output,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: bytes.length,
  }
}

async function cleanupInstance(instanceId: number | null | undefined): Promise<void> {
  if (!instanceId) return
  try {
    await factory(`/v1/vast/instances/${instanceId}`, { method: "DELETE" })
  } catch (error) {
    console.warn("[vast-bootstrap] cleanup failed", error instanceof Error ? error.message : String(error))
  }
}

async function advanceBootstrap(): Promise<Record<string, unknown>> {
  const state = readBootstrapState()
  if (state.completed_at) return { ok: true, phase: "ready", ...safeState(state) }
  if (!state.instance_id) {
    return { ok: true, phase: state.configured_at ? "configured" : "unconfigured", ...safeState(state) }
  }

  const list = await factory("/v1/vast/instances")
  const instance = (Array.isArray(list?.instances) ? list.instances : []).find(
    (item: any) => Number(item?.id || item?.instance_id) === Number(state.instance_id),
  )
  if (!instance) return { ok: true, phase: "instance-not-visible-yet", ...safeState(state) }

  const instanceStatus = String(instance.actual_status || instance.status || instance.cur_state || "unknown")
  const host = instance.public_ipaddr || instance.public_ip || instance.ssh_host || null
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
  const baseUrl = `http://${host}:${port}`
  await factory("/v1/runtime", {
    method: "PUT",
    body: JSON.stringify({ comfyui_base_url: baseUrl }),
  })
  writeBootstrapState({ comfyui_base_url: baseUrl })

  let manifest: any
  try {
    manifest = await registerBootstrapAssets(baseUrl, state.proxy_key)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
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
  if (!manifest?.ready) {
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = requireToken(request)
  if (denied) return denied
  const action = request.nextUrl.searchParams.get("action") || "status"

  try {
    if (action === "public-key") {
      if (bootstrapIsComplete()) {
        return responseJson({ ok: false, error: "Bootstrap already completed", ...safeState() }, 410)
      }
      return responseJson({
        ok: true,
        algorithm: "RSA-OAEP-SHA256",
        public_key_pem: publicKeyPem(),
      })
    }

    if (action === "configure") {
      if (bootstrapIsComplete()) {
        return responseJson({ ok: false, error: "Bootstrap already completed", ...safeState() }, 410)
      }
      const encrypted = request.nextUrl.searchParams.get("ciphertext")
      if (!encrypted) return responseJson({ ok: false, error: "ciphertext is required" }, 422)
      const original = decryptVastKey(encrypted)
      await vast(original, "/v0/users/current/")
      const scoped = await createScopedKey(original)
      await factory("/v1/runtime", {
        method: "PUT",
        body: JSON.stringify({ vast_api_key: scoped.key }),
      })
      const configured = writeBootstrapState({
        configured_at: new Date().toISOString(),
        scoped_key_created: scoped.created,
        scoped_key_id: scoped.id,
        original_key_fingerprint: fingerprintSecret(original),
        failed_at: null,
        last_error: null,
      })
      return responseJson({ ok: true, ...safeState(configured), candidates: await discover() })
    }

    if (action === "discover") {
      return responseJson({ ok: true, ...safeState(), candidates: await discover() })
    }

    if (action === "provision") {
      if (bootstrapIsComplete()) {
        return responseJson({ ok: false, error: "Bootstrap already completed", ...safeState() }, 410)
      }
      const state = readBootstrapState()
      if (!state.configured_at) {
        return responseJson({ ok: false, error: "Vast.ai key is not configured" }, 409)
      }
      if (state.instance_id) return responseJson(await advanceBootstrap())

      const candidates = await discover()
      const templateHash = request.nextUrl.searchParams.get("template_hash")
        || candidates.templates[0]?.hash_id
      if (!templateHash) throw new Error("No suitable ComfyUI template was found")
      const requestedOfferId = Number(request.nextUrl.searchParams.get("offer_id") || 0)
      const offerRows = requestedOfferId
        ? candidates.offers.filter((item: any) => Number(item.offer_id) === requestedOfferId)
        : candidates.offers
      if (!offerRows.length) throw new Error("No suitable GPU offer was found")

      const proxyKey = randomBytes(32).toString("hex")
      let created: any = null
      let chosen: any = null
      let lastError: unknown = null
      for (const offer of offerRows.slice(0, 8)) {
        try {
          created = await factory("/v1/vast/instances", {
            method: "POST",
            body: JSON.stringify({
              offer_id: Number(offer.offer_id),
              template_hash_id: templateHash,
              label: `paradigm-comfyui-wan22-${Date.now().toString().slice(-6)}`,
              disk_gb: 120,
              target_state: "running",
              mount_path: "/workspace",
              runtype: "ssh_direct",
              env: {
                PROVISIONING_SCRIPT,
                COMFY_PROXY_KEY: proxyKey,
                COMFY_INTERNAL_PORT: "18188",
                COMFY_PROXY_PORT: "18189",
                COMFYUI_ARGS: "--disable-auto-launch --listen 127.0.0.1 --port 18188",
                WEB_ENABLE_AUTH: "false",
                HF_HUB_ENABLE_HF_TRANSFER: "1",
                "-p 18189:18189": "1",
              },
            }),
          })
          chosen = offer
          break
        } catch (error) {
          lastError = error
          console.warn(
            `[vast-bootstrap] offer ${offer.offer_id} became unavailable`,
            error instanceof Error ? error.message : String(error),
          )
        }
      }
      if (!created || !chosen) {
        throw new Error(`All candidate GPU offers failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
      }
      const instanceId = Number(
        created?.result?.new_contract
          || created?.result?.id
          || created?.new_contract
          || created?.id,
      )
      if (!instanceId) throw new Error("Vast.ai did not return an instance ID")
      await factory("/v1/runtime", {
        method: "PUT",
        body: JSON.stringify({
          comfyui_api_key: proxyKey,
          vast_template_hash: templateHash,
        }),
      })
      const provisioned = writeBootstrapState({
        instance_id: instanceId,
        template_hash: templateHash,
        offer_id: Number(chosen.offer_id),
        gpu_name: chosen.gpu_name,
        hourly_price: Number(chosen.hourly_price),
        proxy_key: proxyKey,
        provision_started_at: new Date().toISOString(),
        failed_at: null,
        last_error: null,
      })
      return responseJson({ ok: true, phase: "instance-created", ...safeState(provisioned) })
    }

    if (action === "cleanup") {
      const state = readBootstrapState()
      await cleanupInstance(state.instance_id)
      await factory("/v1/runtime", {
        method: "PUT",
        body: JSON.stringify({ clear_comfyui_api_key: true, comfyui_base_url: null }),
      })
      const cleaned = writeBootstrapState({
        instance_id: null,
        offer_id: null,
        gpu_name: null,
        hourly_price: null,
        proxy_key: null,
        comfyui_base_url: null,
        workflow_id: null,
        smoke_prompt_id: null,
        smoke_started_at: null,
        provision_started_at: null,
      })
      return responseJson({ ok: true, phase: "cleaned", ...safeState(cleaned) })
    }

    if (action === "status" || action === "finalize") {
      return responseJson(await advanceBootstrap())
    }

    return responseJson({ ok: false, error: "Unknown action" }, 404)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error("[vast-bootstrap] failed", detail)
    const state = writeBootstrapState({
      last_error: detail,
      failed_at: new Date().toISOString(),
    })
    return responseJson({ ok: false, error: detail, ...safeState(state) }, 500)
  }
}
