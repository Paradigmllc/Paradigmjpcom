import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { upsertCompanyByDomain } from "@/lib/sales/companies"
import { insertWithOptionalColumns } from "@/lib/sales/safe-supabase-insert"
import { countrySelectValue, industrySelectValue, sourceSelectValue } from "@/lib/sales/twenty-sync-summaries"
import { requireTwentyAuth } from "@/lib/sales/twenty-health"
import { linkField, type TwentyRecord } from "@/lib/sales/twenty-sync-utils"
import { createTwentyCompanyBase, findTwentyCompanyByDomain, patchTwentyCompanyHome } from "@/lib/sales/twenty-sync-company-home"
import type { CandidateListItem } from "@/lib/sales/lead-candidate-list"
import type { PortalCandidateExtraction } from "./types"
import { isPortalPrivateProposalEligible, readPortalSnapshot } from "./service"

export type PortalTwentySyncStatus = "synced" | "reused" | "skipped" | "failed" | "deferred"

export interface PortalTwentySyncResult {
  ok: boolean
  candidateId: string
  companyName: string
  status: PortalTwentySyncStatus
  companyId?: string
  twentyCompanyId?: string
  error?: string
}

export interface PortalTwentySyncSummary {
  requested: number
  synced: number
  reused: number
  skipped: number
  failed: number
  deferred: number
  results: PortalTwentySyncResult[]
}

const TWENTY_BACKPRESSURE_PATTERN = /circuit breaker is open|limit reached|statusCode["']?:\s*429|HTTP 429/iu

export function isTwentyBackpressureError(message: string | undefined): boolean {
  return TWENTY_BACKPRESSURE_PATTERN.test(message ?? "")
}

interface PortalSyncMeta {
  status?: string
  companyId?: string | null
  twentyCompanyId?: string | null
  syncedAt?: string | null
  lastAttemptAt?: string | null
  error?: string | null
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function syncMeta(value: unknown): PortalSyncMeta {
  const meta = record(value)
  return {
    status: typeof meta.status === "string" ? meta.status : undefined,
    companyId: typeof meta.companyId === "string" ? meta.companyId : null,
    twentyCompanyId: typeof meta.twentyCompanyId === "string" ? meta.twentyCompanyId : null,
    syncedAt: typeof meta.syncedAt === "string" ? meta.syncedAt : null,
    lastAttemptAt: typeof meta.lastAttemptAt === "string" ? meta.lastAttemptAt : null,
    error: typeof meta.error === "string" ? meta.error : null,
  }
}

function portalSummary(candidate: CandidateListItem, snapshot: PortalCandidateExtraction): string {
  const fit = snapshot.smbFit
  const lines = [
    "ローカルSMB候補（ポータル確認済み / 外部送信なし）",
    `収集元: ${snapshot.source}`,
    `掲載ページ: ${snapshot.listingUrl}`,
    `カテゴリ: ${snapshot.category}`,
    `所在地: ${snapshot.address ?? "未確認"}`,
    `独自HP: ${snapshot.websiteUrl ?? "確認できず"}`,
    `候補スコア: ${candidate.score?.opportunityScore ?? "未算出"} / SMB適合: ${fit.score}`,
    `判定根拠: ${fit.reasons.join(" / ") || "要確認"}`,
    `画像: ${snapshot.images.length}件（使用権確認はDEMO生成前に実施）`,
    snapshot.description ? `事業者説明: ${snapshot.description.slice(0, 1_200)}` : null,
    "次工程: 元ページ・画像・独自HP有無を人間確認。DEMO生成・文面生成・送信は未実行。",
  ]
  return lines.filter((line): line is string => Boolean(line)).join("\n")
}

export function portalCandidateTwentyPayload(
  candidate: CandidateListItem,
  snapshot: PortalCandidateExtraction,
): Record<string, unknown> {
  const source = sourceSelectValue(snapshot.source) ?? "manual_csv"
  return {
    name: snapshot.companyName,
    paradigmFormUrl: linkField("", null),
    paradigmOutreachTargetUrl: linkField("営業先（ポータル掲載ページ）", snapshot.listingUrl),
    paradigmCountryName: countrySelectValue("JP"),
    paradigmRegionName: snapshot.prefecture ?? snapshot.address ?? null,
    paradigmIndustryName: industrySelectValue(snapshot.suggestedIndustry),
    paradigmSourceName: source,
    paradigmLeadStatus: "候補登録 / 要確認 / 未送信",
    paradigmNextAction: "営業先URLを開いて掲載内容・独自HP有無を最終確認（未送信）",
    paradigmKarteSummary: { markdown: portalSummary(candidate, snapshot) },
    paradigmOpportunityScore: candidate.score?.opportunityScore ?? null,
    paradigmSmbScore: candidate.score?.smbScore ?? snapshot.smbFit.score,
    paradigmSourceCoverage: "ポータル公式プロフィール確認済み",
    paradigmDataStatus: "portal_snapshot_reviewed",
    paradigmDataSources: snapshot.source,
    paradigmReportUrl: linkField("", null),
    paradigmSalesMaterialUrl: linkField("", null),
    paradigmDemoUrl: linkField("", null),
    paradigmSalesStatus: null,
    paradigmLastError: null,
  }
}

function readbackIssues(
  actual: TwentyRecord | null,
  expectedCompanyId: string,
  payload: Record<string, unknown>,
): string[] {
  if (!actual) return ["company_not_found"]
  const issues: string[] = []
  if (actual.id !== expectedCompanyId) issues.push("company_id_mismatch")
  if (actual.name !== payload.name) issues.push("name_mismatch")
  if (actual.paradigmLeadStatus !== payload.paradigmLeadStatus) issues.push("lead_status_mismatch")
  if (actual.paradigmNextAction !== payload.paradigmNextAction) issues.push("next_action_mismatch")
  if (actual.paradigmSourceName !== payload.paradigmSourceName) issues.push("source_mismatch")
  if (actual.paradigmKarteSummary?.markdown !== record(payload.paradigmKarteSummary).markdown) issues.push("summary_mismatch")
  const normalizeLink = (value: unknown): string => typeof value === "string" ? value.trim().replace(/\/+$/u, "") : ""
  if (normalizeLink(actual.paradigmFormUrl?.primaryLinkUrl) !== normalizeLink(record(payload.paradigmFormUrl).primaryLinkUrl)) issues.push("form_url_mismatch")
  if (normalizeLink(actual.paradigmOutreachTargetUrl?.primaryLinkUrl) !== normalizeLink(record(payload.paradigmOutreachTargetUrl).primaryLinkUrl)) issues.push("outreach_target_url_mismatch")
  if (actual.paradigmDemoUrl?.primaryLinkUrl) issues.push("demo_url_must_be_empty")
  if (actual.paradigmReportUrl?.primaryLinkUrl) issues.push("report_url_must_be_empty")
  if (actual.paradigmSalesMaterialUrl?.primaryLinkUrl) issues.push("sales_material_url_must_be_empty")
  return issues
}

async function persistCandidateSync(candidate: CandidateListItem, sync: PortalSyncMeta, companyId: string | null): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  const nextMeta = {
    ...candidate.meta,
    portal_twenty_sync: sync,
  }
  const { error } = await sb
    .from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS)
    .update({ company_id: companyId, meta: nextMeta })
    .eq("id", candidate.id)
  if (error) throw new Error(error.message)
}

