import { z } from "zod"
import { validateDemoAssets, type DemoReviewedAsset } from "./demo-private-access"

export const DEMO_SOURCE_TYPES = [
  "customer_provided",
  "operator_verified",
  "official_profile_link",
  "official_feed",
  "public_registry",
] as const

export const DEMO_ASSET_STRATEGIES = ["licensed_library", "reviewed_real_assets"] as const

const sourceSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.enum(DEMO_SOURCE_TYPES),
  url: z.url().startsWith("https://"),
  ownerLabel: z.string().min(1).max(200),
  verifiedAt: z.iso.datetime(),
  fetchPolicy: z.literal("never"),
})

const factSchema = z.object({
  key: z.string().min(1).max(80),
  value: z.union([z.string().min(1).max(500), z.number(), z.boolean()]),
  sourceId: z.string().min(1).max(120),
  verified: z.literal(true),
})

const assetSchema = z.object({
  id: z.string().min(1).max(120),
  kind: z.enum(["logo", "image", "video"]),
  sourceUrl: z.url().startsWith("https://"),
  ownerLabel: z.string().min(1).max(200),
  sourceAccount: z.string().min(1).max(500),
  useBasis: z.enum(["consented", "licensed", "official_embed", "private_proposal", "generated", "blocked"]),
  officialSource: z.boolean(),
  peopleVisible: z.boolean(),
  watermarkVisible: z.boolean(),
  alt: z.string().min(1).max(240),
  notes: z.string().max(500).optional(),
})

export const demoSourceManifestSchema = z.object({
  version: z.literal("2026-07-13.1"),
  mode: z.literal("reviewed_manifest"),
  collectionPolicy: z.literal("no_automated_fetch"),
  assetStrategy: z.enum(DEMO_ASSET_STRATEGIES),
  sources: z.array(sourceSchema).min(1).max(20),
  facts: z.array(factSchema).min(3).max(50),
  assets: z.array(assetSchema).min(3).max(20),
})

export type DemoSourceManifest = z.infer<typeof demoSourceManifestSchema>

const IDENTITY_FACT_KEYS = new Set(["business_name", "address", "phone", "hours", "service", "product"])

export function validateDemoSourceManifest(value: unknown): {
  ok: boolean
  manifest?: DemoSourceManifest
  errors: string[]
} {
  const parsed = demoSourceManifestSchema.safeParse(value)
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) }
  }

  const manifest = parsed.data
  const errors: string[] = []
  const sourceIds = new Set(manifest.sources.map((source) => source.id))
  for (const fact of manifest.facts) {
    if (!sourceIds.has(fact.sourceId)) errors.push(`fact ${fact.key}: sourceId ${fact.sourceId} が存在しません`)
  }
  if (!manifest.facts.some((fact) => IDENTITY_FACT_KEYS.has(fact.key))) {
    errors.push("business_name / address / phone / hours / service / product の確認済み事実が1件以上必要です")
  }

  const reviewedAssets = manifest.assets as DemoReviewedAsset[]
  errors.push(...validateDemoAssets(reviewedAssets))
  if (manifest.assetStrategy === "licensed_library"
    && reviewedAssets.some((asset) => !["licensed", "generated", "consented"].includes(toRightsUsage(asset)))) {
    errors.push("licensed_library は許諾済み・生成所有素材だけを利用できます")
  }

  return { ok: errors.length === 0, manifest, errors }
}

function toRightsUsage(asset: DemoReviewedAsset): "licensed" | "generated" | "consented" | "proposal_only" {
  if (asset.useBasis === "generated") return "generated"
  if (asset.useBasis === "consented") return "consented"
  if (["licensed", "official_embed"].includes(asset.useBasis)) return "licensed"
  return "proposal_only"
}

export function sourceManifestToCompanyMeta(manifest: DemoSourceManifest): Record<string, unknown> {
  const publicFacts = Object.fromEntries(manifest.facts.map((fact) => [fact.key, fact.value]))
  const demoMedia = manifest.assets.map((asset) => ({
    src: asset.sourceUrl,
    alt: asset.alt,
    kind: asset.kind,
    caption: asset.notes,
    usage: asset.useBasis === "private_proposal" ? "proposal_only" : asset.useBasis === "generated" ? "owned" : "licensed",
  }))
  const socialUrls = manifest.sources.reduce<Record<string, string>>((result, source) => {
    const host = new URL(source.url).hostname.toLowerCase()
    if (host.endsWith("instagram.com")) result.official_instagram_url = source.url
    if (host.endsWith("facebook.com")) result.official_facebook_url = source.url
    return result
  }, {})

  return {
    skip_enrichment: true,
    demo_source_manifest: manifest,
    public_facts: publicFacts,
    demo_media: demoMedia,
    ...socialUrls,
  }
}

export function readValidatedDemoSourceManifest(meta: unknown): ReturnType<typeof validateDemoSourceManifest> {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return { ok: false, errors: ["company meta がありません"] }
  }
  return validateDemoSourceManifest((meta as Record<string, unknown>).demo_source_manifest)
}
