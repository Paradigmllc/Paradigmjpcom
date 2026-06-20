import { getServiceSalesSupabase } from "@/lib/supabase"
import { buildCompanyIntelligence, type CompanyIntelligence } from "@/lib/sales/company-intelligence"
import { buildReportUrl, REPORT_LOCALES, type ReportLocale } from "@/lib/sales/routing"
import { computeSourceCoverage, type SourceCoverageItem } from "@/lib/sales/source-coverage"
import type { CompanyProductRecommendation } from "@/lib/sales/products"
import type { SalesCompany } from "@/lib/sales/types"
import { DB_TABLES } from "@/lib/sales/db-tables"
import {
  companyContactFormUrl,
  companyDemoSite,
  companyDifyResult,
  companyPainDiagnosis,
  companyTechStack,
  mergedCompanyMeta,
} from "@/lib/sales/company-data-view"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export interface SourceRunRow {
  source_slug: string
  category: string
  status: SourceCoverageItem["status"]
  score: number
  details: JsonRecord | null
  measured_at: string | null
}

export interface CompanyKarteEvidence {
  label: string
  value: string
  source: string
  tone: "good" | "warning" | "neutral"
}

export interface CompanyKarteLink {
  label: string
  url: string
}

export interface CompanyKarteSnapshot {
  companyId: string
  companyName: string
  domain: string
  region: string
  industry: string | null
  regionName: string | null
  sourceName: string | null
  pipelineStatus: string
  dealStage: string
  reportLocale: ReportLocale
  targetCountry: string
  templateVariant: string
  reportUrl: string | null
  formUrl: string | null
  demoUrl: string | null
  salesMaterialUrl: string | null
  customerPortalUrl: string | null
  localizedReportUrls: CompanyKarteLink[]
  sourceScore: number
  collectedCount: number
  configuredCount: number
  missingCount: number
  errorCount: number
  sourceItems: SourceCoverageItem[]
  evidence: CompanyKarteEvidence[]
  intelligence: CompanyIntelligence
  recommendedProducts: CompanyProductRecommendation[]
  diagnosisSummary: string | null
  recommendedOffer: string | null
  personalizedHook: string | null
  personalizedCTA: string | null
  // Phase 6-2: generation trace so operators can see which engine produced the copy.
  reportEngine?: string | null
  diagnosisEngine?: string | null
  generatedAt: string
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

function stringAt(meta: JsonRecord, path: string[]): string | null {
  let cursor: unknown = meta
  for (const key of path) {
    const record = asRecord(cursor)
    if (!record) return null
    cursor = record[key]
  }
  return typeof cursor === "string" && cursor.trim().length > 0 ? cursor.trim() : null
}

function firstString(meta: JsonRecord, paths: string[][]): string | null {
  for (const path of paths) {
    const value = stringAt(meta, path)
    if (value) return value
  }
  return null
}

function numberEvidence(label: string, value: number | null, source: string): CompanyKarteEvidence | null {
  if (value === null || !Number.isFinite(value)) return null
  return {
    label,
    value: String(value),
    source,
    tone: value >= 80 ? "good" : "warning",
  }
}

function textEvidence(
  label: string,
  value: string | null,
  source: string,
  tone: CompanyKarteEvidence["tone"] = "neutral",
): CompanyKarteEvidence | null {
  if (!value) return null
  return { label, value, source, tone }
}

function sourceItemFromRun(row: SourceRunRow): SourceCoverageItem {
  const details = asRecord(row.details)
  const label = typeof details?.label === "string" ? details.label : row.source_slug
  const detail = typeof details?.detail === "string" ? details.detail : "Evidence source"
  return {
    slug: row.source_slug,
    category: row.category,
    status: row.status,
    score: row.score,
    label,
    detail,
    meaning:
      typeof details?.meaning === "string"
        ? details.meaning
        : `${label} は企業カルテの根拠を補強し、営業判断を数字の羅列から改善理由へ変換するためのソースです。`,
    missingConsequence:
      typeof details?.missingConsequence === "string"
        ? details.missingConsequence
        : `${label} が未取得のため、${detail} を根拠にした断定は避けます。`,
    nextStep:
      typeof details?.nextStep === "string"
        ? details.nextStep
        : `${label} の取得ジョブを再実行し、取得できない場合は手動確認キューに回します。`,
  }
}

function sourceItemsFromRows(company: SalesCompany, rows: SourceRunRow[]): SourceCoverageItem[] {
  if (rows.length > 0) return rows.map(sourceItemFromRun)
  return computeSourceCoverage(company).items
}

function localizedReportUrls(company: SalesCompany, reportLocale: ReportLocale): CompanyKarteLink[] {
  if (!company.slug) return []
  return REPORT_LOCALES.map((locale) => ({
    label: locale === reportLocale ? `${locale.toUpperCase()} (active)` : locale.toUpperCase(),
    url: buildReportUrl(locale, company.slug ?? ""),
  }))
}

function evidenceFromCompany(company: SalesCompany): CompanyKarteEvidence[] {
  const meta = mergedCompanyMeta(company)
  const diagnosis = companyPainDiagnosis(company)
  const dify = companyDifyResult(company)
  const tech = companyTechStack(company)
  const place = asRecord(meta.place)
  const demo = companyDemoSite(company)

  return [
    numberEvidence("PageSpeed Mobile", company.pagespeed_mobile, "PageSpeed Insights"),
    numberEvidence("PageSpeed Desktop", company.pagespeed_desktop, "PageSpeed Insights"),
    textEvidence(
      "フォームURL",
      companyContactFormUrl(company),
      "Crawlee / Crawl4AI",
      "good",
    ),
    textEvidence("診断レポートURL", company.report_url, "Paradigm Report", "good"),
    textEvidence("AstroデモURL", typeof demo?.url === "string" ? demo.url : null, "Astro demo generator", "good"),
    textEvidence("主な痛み", typeof diagnosis?.primaryPain === "string" ? diagnosis.primaryPain : null, "Dify / DeepSeek", "warning"),
    textEvidence("推奨提案", typeof diagnosis?.recommendedOffer === "string" ? diagnosis.recommendedOffer : null, "Dify / DeepSeek", "good"),
    textEvidence("技術スタック", Array.isArray(tech?.stack) ? tech.stack.slice(0, 6).join(", ") : null, "Wappalyzer CLI", "neutral"),
    textEvidence("Google Places", typeof place?.name === "string" ? place.name : null, "Google Places", "neutral"),
    textEvidence("Dify raw", typeof dify?.summary === "string" ? dify.summary : null, "Dify", "neutral"),
  ].filter((item): item is CompanyKarteEvidence => item !== null)
}

function coverageCounts(items: SourceCoverageItem[]) {
  const scored = items.filter((item) => item.status !== "not_applicable")
  const total = scored.reduce((sum, item) => sum + item.score, 0)
  return {
    sourceScore: scored.length > 0 ? Math.round(total / scored.length) : 0,
    collectedCount: items.filter((item) => item.status === "collected").length,
    configuredCount: items.filter((item) => item.status === "configured").length,
    missingCount: items.filter((item) => item.status === "missing").length,
    errorCount: items.filter((item) => item.status === "error").length,
  }
}

export function buildCompanyKarte(
  company: SalesCompany,
  sourceRows: SourceRunRow[] = [],
  recommendedProducts: CompanyProductRecommendation[] = [],
): CompanyKarteSnapshot {
  const meta = mergedCompanyMeta(company)
  const routing = asRecord(meta.routing)
  const reportLocale = (company.report_locale ?? routing?.report_locale ?? "ja") as ReportLocale
  const targetCountry =
    company.target_country ?? (typeof routing?.target_country === "string" ? routing.target_country : "JP")
  const templateVariant =
    company.template_variant ??
    (typeof routing?.template_variant === "string" ? routing.template_variant : "website_diagnostic")
  const sourceItems = sourceItemsFromRows(company, sourceRows)
  const counts = coverageCounts(sourceItems)
  const formUrl = companyContactFormUrl(company)
  const diagnosis = companyPainDiagnosis(company)
  const personalizedCopy = asRecord(meta.personalized_copy)

  return {
    companyId: company.id,
    companyName: company.company_name,
    domain: company.domain,
    region: company.region,
    industry: company.industry,
    regionName:
      company.prefecture ??
      stringAt(meta, ["gbiz", "prefecture"]) ??
      stringAt(meta, ["place", "prefecture"]) ??
      stringAt(meta, ["address", "state"]),
    sourceName: company.source,
    pipelineStatus: company.pipeline_status,
    dealStage: company.deal_stage,
    reportLocale,
    targetCountry,
    templateVariant,
    reportUrl: company.report_url ?? (company.slug ? buildReportUrl(reportLocale, company.slug) : null),
    formUrl,
    demoUrl: stringAt(meta, ["demo_site", "url"]),
    salesMaterialUrl: firstString(meta, [
      ["sales_material_url"],
      ["sales_material_pdf"],
      ["sales_assets", "deck_url"],
      ["sales_assets", "pdf_url"],
      ["slidev", "url"],
      ["gotenberg", "url"],
    ]),
    customerPortalUrl: firstString(meta, [
      ["customer_portal_url"],
      ["notion_page_url"],
      ["customer_success", "notion_page_url"],
      ["customer_success", "notion_url"],
    ]),
    localizedReportUrls: localizedReportUrls(company, reportLocale),
    sourceItems,
    evidence: evidenceFromCompany(company),
    intelligence: buildCompanyIntelligence(company, sourceItems),
    recommendedProducts,
    diagnosisSummary: typeof diagnosis?.primaryPain === "string" ? diagnosis.primaryPain : null,
    recommendedOffer: typeof diagnosis?.recommendedOffer === "string" ? diagnosis.recommendedOffer : null,
    personalizedHook: typeof personalizedCopy?.personalized_hook === "string" ? personalizedCopy.personalized_hook : null,
    personalizedCTA: typeof personalizedCopy?.personalized_cta === "string" ? personalizedCopy.personalized_cta : null,
    reportEngine:
      typeof personalizedCopy?.model === "string"
        ? personalizedCopy.model
        : personalizedCopy && Object.keys(personalizedCopy).length > 0
          ? "personalized"
          : "template",
    diagnosisEngine: typeof diagnosis?.engine === "string" ? diagnosis.engine : null,
    generatedAt: new Date().toISOString(),
    ...counts,
  }
}

export async function fetchCompanyKarte(
  sb: ServiceSupabase,
  companyId: string,
): Promise<{ ok: true; karte: CompanyKarteSnapshot } | { ok: false; error: string }> {
  const companyRes = await sb.from(DB_TABLES.SALES_COMPANIES).select("*").eq("id", companyId).maybeSingle()
  if (companyRes.error) return { ok: false, error: companyRes.error.message }
  if (!companyRes.data) return { ok: false, error: "company not found" }

  const sourceRes = await sb
    .from(DB_TABLES.SALES_SOURCE_RUNS)
    .select("source_slug, category, status, score, details")
    .eq("company_id", companyId)
    .order("category", { ascending: true })
    .order("source_slug", { ascending: true })

  if (sourceRes.error) return { ok: false, error: sourceRes.error.message }

  return {
    ok: true,
    karte: buildCompanyKarte(companyRes.data as SalesCompany, (sourceRes.data ?? []) as SourceRunRow[]),
  }
}

export function companyKarteMarkdown(karte: CompanyKarteSnapshot): string {
  const sourceLines = karte.sourceItems.map((item) => `- ${item.label}: ${item.status} / ${item.score} - ${item.detail}`).join("\n")
  const evidenceLines = karte.evidence.map((item) => `- ${item.label}: ${item.value} (${item.source})`).join("\n")
  const localizedLinks = karte.localizedReportUrls.map((link) => `- ${link.label}: ${link.url}`).join("\n")
  const signalLines = karte.intelligence.signals
    .map((signal) => `- ${signal.label}: ${signal.value} (${signal.source}) - ${signal.detail}`)
    .join("\n")
  const painLines = karte.intelligence.painPoints
    .map((pain) => `- [${pain.severity}] ${pain.title}: ${pain.evidence} / ${pain.recommendedAction}`)
    .join("\n")
  const actionLines = karte.intelligence.nextActions.map((action) => `- ${action}`).join("\n")
  const productLines = karte.recommendedProducts
    .map((product) => `- P${product.priority} ${product.displayName}: fit ${product.fitScore} / ${product.reason}`)
    .join("\n")

  return [
    `# 企業カルテ - ${karte.companyName}`,
    "",
    `Domain: ${karte.domain}`,
    `Country/Locale: ${karte.targetCountry} / ${karte.reportLocale}`,
    `Template: ${karte.templateVariant}`,
    `Source coverage: ${karte.sourceScore}% (${karte.collectedCount} collected, ${karte.configuredCount} configured, ${karte.missingCount} missing)`,
    "",
    "## 営業URL",
    `- フォームURL: ${karte.formUrl ?? "未検出"}`,
    `- 診断レポートURL: ${karte.reportUrl ?? "未生成"}`,
    `- AstroデモURL: ${karte.demoUrl ?? "未生成"}`,
    "",
    "## 言語別レポートURL",
    localizedLinks || "- slug未設定",
    "",
    "## 痛みと提案",
    `- 主な痛み: ${karte.diagnosisSummary ?? "Dify診断待ち"}`,
    `- 推奨提案: ${karte.recommendedOffer ?? "テンプレ判定待ち"}`,
    "",
    "## 痛みの根拠",
    painLines || "- まだ痛みの根拠がありません",
    "",
    "## 次の営業アクション",
    actionLines || "- カルテ生成を再実行してください",
    "",
    "## 推奨商材 / Twenty商談候補",
    productLines || "- 商材判定待ち",
    "",
    "## 無料API/OSS取得データ",
    signalLines || evidenceLines || "- まだ取得データがありません",
    "",
    "## ソース別取得状況",
    sourceLines || "- まだソース実行履歴がありません",
    "",
    `Generated: ${karte.generatedAt}`,
  ].join("\n")
}
