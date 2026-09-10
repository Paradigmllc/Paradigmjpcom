import { createHash, timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

const EXPECTED_VAST_KEY_SHA256 = "617ad24a42bf101a2191deab6a8c98c12005855d07f0967f25d70a703b751d02"
const INTERNAL_ORIGIN = process.env.VIDEO_FACTORY_INTERNAL_URL?.trim() || "http://127.0.0.1:8080"
const VAST_ORIGIN = "https://console.vast.ai/api"

function responseJson(body: object, status = 200): NextResponse {
  const response = NextResponse.json(body, { status })
  response.headers.set("Cache-Control", "private, no-store, max-age=0")
  response.headers.set("Pragma", "no-cache")
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  return response
}

function secretHashMatches(value: string): boolean {
  const expected = Buffer.from(EXPECTED_VAST_KEY_SHA256, "hex")
  const actual = createHash("sha256").update(value, "utf8").digest()
  return actual.length === expected.length && timingSafeEqual(actual, expected)
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

async function vast(key: string, pathname: string): Promise<any> {
  const response = await fetch(`${VAST_ORIGIN}${pathname}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
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

function findProxyKey(value: unknown): string | null {
  const candidates: string[] = []
  const visit = (item: unknown): void => {
    if (Array.isArray(item)) {
      for (const child of item) visit(child)
      return
    }
    if (item && typeof item === "object") {
      for (const [key, child] of Object.entries(item as Record<string, unknown>)) {
        if (key.toUpperCase() === "COMFY_PROXY_KEY" && typeof child === "string") {
          candidates.push(child.trim())
        }
        visit(child)
      }
      return
    }
    if (typeof item !== "string") return
    const patterns = [
      /COMFY_PROXY_KEY\s*=\s*([A-Fa-f0-9]{64,128})/,
      /COMFY_PROXY_KEY["']?\s*[:=]\s*["']?([A-Fa-f0-9]{64,128})/,
    ]
    for (const pattern of patterns) {
      const match = item.match(pattern)
      if (match?.[1]) candidates.push(match[1])
    }
  }
  visit(value)
  return candidates.find((candidate) => /^[A-Fa-f0-9]{64,128}$/.test(candidate)) || null
}

function mappedPort(instance: any): string | null {
  const ports = instance?.ports && typeof instance.ports === "object" ? instance.ports : {}
  for (const name of ["18189/tcp", "8189/tcp", "18189", "8189"]) {
    const mappings = ports[name]
    const value = Array.isArray(mappings) ? mappings[0] : mappings
    const port = value?.HostPort || value?.host_port || value?.port || value
    if (typeof port === "string" || typeof port === "number") return String(port)
  }
  return null
}

function instanceStatus(instance: any): string {
  return String(instance?.actual_status || instance?.status || instance?.cur_state || "unknown")
}

function instanceId(instance: any): number {
  return Number(instance?.id || instance?.instance_id || 0)
}

function safeRuntimeFlags(runtime: any): Record<string, unknown> {
  return {
    vast_configured: Boolean(runtime?.vast?.configured || runtime?.vast_api_key_configured),
    comfyui_url_configured: Boolean(
      runtime?.comfyui?.base_url
      || runtime?.comfyui_base_url
      || runtime?.comfyui_base_url_configured,
    ),
    comfyui_key_configured: Boolean(
      runtime?.comfyui?.api_key_configured
      || runtime?.comfyui_api_key_configured,
    ),
    vast_instance_id: runtime?.vast?.instance_id || runtime?.vast_instance_id || null,
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const key = request.headers.get("x-vast-key")?.trim() || ""
  if (!secretHashMatches(key)) {
    return responseJson({ ok: false, error: "Unauthorized" }, 403)
  }

  try {
    await vast(key, "/v0/users/current/")
    const payload = await vast(key, "/v0/instances/")
    const instances = Array.isArray(payload?.instances)
      ? payload.instances
      : Array.isArray(payload)
        ? payload
        : []
    const candidates = instances
      .filter((item: any) => String(item?.label || "").startsWith("paradigm-comfyui-wan22-"))
      .filter((item: any) => instanceStatus(item).toLowerCase() === "running")
      .sort((left: any, right: any) => instanceId(right) - instanceId(left))
    const instance = candidates[0]
    if (!instance) throw new Error("No running Paradigm ComfyUI instance was found")

    const proxyKey = findProxyKey(instance)
    if (!proxyKey) throw new Error("The ComfyUI proxy key could not be recovered from the Vast instance")
    const host = instance.public_ipaddr || instance.public_ip || instance.ssh_host
    const port = mappedPort(instance)
    if (!host || !port) throw new Error("The ComfyUI proxy host or port is unavailable")
    const baseUrl = `http://${host}:${port}`
    const headers = {
      Authorization: `Bearer ${proxyKey}`,
      "X-API-Key": proxyKey,
      Accept: "application/json",
    }

    const statsResponse = await fetch(`${baseUrl}/system_stats`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    })
    if (!statsResponse.ok) {
      throw new Error(`ComfyUI system check returned HTTP ${statsResponse.status}`)
    }
    const stats = await statsResponse.json()

    const manifestResponse = await fetch(`${baseUrl}/__video_factory/status`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    })
    const manifestText = await manifestResponse.text()
    let manifest: any = null
    try { manifest = manifestText ? JSON.parse(manifestText) : null } catch {}
    if (!manifestResponse.ok || !manifest?.ready) {
      throw new Error(
        `ComfyUI workflow manifest is not ready: HTTP ${manifestResponse.status}: ${manifestText.slice(0, 1000)}`,
      )
    }

    await factory("/v1/runtime", {
      method: "PUT",
      body: JSON.stringify({
        vast_api_key: key,
        comfyui_base_url: baseUrl,
        comfyui_api_key: proxyKey,
        vast_instance_id: instanceId(instance),
      }),
    })
    const runtime = await factory("/v1/runtime")

    return responseJson({
      ok: true,
      connected: true,
      instance_id: instanceId(instance),
      gpu_name: instance.gpu_name || null,
      instance_status: instanceStatus(instance),
      workflow: "abstract-broll-t2v",
      manifest_ready: true,
      model_count: Array.isArray(manifest.models) ? manifest.models.length : 0,
      system_stats_ready: Boolean(stats),
      ...safeRuntimeFlags(runtime),
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error("[video-factory-runtime-handoff] failed", detail)
    return responseJson({ ok: false, error: detail }, 500)
  }
}
