/**
 * lib/sales/vast-client.ts — Vast.ai GPU インスタンス管理クライアント
 *
 * 役割: Vast.ai API 経由で GPU インスタンスを検索・作成・管理する。
 *       ComfyUI / LivePortrait / Whisper 等の動画生成ワークロードを
 *       GPU クラウド上で実行するための基盤。
 *
 * 設計原則:
 *   - VAST_API_KEY が未設定なら graceful fallback
 *   - 全 API 呼び出しは AbortSignal.timeout 付き
 *   - インスタンス料金は自動計算（時間単価 × 稼働時間）
 *   - 結果は Supabase の sales_video_jobs に記録可能
 */

/* ───── 型定義 ───── */
import { captureException } from "@/lib/error-monitor"

export interface VastClientConfig {
  ready: boolean
  apiKey: string | null
  note: string
}

export interface VastSearchOffer {
  id: number
  gpu_name: string
  num_gpus: number
  gpu_ram: number
  vcpu_count: number
  ram: number
  storage_cost: number
  dph_total: number
  dph_base: number
  reliability: number
  score: number
  inet_up: number
  inet_down: number
  rented_duration: string
  bundle_id: number | null
  verified: boolean
  datacenter: boolean
  geolocation: string | null
}

export interface VastSearchParams {
  gpuName?: string
  minGpuRam?: number
  numGpus?: number
  maxDph?: number
  minReliability?: number
  datacenter?: boolean
  geolocation?: string
  diskSpace?: number
}

export interface VastInstance {
  id: number
  label: string | null
  status: "running" | "stopped" | "off" | "pending"
  gpu_name: string
  num_gpus: number
  gpu_ram: number
  vcpu_count: number
  ram: number
  disk_space: number
  dph_total: number
  image_uuid: string | null
  ssh_host: string | null
  ssh_port: number | null
  jupyter_token: string | null
  jupyter_port: number | null
  actual_uptime: number
  machine_id: number
  geolocation: string | null
}

export interface VastCreateInstanceParams {
  offerId: number
  image: string
  disk: number
  label?: string
  env?: Record<string, string>
  onStart?: string[]
  jupyter?: boolean
  ssh?: boolean
}

export interface VastCreateInstanceResult {
  ok: boolean
  instanceId?: number
  error?: string
}

export interface VastInstanceActionResult {
  ok: boolean
  error?: string
}

export interface VastUploadResult {
  ok: boolean
  url?: string
  error?: string
}

/* ───── 設定 ───── */

function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function getVastClientConfig(): VastClientConfig {
  const apiKey = optionalEnv("VAST_API_KEY")
  return {
    ready: apiKey !== null,
    apiKey,
    note: apiKey
      ? "Vast.ai API キー設定済み。GPU インスタンスの検索・作成・管理が可能。"
      : "VAST_API_KEY 未設定。Vast.ai GPU インスタンス管理はスキップされます。",
  }
}

/* ───── Vast.ai REST API ───── */

const VAST_API_BASE = "https://console.vast.ai/api/v1"

function authHeaders(): Record<string, string> {
  const config = getVastClientConfig()
  if (!config.apiKey) throw new Error("VAST_API_KEY is not configured")
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  }
}

async function readErrorBody(res: Response, source: string): Promise<string> {
  try {
    return await res.text()
  } catch (error) {
    console.error(`[vast-client] failed to read ${source} error body:`, error)
    return ""
  }
}

/**
 * GPU オファーを検索する。
 * フィルタ条件に合致するインスタンス一覧を返す。
 */
