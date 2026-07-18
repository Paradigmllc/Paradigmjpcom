import { siteUrl } from "./routing"
import { findCompanyById } from "./companies"
import { enqueueCompanyEnrichment } from "./enrichment-jobs"
import type { CandidateListItem } from "./lead-candidate-list"
import { listPortalCandidates, readPortalSnapshot } from "./portal-sources/service"
import { syncPortalCandidateToTwenty } from "./portal-sources/twenty-sync"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import {
  sourceManifestToCompanyMeta,
  validateDemoSourceManifest,
  type DemoSourceManifest,
} from "./demo-source-policy"
import { generatedDemoVisualUrl } from "./demo-generated-visual"
import { INDUSTRIES, type Industry, type ReportLocale, type SalesCompany } from "./types"

type JsonRecord = Record<string, unknown>

interface PortalSnapshotShape {
  source?: string
  listingUrl?: string
  companyName?: string
  category?: string
  description?: string
  address?: string | null
  prefecture?: string | null
  websiteUrl?: string | null
  images?: unknown[]
  suggestedIndustry?: string
  status?: string
  fetchedAt?: string
  smbFit?: {
    eligible?: boolean
    enterpriseSignals?: unknown[]
    decisionSignals?: unknown[]
  }
}

export interface ListCandidateEligibility {
  eligible: boolean
  reasons: string[]
  snapshot: PortalSnapshotShape | null
}

export interface ListCandidateQueueResult {
  ok: boolean
  companyId: string
  candidateId?: string
  companyName: string
  jobId?: string
  status?: string
  reused?: boolean
  error?: string
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function snapshotFromMeta(meta: unknown): PortalSnapshotShape | null {
  const root = record(meta)
  const direct = record(root.portal_snapshot)
  const raw = record(root.raw)
  const nested = record(raw.portal_snapshot)
  const candidate = Object.keys(direct).length > 0 ? direct : nested
  if (Object.keys(candidate).length === 0) return null
  return candidate as PortalSnapshotShape
}

function industryFor(company: SalesCompany, snapshot: PortalSnapshotShape): Industry {
  const value = stringValue(snapshot.suggestedIndustry) || stringValue(company.industry)
  return (INDUSTRIES as readonly string[]).includes(value) ? value as Industry : "consulting"
}

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === "https:"
  } catch (error) {
    console.error("[list-candidate-demo] invalid source URL:", error)
    return false
  }
}

function verifiedTimestamp(value: unknown, fallback: string): string {
  const text = stringValue(value)
  return text && Number.isFinite(Date.parse(text)) ? new Date(text).toISOString() : fallback
}

export function evaluateListCandidateForDemo(company: SalesCompany): ListCandidateEligibility {
  const meta = record(company.meta)
  const snapshot = snapshotFromMeta(meta)
  const reasons: string[] = []
  if (meta.list_only !== true || meta.skip_enrichment !== true) reasons.push("list_only候補ではありません")
  if (record(meta.demo_site).url) reasons.push("DEMO生成済みです")
  if (snapshot?.websiteUrl) reasons.push("独自HPが確認されています")
  if (!snapshot) reasons.push("ブラウザ確認済みポータルスナップショットがありません")
  const enterpriseSignals = Array.isArray(snapshot?.smbFit?.enterpriseSignals) ? snapshot?.smbFit?.enterpriseSignals : []
  if (enterpriseSignals.length > 0) reasons.push(`大企業シグナル: ${enterpriseSignals.slice(0, 3).map(String).join("、")}`)
  const proposalOnly = snapshot?.status === "decision_fit_unverified"
    && !snapshot.websiteUrl
    && enterpriseSignals.length === 0
    && stringValue(snapshot.address).length > 0
    && stringValue(snapshot.description).length >= 80
    && Array.isArray(snapshot.images)
    && snapshot.images.length >= 3
  const reviewedReady = snapshot?.smbFit?.eligible === true && snapshot.status === "ready_for_review"
  if (!reviewedReady && !proposalOnly) reasons.push("SMB意思決定シグナルまたは掲載情報量の審査基準未達です")
  if (!stringValue(snapshot?.companyName) || !stringValue(snapshot?.category)) reasons.push("事業者名または業種情報が不足しています")
  const listingUrl = stringValue(meta.portal_listing_url) || stringValue(snapshot?.listingUrl)
  if (!isHttps(listingUrl)) reasons.push("根拠となるポータルURLがHTTPSではありません")
  return { eligible: reasons.length === 0, reasons, snapshot }
}

function fact(key: string, value: string, sourceId: string) {
  return value ? { key, value: value.slice(0, 500), sourceId, verified: true as const } : null
}

