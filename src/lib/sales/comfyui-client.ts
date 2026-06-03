/**
 * lib/sales/comfyui-client.ts — ComfyUI API クライアント
 *
 * 役割: ComfyUI インスタンスとの通信（キューイング、進捗確認、結果取得）。
 *       プロスタジオ級動画の背景素材、アバター、動画サブスク生成を担当。
 *
 * 設計原則:
 *   - COMFYUI_API_URL が未設定なら graceful fallback（エラーを返す）
 *   - 全 API 呼び出しは AbortSignal.timeout 付き
 *   - ワークフロー JSON は comfyui-workflows.ts から注入
 */

import { callDeepSeek } from "@/lib/deepseek"

/* ───── 型定義 ───── */

export type ComfyuiWorkflowType =
  | "background_generation"
  | "avatar_generation"
  | "video_generation"
  | "image_sequence"
  | "broll_generation"
  | "thumbnail_generation"
  | "liveportrait_animation"
  | "whisper_transcription"
  | "cosyvoice_tts"
  | "xttsv2_clone"
  | "edge_tts"
  | "animatediff_video"
  | "svd_video"
  | "image_to_video"
  | "face_swap"
  | "super_resolution"
  | "inpainting"
  | "outpainting"
  | "controlnet_pose"
  | "ip_adapter_style"
  | "lora_apply"
  | "model_unload"
  | "workflow_chain"

export interface ComfyuiClientConfig {
  ready: boolean
  baseUrl: string | null
  note: string
}

export interface ComfyuiQueueRequest {
  workflowType: ComfyuiWorkflowType
  workflowJson: Record<string, unknown>
  prompt?: Record<string, unknown>
  timeoutMs?: number
}

export interface ComfyuiQueueResponse {
  ok: boolean
  promptId?: string
  error?: string
}

export interface ComfyuiProgressResponse {
  ok: boolean
  status: "queued" | "running" | "completed" | "error"
  progress: number // 0-100
  outputs?: Array<{ filename: string; type: string; url?: string }>
  error?: string
}

export interface ComfyuiGenerateResult {
  ok: boolean
  outputs: Array<{ filename: string; url: string; type: string }>
  promptId?: string
  durationMs?: number
  error?: string
}

/* ───── 設定 ───── */

function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

let dynamicBaseUrl: string | null = null;

export function getComfyuiClientConfig(overrideBaseUrl?: string): ComfyuiClientConfig {
  const baseUrl = overrideBaseUrl ?? dynamicBaseUrl ?? optionalEnv("COMFYUI_API_URL") ?? optionalEnv("COMFYUI_BASE_URL")
  return {
    ready: baseUrl !== null,
    baseUrl,
    note: baseUrl
      ? "ComfyUI インスタンスに接続済み。背景素材、アバター、動画生成が可能。"
      : "COMFYUI_API_URL 未設定。ComfyUI を使ったプロスタジオ級生成はスキップされます。",
  }
}

export function updateComfyuiClientConfig(newUrl: string) {
  dynamicBaseUrl = newUrl;
}


/* ───── ComfyUI API 呼び出し ───── */

/**
 * ComfyUIの "Save as API" で出力されたJSONテンプレートに変数を注入し、オブジェクトとして返す。
 * 例: {{prompt}}, {{image_url}} などを置換。
 */
