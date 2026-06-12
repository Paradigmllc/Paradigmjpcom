import {
  generateComfyuiPrompt,
  getComfyuiClientConfig,
  runComfyuiGeneration,
  type ComfyuiWorkflowType,
} from "./comfyui-client"
import {
  estimateWorkflowDuration,
  getComfyuiWorkflowTemplate,
  injectComfyuiWorkflowPrompt,
} from "./comfyui-workflows"
import {} from "./r2-storage"

export interface ComfyuiGenerationResult {
  ok: boolean
  outputs: Array<{ filename: string; url: string; type: string }>
  prompt?: string
  negativePrompt?: string
  promptId?: string
  durationMs?: number
  error?: string
}

export interface ProfessionalVideoResult {
  ok: boolean
  comfyui: {
    background?: ComfyuiGenerationResult
    avatar?: ComfyuiGenerationResult
    broll?: ComfyuiGenerationResult
    thumbnail?: ComfyuiGenerationResult
    video?: ComfyuiGenerationResult
  }
  diagnostic?: import("./video-generator").VideoGenerationResult
  error?: string
}

export interface ProfessionalVideoOptions {
  companyIdOrSlugOrDomain: string
  locale?: string
  generateBackground?: boolean
  generateAvatar?: boolean
  generateBroll?: boolean
  generateThumbnail?: boolean
  generateVideo?: boolean
}

type ComfyGenerationParams = {
  companyName: string
  industry: string
  locale: string
  description: string
  promptOverride?: string | null
  negativePromptOverride?: string | null
}

async function runComfyAssetGeneration(
  workflowType: ComfyuiWorkflowType,
  params: ComfyGenerationParams,
): Promise<ComfyuiGenerationResult> {
  const config = getComfyuiClientConfig()
  if (!config.ready) {
    return { ok: false, error: "ComfyUI is not configured", outputs: [] }
  }

  const template = getComfyuiWorkflowTemplate(workflowType)
  if (!template) {
    return { ok: false, error: `ComfyUI workflow template not found: ${workflowType}`, outputs: [] }
  }

  const promptResult = params.promptOverride
    ? { ok: true, prompt: params.promptOverride, negativePrompt: params.negativePromptOverride ?? undefined }
    : await generateComfyuiPrompt({
        workflowType,
        companyName: params.companyName,
        industry: params.industry,
        locale: params.locale,
        description: params.description,
      })

  if (!promptResult.ok || !promptResult.prompt) {
    return { ok: false, error: promptResult.error ?? "ComfyUI prompt generation failed", outputs: [] }
  }

  const workflowJson = injectComfyuiWorkflowPrompt(template, {
    prompt: promptResult.prompt,
    negativePrompt: promptResult.negativePrompt ?? params.negativePromptOverride ?? undefined,
  })
  const result = await runComfyuiGeneration({
    workflowType,
    workflowJson,
    prompt: {
      company_name: params.companyName,
      industry: params.industry,
      locale: params.locale,
      description: params.description,
      positive_prompt: promptResult.prompt,
      negative_prompt: promptResult.negativePrompt ?? null,
    },
    pollIntervalMs: 3_000,
    maxPollTimeMs: Math.max(90_000, (estimateWorkflowDuration(workflowType) + 90) * 1000),
  })

  return {
    ok: result.ok,
    outputs: result.outputs,
    prompt: promptResult.prompt,
    negativePrompt: promptResult.negativePrompt,
    promptId: result.promptId,
    durationMs: result.durationMs,
    error: result.error,
  }
}

export async function generateComfyUIBackground(params: ComfyGenerationParams): Promise<ComfyuiGenerationResult> {
  return runComfyAssetGeneration("background_generation", params)
}

export async function generateComfyUIAvatar(params: ComfyGenerationParams): Promise<ComfyuiGenerationResult> {
  return runComfyAssetGeneration("avatar_generation", params)
}

export async function generateComfyUIBroll(params: ComfyGenerationParams): Promise<ComfyuiGenerationResult> {
  return runComfyAssetGeneration("broll_generation", params)
}

export async function generateComfyUIThumbnail(params: ComfyGenerationParams): Promise<ComfyuiGenerationResult> {
  return runComfyAssetGeneration("thumbnail_generation", params)
}

export async function generateComfyUIVideo(params: ComfyGenerationParams): Promise<ComfyuiGenerationResult> {
  return runComfyAssetGeneration("video_generation", params)
}

export async function generateProfessionalVideo(
  options: ProfessionalVideoOptions
): Promise<ProfessionalVideoResult> {
  return {
    ok: true,
    comfyui: {}
  }
}