async function writeSyncLog(candidate: CandidateListItem, result: PortalTwentySyncResult): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb) return
  const { error } = await insertWithOptionalColumns(sb, DB_TABLES.SALES_SYNC_LOGS, {
    direction: "supabase->twenty",
    entity_type: "company",
    entity_id: result.companyId ?? candidate.id,
    action: "portal_candidate_twenty_sync",
    status: result.ok ? "success" : "error",
    payload: {
      candidate_id: candidate.id,
      source: candidate.sourceSlug,
      twenty_company_id: result.twentyCompanyId ?? null,
      status: result.status,
      error: result.error ?? null,
      sending_enabled: false,
    },
  }, [])
  if (error) console.error("[portal-twenty-sync] sync log insert failed:", error.message)
}

export async function syncPortalCandidateToTwenty(
  candidate: CandidateListItem,
  force = false,
): Promise<PortalTwentySyncResult> {
  const snapshot = readPortalSnapshot(candidate)
  const companyName = snapshot?.companyName ?? "候補企業"
  const previous = syncMeta(candidate.meta.portal_twenty_sync)
  if (!force && previous.status === "synced" && previous.companyId && previous.twentyCompanyId) {
    return { ok: true, candidateId: candidate.id, companyName, status: "reused", companyId: previous.companyId, twentyCompanyId: previous.twentyCompanyId }
  }
  const listEligible = Boolean(snapshot && (snapshot.status === "ready_for_review" || isPortalPrivateProposalEligible(snapshot)))
  if ((candidate.status === "promoted" && !force) || !snapshot || !listEligible) {
    const result: PortalTwentySyncResult = { ok: true, candidateId: candidate.id, companyName, status: "skipped", error: "SMB適合・独自HPなし・情報量の基準を満たしていません" }
    await persistCandidateSync(candidate, { ...previous, status: "skipped", lastAttemptAt: new Date().toISOString(), error: result.error }, candidate.companyId)
    await writeSyncLog(candidate, result)
    return result
  }

  const attemptedAt = new Date().toISOString()
  try {
    requireTwentyAuth()
    const saved = await upsertCompanyByDomain({
      domain: candidate.domain,
      company_name: snapshot.companyName,
      region: "jp",
      report_locale: "ja",
      target_country: "JP",
      industry: snapshot.suggestedIndustry,
      prefecture: snapshot.prefecture ?? null,
      pipeline_status: "pending",
      source: snapshot.source,
      generate_report_url: false,
      meta: {
        list_only: true,
        skip_enrichment: true,
        portal_source: snapshot.source,
        portal_listing_url: snapshot.listingUrl,
        portal_snapshot: snapshot,
        lead_candidate: {
          id: candidate.id,
          lane: candidate.lane,
          source: snapshot.source,
          score: candidate.score,
        },
      },
    })
    if (!saved.ok || !saved.company) throw new Error(saved.error ?? "候補企業の保存に失敗しました")

    let twentyCompany = await findTwentyCompanyByDomain(candidate.domain)
    if (!twentyCompany?.id) twentyCompany = await createTwentyCompanyBase({ companyName: snapshot.companyName, domain: candidate.domain })
    if (!twentyCompany.id) throw new Error("Twenty company id missing")
    const payload = portalCandidateTwentyPayload(candidate, snapshot)
    const patched = await patchTwentyCompanyHome(twentyCompany.id, payload)
    if (!patched.ok) throw new Error(patched.error)
    const readback = await findTwentyCompanyByDomain(candidate.domain)
    const issues = readbackIssues(readback, twentyCompany.id, payload)
    if (issues.length > 0) throw new Error(`Twenty read-back verification failed: ${issues.join(", ")}`)

    const result: PortalTwentySyncResult = {
      ok: true,
      candidateId: candidate.id,
      companyName: snapshot.companyName,
      status: "synced",
      companyId: saved.company.id,
      twentyCompanyId: twentyCompany.id,
    }
    try {
      await persistCandidateSync(candidate, { status: "synced", companyId: saved.company.id, twentyCompanyId: twentyCompany.id, syncedAt: new Date().toISOString(), lastAttemptAt: attemptedAt, error: null }, saved.company.id)
    } catch (error) {
      console.error("[portal-twenty-sync] synced state persistence failed:", candidate.id, error)
      throw new Error(`Twenty同期は完了しましたが、ローカル状態の保存に失敗しました: ${error instanceof Error ? error.message : "unknown error"}`)
    }
    await writeSyncLog(candidate, result)
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : "Twenty同期に失敗しました"
    console.error("[portal-twenty-sync] candidate sync failed:", candidate.id, error)
    const result: PortalTwentySyncResult = { ok: false, candidateId: candidate.id, companyName, status: "failed", companyId: candidate.companyId ?? undefined, error: message }
    try {
      await persistCandidateSync(candidate, { ...previous, status: "failed", companyId: previous.companyId ?? candidate.companyId, lastAttemptAt: attemptedAt, error: message }, candidate.companyId)
    } catch (persistError) {
      console.error("[portal-twenty-sync] failed state persistence failed:", candidate.id, persistError)
    }
    await writeSyncLog(candidate, result)
    return result
  }
}