export async function searchVastOffers(
  params: VastSearchParams = {},
  timeoutMs = 30_000,
): Promise<{ ok: boolean; offers: VastSearchOffer[]; error?: string }> {
  const config = getVastClientConfig()
  if (!config.ready) {
    return { ok: false, offers: [], error: "VAST_API_KEY not configured" }
  }

  try {
    // クエリパラメータ構築
    const queryParts: string[] = ["verified=true", "sort=score-"]
    if (params.gpuName) queryParts.push(`gpu_name=${encodeURIComponent(params.gpuName)}`)
    if (params.minGpuRam) queryParts.push(`gpu_ram=${params.minGpuRam}`)
    if (params.numGpus) queryParts.push(`num_gpus=${params.numGpus}`)
    if (params.maxDph) queryParts.push(`dph_total=${params.maxDph}`)
    if (params.minReliability) queryParts.push(`reliability=${params.minReliability}`)
    if (params.datacenter) queryParts.push("datacenter=true")
    if (params.geolocation) queryParts.push(`geolocation=${encodeURIComponent(params.geolocation)}`)
    if (params.diskSpace) queryParts.push(`disk_space=${params.diskSpace}`)

    const url = `${VAST_API_BASE}/bundles?${queryParts.join("&")}`
    const res = await fetch(url, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!res.ok) {
      const text = await readErrorBody(res, "search")
      return { ok: false, offers: [], error: `Vast.ai search failed: HTTP ${res.status} ${text.slice(0, 200)}` }
    }

    const data = (await res.json()) as { offers?: VastSearchOffer[] }
    return { ok: true, offers: data.offers ?? [] }
  } catch (error) {
    captureException(error instanceof Error ? error : new Error("vast-client search error"), { source: "vast-search" })
    return {
      ok: false,
      offers: [],
      error: error instanceof Error ? error.message : "Vast.ai search network error",
    }
  }
}

/**
 * GPU インスタンスを作成する。
 * 指定されたオファーID の GPU をレンタルし、Docker イメージを起動する。
 */
export async function createVastInstance(
  params: VastCreateInstanceParams,
  timeoutMs = 60_000,
): Promise<VastCreateInstanceResult> {
  const config = getVastClientConfig()
  if (!config.ready) {
    return { ok: false, error: "VAST_API_KEY not configured" }
  }

  try {
    const body: Record<string, unknown> = {
      client_id: "me",
      image: params.image,
      disk: params.disk,
      bundle_id: params.offerId,
      label: params.label ?? `paradigm-video-${Date.now()}`,
      runtype: "ssh",
      ...(params.env ? { env: params.env } : {}),
      ...(params.onStart ? { onstart: params.onStart.join("\n") } : {}),
      ...(params.jupyter ? { jupyter: true, jupyter_dir: "/workspace" } : {}),
      ...(params.ssh ? { ssh: true } : {}),
    }

    const res = await fetch(`${VAST_API_BASE}/instances`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!res.ok) {
      const text = await readErrorBody(res, "create")
      return { ok: false, error: `Vast.ai create instance failed: HTTP ${res.status} ${text.slice(0, 200)}` }
    }

    const data = (await res.json()) as { new_instance?: { id?: number }; success?: boolean }
    if (!data.new_instance?.id) {
      return { ok: false, error: "Vast.ai returned no instance ID" }
    }

    return { ok: true, instanceId: data.new_instance.id }
  } catch (error) {
    captureException(error instanceof Error ? error : new Error("vast-client create error"), { source: "vast-create" })
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Vast.ai create instance network error",
    }
  }
}

/**
 * インスタンス一覧を取得する。
 */
export async function listVastInstances(
  timeoutMs = 30_000,
): Promise<{ ok: boolean; instances: VastInstance[]; error?: string }> {
  const config = getVastClientConfig()
  if (!config.ready) {
    return { ok: false, instances: [], error: "VAST_API_KEY not configured" }
  }

  try {
    const res = await fetch(`${VAST_API_BASE}/instances`, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!res.ok) {
      const text = await readErrorBody(res, "list")
      return { ok: false, instances: [], error: `Vast.ai list failed: HTTP ${res.status} ${text.slice(0, 200)}` }
    }

    const data = (await res.json()) as { instances?: VastInstance[] }
    return { ok: true, instances: data.instances ?? [] }
  } catch (error) {
    captureException(error instanceof Error ? error : new Error("vast-client list error"), { source: "vast-list" })
    return {
      ok: false,
      instances: [],
      error: error instanceof Error ? error.message : "Vast.ai list network error",
    }
  }
}

