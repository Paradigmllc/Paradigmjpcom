import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import {
  bootstrapIsComplete,
  decryptVastKey,
  fingerprintSecret,
  publicKeyPem,
  readBootstrapState,
  removeBootstrapKeyMaterial,
  tokenIsValid,
  writeBootstrapState,
} from "@/lib/video-factory-vast-bootstrap"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

const INTERNAL_ORIGIN = process.env.VIDEO_FACTORY_INTERNAL_URL?.trim() || "http://127.0.0.1:8080"
const VAST_ORIGIN = "https://console.vast.ai/api"
const PROVISIONING_SCRIPT = "https://raw.githubusercontent.com/Paradigmllc/Paradigmjpcom/main/scripts/vast/provision-video-factory-wan22.sh"

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
  if (!response.ok) throw new Error(`Factory ${pathname} -> HTTP ${response.status}: ${text.slice(0, 800)}`)
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
  if (!response.ok) throw new Error(`Vast ${pathname} -> HTTP ${response.status}: ${text.slice(0, 800)}`)
  return data
}

function safeState() {
  const state = readBootstrapState() as any
  return {
    configured_at: state.configured_at || null,
    scoped_key_created: Boolean(state.scoped_key_created),
    scoped_key_id: state.scoped_key_id || null,
    original_key_fingerprint: state.original_key_fingerprint || null,
    instance_id: state.instance_id || null,
    template_hash: state.template_hash || null,
    offer_id: state.offer_id || null,
    completed_at: state.completed_at || null,
    proxy_key_configured: Boolean(state.proxy_key),
    test_project_id: state.test_project_id || null,
  }
}

function requireToken(request: NextRequest): NextResponse | null {
  if (!tokenIsValid(request.nextUrl.searchParams.get("token"))) {
    return NextResponse.json({ ok: false, error: "Invalid bootstrap token" }, { status: 403 })
  }
  return null
}

function templateScore(item: any): number {
  const text = `${item?.name || ""} ${item?.desc || ""} ${item?.image || ""}`.toLowerCase()
  let score = 0
  if (/\bcomfyui\b/.test(text)) score += 200
  if (/recommended/.test(text) || item?.recommended === true) score += 50
  if (/jupyter/.test(text)) score += 20
  if (/wan\s*2\.2|serverless/.test(text)) score -= 80
  if (/ltx/.test(text)) score -= 20
  return score + Number(item?.count_created || 0) / 1000
}

function offerScore(item: any): number {
  const price = Math.max(Number(item?.dph_total || item?.min_bid || 99), 0.001)
  const dlperf = Number(item?.dlperf || 0)
  const reliability = Number(item?.reliability || 0)
  const inet = Math.min(Number(item?.inet_down || 0), 2000) / 2000
  return (dlperf / price) * Math.max(reliability, 0.5) * (1 + inet * 0.1)
}

async function discover() {
  const templatesBody = await factory("/v1/vast/templates?query=ComfyUI&recommended_only=true&ssh_only=true")
  const templates = Array.isArray(templatesBody?.templates) ? templatesBody.templates : []
  const rankedTemplates = templates
    .filter((item: any) => item?.hash_id || item?.hash)
    .sort((a: any, b: any) => templateScore(b) - templateScore(a))
    .slice(0, 10)
    .map((item: any) => ({
      hash_id: item.hash_id || item.hash,
      name: item.name || item.image || "ComfyUI",
      image: item.image || null,
      recommended: Boolean(item.recommended),
      score: templateScore(item),
    }))

  const searches = [
    { gpu_names: ["RTX 4090"], min_gpu_ram_gb: 24, max_hourly_price: 0.9 },
    { gpu_names: ["RTX 3090", "RTX A6000"], min_gpu_ram_gb: 24, max_hourly_price: 0.75 },
  ]
  let offers: any[] = []
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
    const rows = Array.isArray(body?.offers) ? body.offers : []
    offers.push(...rows)
    if (offers.length >= 5) break
  }
  const rankedOffers = offers
    .filter((item: any) => item?.id || item?.ask_contract_id)
    .sort((a: any, b: any) => offerScore(b) - offerScore(a))
    .slice(0, 12)
    .map((item: any) => ({
      offer_id: Number(item.id || item.ask_contract_id),
      gpu_name: item.gpu_name || null,
      gpu_ram_gb: Number(item.gpu_ram || 0) / 1024,
      hourly_price: Number(item.dph_total || item.min_bid || 0),
      reliability: Number(item.reliability || 0),
      dlperf: Number(item.dlperf || 0),
      geolocation: item.geolocation || item.country || null,
      score: offerScore(item),
    }))
  return { templates: rankedTemplates, offers: rankedOffers }
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
    console.warn("[vast-bootstrap] scoped key creation unavailable; using supplied key", error instanceof Error ? error.message : String(error))
  }
  return { key: original, id: null, created: false }
}

