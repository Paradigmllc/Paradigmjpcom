import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export interface SalesCrmViewField {
  id?: string
  fieldKey: string
  twentyFieldName: string
  label: string
  position: number
  isVisible: boolean
  fieldType: "text" | "url" | "select" | "multi_select"
  description: string | null
}

export interface SalesCrmSelectOption {
  id?: string
  fieldKey: string
  value: string
  label: string
  countryCode: string | null
  position: number
  isActive: boolean
  color: string
}

interface CrmViewFieldRow {
  id: string
  field_key: string
  twenty_field_name: string
  label: string
  position: number
  is_visible: boolean
  field_type: string
  description: string | null
}

interface CrmSelectOptionRow {
  id: string
  field_key: string
  value: string
  label: string
  country_code: string | null
  position: number
  is_active: boolean
  color: string | null
}

export const DEFAULT_CRM_VIEW_FIELDS: SalesCrmViewField[] = [
  { fieldKey: "name", twentyFieldName: "name", label: "Name", position: 0, isVisible: true, fieldType: "text", description: "企業名" },
  { fieldKey: "domain", twentyFieldName: "domainName", label: "Domain Name", position: 1, isVisible: true, fieldType: "text", description: "Webサイトドメイン" },
  { fieldKey: "sales_status", twentyFieldName: "paradigmSalesStatus", label: "営業ステータス", position: 2, isVisible: true, fieldType: "select", description: "営業の現在地" },
  { fieldKey: "country", twentyFieldName: "paradigmCountryName", label: "国名", position: 3, isVisible: true, fieldType: "select", description: "対象国" },
  { fieldKey: "region", twentyFieldName: "paradigmRegionName", label: "地域名", position: 4, isVisible: true, fieldType: "text", description: "国別の地域候補はSales OSの選択肢マスタで管理し、Twentyには確定した地域名だけを表示" },
  { fieldKey: "industry", twentyFieldName: "paradigmIndustryName", label: "業種名", position: 5, isVisible: true, fieldType: "select", description: "営業テンプレ選定に使う業種" },
  { fieldKey: "source", twentyFieldName: "paradigmSourceName", label: "ソース元", position: 6, isVisible: true, fieldType: "select", description: "Apollo、Fumadataなどの取得元" },
  { fieldKey: "form_url", twentyFieldName: "paradigmFormUrl", label: "フォームURL", position: 7, isVisible: true, fieldType: "url", description: "フォーム営業対象URL" },
  { fieldKey: "report_url", twentyFieldName: "paradigmReportUrl", label: "診断レポートURL", position: 8, isVisible: true, fieldType: "url", description: "顧客向け診断ページ" },
  { fieldKey: "sales_material_url", twentyFieldName: "paradigmSalesMaterialUrl", label: "営業資料URL", position: 9, isVisible: true, fieldType: "url", description: "Slidev/Gotenberg資料" },
  { fieldKey: "demo_url", twentyFieldName: "paradigmDemoUrl", label: "デモURL", position: 10, isVisible: true, fieldType: "url", description: "Astroデモサイト" },
  { fieldKey: "customer_portal_url", twentyFieldName: "paradigmCustomerPortalUrl", label: "顧客ポータルURL", position: 11, isVisible: true, fieldType: "url", description: "成約後の顧客ポータル" },
]

const OPERATIONAL_CRM_VIEW_FIELDS: SalesCrmViewField[] = [
  { fieldKey: "data_status", twentyFieldName: "paradigmDataStatus", label: "取得ステータス", position: 7, isVisible: true, fieldType: "text", description: "Twenty Sales OS readiness and data collection state" },
  { fieldKey: "next_action", twentyFieldName: "paradigmNextAction", label: "Next Action", position: 8, isVisible: true, fieldType: "text", description: "Next required pipeline action" },
  { fieldKey: "last_error", twentyFieldName: "paradigmLastError", label: "最終エラー", position: 9, isVisible: true, fieldType: "text", description: "Latest source or pipeline error summary" },
]

