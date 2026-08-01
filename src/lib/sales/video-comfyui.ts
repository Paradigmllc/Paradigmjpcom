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
import { findCompanyByDomain, findCompanyById, findCompanyBySlug } from "./companies"
import { fetchDiagnosticReport } from "./diagnostic"
import { normalizeReportLocale } from "./routing"
import { localeToRegion } from "./types"
import { isUuid } from "./japan-readiness-utils"

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
  /** Generate the deterministic HyperFrames diagnostic composition as the final lane. */
  generateDiagnostic?: boolean
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
  try {
    const requestedLocale = options.locale ? normalizeReportLocale(options.locale, "jp") : null
    const region = requestedLocale ? localeToRegion(requestedLocale) : "jp"
    let company = await findCompanyBySlug(options.companyIdOrSlugOrDomain, region)
    if (!company) {
      company = isUuid(options.companyIdOrSlugOrDomain)
        ? await findCompanyById(options.companyIdOrSlugOrDomain)
        : options.companyIdOrSlugOrDomain.includes(".")
          ? await findCompanyByDomain(options.companyIdOrSlugOrDomain)
          : null
    }
    if (!company) return { ok: false, comfyui: {}, error: "company not found" }

    const report = await fetchDiagnosticReport({
      companyId: company.id,
      reportLocale: requestedLocale ?? company.report_locale ?? undefined,
    })
    if (!report) return { ok: false, comfyui: {}, error: "diagnostic data unavailable" }

    const metadata = company.meta && typeof company.meta === "object" ? company.meta : null
    const sourceDescription = metadata && typeof metadata.description === "string" ? metadata.description : null
    const description = [
      report.hook,
      ...report.acts.slice(0, 3).map((act) => act.body),
      sourceDescription,
    ].filter((value): value is string => Boolean(value && value.trim())).join(" ")
    const generationParams: ComfyGenerationParams = {
      companyName: report.company_name,
      industry: report.industry ?? "general",
      locale: report.report_locale,
      description: description || report.company_name,
    }
    const shouldGenerate = {
      background: options.generateBackground ?? true,
      avatar: options.generateAvatar ?? false,
      broll: options.generateBroll ?? true,
      thumbnail: options.generateThumbnail ?? true,
      video: options.generateVideo ?? false,
      diagnostic: options.generateDiagnostic ?? true,
    }

    const assetJobs = [
      ["background", shouldGenerate.background ? generateComfyUIBackground(generationParams) : null],
      ["avatar", shouldGenerate.avatar ? generateComfyUIAvatar(generationParams) : null],
      ["broll", shouldGenerate.broll ? generateComfyUIBroll(generationParams) : null],
      ["thumbnail", shouldGenerate.thumbnail ? generateComfyUIThumbnail(generationParams) : null],
      ["video", shouldGenerate.video ? generateComfyUIVideo(generationParams) : null],
    ] as const
    const assetResults = await Promise.allSettled(
      assetJobs.map(([, job]) => job ?? Promise.resolve(undefined)),
    )
    const [background, avatar, broll, thumbnail, video] = assetResults.map((result) => {
      if (result.status === "fulfilled") return result.value
      console.error("[video-comfyui] asset lane failed:", result.reason)
      return {
        ok: false,
        outputs: [],
        error: result.reason instanceof Error ? result.reason.message : "ComfyUI asset lane failed",
      } satisfies ComfyuiGenerationResult
    })

    let diagnostic: ProfessionalVideoResult["diagnostic"]
    if (shouldGenerate.diagnostic) {
      // Import lazily to avoid a module cycle: video-generator re-exports these ComfyUI helpers.
      try {
        const { generateDiagnosticVideo } = await import("./video-generator")
        diagnostic = await generateDiagnosticVideo(company.id, report.report_locale)
      } catch (error) {
        console.error("[video-comfyui] HyperFrames lane failed:", error)
        diagnostic = {
          ok: false,
          error: error instanceof Error ? error.message : "HyperFrames lane failed",
        }
      }
    }

    const comfyui = { background, avatar, broll, thumbnail, video }
    const requestedAssets = Object.entries({ ...comfyui, diagnostic })
      .filter(([key]) => key !== "diagnostic" || shouldGenerate.diagnostic)
      .map(([, result]) => result)
      .filter((result): result is NonNullable<typeof result> => Boolean(result))
    const failures = requestedAssets
      .filter((result) => !result.ok)
      .map((result) => result.error)
      .filter((error): error is string => Boolean(error))
    const ok = requestedAssets.some((result) => result.ok)

    return {
      ok,
      comfyui,
      diagnostic,
      error: failures.length > 0 ? failures.join("; ") : undefined,
    }
  } catch (error) {
    console.error("[video-comfyui] professional video orchestration failed:", error)
    return {
      ok: false,
      comfyui: {},
      error: error instanceof Error ? error.message : "Professional video generation failed",
    }
  }
}
