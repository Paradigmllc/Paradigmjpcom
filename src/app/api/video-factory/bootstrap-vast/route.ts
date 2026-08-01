import { randomBytes } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import {
  bootstrapIsComplete,
  decryptVastKey,
  fingerprintSecret,
  publicKeyPem,
  readBootstrapState,
  tokenIsValid,
  writeBootstrapState,
} from "@/lib/video-factory-vast-bootstrap"
import {
  advanceBootstrap,
  cleanupInstance,
  factory,
  safeState,
} from "@/lib/video-factory-vast-bootstrap-runtime"
import {
  createScopedVastKey,
  discoverVastCandidates,
  type VastOfferCandidate,
  verifyVastKey,
  VIDEO_FACTORY_PROVISIONING_SCRIPT,
} from "@/lib/video-factory-vast-marketplace"
import {
  jsonNumber,
  jsonRecord,
} from "@/lib/video-factory-vast-json"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

function responseJson(body: object, status = 200): NextResponse {
  const response = NextResponse.json(body, { status })
  response.headers.set("Cache-Control", "private, no-store, max-age=0")
  response.headers.set("Pragma", "no-cache")
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  return response
}

function requireToken(request: NextRequest): NextResponse | null {
  if (!tokenIsValid(request.nextUrl.searchParams.get("token"))) {
    return responseJson({ ok: false, error: "Invalid bootstrap token" }, 403)
  }
  return null
}

async function configure(request: NextRequest): Promise<NextResponse> {
  if (bootstrapIsComplete()) {
    return responseJson(
      { ok: false, error: "Bootstrap already completed", ...safeState() },
      410,
    )
  }
  const encrypted = request.nextUrl.searchParams.get("ciphertext")
  if (!encrypted) {
    return responseJson({ ok: false, error: "ciphertext is required" }, 422)
  }
  const original = decryptVastKey(encrypted)
  await verifyVastKey(original)
  const scoped = await createScopedVastKey(original)
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
  return responseJson({
    ok: true,
    ...safeState(configured),
    candidates: await discoverVastCandidates(),
  })
}

async function provision(request: NextRequest): Promise<NextResponse> {
  if (bootstrapIsComplete()) {
    return responseJson(
      { ok: false, error: "Bootstrap already completed", ...safeState() },
      410,
    )
  }
  const state = readBootstrapState()
  if (!state.configured_at) {
    return responseJson({ ok: false, error: "Vast.ai key is not configured" }, 409)
  }
  if (state.instance_id) return responseJson(await advanceBootstrap())

  const candidates = await discoverVastCandidates()
  const templateHash = request.nextUrl.searchParams.get("template_hash")
    || candidates.templates[0]?.hash_id
  if (!templateHash) throw new Error("No suitable ComfyUI template was found")
  const requestedOfferId = Number(request.nextUrl.searchParams.get("offer_id") || 0)
  const offerRows = requestedOfferId
    ? candidates.offers.filter((item) => Number(item.offer_id) === requestedOfferId)
    : candidates.offers
  if (!offerRows.length) throw new Error("No suitable GPU offer was found")

  const proxyKey = randomBytes(32).toString("hex")
  let created: unknown = null
  let chosen: VastOfferCandidate | null = null
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
            PROVISIONING_SCRIPT: VIDEO_FACTORY_PROVISIONING_SCRIPT,
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
    const detail = lastError instanceof Error ? lastError.message : String(lastError)
    throw new Error(`All candidate GPU offers failed: ${detail}`)
  }
  const createdRecord = jsonRecord(created)
  const createdResult = jsonRecord(createdRecord?.result)
  const instanceId = jsonNumber(createdResult?.new_contract)
    || jsonNumber(createdResult?.id)
    || jsonNumber(createdRecord?.new_contract)
    || jsonNumber(createdRecord?.id)
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
  return responseJson({
    ok: true,
    phase: "instance-created",
    ...safeState(provisioned),
  })
}

async function cleanup(): Promise<NextResponse> {
  const state = readBootstrapState()
  await cleanupInstance(state.instance_id)
  await factory("/v1/runtime", {
    method: "PUT",
    body: JSON.stringify({
      clear_comfyui_api_key: true,
      comfyui_base_url: null,
    }),
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = requireToken(request)
  if (denied) return denied
  const action = request.nextUrl.searchParams.get("action") || "status"

  try {
    if (action === "public-key") {
      if (bootstrapIsComplete()) {
        return responseJson(
          { ok: false, error: "Bootstrap already completed", ...safeState() },
          410,
        )
      }
      return responseJson({
        ok: true,
        algorithm: "RSA-OAEP-SHA256",
        public_key_pem: publicKeyPem(),
      })
    }
    if (action === "configure") return await configure(request)
    if (action === "discover") {
      return responseJson({
        ok: true,
        ...safeState(),
        candidates: await discoverVastCandidates(),
      })
    }
    if (action === "provision") return await provision(request)
    if (action === "cleanup") return await cleanup()
    if (action === "status" || action === "finalize") {
      return responseJson(await advanceBootstrap())
    }
    return responseJson({ ok: false, error: "Unknown action" }, 404)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error("[vast-bootstrap] failed", error)
    const state = writeBootstrapState({
      last_error: detail,
      failed_at: new Date().toISOString(),
    })
    return responseJson({ ok: false, error: detail, ...safeState(state) }, 500)
  }
}
