/**
 * lib/sales/templates.ts — sales_templates lookup (Sprint 16 region 拡張)
 *
 * 役割: 業種×課題コードで診断レポートのテンプレ文言を取得.
 *       Reviewed content is stored in Supabase and selected by region and locale.
 *
 * Sprint 16: region (jp / global) スコープ必須.
 *           jp = 日本語テンプレ (paradigmjp.com/ja/report)
 *           global = 英語ベース・他 11 locale fill 用 (paradigmjp.com/en|ko|...)
 */

import { getServiceSalesSupabase } from "@/lib/supabase"
import {
  inferVariant,
  normalizeReportLocale,
  normalizeTargetCountry,
  normalizeTemplateVariant,
  type ReportLocale,
  type TemplateVariant,
} from "./routing"
import type { SalesTemplate, Industry, IssueCode, Region } from "./types"
import { DB_TABLES } from "@/lib/sales/db-tables"

export interface TemplateScope {
  templateVariant?: TemplateVariant | string | null
  reportLocale?: ReportLocale | string | null
  targetCountry?: string | null
}

function scoreTemplate(template: SalesTemplate, scope: Required<TemplateScope>): number {
  let score = 0
  if (template.template_variant === scope.templateVariant) score += 40
  else if (template.template_variant === "website_diagnostic") score += 10

  if (template.target_country === scope.targetCountry) score += 20
  else if (template.target_country === "JP" || template.target_country === "US") score += 4

  if (template.report_locale === scope.reportLocale) score += 20
  else if (template.report_locale === "en" || template.report_locale === "ja") score += 5

  return score
}

function normalizeScope(region: Region, scope: TemplateScope = {}): Required<TemplateScope> {
  const reportLocale = normalizeReportLocale(scope.reportLocale, region)
  const targetCountry = normalizeTargetCountry(scope.targetCountry, reportLocale)
  const templateVariant = normalizeTemplateVariant(
    scope.templateVariant ?? inferVariant({ reportLocale, targetCountry }),
  )
  return { reportLocale, targetCountry, templateVariant }
}

/** 業種×課題コードで 1 件取得 (region scope 必須・default 'jp') */
export async function matchTemplate(
  industry: Industry,
  issueCode: IssueCode,
  region: Region = "jp",
  scope: TemplateScope = {},
): Promise<SalesTemplate | null> {
  const templates = await getTemplatesByIndustry(industry, [issueCode], region, scope)
  return templates[0] ?? null
}

/** 業種 1 つで複数 issue を一括取得 (診断レポートの 3-Act 構成用・region scope) */
export async function getTemplatesByIndustry(
  industry: Industry,
  issueCodes?: IssueCode[],
  region: Region = "jp",
  scope: TemplateScope = {},
): Promise<SalesTemplate[]> {
  const sb = getServiceSalesSupabase()
  if (!sb) return []
  let q = sb
    .from(DB_TABLES.SALES_TEMPLATES)
    .select("*")
    .eq("region", region)
    .eq("industry", industry)
    .eq("is_active", true)
  if (issueCodes && issueCodes.length > 0) {
    q = q.in("issue_code", issueCodes)
  }
  const { data } = await q
  const normalized = normalizeScope(region, scope)
  const rows = ((data as SalesTemplate[]) ?? []).sort(
    (a, b) => scoreTemplate(b, normalized) - scoreTemplate(a, normalized),
  )
  if (!issueCodes?.length) return rows
  const byIssue = new Map<IssueCode, SalesTemplate>()
  for (const row of rows) {
    if (!byIssue.has(row.issue_code)) byIssue.set(row.issue_code, row)
  }
  return issueCodes.map((issue) => byIssue.get(issue)).filter(Boolean) as SalesTemplate[]
}

/** 全テンプレ取得 (admin / debug 用・region scope・最大 1000 件) */
export async function listAllTemplates(region?: Region): Promise<SalesTemplate[]> {
  const sb = getServiceSalesSupabase()
  if (!sb) return []
  let q = sb
    .from(DB_TABLES.SALES_TEMPLATES)
    .select("*")
    .order("industry", { ascending: true })
    .order("issue_code", { ascending: true })
    .limit(1000)
  if (region) q = q.eq("region", region)
  const { data } = await q
  return (data as SalesTemplate[]) ?? []
}
