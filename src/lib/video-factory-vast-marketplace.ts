import "server-only"

import { factory } from "@/lib/video-factory-vast-bootstrap-runtime"
import {
  isJsonRecord,
  jsonArray,
  jsonNumber,
  jsonRecord,
  jsonString,
  type JsonRecord,
} from "@/lib/video-factory-vast-json"

const VAST_ORIGIN = "https://console.vast.ai/api"

export const VIDEO_FACTORY_PROVISIONING_SCRIPT =
  "https://raw.githubusercontent.com/Paradigmllc/Paradigmjpcom/main/scripts/vast/provision-video-factory-wan22.sh"

export type VastTemplateCandidate = {
  hash_id: string
  name: string
  image: string | null
  recommended: boolean
  score: number
}

export type VastOfferCandidate = {
  offer_id: number
  gpu_name: string | null
  gpu_ram_gb: number
  hourly_price: number
  reliability: number
  dlperf: number
  geolocation: string | null
  score: number
}

async function vast(key: string, pathname: string, init: RequestInit = {}): Promise<unknown> {
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
  if (!response.ok) {
    throw new Error(`Vast ${pathname} -> HTTP ${response.status}: ${text.slice(0, 1000)}`)
  }
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch (error) {
    console.error(`[vast-bootstrap] Vast ${pathname} returned invalid JSON`, error)
    throw new Error(`Vast ${pathname} returned invalid JSON`)
  }
}

function templateScore(value: unknown): number {
  const item = jsonRecord(value) || {}
  const text = `${jsonString(item.name) || ""} ${jsonString(item.desc) || ""} ${jsonString(item.image) || ""}`.toLowerCase()
  let score = 0
  if (/\bcomfyui\b/.test(text)) score += 200
  if (item.recommended === true || /recommended/.test(text)) score += 50
  if (/jupyter|ssh/.test(text)) score += 20
  if (/serverless/.test(text)) score -= 100
  return score + (jsonNumber(item.count_created) || 0) / 1000
}

function offerScore(value: unknown): number {
  const item = jsonRecord(value) || {}
  const price = Math.max(
    jsonNumber(item.dph_total) || jsonNumber(item.min_bid) || 99,
    0.001,
  )
  const dlperf = Math.max(jsonNumber(item.dlperf) || 0, 0.1)
  const reliability = Math.max(jsonNumber(item.reliability) || 0, 0.5)
  const inet = Math.min(Math.max(jsonNumber(item.inet_down) || 0, 0), 2000) / 2000
  const disk = Math.min(Math.max(jsonNumber(item.disk_bw) || 0, 0), 5000) / 5000
  return (dlperf / price) * reliability * (1 + inet * 0.1 + disk * 0.05)
}

async function discoverTemplates(): Promise<JsonRecord[]> {
  const attempts = [
    "/v1/vast/templates?query=ComfyUI&recommended_only=true&ssh_only=true",
    "/v1/vast/templates?query=ComfyUI&recommended_only=false&ssh_only=true",
    "/v1/vast/templates?query=ComfyUI&recommended_only=false&ssh_only=false",
  ]
  for (const pathname of attempts) {
    const body = jsonRecord(await factory(pathname))
    const templates = jsonArray(body?.templates).filter(isJsonRecord)
    const ranked = templates
      .filter((item) => jsonString(item.hash_id) || jsonString(item.hash))
      .sort((a, b) => templateScore(b) - templateScore(a))
    if (ranked.length) return ranked
  }
  return []
}

async function discoverOffers(): Promise<JsonRecord[]> {
  const searches = [
    { gpu_names: ["RTX 4090"], min_gpu_ram_gb: 24, max_hourly_price: 0.9 },
    { gpu_names: ["RTX 3090", "RTX A6000"], min_gpu_ram_gb: 24, max_hourly_price: 0.75 },
    { gpu_names: ["A40", "L40S"], min_gpu_ram_gb: 40, max_hourly_price: 1.2 },
  ]
  const byId = new Map<number, JsonRecord>()
  for (const query of searches) {
    const body = jsonRecord(await factory("/v1/vast/offers/search", {
      method: "POST",
      body: JSON.stringify({
        ...query,
        min_reliability: 0.99,
        verified: true,
        instance_type: "on-demand",
        limit: 50,
      }),
    }))
    for (const offer of jsonArray(body?.offers).filter(isJsonRecord)) {
      const id = jsonNumber(offer.id) || jsonNumber(offer.ask_contract_id) || 0
      if (id > 0) byId.set(id, offer)
    }
    if (byId.size >= 12) break
  }
  return [...byId.values()].sort((a, b) => offerScore(b) - offerScore(a))
}

export async function discoverVastCandidates(): Promise<{
  templates: VastTemplateCandidate[]
  offers: VastOfferCandidate[]
}> {
  const [templates, offers] = await Promise.all([
    discoverTemplates(),
    discoverOffers(),
  ])
  return {
    templates: templates.slice(0, 10).map((item) => ({
      hash_id: jsonString(item.hash_id) || jsonString(item.hash) || "",
      name: jsonString(item.name) || jsonString(item.image) || "ComfyUI",
      image: jsonString(item.image),
      recommended: Boolean(item.recommended),
      score: templateScore(item),
    })),
    offers: offers.slice(0, 20).map((item) => ({
      offer_id: jsonNumber(item.id) || jsonNumber(item.ask_contract_id) || 0,
      gpu_name: jsonString(item.gpu_name),
      gpu_ram_gb: (jsonNumber(item.gpu_ram) || 0) / 1024,
      hourly_price: jsonNumber(item.dph_total) || jsonNumber(item.min_bid) || 0,
      reliability: jsonNumber(item.reliability) || 0,
      dlperf: jsonNumber(item.dlperf) || 0,
      geolocation: jsonString(item.geolocation) || jsonString(item.country),
      score: offerScore(item),
    })),
  }
}

export async function verifyVastKey(key: string): Promise<void> {
  await vast(key, "/v0/users/current/")
}

export async function createScopedVastKey(
  original: string,
): Promise<{ key: string; id: number | null; created: boolean }> {
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
    const resultRecord = jsonRecord(result)
    const key = jsonString(resultRecord?.key) || jsonString(resultRecord?.api_key)
    if (key) {
      return {
        key,
        id: jsonNumber(resultRecord?.id),
        created: true,
      }
    }
  } catch (error) {
    console.warn(
      "[vast-bootstrap] scoped key creation unavailable; retaining supplied scoped key",
      error instanceof Error ? error.message : String(error),
    )
  }
  return { key: original, id: null, created: false }
}
