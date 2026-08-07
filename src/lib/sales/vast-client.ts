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

/**
 * Docker のポート公開情報。running のインスタンスにだけ現れる。
 * 例: { "8188/tcp": [{ HostIp: "0.0.0.0", HostPort: "40251" }] }
 */
export type VastPortBindings = Record<string, Array<{ HostIp?: string; HostPort?: string }>>

/**
 * Vast.ai /api/v0/instances/ が実際に返すフィールド。
 * `status` という単一フィールドは存在せず、actual_status と cur_state に分かれている。
 */
export interface VastInstance {
  id: number
  label: string | null
  actual_status: string | null
  cur_state: string | null
  intended_status: string | null
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
  /** 外部からインスタンスに到達するためのグローバルIP。 */
  public_ipaddr: string | null
  /** コンテナ内ポート → 外部ポートの対応。running 時のみ入る。 */
  ports: VastPortBindings | null
  jupyter_token: string | null
  jupyter_port: number | null
  actual_uptime: number
  machine_id: number
  geolocation: string | null
}

export type VastInstanceState = "running" | "pending" | "stopped" | "unknown"

/**
 * インスタンスの状態を正規化する。
 * Vast.ai は actual_status / cur_state / intended_status の3つを返すため、
 * 呼び出し側がどれを見るべきか迷わないようここで1つに畳む。
 */
export function getVastInstanceState(instance: VastInstance): VastInstanceState {
  const actual = (instance.actual_status ?? "").toLowerCase()
  const current = (instance.cur_state ?? "").toLowerCase()

  if (actual === "running") return "running"
  if (actual === "loading" || current === "loading" || current === "creating") return "pending"
  if (actual === "exited" || current === "stopped" || actual === "created") return "stopped"
  if (actual.length === 0 && current.length === 0) return "unknown"
  return "stopped"
}

/**
 * コンテナ内ポートに対応する外部URLを組み立てる。
 * Vast.ai は外部ポートを動的に割り当てるため、固定ポートを前提にしてはいけない。
 * 到達不能な場合は null を返す。呼び出し側で localhost を使わせない。
 */
export function resolveVastPortUrl(
  instance: VastInstance,
  internalPort: number,
  protocol: "http" | "https" = "http",
): string | null {
  const host = instance.public_ipaddr
  if (!host) return null
  const binding = instance.ports?.[`${internalPort}/tcp`]?.[0]
  const externalPort = binding?.HostPort
  if (!externalPort) return null
  return `${protocol}://${host}:${externalPort}`
}

export interface VastCreateInstanceParams {
  offerId: number
  image: string
  disk: number
  label?: string
  env?: Record<string, string>
  /**
   * 起動時に実行するシェルスクリプトの行。
   *
   * 重要: これがスクリプトとして解釈されるのは runtype が ssh 系のときだけ。
   * ssh:false だと runtype が "args" になり、Vast.ai はこの文字列を
   * コンテナの exec argv としてそのまま渡す。結果、複数行のスクリプトは
   * 「そういう名前の実行ファイル」を探して OCI runtime create failed で落ちる。
   * 起動スクリプトを使いたい場合は ssh: true にすること。
   */
  onStart?: string[]
  jupyter?: boolean
  ssh?: boolean
  /**
   * 外部公開したいコンテナ内ポート。指定しないと ComfyUI などに外から到達できない。
   * Vast.ai 側は実際の外部ポートを動的に割り当てるため、
   * 起動後に resolveVastPortUrl() で解決すること。
   */
  exposePorts?: number[]
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

import { optionalEnv } from "./japan-readiness-utils"

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

const VAST_API_V0 = "https://console.vast.ai/api/v0"
const VAST_API_V1 = "https://console.vast.ai/api/v1"

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
    const body: Record<string, unknown> = {
      limit: 20,
      type: "on-demand",
      verified: { eq: true },
      rentable: { eq: true },
      rented: { eq: false },
      ...(params.gpuName ? { gpu_name: { eq: params.gpuName } } : {}),
      ...(params.minGpuRam ? { gpu_ram: { gte: params.minGpuRam } } : {}),
      ...(params.numGpus ? { num_gpus: { gte: params.numGpus } } : {}),
      ...(params.maxDph ? { dph_total: { lte: params.maxDph } } : {}),
      ...(params.minReliability ? { reliability: { gte: params.minReliability } } : {}),
      ...(params.datacenter ? { datacenter: { eq: true } } : {}),
      ...(params.geolocation ? { geolocation: { eq: params.geolocation } } : {}),
      ...(params.diskSpace ? { disk_space: { gte: params.diskSpace } } : {}),
    }