export function buildListCandidateVisualManifest(
  company: SalesCompany,
  locale: ReportLocale = "ja",
): DemoSourceManifest {
  const eligibility = evaluateListCandidateForDemo(company)
  if (!eligibility.eligible || !eligibility.snapshot) {
    throw new Error(eligibility.reasons.join(" / "))
  }
  const snapshot = eligibility.snapshot
  const meta = record(company.meta)
  const sourceUrl = stringValue(meta.portal_listing_url) || stringValue(snapshot.listingUrl)
  const sourceId = `portal-${stringValue(snapshot.source) || "reviewed"}`
  const name = stringValue(snapshot.companyName) || company.company_name
  const industry = industryFor(company, snapshot)
  const location = stringValue(snapshot.address) || stringValue(snapshot.prefecture) || stringValue(company.prefecture)
  const facts = [
    fact("business_name", name, sourceId),
    fact("service", stringValue(snapshot.category), sourceId),
    fact("description", stringValue(snapshot.description), sourceId),
    fact("address", location, sourceId),
  ].filter((value): value is NonNullable<typeof value> => Boolean(value))
  const generatedAt = new Date().toISOString()
  const assets = [1, 2, 3, 4, 5, 6].map((variant) => ({
    id: `generated-${company.id.slice(0, 10)}-${variant}`,
    kind: "image" as const,
    sourceUrl: generatedDemoVisualUrl({ origin: siteUrl(), slug: company.slug ?? company.id, industry, variant }),
    ownerLabel: "Paradigm generated visual",
    sourceAccount: "deterministic SVG visual generator",
    useBasis: "generated" as const,
    officialSource: false,
    peopleVisible: false,
    watermarkVisible: false,
    alt: `${name}の${stringValue(snapshot.category) || industry}を表現するビジュアル ${variant}`,
    width: 1600,
    height: 1000,
    notes: `${locale === "ja" ? "業種別生成ビジュアル" : "Industry-specific generated visual"} / ${industry}`,
  }))
  const manifest = {
    version: "2026-07-13.1" as const,
    mode: "reviewed_manifest" as const,
    collectionPolicy: "no_automated_fetch" as const,
    assetStrategy: "licensed_library" as const,
    sources: [{
      id: sourceId,
      type: "operator_verified" as const,
      url: sourceUrl,
      ownerLabel: name,
      verifiedAt: verifiedTimestamp(snapshot.fetchedAt, generatedAt),
      fetchPolicy: "never" as const,
    }],
    facts: facts.slice(0, 4),
    assets,
  }
  const validated = validateDemoSourceManifest(manifest)
  if (!validated.ok || !validated.manifest) throw new Error(validated.errors.join(" / "))
  return validated.manifest
}

function generationKey(companyId: string, manifest: DemoSourceManifest): string {
  return `${companyId}:generated-visual:${JSON.stringify(manifest)}`
}

export async function queueListCandidateDemoForCompany(
  company: SalesCompany,
  locale: "ja" | "en" = "ja",
  triggeredBy = "list_candidate_generated_visual",
  waveId?: string,
): Promise<ListCandidateQueueResult> {
  const companyId = company.id
  const meta = record(company.meta)
  const previousGeneration = record(meta.demo_generation)
  if (previousGeneration.mode === "generated_visual" && ["queued", "running", "ready"].includes(stringValue(previousGeneration.status))) {
    return {
      ok: true,
      companyId,
      companyName: company.company_name,
      status: previousGeneration.status === "ready" ? "completed" : "queued",
      reused: true,
    }
  }
  const eligibility = evaluateListCandidateForDemo(company)
  if (!eligibility.eligible) return { ok: false, companyId, companyName: company.company_name, error: eligibility.reasons.join(" / ") }
  const manifest = buildListCandidateVisualManifest(company, locale)
  const manifestMeta = sourceManifestToCompanyMeta(manifest)
  const generation = {
    mode: "generated_visual",
    status: "queued",
    queuedAt: new Date().toISOString(),
    source: stringValue(eligibility.snapshot?.source) || "portal",
    sendingEnabled: false,
  }
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, companyId, companyName: company.company_name, error: "Supabase service_role not configured" }
  const { data: updated, error: updateError } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .update({
      pipeline_status: "manual_queue",
      source: company.source ?? "portal_generated_visual",
      meta: { ...meta, ...manifestMeta, list_only: true, skip_enrichment: true, demo_generation: generation },
    })
    .eq("id", company.id)
    .select("id, company_name")
    .maybeSingle()
  if (updateError || !updated) return { ok: false, companyId, companyName: company.company_name, error: updateError?.message ?? "company state update failed" }
  const queued = await enqueueCompanyEnrichment({
    companyId: company.id,
    jobType: "demo_generate",
    source: "portal_generated_visual",
    triggeredBy,
    priority: 65,
    payload: {
      locale,
      source_policy: "list_candidate_generated_visual",
      generation_key: generationKey(company.id, manifest),
      ...(waveId ? { wave_id: waveId } : {}),
      sending_enabled: false,
    },
  })
  if (!queued.ok) {
    const { error: failureMetaError } = await sb.from(DB_TABLES.SALES_COMPANIES).update({
      meta: {
        ...meta,
        ...manifestMeta,
        list_only: true,
        skip_enrichment: true,
        demo_generation: {
          ...generation,
          status: "failed",
          failedAt: new Date().toISOString(),
          error: queued.error ?? "enqueue failed",
        },
      },
    }).eq("id", company.id)
    if (failureMetaError) console.error("[list-candidate-demo] failed enqueue state update failed:", failureMetaError.message)
  }
  return {
    ok: queued.ok,
    companyId: company.id,
    companyName: company.company_name,
    jobId: queued.job?.id,
    status: queued.job?.status,
    reused: queued.job?.status === "completed",
    error: queued.error,
  }
}

