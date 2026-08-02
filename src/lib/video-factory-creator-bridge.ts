import "server-only"

import { timingSafeEqual } from "node:crypto"
import { z } from "zod"

const HANA_ORIGIN = "https://hana-private.178.105.138.55.sslip.io"
const PROJECT_PATTERN = /^hana-[a-f0-9-]{36}$/

const submitSchema = z.object({
  action: z.literal("submit"),
  jobId: z.string().uuid(),
  contentType: z.enum(["image", "short_video", "teaser_video"]),
  targetPlatform: z.enum(["x", "instagram", "tiktok", "telegram", "lp"]),
  prompt: z.string().trim().min(20).max(4_000),
  negativePrompt: z.string().trim().max(2_000).nullable().default(null),
  referenceImageUrl: z.string().url().refine(
    (value) => value === `${HANA_ORIGIN}/creator/character-master-v1.png`,
    "Only the approved Hana character reference is allowed",
  ),
  dryRun: z.boolean().default(false),
}).strict()

const statusSchema = z.object({
  action: z.literal("status"),
  runId: z.string().uuid(),
}).strict()

const artifactsSchema = z.object({
  action: z.literal("artifacts"),
  projectId: z.string().regex(PROJECT_PATTERN),
}).strict()

export const creatorBridgeRequestSchema = z.discriminatedUnion("action", [
  submitSchema,
  statusSchema,
  artifactsSchema,
])

export type CreatorBridgeRequest = z.infer<typeof creatorBridgeRequestSchema>
type CreatorPlatform = z.infer<typeof submitSchema>["targetPlatform"]

function safeEqual(received: string, expected: string): boolean {
  const left = Buffer.from(received)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function authorizeCreatorBridge(request: Request): boolean {
  const secret = process.env.VIDEO_FACTORY_CREATOR_BRIDGE_SECRET?.trim()
  const authorization = request.headers.get("authorization")
  if (!secret || !authorization?.startsWith("Bearer ")) return false
  return safeEqual(authorization.slice(7), secret)
}

function factoryConfig(): { origin: string; apiKey: string } {
  const origin = process.env.VIDEO_FACTORY_INTERNAL_URL?.trim() || "http://127.0.0.1:8080"
  const apiKey = (
    process.env.VIDEO_FACTORY_INTERNAL_API_KEY
    || process.env.ADMIN_SCRIPT_SECRET
    || process.env.ADMIN_PASSWORD
  )?.trim()
  if (!apiKey) throw new Error("Video Factory internal API key is not configured")
  return { origin, apiKey }
}

function deliveryFor(platform: CreatorPlatform) {
  if (platform === "x") return { aspect_ratio: "1:1", width: 1080, height: 1080 }
  return { aspect_ratio: "9:16", width: 1080, height: 1920 }
}

export function buildCreatorRunPayload(input: z.infer<typeof submitSchema>) {
  const delivery = deliveryFor(input.targetPlatform)
  const duration = input.contentType === "image" ? 5 : input.contentType === "teaser_video" ? 10 : 8
  const negative = input.negativePrompt ? ` Avoid: ${input.negativePrompt}` : ""
  return {
    request_id: input.jobId,
    brief: {
      project_name: `hana-${input.jobId}`,
      objective: `Produce an original ${input.contentType} for the disclosed fictional adult AI creator Hana. ${input.prompt}.${negative}`,
      audience: "Adults aged 18+ who follow the disclosed fictional AI virtual creator Hana.",
      platforms: [input.targetPlatform],
      duration_seconds: duration,
      languages: ["ja"],
      brand: {
        name: "Hana Private",
        primary_color: "#18181B",
        accent_color: "#FDA4AF",
        text_color: "#FFFFFF",
        font_family: "Inter",
        logo_path: null,
      },
      source_assets: [input.referenceImageUrl],
      reference_urls: [],
      rights: {
        source_assets_cleared: true,
        ai_generation_allowed: true,
        likeness_consent: "granted",
        voice_consent: "not_applicable",
        claims_approved_by_client: true,
        notes: "Approved fictional adult AI character reference. Public social output must remain SFW.",
      },
      approver: { name: "Hana Creator Operations", email: "contact@paradigmjp.com" },
      deliverables: [{
        name: `hana-${input.targetPlatform}-${input.contentType.replaceAll("_", "-")}`,
        language: "ja",
        aspect_ratio: delivery.aspect_ratio,
        width: delivery.width,
        height: delivery.height,
        fps: 30,
        format: "mp4",
      }],
      requested_shot_kinds: ["generative"],
      engine_profile_overrides: {},
      notes: `Hana automation job ${input.jobId}. Maintain identity and right-flank-only floral tattoo. Central abdomen must remain clear.`,
    },
    dry_run: input.dryRun,
    planner_provider: "deterministic",
    auto_approve: false,
    delivery_target: "local",
  }
}

export async function callCreatorFactory(input: CreatorBridgeRequest): Promise<Response> {
  const { origin, apiKey } = factoryConfig()
  let path: string
  let init: RequestInit = { method: "GET" }
  if (input.action === "submit") {
    path = "/v1/runs"
    init = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildCreatorRunPayload(input)),
    }
  } else if (input.action === "status") {
    path = `/v1/runs/${input.runId}`
  } else {
    path = `/v1/projects/${input.projectId}/artifacts`
  }
  const headers = new Headers(init.headers)
  headers.set("X-Api-Key", apiKey)
  return fetch(new URL(path, origin), {
    ...init,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(input.action === "submit" ? 30_000 : 15_000),
  })
}

export function safeCreatorArtifact(projectId: string, parts: string[]): string | null {
  if (!PROJECT_PATTERN.test(projectId) || parts.length === 0) return null
  const decoded = parts.map((part) => decodeURIComponent(part))
  if (decoded.some((part) => !part || part === "." || part === ".." || part.includes("\\"))) return null
  const path = decoded.join("/")
  const allowedRoot = ["assets/", "scenes/", "master/", "deliverables/"].some((root) => path.startsWith(root))
  const allowedSuffix = /\.(?:png|jpe?g|webp|mp4|mov|webm)$/i.test(path)
  return allowedRoot && allowedSuffix ? path : null
}

export async function fetchCreatorArtifact(projectId: string, artifactPath: string): Promise<Response> {
  const { origin, apiKey } = factoryConfig()
  const encodedPath = artifactPath.split("/").map(encodeURIComponent).join("/")
  return fetch(new URL(`/v1/projects/${projectId}/files/${encodedPath}`, origin), {
    headers: { "X-Api-Key": apiKey },
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  })
}
