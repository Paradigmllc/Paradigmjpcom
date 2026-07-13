import "server-only"

import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

export type DemoAssetKind = "logo" | "image" | "video"
export type DemoAssetUseBasis = "consented" | "licensed" | "official_embed" | "private_proposal" | "generated" | "blocked"
export type DemoAssetApprovalStatus = "unreviewed" | "private_proposal" | "consented" | "blocked"

export interface DemoReviewedAsset {
  id: string
  kind: DemoAssetKind
  sourceUrl: string
  ownerLabel: string
  sourceAccount: string
  useBasis: DemoAssetUseBasis
  officialSource: boolean
  peopleVisible: boolean
  watermarkVisible: boolean
  alt: string
  notes?: string
}

export interface DemoAssetReview {
  status: DemoAssetApprovalStatus
  reviewedAt: string
  assets: DemoReviewedAsset[]
}

export interface DemoPrivateAccessRecord {
  slug: string
  accessMode: "public" | "signed_private"
  expiresAt: string | null
  approvalStatus: DemoAssetApprovalStatus
  review: DemoAssetReview
}

const EMPTY_REVIEW: DemoAssetReview = {
  status: "unreviewed",
  reviewedAt: "",
  assets: [],
}

export function generateDemoPreviewToken(): string {
  return randomBytes(32).toString("base64url")
}

export function hashDemoPreviewToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function previewCookieName(slug: string): string {
  const key = createHash("sha256").update(slug).digest("hex").slice(0, 20)
  return `demo_preview_${key}`
}

export function validateDemoAssets(assets: DemoReviewedAsset[]): string[] {
  const errors: string[] = []
  for (const [index, asset] of assets.entries()) {
    let parsed: URL | null = null
    try {
      parsed = new URL(asset.sourceUrl)
    } catch (error) {
      console.error(`[demo-assets] invalid URL at ${index}:`, error instanceof Error ? error.message : String(error))
    }
    if (!parsed || parsed.protocol !== "https:") errors.push(`素材${index + 1}: HTTPS URLが必要です`)
    if (!asset.ownerLabel.trim() || !asset.sourceAccount.trim()) errors.push(`素材${index + 1}: 所有者と取得元が必要です`)
    if (!asset.alt.trim()) errors.push(`素材${index + 1}: altテキストが必要です`)
    if ((asset.peopleVisible || asset.watermarkVisible) && asset.useBasis !== "consented") {
      errors.push(`素材${index + 1}: 人物または透かしを含む素材は明示許諾が必要です`)
    }
    if (!asset.officialSource && !["consented", "licensed", "generated"].includes(asset.useBasis)) {
      errors.push(`素材${index + 1}: 非公式出所の素材は利用できません`)
    }
    if (asset.useBasis === "blocked") errors.push(`素材${index + 1}: blocked素材は登録できません`)
  }
  return errors
}

export function validatePublicDemoAssets(assets: DemoReviewedAsset[]): string[] {
  const errors = validateDemoAssets(assets)
  for (const [index, asset] of assets.entries()) {
    if (asset.useBasis === "private_proposal") {
      errors.push(`素材${index + 1}: 非公開提案限定素材はクリーンURLで公開できません`)
    }
  }
  return errors
}

function parseReview(value: unknown): DemoAssetReview {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_REVIEW
  const review = value as Partial<DemoAssetReview>
  return {
    status: review.status ?? "unreviewed",
    reviewedAt: typeof review.reviewedAt === "string" ? review.reviewedAt : "",
    assets: Array.isArray(review.assets) ? review.assets : [],
  }
}

export async function getDemoPrivateAccess(slug: string): Promise<DemoPrivateAccessRecord | null> {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase unavailable")
  const { data, error } = await sb
    .from(DB_TABLES.THEME_DEMO_PAGES)
    .select("slug, access_mode, preview_expires_at, asset_approval_status, asset_review")
    .eq("slug", slug)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return {
    slug: data.slug,
    accessMode: data.access_mode === "signed_private" ? "signed_private" : "public",
    expiresAt: data.preview_expires_at,
    approvalStatus: data.asset_approval_status as DemoAssetApprovalStatus,
    review: parseReview(data.asset_review),
  }
}

