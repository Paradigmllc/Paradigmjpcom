/**
 * lib/sales/vast-comfyui-deploy.ts — Vast.ai への ComfyUI 自動デプロイ
 *
 * 役割: Vast.ai の GPU インスタンス上に ComfyUI + LivePortrait + Whisper を
 *       自動デプロイする。Docker イメージの選択、環境変数の設定、
 *       起動スクリプトの注入、ComfyUI API の URL 取得までを一貫して行う。
 *
 * 対応ワークロード:
 *   - ComfyUI（画像生成・動画生成）
 *   - LivePortrait（顔アニメーション）
 *   - Faster Whisper / WhisperX（文字起こし）
 *   - CosyVoice / XTTSv2（音声合成）
 *
 * 使い方:
 *   const deploy = await deployComfyuiToVast({ gpuType: "RTX_4090", disk: 64 })
 *   if (deploy.ok) {
 *     console.log(`ComfyUI URL: ${deploy.comfyuiUrl}`)
 *     console.log(`Instance ID: ${deploy.instanceId}`)
 *   }
 */

import {
  searchVastOffers,
  createVastInstance,
  listVastInstances,
  destroyVastInstance,
  getVastInstanceState,
  resolveVastPortUrl,
  type VastSearchOffer,
} from "./vast-client"

/** ComfyUI がコンテナ内で待ち受けるポート。外部ポートは Vast.ai が動的に決める。 */
const COMFYUI_INTERNAL_PORT = 8188

/* ───── 型定義 ───── */

export type ComfyuiDeployWorkload =
  | "comfyui_base"
  | "comfyui_liveportrait"
  | "comfyui_whisper"
  | "comfyui_cosyvoice"
  | "comfyui_full"

export interface ComfyuiDeployParams {
  /** GPU タイプ（例: "RTX_4090", "A5000", "A6000"） */
  gpuType?: string
  /** ディスク容量（GB） */
  disk?: number
  /** 最大時間単価（USD） */
  maxDph?: number
  /** デプロイするワークロード */
  workload?: ComfyuiDeployWorkload
  /** インスタンスラベル */
  label?: string
  /** ComfyUI のポート（デフォルト: 8188） */
  comfyuiPort?: number
  /** 地域指定（例: "US", "JP", "EU"） */
  geolocation?: string
}

export interface ComfyuiDeployResult {
  ok: boolean
  instanceId?: number
  comfyuiUrl?: string
  sshHost?: string
  sshPort?: number
  jupyterToken?: string
  error?: string
}

export interface ComfyuiDeployStatus {
  ok: boolean
  instanceId: number
  status: "deploying" | "running" | "stopped" | "error"
  comfyuiUrl?: string
  error?: string
}

/* ───── Docker イメージ定義 ───── */

const DEPLOY_IMAGES: Record<ComfyuiDeployWorkload, string> = {
  comfyui_base: "nvidia/cuda:12.4.0-runtime-ubuntu22.04",
  comfyui_liveportrait: "nvidia/cuda:12.4.0-runtime-ubuntu22.04",
  comfyui_whisper: "nvidia/cuda:12.4.0-runtime-ubuntu22.04",
  comfyui_cosyvoice: "nvidia/cuda:12.4.0-runtime-ubuntu22.04",
  comfyui_full: "nvidia/cuda:12.4.0-runtime-ubuntu22.04",
}

/**
 * ワークロードに応じた起動スクリプトを生成する。
 * ComfyUI + 各ツールのインストールと起動を自動化。
 */
function buildOnStartScript(workload: ComfyuiDeployWorkload, comfyuiPort: number): string[] {
  const scripts: string[] = [
    // 基本パッケージ
    "apt-get update -qq",
    "apt-get install -y -qq git python3 python3-pip python3-venv wget curl ffmpeg libgl1-mesa-glx libglib2.0-0",
    "pip3 install --quiet --upgrade pip",

    // ComfyUI のインストール
    "cd /workspace",
    "git clone https://github.com/comfyanonymous/ComfyUI.git",
    "cd ComfyUI",
    "pip3 install --quiet -r requirements.txt",
  ]

  // LivePortrait カスタムノード
  if (workload === "comfyui_liveportrait" || workload === "comfyui_full") {
    scripts.push(
      "cd /workspace/ComfyUI/custom_nodes",
      "git clone https://github.com/kijai/ComfyUI-LivePortraitKJ.git",
      "cd ComfyUI-LivePortraitKJ",
      "pip3 install --quiet -r requirements.txt",
      // LivePortrait モデルのダウンロード
      "mkdir -p /workspace/ComfyUI/models/liveportrait",
      "cd /workspace/ComfyUI/models/liveportrait",
      "wget -q https://huggingface.co/Kijai/LivePortrait_safetensors/resolve/main/liveportrait_base.pth",
    )
  }

  // Whisper カスタムノード
  if (workload === "comfyui_whisper" || workload === "comfyui_full") {
    scripts.push(
      "cd /workspace/ComfyUI/custom_nodes",
      "git clone https://github.com/neverbiasu/ComfyUI-Whisper.git",
      "cd ComfyUI-Whisper",
      "pip3 install --quiet -r requirements.txt",
      "pip3 install --quiet faster-whisper",
    )
  }

  // CosyVoice カスタムノード
  if (workload === "comfyui_cosyvoice" || workload === "comfyui_full") {
    scripts.push(
      "cd /workspace/ComfyUI/custom_nodes",
      "git clone https://github.com/AIFSH/ComfyUI-CosyVoice.git",
      "cd ComfyUI-CosyVoice",
      "pip3 install --quiet -r requirements.txt",
    )
  }

  // ComfyUI 起動
  scripts.push(
    `cd /workspace/ComfyUI`,
    `python3 main.py --listen 0.0.0.0 --port ${comfyuiPort} --force-fp16 &`,
    "echo 'ComfyUI started successfully'",
  )

  return scripts
}