/**
 * インスタンスを起動する。
 */
export async function startVastInstance(
  instanceId: number,
  timeoutMs = 30_000,
): Promise<VastInstanceActionResult> {
  return vastInstanceAction(instanceId, "start", timeoutMs)
}

/**
 * インスタンスを停止する。
 */
export async function stopVastInstance(
  instanceId: number,
  timeoutMs = 30_000,
): Promise<VastInstanceActionResult> {
  return vastInstanceAction(instanceId, "stop", timeoutMs)
}

/**
 * インスタンスを削除する。
 */
export async function destroyVastInstance(
  instanceId: number,
  timeoutMs = 30_000,
): Promise<VastInstanceActionResult> {
  return vastInstanceAction(instanceId, "destroy", timeoutMs)
}

async function vastInstanceAction(
  instanceId: number,
  action: "start" | "stop" | "destroy",
  timeoutMs = 30_000,
): Promise<VastInstanceActionResult> {
  const config = getVastClientConfig()
  if (!config.ready) {
    return { ok: false, error: "VAST_API_KEY not configured" }
  }

  try {
    const res = await fetch(`${VAST_API_BASE}/instances/${instanceId}/${action}`, {
      method: "PUT",
      headers: authHeaders(),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!res.ok) {
      const text = await readErrorBody(res, action)
      return { ok: false, error: `Vast.ai ${action} failed: HTTP ${res.status} ${text.slice(0, 200)}` }
    }

    return { ok: true }
  } catch (error) {
    captureException(error instanceof Error ? error : new Error(`vast-client ${action} error`), { source: `vast-action-${action}` })
    return {
      ok: false,
      error: error instanceof Error ? error.message : `Vast.ai ${action} network error`,
    }
  }
}

/**
 * インスタンスの料金を見積もる。
 * @param dphTotal 時間単価（USD）
 * @param hours 稼働時間
 * @returns 推定料金（USD）
 */
export function estimateVastCost(dphTotal: number, hours: number): number {
  return Math.round(dphTotal * hours * 100) / 100
}

/**
 * インスタンスにファイルをアップロードする（rsync/scp 代替）。
 * Vast.ai のファイル転送 API を使用。
 */
export async function uploadToVastInstance(
  instanceId: number,
  localPath: string,
  remotePath: string,
  timeoutMs = 120_000,
): Promise<VastUploadResult> {
  const config = getVastClientConfig()
  if (!config.ready) {
    return { ok: false, error: "VAST_API_KEY not configured" }
  }

  try {
    const res = await fetch(`${VAST_API_BASE}/instances/${instanceId}/upload`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        local_path: localPath,
        remote_path: remotePath,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!res.ok) {
      const text = await readErrorBody(res, "upload")
      return { ok: false, error: `Vast.ai upload failed: HTTP ${res.status} ${text.slice(0, 200)}` }
    }

    const data = (await res.json()) as { url?: string }
    return { ok: true, url: data.url }
  } catch (error) {
    captureException(error instanceof Error ? error : new Error("vast-client upload error"), { source: "vast-upload" })
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Vast.ai upload network error",
    }
  }
}

/**
 * 推奨 GPU オファーを検索する（動画生成ワークロード向け）。
 * RTX 4090 / A5000 / A6000 等、VRAM 24GB+ の GPU を優先。
 */
export async function findRecommendedGpuOffers(
  minVram = 24,
  maxDph = 1.0,
  timeoutMs = 30_000,
): Promise<{ ok: boolean; offers: VastSearchOffer[]; error?: string }> {
  return searchVastOffers(
    {
      gpuName: "RTX_4090|RTX_6000|A5000|A6000|L40S|A100",
      minGpuRam: minVram * 1024,
      numGpus: 1,
      maxDph,
      minReliability: 0.95,
      datacenter: true,
    },
    timeoutMs,
  )
}