function mappedPort(instance: any, names: string[]): string | null {
  const ports = instance?.ports && typeof instance.ports === "object" ? instance.ports : {}
  for (const name of names) {
    const mappings = ports[name]
    const port = Array.isArray(mappings) ? mappings[0]?.HostPort : null
    if (port) return String(port)
  }
  return null
}

async function instanceDetails(key: string, id: number): Promise<any> {
  const body = await vast(key, `/v0/instances/${id}/`)
  return body?.instances || body
}

async function registerBootstrapAssets(baseUrl: string, proxyKey: string): Promise<any> {
  const response = await fetch(`${baseUrl}/__video_factory/status`, {
    headers: { Authorization: `Bearer ${proxyKey}`, "X-API-Key": proxyKey },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  })
  const text = await response.text()
  let manifest: any = null
  try { manifest = text ? JSON.parse(text) : null } catch {}
  if (!response.ok) throw new Error(`ComfyUI bootstrap -> HTTP ${response.status}: ${text.slice(0, 600)}`)
  if (!manifest?.ready) return manifest || { ready: false }

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
  if (!workflow?.workflow_json) throw new Error("Provisioned instance did not expose abstract-broll-t2v")
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = requireToken(request)
  if (denied) return denied
  const action = request.nextUrl.searchParams.get("action") || "status"

  try {
    if (action === "public-key") {
      if (bootstrapIsComplete()) return NextResponse.json({ ok: false, error: "Bootstrap already completed" }, { status: 410 })
      return NextResponse.json({ ok: true, algorithm: "RSA-OAEP-SHA256", public_key_pem: publicKeyPem() })
    }

    if (action === "configure") {
      if (bootstrapIsComplete()) return NextResponse.json({ ok: false, error: "Bootstrap already completed" }, { status: 410 })
      const encrypted = request.nextUrl.searchParams.get("ciphertext")
      if (!encrypted) return NextResponse.json({ ok: false, error: "ciphertext is required" }, { status: 422 })
      const original = decryptVastKey(encrypted)
      await vast(original, "/v0/users/current/")
      const scoped = await createScopedKey(original)
      await factory("/v1/runtime", {
        method: "PUT",
        body: JSON.stringify({ vast_api_key: scoped.key }),
      })
      writeBootstrapState({
        configured_at: new Date().toISOString(),
        scoped_key_created: scoped.created,
        scoped_key_id: scoped.id,
        original_key_fingerprint: fingerprintSecret(original),
      })
      const candidates = await discover()
      return NextResponse.json({ ok: true, ...safeState(), candidates })
    }

    if (action === "discover") {
      return NextResponse.json({ ok: true, ...safeState(), candidates: await discover() })
    }

    if (action === "provision") {
      if (bootstrapIsComplete()) return NextResponse.json({ ok: false, error: "Bootstrap already completed" }, { status: 410 })
      const state: any = readBootstrapState()
      if (!state.configured_at) return NextResponse.json({ ok: false, error: "Vast.ai key is not configured" }, { status: 409 })
      const candidates = await discover()
      const templateHash = request.nextUrl.searchParams.get("template_hash") || candidates.templates[0]?.hash_id
      const offerId = Number(request.nextUrl.searchParams.get("offer_id") || candidates.offers[0]?.offer_id)
      if (!templateHash || !offerId) throw new Error("No suitable ComfyUI template or GPU offer was found")
      const proxyKey = randomBytes(32).toString("hex")
      const runtime = await factory("/v1/runtime")
      const storedVastKeyConfigured = Boolean(runtime?.vast?.configured)
      if (!storedVastKeyConfigured) throw new Error("Stored Vast.ai credential is unavailable")

      // Use the factory's stored key through its API by asking it to create the instance.
      const created = await factory("/v1/vast/instances", {
        method: "POST",
        body: JSON.stringify({
          offer_id: offerId,
          template_hash_id: templateHash,
          label: `paradigm-comfyui-wan22-${Date.now().toString().slice(-6)}`,
          disk_gb: 120,
          target_state: "running",
          mount_path: "/workspace",
          env: {
            PROVISIONING_SCRIPT,
            COMFY_PROXY_KEY: proxyKey,
            COMFYUI_ARGS: "--disable-auto-launch --listen 0.0.0.0 --port 18188 --enable-cors-header",
            WEB_ENABLE_AUTH: "false",
            "-p 18189:18189": "1",
            "-p 18188:18188": "1",
          },
        }),
      })
      const instanceId = Number(created?.result?.new_contract || created?.result?.id || created?.new_contract)
      if (!instanceId) throw new Error("Vast.ai did not return an instance ID")
      await factory("/v1/runtime", {
        method: "PUT",
        body: JSON.stringify({
          comfyui_api_key: proxyKey,
          vast_template_hash: templateHash,
        }),
      })
      writeBootstrapState({
        instance_id: instanceId,
        template_hash: templateHash,
        offer_id: offerId,
        proxy_key: proxyKey,
      } as any)
      return NextResponse.json({ ok: true, ...safeState(), instance_id: instanceId })
    }

    if (action === "status" || action === "finalize") {
      const state: any = readBootstrapState()
      if (!state.instance_id) return NextResponse.json({ ok: true, phase: state.configured_at ? "configured" : "unconfigured", ...safeState() })
      const runtime = await factory("/v1/runtime")
      const vastKeyConfigured = Boolean(runtime?.vast?.configured)
      if (!vastKeyConfigured) throw new Error("Stored Vast.ai credential is unavailable")
      // The factory does not reveal the stored key. Query the instance through its authenticated facade.
      const list = await factory("/v1/vast/instances")
      const instance = (Array.isArray(list?.instances) ? list.instances : []).find(
        (item: any) => Number(item?.id || item?.instance_id) === Number(state.instance_id),
      )
      if (!instance) return NextResponse.json({ ok: true, phase: "instance-not-visible-yet", ...safeState() })
      const status = instance.actual_status || instance.status || instance.cur_state || "unknown"
      const host = instance.public_ipaddr || instance.public_ip || instance.ssh_host || null
      const port = mappedPort(instance, ["18189/tcp", "8189/tcp"])
      if (!host || !port || status !== "running") {
        return NextResponse.json({ ok: true, phase: "instance-starting", instance_status: status, host_ready: Boolean(host), port_ready: Boolean(port), ...safeState() })
      }
      const baseUrl = `http://${host}:${port}`
      await factory("/v1/runtime", {
        method: "PUT",
        body: JSON.stringify({ comfyui_base_url: baseUrl }),
      })
      let manifest: any
      try {
        manifest = await registerBootstrapAssets(baseUrl, state.proxy_key)
      } catch (error) {
        return NextResponse.json({
          ok: true,
          phase: "provisioning",
          instance_status: status,
          comfyui_base_url: baseUrl,
          detail: error instanceof Error ? error.message : String(error),
          ...safeState(),
        })
      }
      if (!manifest?.ready) {
        return NextResponse.json({ ok: true, phase: "provisioning", instance_status: status, comfyui_base_url: baseUrl, manifest, ...safeState() })
      }
      writeBootstrapState({ completed_at: new Date().toISOString() })
      removeBootstrapKeyMaterial()
      return NextResponse.json({
        ok: true,
        phase: "ready",
        instance_status: status,
        comfyui_base_url: baseUrl,
        workflow: "abstract-broll-t2v",
        models: (manifest.models || []).map((item: any) => ({ id: item.id, exact_artifact: item.exact_artifact, sha256: item.sha256 })),
        ...safeState(),
      })
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 404 })
  } catch (error) {
    console.error("[vast-bootstrap] failed", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error), ...safeState() }, { status: 500 })
  }
}