export async function syncPortalCandidatesToTwenty(
  candidates: CandidateListItem[],
  options: { force?: boolean; concurrency?: number } = {},
): Promise<PortalTwentySyncSummary> {
  const results: PortalTwentySyncResult[] = []
  let nextIndex = 0
  let backpressureError: string | null = null
  const concurrency = Math.max(1, Math.min(Math.floor(options.concurrency ?? 4), 6))
  async function worker(): Promise<void> {
    while (true) {
      if (backpressureError) return
      const index = nextIndex++
      const candidate = candidates[index]
      if (!candidate) return
      const result = await syncPortalCandidateToTwenty(candidate, options.force === true)
      results[index] = result
      if (isTwentyBackpressureError(result.error)) backpressureError = result.error ?? "Twenty backpressure"
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, () => worker()))
  if (backpressureError) {
    for (let index = 0; index < candidates.length; index += 1) {
      if (results[index]) continue
      const snapshot = readPortalSnapshot(candidates[index])
      results[index] = {
        ok: false,
        candidateId: candidates[index].id,
        companyName: snapshot?.companyName ?? "候補企業",
        status: "deferred",
        error: `Twenty rate window deferred this candidate: ${backpressureError}`,
      }
    }
  }
  return {
    requested: candidates.length,
    synced: results.filter((result) => result.status === "synced").length,
    reused: results.filter((result) => result.status === "reused").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed").length,
    deferred: results.filter((result) => result.status === "deferred").length,
    results,
  }
}
