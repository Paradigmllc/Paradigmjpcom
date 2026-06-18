import { buildReportUrl, normalizeReportLocale } from "../routing"
import { computeSourceCoverage } from "../source-coverage"
import type { SalesCompany } from "../types"

type JsonRecord = Record<string, unknown>

export type OutreachReadinessStatus = "send_ready" | "review_required" | "blocked"

export interface OutreachReadiness {
  status: OutreachReadinessStatus
  reportUrl: string | null
  demoUrl: string | null
  formUrl: string | null
  sourceScore: number
  collectedSources: number
  blockers: string[]
  warnings: string[]
  nextAction: string
}

const MIN_SEND_READY_SOURCE_SCORE = 20

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function stringAt(meta: JsonRecord, path: string[]): string | null {
  let cursor: unknown = meta
  for (const key of path) {
    const record = asRecord(cursor)
    if (!record || !(key in record)) return null
    cursor = record[key]
  }
  return typeof cursor === "string" && cursor.trim().length > 0 ? cursor.trim() : null
}

export function reportUrlForCompany(company: SalesCompany): string | null {
  if (company.report_url) return company.report_url
  if (!company.slug) return null
  const meta = asRecord(company.meta)
  const routing = asRecord(meta.routing)
  const reportLocale = normalizeReportLocale(company.report_locale ?? routing.report_locale, company.region)
  return buildReportUrl(reportLocale, company.slug)
}

export function formUrlForCompany(company: SalesCompany): string | null {
  const meta = asRecord(company.meta)
  return (
    stringAt(meta, ["contact_form_url"]) ??
    stringAt(meta, ["form_discovery", "form_url"]) ??
    stringAt(meta, ["discovery", "contact_form_url"])
  )
}

export function demoUrlForCompany(company: SalesCompany): string | null {
  const meta = asRecord(company.meta)
  return (
    stringAt(meta, ["demo_site", "url"]) ??
    null
  )
}

function hasDiagnosisEvidence(company: SalesCompany): boolean {
  const meta = asRecord(company.meta)
  return (
    (company.detected_issues?.length ?? 0) > 0 ||
    company.pagespeed_mobile !== null ||
    company.pagespeed_desktop !== null ||
    Object.keys(asRecord(meta.pain_diagnosis)).length > 0 ||
    Object.keys(asRecord(meta.dify_diagnosis)).length > 0 ||
    Object.keys(asRecord(meta.personalized_copy)).length > 0
  )
}

export function evaluateOutreachReadiness(company: SalesCompany): OutreachReadiness {
  const coverage = computeSourceCoverage(company)
  const reportUrl = reportUrlForCompany(company)
  const demoUrl = demoUrlForCompany(company)
  const formUrl = formUrlForCompany(company)
  const blockers: string[] = []
  const warnings: string[] = []

  if (!reportUrl) blockers.push("診断レポートURLが未生成です")
  if (!company.domain) blockers.push("ドメインが未設定です")

  if (!company.industry) warnings.push("業種が未正規化です")
  if ((company.detected_issues?.length ?? 0) === 0) warnings.push("診断課題が未確定です")
  if (!formUrl) warnings.push("フォームURLが未特定です")
  if (!hasDiagnosisEvidence(company)) warnings.push("営業文面の根拠が不足しています")
  if (coverage.score < MIN_SEND_READY_SOURCE_SCORE) {
    warnings.push(`取得ソース網羅率が低いです (${coverage.score}%)`)
  }
  // Demo-enabled sites always go to review queue for human confirmation
  // (Web制作診断レポート variant only — ensures quality before sending)
  if (demoUrl) {
    warnings.push("デモサイト生成済み - 送信前に人間確認推奨")
  }

  const status: OutreachReadinessStatus =
    blockers.length > 0 ? "blocked" : warnings.length > 0 ? "review_required" : "send_ready"

  const nextAction =
    blockers[0] ??
    (warnings.includes("フォームURLが未特定です")
      ? "Crawl4AI/Crawlee/StagehandでフォームURLを特定"
      : demoUrl
        ? "デモサイトURLを確認後、手動で送信承認"
        : warnings[0] ?? "dry-run後にfirst-5承認へ進む")

  return {
    status,
    reportUrl,
    demoUrl,
    formUrl,
    sourceScore: coverage.score,
    collectedSources: coverage.collected,
    blockers,
    warnings,
    nextAction,
  }
}

export function readinessLabel(status: OutreachReadinessStatus): string {
  if (status === "send_ready") return "送信可能"
  if (status === "review_required") return "レビュー必須"
  return "ブロック"
}
