import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { runVideoOrchestrator, type OrchestratorOptions } from "@/lib/sales/video-orchestrator"
import type { OssRendererType } from "@/lib/sales/oss-renderers"
import type { VideoJobType, VideoRenderEngine, VideoTargetPlatform } from "@/lib/sales/video-pipeline"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const JOB_TYPES = ["sales_video", "subscription_video"] as const
const TARGET_PLATFORMS = ["sales_deck_embed", "report_page", "shorts_9_16", "youtube_16_9", "linkedin_1_1", "customer_subscription"] as const
const RENDER_ENGINES = ["hyperframes", "remotion", "openmontage", "comfyui", "external"] as const
const OSS_RENDERERS = ["ffcreator", "editly", "moviepy", "short_video_maker", "openmontage"] as const

function isOneOf<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === "string" && (options as readonly string[]).includes(value)
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

function priority(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined
  return Math.max(0, Math.min(100, Math.round(value)))
}

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as Record<string, unknown>
    const company = body.company_id_or_domain
    if (typeof company !== "string" || company.trim().length === 0) {
      return NextResponse.json({ ok: false, error: "company_id_or_domain is required" }, { status: 400 })
    }

    const options: OrchestratorOptions = {
      jobType: isOneOf(body.job_type, JOB_TYPES) ? (body.job_type as VideoJobType) : "sales_video",
      targetPlatform: isOneOf(body.target_platform, TARGET_PLATFORMS)
        ? (body.target_platform as VideoTargetPlatform)
        : "youtube_16_9",
      renderEngine: isOneOf(body.render_engine, RENDER_ENGINES)
        ? (body.render_engine as VideoRenderEngine)
        : "openmontage",
      ossRenderer: isOneOf(body.oss_renderer, OSS_RENDERERS) ? (body.oss_renderer as OssRendererType) : "openmontage",
      generateBackground: bool(body.generate_background, true),
      generateAvatar: bool(body.generate_avatar, true),
      generateBroll: bool(body.generate_broll, true),
      generateThumbnail: bool(body.generate_thumbnail, true),
      generateVideo: bool(body.generate_video, false),
      skipTts: bool(body.skip_tts, false),
      skipTranscription: bool(body.skip_transcription, false),
      skipOssRender: bool(body.skip_oss_render, false),
      skipDispatch: bool(body.skip_dispatch, false),
      priority: priority(body.priority),
      requestedBy: "sales-video-studio",
      creativeBrief:
        body.creative_brief && typeof body.creative_brief === "object" && !Array.isArray(body.creative_brief)
          ? (body.creative_brief as { narrativePrompt?: string | null; visualPrompt?: string | null; negativePrompt?: string | null })
          : undefined,
    }

    const result = await runVideoOrchestrator(company.trim(), options)
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (error) {
    console.error("[sales-video-orchestrate-api] failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown video orchestration error" },
      { status: 500 },
    )
  }
}
