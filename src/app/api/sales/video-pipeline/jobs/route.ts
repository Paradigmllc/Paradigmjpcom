import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import {
  createVideoJob,
  listVideoJobs,
  type VideoJobType,
  type VideoRenderEngine,
  type VideoLossInputs,
  type VideoTargetPlatform,
} from "@/lib/sales/video-pipeline"
import { normalizeVideoProductionProfile } from "@/lib/sales/video-production"
import { isVideoOfferAngle, isVideoTargetSegment } from "@/lib/sales/video-strategy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

const JOB_TYPES = ["sales_video", "subscription_video"] as const
const TARGET_PLATFORMS = [
  "sales_deck_embed",
  "report_page",
  "shorts_9_16",
  "youtube_16_9",
  "linkedin_1_1",
  "customer_subscription",
] as const
const RENDER_ENGINES = ["hyperframes", "remotion", "openmontage", "comfyui", "external"] as const

function isJobType(value: unknown): value is VideoJobType {
  return typeof value === "string" && (JOB_TYPES as readonly string[]).includes(value)
}

function isTargetPlatform(value: unknown): value is VideoTargetPlatform {
  return typeof value === "string" && (TARGET_PLATFORMS as readonly string[]).includes(value)
}

function isRenderEngine(value: unknown): value is VideoRenderEngine {
  return typeof value === "string" && (RENDER_ENGINES as readonly string[]).includes(value)
}

function numberOrDefault(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return Math.max(0, Math.min(100, Math.round(value)))
}

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "40")
  const result = await listVideoJobs(Number.isFinite(limit) ? limit : 40, {
    locale: req.nextUrl.searchParams.get("report_locale") ?? req.nextUrl.searchParams.get("locale"),
  })
  return NextResponse.json(result, { status: result.ok ? 200 : 200 })
}

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as {
      company_id_or_domain?: unknown
      job_type?: unknown
      target_platform?: unknown
      render_engine?: unknown
      target_segment?: unknown
      offer_angle?: unknown
      production_genre?: unknown
      voice_style?: unknown
      avatar_style?: unknown
      caption_style?: unknown
      story_framework?: unknown
      quality_tier?: unknown
      loss_inputs?: unknown
      report_locale?: unknown
      priority?: unknown
      creative_brief?: unknown
    }
    if (typeof body.company_id_or_domain !== "string" || body.company_id_or_domain.trim().length === 0) {
      return NextResponse.json({ ok: false, error: "company_id_or_domain is required" }, { status: 400 })
    }
    if (!isJobType(body.job_type)) {
      return NextResponse.json({ ok: false, error: "job_type is invalid" }, { status: 400 })
    }
    if (!isTargetPlatform(body.target_platform)) {
      return NextResponse.json({ ok: false, error: "target_platform is invalid" }, { status: 400 })
    }
    if (!isRenderEngine(body.render_engine)) {
      return NextResponse.json({ ok: false, error: "render_engine is invalid" }, { status: 400 })
    }
    if (body.target_segment !== undefined && !isVideoTargetSegment(body.target_segment)) {
      return NextResponse.json({ ok: false, error: "target_segment is invalid" }, { status: 400 })
    }
    if (body.offer_angle !== undefined && !isVideoOfferAngle(body.offer_angle)) {
      return NextResponse.json({ ok: false, error: "offer_angle is invalid" }, { status: 400 })
    }
    const lossInputs =
      body.loss_inputs && typeof body.loss_inputs === "object" && !Array.isArray(body.loss_inputs)
        ? (body.loss_inputs as VideoLossInputs)
        : undefined
    const profile = normalizeVideoProductionProfile({
      productionGenre: body.production_genre,
      voiceStyle: body.voice_style,
      avatarStyle: body.avatar_style,
      captionStyle: body.caption_style,
      storyFramework: body.story_framework,
      qualityTier: body.quality_tier,
    })

    const result = await createVideoJob({
      companyIdOrSlugOrDomain: body.company_id_or_domain.trim(),
      jobType: body.job_type,
      targetPlatform: body.target_platform,
      renderEngine: body.render_engine,
      targetSegment: isVideoTargetSegment(body.target_segment) ? body.target_segment : undefined,
      offerAngle: isVideoOfferAngle(body.offer_angle) ? body.offer_angle : undefined,
      productionGenre: profile.productionGenre,
      voiceStyle: profile.voiceStyle,
      avatarStyle: profile.avatarStyle,
      captionStyle: profile.captionStyle,
      storyFramework: profile.storyFramework,
      qualityTier: profile.qualityTier,
      lossInputs,
      reportLocale: typeof body.report_locale === "string" ? body.report_locale : null,
      priority: numberOrDefault(body.priority, 50),
      creativeBrief:
        body.creative_brief && typeof body.creative_brief === "object" && !Array.isArray(body.creative_brief)
          ? (body.creative_brief as { narrativePrompt?: string | null; visualPrompt?: string | null; negativePrompt?: string | null })
          : undefined,
    })
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (error) {
    console.error("[sales-video-pipeline-api] create failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown video pipeline error" },
      { status: 500 },
    )
  }
}
