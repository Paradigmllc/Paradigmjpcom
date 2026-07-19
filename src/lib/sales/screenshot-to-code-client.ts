import "server-only"

export interface ScreenshotToCodeInput {
  imageDataUrls: string[]
  prompt?: string
  designSystem?: string
  requireVision?: boolean
}

export interface ScreenshotToCodeResult {
  ok: true
  code: string
  upstreamCommit: string
  provider: string
  model: string
  visualMode: string
  visionAnalyzed: boolean
}

interface ScreenshotToCodeResponse {
  ok?: boolean
  code?: unknown
  upstream_commit?: unknown
  provider?: unknown
  model?: unknown
  visual_mode?: unknown
  vision_analyzed?: unknown
  detail?: unknown
}

const REQUEST_TIMEOUT_MS = 180_000
const MAX_CODE_BYTES = 2_000_000

function configuredUrl(): string | null {
  const raw = process.env.SCREENSHOT_TO_CODE_URL?.trim()
  return raw ? raw.replace(/\/$/u, "") : null
}

export function isScreenshotToCodeConfigured(): boolean {
  return Boolean(configuredUrl() && process.env.SCREENSHOT_TO_CODE_SHARED_SECRET?.trim())
}

export async function generateScreenshotToCode(
  input: ScreenshotToCodeInput,
): Promise<ScreenshotToCodeResult> {
  const baseUrl = configuredUrl()
  const secret = process.env.SCREENSHOT_TO_CODE_SHARED_SECRET?.trim()
  if (!baseUrl || !secret) {
    throw new Error("SCREENSHOT_TO_CODE_URL and SCREENSHOT_TO_CODE_SHARED_SECRET are required")
  }
  if (input.imageDataUrls.length < 1 || input.imageDataUrls.length > 3) {
    throw new Error("screenshot-to-code requires between 1 and 3 images")
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-screenshot-to-code-secret": secret,
      },
      body: JSON.stringify({
        image_data_urls: input.imageDataUrls,
        prompt: input.prompt ?? "",
        design_system: input.designSystem ?? null,
        require_vision: input.requireVision === true,
      }),
      signal: controller.signal,
    })
    const payload = (await response.json().catch((error: unknown) => {
      console.error("[screenshot-to-code-client] invalid gateway JSON:", error)
      return {}
    })) as ScreenshotToCodeResponse
    if (!response.ok || payload.ok !== true || typeof payload.code !== "string") {
      const detail = typeof payload.detail === "string" ? payload.detail : `gateway HTTP ${response.status}`
      throw new Error(`screenshot-to-code gateway rejected request: ${detail}`)
    }
    if (Buffer.byteLength(payload.code, "utf8") > MAX_CODE_BYTES) {
      throw new Error("screenshot-to-code output exceeds the 2MB safety limit")
    }
    return {
      ok: true,
      code: payload.code,
      upstreamCommit: typeof payload.upstream_commit === "string" ? payload.upstream_commit : "unknown",
      provider: typeof payload.provider === "string" ? payload.provider : "unknown",
      model: typeof payload.model === "string" ? payload.model : "unknown",
      visualMode: typeof payload.visual_mode === "string" ? payload.visual_mode : "unknown",
      visionAnalyzed: payload.vision_analyzed === true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (error instanceof DOMException && error.name === "AbortError") {
      console.error(`[screenshot-to-code-client] gateway timed out after ${REQUEST_TIMEOUT_MS / 1000}s`)
    } else {
      console.error(`[screenshot-to-code-client] gateway call failed: ${message}`)
    }
    throw error instanceof Error ? error : new Error(message)
  } finally {
    clearTimeout(timer)
  }
}
