import { extractProperty } from "@/lib/notion"
import { normalizeDomain, normalizeCompanyName } from "./dedup"
import {
  buildCompanySlug,
  buildReportUrl,
  normalizeReportLocale,
  normalizeTargetCountry,
  normalizeTemplateVariant,
} from "./routing"
import {
  isValidDealStage,
  isValidIndustry,
  isValidIssueCode,
  type Region,
} from "./types"

export type Entity = "company" | "customer" | "delivery" | "template"

export const VALID_CONTRACT_STATUS = ["トライアル", "継続中", "解約予告", "解約済", "Trial", "Active", "Pending Cancel", "Cancelled"]
export const VALID_HEALTH = ["🟢 良好", "🟡 要注意", "🔴 要対応", "🟢 Good", "🟡 Watch", "🔴 Action Required"]
export const VALID_SUBSIDY = ["未申請", "申請中", "採択済", "非対象"]
export const VALID_DELIVERY_STATUS = ["未着手", "制作中", "レビュー待ち", "納品済", "Not Started", "In Progress", "Review", "Delivered"]

export function normId(id: string): string {
  return id.replace(/-/g, "").toLowerCase()
}

function dbEntries(): Array<[string | undefined, Entity, Region]> {
  const E = process.env
  return [
    [E.NOTION_DB_COMPANIES_JP ?? "8cbab1f501144f83872c1738ce3e79c4", "company", "jp"],
    [E.NOTION_DB_COMPANIES_GLOBAL ?? "35fa2b78f3fc8107aa0bf28694e1009c", "company", "global"],
    [E.NOTION_DB_CUSTOMERS_JP ?? "86b1d93e3b854862ae7b2750d2585677", "customer", "jp"],
    [E.NOTION_DB_CUSTOMERS_GLOBAL ?? "35fa2b78f3fc81aab57ffcc729431181", "customer", "global"],
    [E.NOTION_DB_DELIVERIES_JP ?? "b3cbef9dd96f4e5bbbecc404c703a298", "delivery", "jp"],
    [E.NOTION_DB_DELIVERIES_GLOBAL ?? "35fa2b78f3fc81e2a5c3d7b9b9d7f5a9", "delivery", "global"],
    [E.NOTION_DB_TEMPLATES_JP ?? "115e2b0e79424bb0813fc05402096f95", "template", "jp"],
    [E.NOTION_DB_TEMPLATES_GLOBAL, "template", "global"],
  ]
}

export function buildDbMap(): Map<string, { entity: Entity; region: Region }> {
  const map = new Map<string, { entity: Entity; region: Region }>()
  for (const [id, entity, region] of dbEntries()) {
    if (id) map.set(normId(id), { entity, region })
  }
  return map
}

export function resolveNotionDbId(entity: Entity, region: Region): string | null {
  for (const [id, e, r] of dbEntries()) {
    if (e === entity && r === region && id) return id
  }
  return null
}

export interface CompanyPropsResult {
  update: Record<string, unknown>
  name: string | null
  domain: string | null
  industry: string | null
  prefecture: string | null
  reportLocale: string
  targetCountry: string
  templateVariant: string
  finalSlug: string | null
}

export function parseCompanyProps(props: Record<string, unknown>, region: Region): CompanyPropsResult {
  const name =
    (extractProperty(props, "企業名") as string | null) ||
    (extractProperty(props, "会社名") as string | null) ||
    (extractProperty(props, "Company") as string | null) ||
    (extractProperty(props, "Name") as string | null)
  const domain = normalizeDomain(
    (extractProperty(props, "ドメイン") as string | null) ||
      (extractProperty(props, "Website") as string | null) ||
      (extractProperty(props, "Domain") as string | null) ||
      (extractProperty(props, "URL") as string | null),
  )
  const dealStageRaw = extractProperty(props, "商談ステージ") || extractProperty(props, "Deal Stage")
  const memo = extractProperty(props, "メモ") || extractProperty(props, "Notes")
  const followUp = extractProperty(props, "フォローアップ日") || extractProperty(props, "Follow-up Date")
  const industryRaw = extractProperty(props, "業種") || extractProperty(props, "Industry")
  const prefecture = extractProperty(props, "都道府県") || extractProperty(props, "Country")
  const assignedTo = extractProperty(props, "担当者") || extractProperty(props, "Assignee")
  const reportLocale = normalizeReportLocale(
    extractProperty(props, "表示言語") || extractProperty(props, "Report Locale"),
    region,
  )
  const targetCountry = normalizeTargetCountry(
    extractProperty(props, "対象国") || extractProperty(props, "Target Country"),
    reportLocale,
  )
  const templateVariant = normalizeTemplateVariant(
    extractProperty(props, "テンプレ種別") || extractProperty(props, "Template Variant"),
  )
  const slug = extractProperty(props, "slug (URL)") || extractProperty(props, "Slug")

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof name === "string" && name) update.company_name = name
  if (typeof dealStageRaw === "string" && isValidDealStage(dealStageRaw)) update.deal_stage = dealStageRaw
  if (typeof memo === "string") update.memo = memo
  if (typeof followUp === "string" || followUp === null) update.follow_up_date = followUp
  if (typeof industryRaw === "string" && isValidIndustry(industryRaw)) update.industry = industryRaw
  if (typeof prefecture === "string") update.prefecture = prefecture
  if (typeof assignedTo === "string") update.assigned_to = assignedTo
  const finalSlug =
    typeof slug === "string" && slug.trim()
      ? slug.trim()
      : domain && typeof name === "string" && name
        ? buildCompanySlug(name, domain)
        : null
  if (finalSlug) {
    update.slug = finalSlug
    update.report_url = buildReportUrl(reportLocale, finalSlug)
  }

  return {
    update,
    name,
    domain,
    industry: typeof industryRaw === "string" && isValidIndustry(industryRaw) ? industryRaw : null,
    prefecture: typeof prefecture === "string" ? prefecture : null,
    reportLocale,
    targetCountry,
    templateVariant,
    finalSlug,
  }
}