export function injectComfyuiVariables(
  templateJsonString: string,
  variables: Record<string, string | number | boolean>
): Record<string, unknown> {
  let injected = templateJsonString
  for (const [key, value] of Object.entries(variables)) {
    // 文字列置換（JSONエスケープ考慮）
    const safeValue = typeof value === "string" 
      ? value.replace(/"/g, '\\"') // ダブルクォートのエスケープ
             .replace(/\\n/g, '\\\\n') // 改行の維持
      : String(value)
    
    // {{key}} を置換
    const regex = new RegExp(`\\{\\{(?:\\s*)${key}(?:\\s*)\\}\\}`, "g")
    injected = injected.replace(regex, safeValue)
  }

  try {
    return JSON.parse(injected) as Record<string, unknown>
  } catch (error) {
    console.error("[comfyui-client] JSON parse error after variable injection", error)
    throw new Error("Failed to parse ComfyUI JSON template after variable injection")
  }
}

/**
 * ComfyUI にワークフローをキューイングする。
 * POST /prompt に workflowJson を送信し、prompt_id を取得する。
 */
export async function queueComfyuiWorkflow(
  request: ComfyuiQueueRequest,
  overrideBaseUrl?: string,
): Promise<ComfyuiQueueResponse> {
  const config = getComfyuiClientConfig(overrideBaseUrl)
  if (!config.ready || !config.baseUrl) {
    return { ok: false, error: "ComfyUI is not configured (COMFYUI_API_URL missing)" }
  }

  const baseUrl = config.baseUrl.replace(/\/+$/, "")
  const timeoutMs = request.timeoutMs ?? 60_000

  try {
    const body: Record<string, unknown> = {
      prompt: request.workflowJson,
      ...(request.prompt ? { extra_data: { extra_pnginfo: request.prompt } } : {}),
    }

    const res = await fetch(`${baseUrl}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return { ok: false, error: `ComfyUI queue failed: HTTP ${res.status} ${text.slice(0, 200)}` }
    }

    const data = (await res.json()) as { prompt_id?: string; error?: string }
    if (!data.prompt_id) {
      return { ok: false, error: data.error ?? "ComfyUI returned no prompt_id" }
    }

    return { ok: true, promptId: data.prompt_id }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "ComfyUI queue network error",
    }
  }
}

/**
 * ComfyUI の進捗を確認する。
 * GET /history/{prompt_id} で結果を取得。
 */
export async function getComfyuiProgress(
  promptId: string,
  timeoutMs = 30_000,
  overrideBaseUrl?: string,
): Promise<ComfyuiProgressResponse> {
  const config = getComfyuiClientConfig(overrideBaseUrl)
  if (!config.ready || !config.baseUrl) {
    return { ok: false, status: "error", progress: 0, error: "ComfyUI is not configured" }
  }

  const baseUrl = config.baseUrl.replace(/\/+$/, "")

  try {
    const res = await fetch(`${baseUrl}/history/${encodeURIComponent(promptId)}`, {
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!res.ok) {
      // 404 = still queued or running
      if (res.status === 404) {
        return { ok: true, status: "running", progress: 50 }
      }
      return { ok: false, status: "error", progress: 0, error: `HTTP ${res.status}` }
    }

    const data = (await res.json()) as Record<string, unknown>
    const promptData = data[promptId] as Record<string, unknown> | undefined

    if (!promptData) {
      return { ok: true, status: "running", progress: 50 }
    }

    const status = promptData.status as Record<string, unknown> | undefined
    const completed = status?.completed === true
    const outputsData = promptData.outputs as Record<string, unknown> | undefined

    if (completed) {
      const outputs: Array<{ filename: string; type: string; url?: string }> = []
      if (outputsData) {
        for (const [nodeId, nodeOutput] of Object.entries(outputsData)) {
          const images = (nodeOutput as Record<string, unknown>)?.images as
            | Array<{ filename: string; type: string; subfolder?: string }>
            | undefined
          if (images) {
            for (const img of images) {
              outputs.push({
                filename: img.filename,
                type: img.type,
                url: `${baseUrl}/view?filename=${encodeURIComponent(img.filename)}&type=${encodeURIComponent(img.type)}${img.subfolder ? `&subfolder=${encodeURIComponent(img.subfolder)}` : ""}`,
              })
            }
          }
        }
      }
      return { ok: true, status: "completed", progress: 100, outputs }
    }

    return { ok: true, status: "running", progress: 50 }
  } catch (error) {
    return {
      ok: false,
      status: "error",
      progress: 0,
      error: error instanceof Error ? error.message : "ComfyUI progress check failed",
    }
  }
}

/**
 * ComfyUI で生成を実行し、完了までポーリングする。
 * queue → poll (2秒間隔, max 300秒) → 結果返却
 */
export async function runComfyuiGeneration(
  request: ComfyuiQueueRequest & { pollIntervalMs?: number; maxPollTimeMs?: number },
  overrideBaseUrl?: string,
): Promise<ComfyuiGenerateResult> {
  const startTime = Date.now()
  const pollInterval = request.pollIntervalMs ?? 2_000
  const maxPollTime = request.maxPollTimeMs ?? 300_000

  // 1. キューイング
  const queueRes = await queueComfyuiWorkflow(request, overrideBaseUrl)
  if (!queueRes.ok || !queueRes.promptId) {
    return { ok: false, outputs: [], error: queueRes.error ?? "Failed to queue ComfyUI workflow" }
  }

  const promptId = queueRes.promptId

  // 2. ポーリング
  while (Date.now() - startTime < maxPollTime) {
    await sleep(pollInterval)
    const progress = await getComfyuiProgress(promptId, 30_000, overrideBaseUrl)

    if (progress.status === "completed" && progress.outputs) {
      const outputs = progress.outputs.map((o) => ({
        filename: o.filename,
        url: o.url ?? `${getComfyuiClientConfig(overrideBaseUrl).baseUrl?.replace(/\/+$/, "")}/view?filename=${encodeURIComponent(o.filename)}&type=${encodeURIComponent(o.type)}`,
        type: o.type,
      }))
      return {
        ok: true,
        outputs,
        promptId,
        durationMs: Date.now() - startTime,
      }
    }

    if (progress.status === "error") {
      return { ok: false, outputs: [], promptId, error: progress.error ?? "ComfyUI generation failed" }
    }
  }

  return {
    ok: false,
    outputs: [],
    promptId,
    error: `ComfyUI generation timed out after ${maxPollTime}ms`,
  }
}

/* ───── ユーティリティ ───── */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * DeepSeek を使って ComfyUI ワークフローのプロンプトを生成する。
 * 背景素材・アバター・動画の各ワークフローに適したプロンプトを LLM で生成。
 */
export async function generateComfyuiPrompt(params: {
  workflowType: ComfyuiWorkflowType
  companyName: string
  industry: string
  locale: string
  description: string
}): Promise<{ ok: boolean; prompt?: string; negativePrompt?: string; error?: string }> {
  const systemPrompt = `You are a ComfyUI prompt engineer for professional video production.
Generate a detailed Stable Diffusion / Flux prompt for the requested workflow type.

Rules:
- Output JSON only: { "prompt": "...", "negative_prompt": "..." }
- prompt: detailed positive prompt (English, 100-200 chars)
- negative_prompt: quality negative prompt (English, 50-100 chars)
- For background_generation: describe environment, lighting, mood
- For avatar_generation: describe character appearance, expression, clothing
- For video_generation: describe motion, scene, atmosphere
- For thumbnail_generation: describe composition, text areas, focal point`

  const userPrompt = JSON.stringify({
    workflow_type: params.workflowType,
    company_name: params.companyName,
    industry: params.industry,
    locale: params.locale,
    description: params.description,
  })

  const res = await callDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.4, maxTokens: 600, responseFormat: "json_object" },
  )

  if (!res.ok || !res.text) {
    return { ok: false, error: res.error ?? "DeepSeek prompt generation failed" }
  }

  try {
    const parsed = JSON.parse(res.text) as { prompt?: string; negative_prompt?: string }
    if (!parsed.prompt) {
      return { ok: false, error: "Generated prompt is empty" }
    }
    return {
      ok: true,
      prompt: parsed.prompt,
      negativePrompt: parsed.negative_prompt ?? "low quality, blurry, distorted, ugly, bad anatomy",
    }
  } catch (error) {
    return { ok: false, error: `Failed to parse prompt JSON: ${error instanceof Error ? error.message : String(error)}` }
  }
}