export async function queueListCandidateDemo(
  companyId: string,
  locale: "ja" | "en" = "ja",
  triggeredBy = "list_candidate_generated_visual",
  waveId?: string,
): Promise<ListCandidateQueueResult> {
  const company = await findCompanyById(companyId)
  if (!company) return { ok: false, companyId, companyName: "", error: "company not found" }
  return queueListCandidateDemoForCompany(company, locale, triggeredBy, waveId)
}

function candidateSyncCompanyId(candidate: CandidateListItem): string {
  const meta = record(candidate.meta)
  const sync = record(meta.portal_twenty_sync)
  return stringValue(sync.companyId) || stringValue(candidate.companyId)
}

/** Resolve a portal candidate to its current list-only company before queueing. */
export async function queuePortalListCandidateDemo(
  candidate: CandidateListItem,
  locale: "ja" | "en" = "ja",
  triggeredBy = "list_candidate_generated_visual",
  waveId?: string,
): Promise<ListCandidateQueueResult> {
  const candidateId = candidate.id
  const snapshot = readPortalSnapshot(candidate)
  if (!snapshot) return { ok: false, candidateId, companyId: candidate.companyId ?? "", companyName: "", error: "ポータル取得スナップショットがありません" }

  let companyId = candidateSyncCompanyId(candidate)
  let company = companyId ? await findCompanyById(companyId) : null
  if (company && evaluateListCandidateForDemo(company).eligible) {
    return { ...(await queueListCandidateDemoForCompany(company, locale, triggeredBy, waveId)), candidateId }
  }

  const synced = await syncPortalCandidateToTwenty(candidate, true)
  if (!synced.ok || !synced.companyId) {
    return { ok: false, candidateId, companyId, companyName: snapshot.companyName, error: synced.error ?? "候補企業のTwenty同期に失敗しました" }
  }
  companyId = synced.companyId
  company = await findCompanyById(companyId)
  if (!company) return { ok: false, candidateId, companyId, companyName: snapshot.companyName, error: "Twenty同期後の会社レコードを取得できません" }
  return { ...(await queueListCandidateDemoForCompany(company, locale, triggeredBy, waveId)), candidateId }
}

export async function queuePortalListCandidatesDemo(
  candidateIds: string[],
  locale: "ja" | "en" = "ja",
  triggeredBy = "list_candidate_generated_visual",
  waveId?: string,
): Promise<ListCandidateQueueResult[]> {
  const candidates: CandidateListItem[] = []
  for (let index = 0; index < candidateIds.length; index += 100) {
    const page = await listPortalCandidates(undefined, Math.min(100, candidateIds.length - index), { ids: candidateIds.slice(index, index + 100) })
    candidates.push(...page)
  }
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]))
  return Promise.all(candidateIds.map(async (candidateId) => {
    const candidate = byId.get(candidateId)
    if (!candidate) return { ok: false, candidateId, companyId: "", companyName: "", error: "候補が見つかりません" }
    try {
      return await queuePortalListCandidateDemo(candidate, locale, triggeredBy, waveId)
    } catch (error) {
      console.error(`[list-candidate-demo] portal candidate ${candidateId} failed:`, error)
      return { ok: false, candidateId, companyId: candidate.companyId ?? "", companyName: "", error: error instanceof Error ? error.message : "DEMOキュー投入に失敗しました" }
    }
  }))
}