export async function verifyDemoPreviewToken(slug: string, token: string): Promise<{ ok: boolean; expiresAt: string | null }> {
  const sb = getServiceSalesSupabase()
  if (!sb || token.length < 32) return { ok: false, expiresAt: null }
  const { data, error } = await sb
    .from(DB_TABLES.THEME_DEMO_PAGES)
    .select("preview_token_hash, preview_expires_at, access_mode")
    .eq("slug", slug)
    .maybeSingle()
  if (error) {
    console.error(`[demo-preview/${slug}] verification failed:`, error.message)
    return { ok: false, expiresAt: null }
  }
  if (!data || data.access_mode !== "signed_private" || !data.preview_token_hash || !data.preview_expires_at) {
    return { ok: false, expiresAt: null }
  }
  if (Date.parse(data.preview_expires_at) <= Date.now()) return { ok: false, expiresAt: data.preview_expires_at }
  const expected = Buffer.from(data.preview_token_hash, "hex")
  const actual = Buffer.from(hashDemoPreviewToken(token), "hex")
  return { ok: expected.length === actual.length && timingSafeEqual(expected, actual), expiresAt: data.preview_expires_at }
}

export async function activateSignedPrivateDemo(input: {
  slug: string
  ttlDays: number
  assets: DemoReviewedAsset[]
}): Promise<{ token: string; expiresAt: string; review: DemoAssetReview }> {
  const errors = validateDemoAssets(input.assets)
  if (errors.length > 0) throw new Error(errors.join("\n"))
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase unavailable")
  const token = generateDemoPreviewToken()
  const expiresAt = new Date(Date.now() + input.ttlDays * 86_400_000).toISOString()
  const status: DemoAssetApprovalStatus = input.assets.every((asset) => ["consented", "licensed", "generated"].includes(asset.useBasis))
    ? "consented"
    : "private_proposal"
  const review: DemoAssetReview = { status, reviewedAt: new Date().toISOString(), assets: input.assets }
  const { data, error } = await sb
    .from(DB_TABLES.THEME_DEMO_PAGES)
    .update({
      access_mode: "signed_private",
      preview_token_hash: hashDemoPreviewToken(token),
      preview_expires_at: expiresAt,
      asset_approval_status: status,
      asset_review: review,
      is_published: false,
      publication_status: "private_review",
      updated_at: new Date().toISOString(),
    })
    .eq("slug", input.slug)
    .select("slug")
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error("Demo not found")
  return { token, expiresAt, review }
}

export async function activatePublicUnlistedDemo(input: {
  slug: string
  assets: DemoReviewedAsset[]
}): Promise<{ urlSlug: string; review: DemoAssetReview }> {
  const errors = validatePublicDemoAssets(input.assets)
  if (errors.length > 0) throw new Error(errors.join("\n"))
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase unavailable")
  const review: DemoAssetReview = {
    status: "consented",
    reviewedAt: new Date().toISOString(),
    assets: input.assets,
  }
  const { data, error } = await sb
    .from(DB_TABLES.THEME_DEMO_PAGES)
    .update({
      access_mode: "public",
      preview_token_hash: null,
      preview_expires_at: null,
      asset_approval_status: "consented",
      asset_review: review,
      is_published: true,
      publication_status: "published",
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("slug", input.slug)
    .select("slug")
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error("Demo not found or quality gate rejected publication")
  return { urlSlug: data.slug, review }
}

export async function revokeSignedPrivateDemo(slug: string): Promise<boolean> {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase unavailable")
  const { data, error } = await sb
    .from(DB_TABLES.THEME_DEMO_PAGES)
    .update({ preview_expires_at: new Date(0).toISOString(), updated_at: new Date().toISOString() })
    .eq("slug", slug)
    .eq("access_mode", "signed_private")
    .select("slug")
    .maybeSingle()
  if (error) throw new Error(error.message)
  return Boolean(data)
}