const CRM_FIELD_OVERRIDES: Record<string, Partial<SalesCrmViewField>> = {
  name: { label: "Name", position: 0, isVisible: true },
  domain: { label: "Domain Name", position: 1, isVisible: true },
  country: { label: "国名", position: 2, isVisible: true, fieldType: "select", description: "対象国" },
  data_status: { label: "取得ステータス", position: 3, isVisible: true },
  next_action: { label: "Next Action", position: 4, isVisible: true },
  last_error: { label: "最終エラー", position: 5, isVisible: true },
  sales_status: { label: "営業ステータス", position: 6, isVisible: true },
  form_url: { label: "フォームURL", position: 7, isVisible: true },
  report_url: { label: "診断レポートURL", position: 8, isVisible: true },
  region: { label: "地域名", position: 9, isVisible: true, fieldType: "text" },
  industry: { label: "業種名", position: 10, isVisible: true },
  source: { label: "ソース元", position: 11, isVisible: true },
  sales_material_url: { label: "営業資料URL", position: 12, isVisible: true },
  demo_url: { label: "デモURL", position: 13, isVisible: true },
  customer_portal_url: { label: "顧客ポータルURL", position: 14, isVisible: true },
}

const JAPAN_PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
] as const

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
] as const

function option(
  fieldKey: string,
  value: string,
  label: string,
  position: number,
  countryCode: string | null = null,
  color = "gray",
): SalesCrmSelectOption {
  return { fieldKey, value, label, countryCode, position, isActive: true, color }
}

export const DEFAULT_CRM_SELECT_OPTIONS: SalesCrmSelectOption[] = [
  option("country", "日本", "日本", 0, "JP", "green"),
  option("country", "米国", "米国", 1, "US", "blue"),
  option("country", "韓国", "韓国", 2, "KR", "purple"),
  option("country", "中国", "中国", 3, "CN", "red"),
  option("country", "台湾", "台湾", 4, "TW", "cyan"),
  option("country", "ドイツ", "ドイツ", 5, "DE", "yellow"),
  option("country", "フランス", "フランス", 6, "FR", "pink"),
  option("country", "スペイン", "スペイン", 7, "ES", "orange"),
  option("country", "ポルトガル", "ポルトガル", 8, "PT", "orange"),
  option("country", "ロシア", "ロシア", 9, "RU", "gray"),
  option("country", "UAE", "UAE", 10, "AE", "teal"),
  option("country", "南アフリカ", "南アフリカ", 11, "ZA", "green"),
  option("country", "英国", "英国", 12, "GB", "blue"),
  option("country", "カナダ", "カナダ", 13, "CA", "blue"),
  option("country", "オーストラリア", "オーストラリア", 14, "AU", "yellow"),
  option("country", "インド", "インド", 15, "IN", "orange"),
  option("country", "シンガポール", "シンガポール", 16, "SG", "cyan"),
  option("country", "ベトナム", "ベトナム", 17, "VN", "green"),
  option("country", "インドネシア", "インドネシア", 18, "ID", "green"),
  ...JAPAN_PREFECTURES.map((name, index) => option("region", name, name, index, "JP", "green")),
  ...US_STATES.map((name, index) => option("region", name, name, 100 + index, "US", "blue")),
  option("industry", "美容サロン", "美容サロン", 0, null, "pink"),
  option("industry", "歯科医院", "歯科医院", 1, null, "cyan"),
  option("industry", "飲食店", "飲食店", 2, null, "orange"),
  option("industry", "建設・工務店", "建設・工務店", 3, null, "yellow"),
  option("industry", "会計事務所", "会計事務所", 4, null, "blue"),
  option("industry", "小売・店舗", "小売・店舗", 5, null, "purple"),
  option("industry", "清掃・メンテナンス", "清掃・メンテナンス", 6, null, "green"),
  option("industry", "コンサルティング", "コンサルティング", 7, null, "gray"),
  option("source", "apollo", "Apollo", 0, null, "blue"),
  option("source", "fumadata", "Fumadata", 1, null, "purple"),
  option("source", "bizmap", "BIZMap", 2, null, "yellow"),
  option("source", "gbizinfo", "gBizInfo", 3, null, "green"),
  option("source", "jgrants", "jGrants", 4, null, "cyan"),
  option("source", "nta_corporate_number", "国税庁法人番号", 5, null, "orange"),
  option("source", "apify", "Apify", 6, null, "pink"),
  option("source", "outscraper", "Outscraper", 7, null, "teal"),
  option("source", "manual_csv", "手動CSV", 8, null, "gray"),
  option("source", "codex_verification", "Codex検証", 9, null, "red"),
  option("source", "codex_e2e", "Codex E2E", 10, null, "red"),
  option("sales_status", "未診断 / 未対応", "未診断 / 未対応", 0, null, "gray"),
  option("sales_status", "カルテ生成中 / 未対応", "カルテ生成中 / 未対応", 1, null, "yellow"),
  option("sales_status", "送信待ち / 未対応", "送信待ち / 未対応", 2, null, "orange"),
  option("sales_status", "手動確認 / 未対応", "手動確認 / 未対応", 3, null, "purple"),
  option("sales_status", "送信済み / 未対応", "送信済み / 未対応", 4, null, "blue"),
  option("sales_status", "商談化 / 初回商談", "商談化 / 初回商談", 5, null, "cyan"),
  option("sales_status", "提案中 / 提案", "提案中 / 提案", 6, null, "teal"),
  option("sales_status", "成約 / 契約", "成約 / 契約", 7, null, "green"),
  option("sales_status", "失注 / 失注", "失注 / 失注", 8, null, "red"),
]

