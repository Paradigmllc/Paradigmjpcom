import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "../db-tables"
import { queueReviewedDemoItem } from "../demo-batch-queue"
import type { DemoReviewedAsset } from "../demo-private-access"
import type { DemoSourceManifest } from "../demo-source-policy"
import { validateDemoSourceManifest } from "../demo-source-policy"
import { ingestLocalSmbCandidates, listLeadCandidates, type CandidateListItem, type LocalSmbInputRow } from "../lead-candidates"
import type { Industry } from "../types"
import { fetchPortalCandidate } from "./extract"
import type { PortalCandidateExtraction, PortalCandidateImportResult, PortalSource } from "./types"

async function mapLimit<T, R>(values: T[], limit: number, task: (value: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(values.length)
  let cursor = 0
  async function worker(): Promise<void> {
    while (cursor < values.length) {
      const index = cursor++
      output[index] = await task(values[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()))
  return output
}

function toLocalSmbRow(candidate: PortalCandidateExtraction): LocalSmbInputRow {
  return {
    businessName: candidate.companyName,
    countryCode: "JP",
    listingUrl: candidate.listingUrl,
    category: candidate.category,
    address: candidate.address,
    phone: candidate.phone,
    socialLinks: candidate.socialLinks,
    websiteUrl: candidate.websiteUrl,
    sourceSlug: candidate.source,
    raw: { portal_snapshot: candidate },
  }
}

export async function ingestPortalCandidateUrls(source: PortalSource, urls: string[]): Promise<{
  ok: boolean
  imported: number
  failed: number
  results: PortalCandidateImportResult[]
}> {
  const results = await mapLimit(urls, 5, async (url): Promise<PortalCandidateImportResult> => {
    try {
      return { url, ok: true, candidate: await fetchPortalCandidate(source, url) }
    } catch (error) {
      console.error(`[portal-source/${source}] import failed:`, url, error)
      return { url, ok: false, error: error instanceof Error ? error.message : "取得に失敗しました" }
    }
  })
  const rows = results.flatMap((result) => result.ok && result.candidate ? [toLocalSmbRow(result.candidate)] : [])
  if (rows.length > 0) await ingestLocalSmbCandidates(rows, false)
  return { ok: rows.length > 0, imported: rows.length, failed: results.length - rows.length, results }
}

export async function listPortalCandidates(source?: PortalSource, limit = 100): Promise<CandidateListItem[]> {
  return listLeadCandidates({
    countryCode: "JP",
    lane: "no_website_local_smb",
    sourceSlug: source ?? null,
    limit,
  })
}

function portalSnapshot(meta: Record<string, unknown>): PortalCandidateExtraction | null {
  const raw = meta.raw
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const snapshot = (raw as Record<string, unknown>).portal_snapshot
  return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot as PortalCandidateExtraction : null
}

export function buildPortalDemoManifest(candidate: CandidateListItem, assets: DemoReviewedAsset[]): DemoSourceManifest {
  const snapshot = portalSnapshot(candidate.meta)
  if (!snapshot) throw new Error("ポータル取得スナップショットがありません")
  if (snapshot.status !== "ready_for_review") throw new Error("独自HPあり、または情報・画像が不足している候補です")
  const allowedImages = new Set(snapshot.images.map((image) => image.url))
  if (assets.some((asset) => !allowedImages.has(asset.sourceUrl))) throw new Error("取得スナップショットにない素材が含まれています")
  const sourceId = `portal-${snapshot.source}`
  const facts = [
    { key: "business_name", value: snapshot.companyName, sourceId, verified: true as const },
    { key: "service", value: snapshot.category, sourceId, verified: true as const },
    snapshot.description ? { key: "description", value: snapshot.description.slice(0, 500), sourceId, verified: true as const } : null,
    snapshot.address ? { key: "address", value: snapshot.address, sourceId, verified: true as const } : null,
    snapshot.phone ? { key: "phone", value: snapshot.phone, sourceId, verified: true as const } : null,
  ].filter((fact): fact is NonNullable<typeof fact> => Boolean(fact))
  const manifest = {
    version: "2026-07-13.1" as const,
    mode: "reviewed_manifest" as const,
    collectionPolicy: "no_automated_fetch" as const,
    assetStrategy: "reviewed_real_assets" as const,
    sources: [{
      id: sourceId,
      type: "official_profile_link" as const,
      url: snapshot.listingUrl,
      ownerLabel: snapshot.companyName,
      verifiedAt: new Date().toISOString(),
      fetchPolicy: "never" as const,
    }],
    facts,
    assets,
  }
  const review = validateDemoSourceManifest(manifest)
  if (!review.ok || !review.manifest) throw new Error(review.errors.join("\n"))
  return review.manifest
}

export async function approvePortalCandidateForDemo(input: {
  candidateId: string
  industry: Industry
  prefecture?: string
  assets: DemoReviewedAsset[]
}) {
  const candidates = await listLeadCandidates({ lane: "no_website_local_smb", limit: 500 })
  const candidate = candidates.find((item) => item.id === input.candidateId)
  if (!candidate) throw new Error("候補が見つかりません")
  const snapshot = portalSnapshot(candidate.meta)
  if (!snapshot) throw new Error("ポータル取得情報がありません")
  const manifest = buildPortalDemoManifest(candidate, input.assets)
  const queued = await queueReviewedDemoItem({
    companyName: snapshot.companyName,
    industry: input.industry,
    prefecture: input.prefecture ?? snapshot.prefecture ?? undefined,
    locale: "ja",
    manifest,
  }, `portal_${snapshot.source}_review`)
  if (!queued.ok || !queued.companyId) return queued

  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  const nextMeta = {
    ...candidate.meta,
    portal_review: {
      reviewed_at: new Date().toISOString(),
      asset_count: input.assets.length,
      sending_enabled: false,
      demo_job_id: queued.jobId ?? null,
    },
  }
  const { error } = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS).update({
    status: "promoted",
    company_id: queued.companyId,
    meta: nextMeta,
  }).eq("id", candidate.id)
  if (error) throw new Error(error.message)
  return { ...queued, manifest, sendingEnabled: false }
}

export function readPortalSnapshot(candidate: CandidateListItem): PortalCandidateExtraction | null {
  return portalSnapshot(candidate.meta)
}