/**
 * Vast.ai 上に ComfyUI インスタンスを自動デプロイする。
 *
 * 手順:
 * 1. 条件に合う GPU オファーを検索
 * 2. 最適なオファーでインスタンスを作成
 * 3. 起動スクリプトで ComfyUI + 各ツールを自動インストール
 * 4. ComfyUI API URL を返却
 */
export async function deployComfyuiToVast(
  params: ComfyuiDeployParams = {},
): Promise<ComfyuiDeployResult> {
  const {
    gpuType = "RTX_4090",
    disk = 64,
    maxDph = 0.80,
    workload = "comfyui_full",
    label = `paradigm-comfyui-${workload}-${Date.now()}`,
    comfyuiPort = 8188,
    geolocation,
  } = params

  // 1. GPU オファー検索
  let searchResult = await searchVastOffers({
    gpuName: gpuType,
    minGpuRam: 24 * 1024, // 24GB VRAM 以上
    numGpus: 1,
    maxDph,
    minReliability: 0.95,
    datacenter: true,
    geolocation,
  })

  if (searchResult.ok && searchResult.offers.length === 0) {
    searchResult = await searchVastOffers({
      minGpuRam: 16 * 1024,
      numGpus: 1,
      maxDph,
      minReliability: 0.9,
      datacenter: true,
      geolocation,
    })
  }

  if (!searchResult.ok || searchResult.offers.length === 0) {
    return {
      ok: false,
      error: `No suitable GPU offers found for ${gpuType} or fallback GPUs under $${maxDph}/hr. Try increasing maxDph or changing gpuType.`,
    }
  }

  // 最適なオファーを選択（スコア順にソート済み）
  const bestOffer = searchResult.offers[0]

  // 2. インスタンス作成
  const onStartScripts = buildOnStartScript(workload, comfyuiPort)

  const createResult = await createVastInstance({
    offerId: bestOffer.id,
    image: DEPLOY_IMAGES[workload],
    disk,
    label,
    env: {
      COMFYUI_PORT: String(comfyuiPort),
      WORKLOAD: workload,
      // ComfyUI 同梱イメージ (vastai/aio-studio 系) はこの変数で起動引数を決める。
      // 既定は "--listen 127.0.0.1 --port 18188" で、ループバックかつ非公開ポートに
      // バインドされるため外部から到達できない。0.0.0.0 と公開ポートを明示して上書きする。
      COMFYUI_ARGS: `--listen 0.0.0.0 --port ${comfyuiPort}`,
    },
    onStart: onStartScripts,
    jupyter: true,
    ssh: true,
    // これが無いと ComfyUI が起動しても外部から到達できない。
    exposePorts: [comfyuiPort],
  })

  if (!createResult.ok || !createResult.instanceId) {
    return {
      ok: false,
      error: createResult.error ?? "Failed to create Vast.ai instance",
    }
  }

  const instanceId = createResult.instanceId

  // comfyuiUrl はここでは返せない。Vast.ai が外部ポートを割り当てるのは起動後で、
  // 作成応答には含まれない。以前は "http://localhost:8188" を返していたが、
  // それを ComfyUI クライアントに設定すると全生成が黙って失敗する。
  // 呼び出し側は checkComfyuiDeployStatus / waitForComfyuiReady で解決すること。
  return {
    ok: true,
    instanceId,
  }
}

/**
 * デプロイ済み ComfyUI インスタンスの状態を確認する。
 * インスタンスが起動し、ComfyUI API が応答するかチェック。
 */