function mapField(row: CrmViewFieldRow): SalesCrmViewField {
  const fieldType = ["text", "url", "select", "multi_select"].includes(row.field_type) ? row.field_type : "text"
  return {
    id: row.id,
    fieldKey: row.field_key,
    twentyFieldName: row.twenty_field_name,
    label: row.label,
    position: row.position,
    isVisible: row.is_visible,
    fieldType: fieldType as SalesCrmViewField["fieldType"],
    description: row.description,
  }
}

function normalizeCrmViewFields(fields: SalesCrmViewField[]): SalesCrmViewField[] {
  const byKey = new Map<string, SalesCrmViewField>()
  for (const field of fields) byKey.set(field.fieldKey, field)
  for (const field of OPERATIONAL_CRM_VIEW_FIELDS) {
    if (!byKey.has(field.fieldKey)) byKey.set(field.fieldKey, field)
  }
  for (const [fieldKey, override] of Object.entries(CRM_FIELD_OVERRIDES)) {
    const field = byKey.get(fieldKey)
    if (field) byKey.set(fieldKey, { ...field, ...override })
  }

  return [...byKey.values()].map((field): SalesCrmViewField =>
    field.fieldKey === "region"
      ? {
          ...field,
          fieldType: "text",
          description:
            field.description ??
            "国別の地域候補はSales OSの選択肢マスタで管理し、Twentyには確定した地域名だけを表示",
        }
      : field,
  ).sort((a, b) => a.position - b.position || a.fieldKey.localeCompare(b.fieldKey))
}

function mapOption(row: CrmSelectOptionRow): SalesCrmSelectOption {
  return {
    id: row.id,
    fieldKey: row.field_key,
    value: row.value,
    label: row.label,
    countryCode: row.country_code,
    position: row.position,
    isActive: row.is_active,
    color: row.color ?? "gray",
  }
}

function normalizeCrmSelectOptions(options: SalesCrmSelectOption[]): SalesCrmSelectOption[] {
  const byKey = new Map<string, SalesCrmSelectOption>()
  for (const option of options) byKey.set(`${option.fieldKey}:${option.value}`, option)
  for (const option of DEFAULT_CRM_SELECT_OPTIONS) {
    const key = `${option.fieldKey}:${option.value}`
    if (!byKey.has(key)) byKey.set(key, option)
  }
  return [...byKey.values()].sort((a, b) =>
    a.fieldKey.localeCompare(b.fieldKey) || a.position - b.position || a.value.localeCompare(b.value),
  )
}