    const url = `${VAST_API_V0}/bundles/`
    const res = await fetch(url, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
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
    // Vast.ai のポート公開は独立フィールドではなく、env の中の "-p 8188:8188" という
    // キーで表現する(値は任意)。`ports` を渡しても黙って無視され、22番しか開かない。
    // 実機で確認済み: 公開済みインスタンスの extra_env に ["-p 1111:1111","1"] が並んでいる。
    const env: Record<string, string> = { ...(params.env ?? {}) }
    for (const port of params.exposePorts ?? []) {
      env[`-p ${port}:${port}`] = "1"
    }

    const body: Record<string, unknown> = {
      image: params.image,
      disk: params.disk,
      label: params.label ?? `paradigm-video-${Date.now()}`,
      runtype: params.ssh ? "ssh_direct" : "args",
      ...(Object.keys(env).length > 0 ? { env } : {}),
      ...(params.onStart ? { onstart: params.onStart.join("\n") } : {}),
      ...(params.jupyter ? { jupyter: true, jupyter_dir: "/workspace" } : {}),
      ...(params.ssh ? { ssh: true } : {}),
    }

    const res = await fetch(`${VAST_API_V0}/asks/${params.offerId}/`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!res.ok) {
      const text = await readErrorBody(res, "create")
      return { ok: false, error: `Vast.ai create instance failed: HTTP ${res.status} ${text.slice(0, 200)}` }
    }

    const data = (await res.json()) as { new_contract?: number; success?: boolean }
    if (!data.new_contract) {
      return { ok: false, error: "Vast.ai returned no instance ID" }
    }

    return { ok: true, instanceId: data.new_contract }
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
    // /api/v1/instances は存在せず HTML の 301 を返す。v0 が正。
    const res = await fetch(`${VAST_API_V0}/instances/`, {
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
    // v0 は状態変更を PUT /instances/{id}/ の body で表現し、削除は DELETE を使う。
    const res = await fetch(`${VAST_API_V0}/instances/${instanceId}/`, {
      method: action === "destroy" ? "DELETE" : "PUT",
      headers: authHeaders(),
      ...(action === "destroy"
        ? {}
        : { body: JSON.stringify({ state: action === "start" ? "running" : "stopped" }) }),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!res.ok) {
      const text = await readErrorBody(res, action)
      return { ok: false, error: `Vast.ai ${action} failed: HTTP ${res.status} ${text.slice(0, 200)}` }
    }

    // Vast.ai は失敗時も HTTP 200 で { success: false, error } を返すため、本文まで見る。
    // 例: GPU が他ユーザーに使用中だと resources_unavailable が返り、要求はキューされるだけ。
    const body = (await res.json().catch(() => null)) as
      | { success?: boolean; error?: string; msg?: string }
      | null
    if (body && body.success === false) {
      return {
        ok: false,
        error: `Vast.ai ${action} rejected: ${body.error ?? "unknown"} ${body.msg ?? ""}`.trim(),
      }
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
    // 未検証。/api/v1 は 301 を返すため、この呼び出しは現状成功しない。
    // Vast.ai へのファイル転送は SSH/scp が正規経路。本番利用前に要再実装。
    const res = await fetch(`${VAST_API_V1}/instances/${instanceId}/upload`, {
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