export function parseCustomerProps(props: Record<string, unknown>): Record<string, unknown> {
  const update: Record<string, unknown> = {}
  const name = extractProperty(props, "顧客名") || extractProperty(props, "Customer")
  if (typeof name === "string" && name) update.customer_name = name

  const status = extractProperty(props, "契約ステータス") || extractProperty(props, "Status")
  if (typeof status === "string" && VALID_CONTRACT_STATUS.includes(status)) update.contract_status = status

  const health = extractProperty(props, "健全度") || extractProperty(props, "Health")
  if (typeof health === "string" && VALID_HEALTH.includes(health)) update.health = health

  const nextMeeting = extractProperty(props, "次回ミーティング") || extractProperty(props, "Next Meeting")
  if (typeof nextMeeting === "string" || nextMeeting === null) update.next_meeting = nextMeeting

  const subsidy = extractProperty(props, "補助金申請状況")
  if (typeof subsidy === "string" && VALID_SUBSIDY.includes(subsidy)) update.subsidy_status = subsidy

  const monthly = extractProperty(props, "月額") || extractProperty(props, "Monthly (USD)")
  if (typeof monthly === "number") update.monthly_amount = monthly

  const wlCount = extractProperty(props, "WLクライアント数") || extractProperty(props, "WL Client Count")
  if (typeof wlCount === "number") update.wl_client_count = wlCount

  const contractStart = extractProperty(props, "契約開始日") || extractProperty(props, "Contract Start")
  if (typeof contractStart === "string" || contractStart === null) update.contract_start = contractStart

  const nextInvoice = extractProperty(props, "次回請求日") || extractProperty(props, "Next Invoice")
  if (typeof nextInvoice === "string" || nextInvoice === null) update.next_invoice_date = nextInvoice

  const products = extractProperty(props, "契約商材") || extractProperty(props, "Products")
  if (Array.isArray(products)) update.contract_products = products

  const isWL = extractProperty(props, "WLクライアント") || extractProperty(props, "White Label")
  if (typeof isWL === "boolean") update.is_white_label = isWL

  const assignedTo = extractProperty(props, "担当者") || extractProperty(props, "Assignee")
  if (typeof assignedTo === "string") update.assigned_to = assignedTo

  return update
}

export interface DeliveryPropsResult {
  update: Record<string, unknown>
  metaUpdates: Record<string, unknown>
}

export function parseDeliveryProps(props: Record<string, unknown>): DeliveryPropsResult {
  const update: Record<string, unknown> = {}
  const metaUpdates: Record<string, unknown> = {}

  const name = extractProperty(props, "納品名") || extractProperty(props, "Delivery")
  if (typeof name === "string" && name) update.delivery_name = name

  const status = extractProperty(props, "ステータス") || extractProperty(props, "Status")
  if (typeof status === "string" && VALID_DELIVERY_STATUS.includes(status)) update.status = status

  const dueDate = extractProperty(props, "納期") || extractProperty(props, "Due Date")
  if (typeof dueDate === "string" || dueDate === null) update.due_date = dueDate

  const deliveryUrl = extractProperty(props, "納品URL") || extractProperty(props, "Delivery URL")
  if (typeof deliveryUrl === "string") update.delivery_url = deliveryUrl

  const r2Path = extractProperty(props, "Cloudflare R2 パス") || extractProperty(props, "R2 Path")
  if (typeof r2Path === "string") update.r2_path = r2Path

  const createdBy = extractProperty(props, "制作者") || extractProperty(props, "Created By")
  if (typeof createdBy === "string") update.created_by = createdBy

  const progress = extractProperty(props, "進捗 %") || extractProperty(props, "Progress %")
  if (typeof progress === "number") metaUpdates.progress_percent = progress

  const isPublic = extractProperty(props, "公開") || extractProperty(props, "Public")
  if (typeof isPublic === "boolean") metaUpdates.is_public = isPublic

  return { update, metaUpdates }
}

export function parseTemplateProps(props: Record<string, unknown>, region: Region): Record<string, unknown> {
  const update: Record<string, unknown> = { last_synced: new Date().toISOString() }
  const templateName = extractProperty(props, "テンプレ名")
  if (typeof templateName === "string" && templateName) update.template_name = templateName
  const templateVariant = normalizeTemplateVariant(
    extractProperty(props, "テンプレ種別") || extractProperty(props, "Template Variant"),
  )
  const reportLocale = normalizeReportLocale(
    extractProperty(props, "表示言語") || extractProperty(props, "Report Locale"),
    region,
  )
  const targetCountry = normalizeTargetCountry(
    extractProperty(props, "対象国") || extractProperty(props, "Target Country"),
    reportLocale,
  )
  const industry = extractProperty(props, "業種")
  const issue = extractProperty(props, "課題コード")
  update.template_variant = templateVariant
  update.report_locale = reportLocale
  update.target_country = targetCountry
  if (typeof industry === "string" && isValidIndustry(industry)) update.industry = industry
  if (typeof issue === "string" && isValidIssueCode(issue)) update.issue_code = issue
  for (const field of ["headline", "pain", "fear", "loss", "cta_text"] as const) {
    const v = extractProperty(props, field)
    if (typeof v === "string") update[field] = v
  }
  const severity = extractProperty(props, "重要度")
  if (severity === "critical" || severity === "warning" || severity === "info") update.severity = severity
  const isActive = extractProperty(props, "有効")
  if (typeof isActive === "boolean") update.is_active = isActive

  return update
}