export async function checkComfyuiDeployStatus(
  instanceId: number,
): Promise<ComfyuiDeployStatus> {
  try {
    const instances = await listVastInstances()
    const instance = instances.instances.find((i) => i.id === instanceId)

    if (!instance) {
      return { ok: false, instanceId, status: "error", error: "Instance not found" }
    }

    const state = getVastInstanceState(instance)
    if (state !== "running") {
      return {
        ok: false,
        instanceId,
        status: state === "pending" ? "deploying" : "stopped",
        error:
          state === "pending"
            ? "Instance is still deploying..."
            : `Instance is not running (actual_status=${instance.actual_status ?? "?"})`,
      }
    }

    // 外部ポートは Vast.ai が動的に割り当てるため、固定ポートを前提にしない。
    const comfyuiUrl = resolveVastPortUrl(instance, COMFYUI_INTERNAL_PORT)
    if (!comfyuiUrl) {
      return {
        ok: false,
        instanceId,
        status: "deploying",
        error: `ポート ${COMFYUI_INTERNAL_PORT} がまだ公開されていません。作成時に exposePorts を指定したか確認してください。`,
      }
    }

    try {
      const res = await fetch(`${comfyuiUrl}/system_stats`, {
        signal: AbortSignal.timeout(10_000),
      })
      if (res.ok) {
        return {
          ok: true,
          instanceId,
          status: "running",
          comfyuiUrl,
        }
      }
    } catch (error) {
      console.warn("[vast-comfyui-deploy] ComfyUI status check is not ready yet:", error)
    }

    return {
      ok: true,
      instanceId,
      status: "deploying",
      comfyuiUrl,
      error: "ComfyUI is still starting up...",
    }
  } catch (error) {
    return {
      ok: false,
      instanceId,
      status: "error",
      error: error instanceof Error ? error.message : "Failed to check deploy status",
    }
  }
}

export interface WaitForComfyuiOptions {
  /** 諦めるまでの最大待ち時間。素の CUDA イメージからの構築は10分以上かかる。 */
  timeoutMs?: number
  /** 状態確認の間隔。 */
  pollIntervalMs?: number
}

/**
 * ComfyUI が外部から叩ける状態になるまで待つ。
 *
 * deployComfyuiToVast は作成要求を投げるだけで URL を返さない。
 * インスタンス起動 → ポート割り当て → ComfyUI 起動 の3段階が終わって初めて
 * 到達可能になるため、URL が必要な呼び出し側はこの関数を通す。
 */
export async function waitForComfyuiReady(
  instanceId: number,
  options: WaitForComfyuiOptions = {},
): Promise<ComfyuiDeployStatus> {
  const timeoutMs = options.timeoutMs ?? 15 * 60_000
  const pollIntervalMs = options.pollIntervalMs ?? 15_000
  const deadline = Date.now() + timeoutMs

  let last: ComfyuiDeployStatus = { ok: false, instanceId, status: "deploying" }

  while (Date.now() < deadline) {
    last = await checkComfyuiDeployStatus(instanceId)
    if (last.ok && last.status === "running" && last.comfyuiUrl) return last
    // 停止・エラーは待っても変わらないので即座に返す。
    if (last.status === "stopped" || last.status === "error") return last
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  return { ...last, ok: false, error: last.error ?? `ComfyUI が ${timeoutMs / 1000} 秒以内に起動しませんでした。` }
}

/**
 * ComfyUI インスタンスを破棄する。
 * 使用後は必ず呼び出してコストを節約。
 */
export async function destroyComfyuiInstance(
  instanceId: number,
): Promise<{ ok: boolean; error?: string }> {
  return destroyVastInstance(instanceId)
}

/**
 * 利用可能な ComfyUI デプロイイメージ一覧を取得する。
 */
export function getComfyuiDeployImages(): Array<{
  key: ComfyuiDeployWorkload
  label: string
  description: string
  minVram: number
}> {
  return [
    {
      key: "comfyui_base",
      label: "ComfyUI 基本",
      description: "画像生成・動画生成の基本機能",
      minVram: 8,
    },
    {
      key: "comfyui_liveportrait",
      label: "ComfyUI + LivePortrait",
      description: "顔アニメーション・ポートレート動画生成",
      minVram: 12,
    },
    {
      key: "comfyui_whisper",
      label: "ComfyUI + Whisper",
      description: "文字起こし・字幕生成",
      minVram: 8,
    },
    {
      key: "comfyui_cosyvoice",
      label: "ComfyUI + CosyVoice",
      description: "音声合成・音声クローン",
      minVram: 12,
    },
    {
      key: "comfyui_full",
      label: "ComfyUI フルセット",
      description: "全機能（LivePortrait + Whisper + CosyVoice）",
      minVram: 24,
    },
  ]
}