export async function getSalesCrmFieldConfig(sb: ServiceSupabase | null = getServiceSalesSupabase()): Promise<{
  fields: SalesCrmViewField[]
  options: SalesCrmSelectOption[]
  fallbackUsed: boolean
  error: string | null
}> {
  if (!sb) {
    return { fields: normalizeCrmViewFields(DEFAULT_CRM_VIEW_FIELDS), options: normalizeCrmSelectOptions(DEFAULT_CRM_SELECT_OPTIONS), fallbackUsed: true, error: "Supabase is not configured." }
  }

  const [fieldsRes, optionsRes] = await Promise.all([
    sb.from(DB_TABLES.SALES_CRM_VIEW_FIELDS).select("*").order("position", { ascending: true }),
    sb.from(DB_TABLES.SALES_CRM_SELECT_OPTIONS).select("*").order("field_key", { ascending: true }).order("position", { ascending: true }),
  ])

  const error = fieldsRes.error?.message ?? optionsRes.error?.message ?? null
  if (error) {
    const fields = (fieldsRes.data ?? []).length > 0 ? normalizeCrmViewFields(((fieldsRes.data ?? []) as CrmViewFieldRow[]).map(mapField)) : normalizeCrmViewFields(DEFAULT_CRM_VIEW_FIELDS)
    const options = (optionsRes.data ?? []).length > 0 ? normalizeCrmSelectOptions(((optionsRes.data ?? []) as CrmSelectOptionRow[]).map(mapOption)) : normalizeCrmSelectOptions(DEFAULT_CRM_SELECT_OPTIONS)
    const partial = (fields !== DEFAULT_CRM_VIEW_FIELDS || options !== DEFAULT_CRM_SELECT_OPTIONS)
    console.error("[sales-crm-field-config] Supabase fetch error:", error, partial ? "(partial data used)" : "(full fallback)")
    return { fields, options, fallbackUsed: !partial, error }
  }

  return {
    fields: normalizeCrmViewFields(((fieldsRes.data ?? []) as CrmViewFieldRow[]).map(mapField)),
    options: normalizeCrmSelectOptions(((optionsRes.data ?? []) as CrmSelectOptionRow[]).map(mapOption)),
    fallbackUsed: false,
    error: null,
  }
}

export async function saveSalesCrmFieldConfig(input: {
  fields: SalesCrmViewField[]
  options: SalesCrmSelectOption[]
}): Promise<{ fields: SalesCrmViewField[]; options: SalesCrmSelectOption[] }> {
  const sb = getServiceSalesSupabase()
  if (!sb) {
    console.error("[crm-field-config] Supabase service_role is not configured")
    throw new Error("Supabase service_role is not configured.")
  }

  const fieldRows = normalizeCrmViewFields(input.fields).map((field) => ({
    field_key: field.fieldKey,
    twenty_field_name: field.twentyFieldName,
    label: field.label,
    position: field.position,
    is_visible: field.isVisible,
    field_type: field.fieldType,
    description: field.description,
  }))
  const optionRows = normalizeCrmSelectOptions(input.options).map((item) => ({
    field_key: item.fieldKey,
    value: item.value,
    label: item.label,
    country_code: item.countryCode,
    position: item.position,
    is_active: item.isActive,
    color: item.color,
  }))

  const fieldsRes = await sb
    .from(DB_TABLES.SALES_CRM_VIEW_FIELDS)
    .upsert(fieldRows, { onConflict: "field_key" })
    .select("*")
    .order("position", { ascending: true })
  if (fieldsRes.error) {
    console.error("[crm-field-config] upsert fields failed:", fieldsRes.error.message)
    throw new Error(fieldsRes.error.message)
  }

  const optionsRes = await sb
    .from(DB_TABLES.SALES_CRM_SELECT_OPTIONS)
    .upsert(optionRows, { onConflict: "field_key,value" })
    .select("*")
    .order("field_key", { ascending: true })
    .order("position", { ascending: true })
  if (optionsRes.error) {
    console.error("[crm-field-config] upsert options failed:", optionsRes.error.message)
    throw new Error(optionsRes.error.message)
  }

  return {
    fields: ((fieldsRes.data ?? []) as CrmViewFieldRow[]).map(mapField),
    options: ((optionsRes.data ?? []) as CrmSelectOptionRow[]).map(mapOption),
  }
}
