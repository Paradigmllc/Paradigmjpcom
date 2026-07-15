import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export const SALES_PRODUCT_CODES = [
  "jp_web_production",
  "jp_dx_package",
  "global_jaas",
  "global_video_subscription",
] as const

export type SalesProductCode = (typeof SALES_PRODUCT_CODES)[number]

export interface ProductRecommendationInput {
  companyId: string
  region: string
  reportLocale: string
  targetCountry: string
  templateVariant: string
  diagnosisSummary?: string | null
  recommendedOffer?: string | null
}

export interface SalesProduct {
  id: string
  code: SalesProductCode
  display_name: string
  market_scope: "jp" | "global"
  template_variant: string
  default_currency: string
  default_amount_yen: number
  is_subscription: boolean
  description: string | null
  sort_order: number
  meta: Record<string, unknown>
}

export interface CompanyProductRecommendation {
  id: string | null
  productId: string
  code: SalesProductCode
  displayName: string
  marketScope: "jp" | "global"
  defaultCurrency: string
  defaultAmountYen: number
  isSubscription: boolean
  priority: number
  fitScore: number
  reason: string
  status: "recommended" | "assigned" | "opportunity_created" | "dismissed"
  twentyOpportunityId: string | null
}

interface InferredRecommendation {
  code: SalesProductCode
  priority: number
  fitScore: number
  reason: string
}

interface RecommendationRow {
  id: string
  product_id: string
  priority: number
  fit_score: number
  reason: string
  status: CompanyProductRecommendation["status"]
  twenty_opportunity_id: string | null
  sales_products?: SalesProduct | SalesProduct[] | null
}

const FALLBACK_PRODUCTS: Record<SalesProductCode, Omit<SalesProduct, "id">> = {
  jp_web_production: {
    code: "jp_web_production",
    display_name: "Web制作",
    market_scope: "jp",
    template_variant: "website_diagnostic",
    default_currency: "JPY",
    default_amount_yen: 450000,
    is_subscription: false,
    description: "診断レポートとAstro差し替えデモを起点にしたWeb制作提案。",
    sort_order: 10,
    meta: {},
  },
  jp_dx_package: {
    code: "jp_dx_package",
    display_name: "DXパッケージ",
    market_scope: "jp",
    template_variant: "outreach",
    default_currency: "JPY",
    default_amount_yen: 650000,
    is_subscription: false,
    description: "営業自動化、業務改善、AI導入をまとめたDXパッケージ。",
    sort_order: 20,
    meta: {},
  },
  global_jaas: {
    code: "global_jaas",
    display_name: "Japan Entry Package (JaaS)",
    market_scope: "global",
    template_variant: "japan_entry",
    default_currency: "USD",
    default_amount_yen: 12000,
    is_subscription: false,
    description: "海外SMB向けの日本市場参入パッケージ。",
    sort_order: 30,
    meta: {
      pricing_model: "fixed_setup",
      setup_amount_usd: 12000,
      monthly_free_months: 6,
      continuation_pricing: "agreed_separately_after_included_period",
    },
  },
  global_video_subscription: {
    code: "global_video_subscription",
    display_name: "動画納品サブスク",
    market_scope: "global",
    template_variant: "video_subscription",
    default_currency: "JPY",
    default_amount_yen: 250000,
    is_subscription: true,
    description: "海外SMB向けの動画制作、字幕、短尺動画の継続納品。",
    sort_order: 40,
    meta: {},
  },
}

function isJapanTarget(input: ProductRecommendationInput): boolean {
  return input.region === "jp" || input.reportLocale === "ja" || input.targetCountry === "JP"
}

function containsAny(value: string | null | undefined, keywords: readonly string[]): boolean {
  const normalized = (value ?? "").toLowerCase()
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
}

export function inferCompanyProductRecommendations(input: ProductRecommendationInput): InferredRecommendation[] {
  const text = `${input.templateVariant} ${input.diagnosisSummary ?? ""} ${input.recommendedOffer ?? ""}`
  const wantsVideo = input.templateVariant === "video_subscription" || containsAny(text, ["動画", "video", "short"])
  const wantsDx = input.templateVariant === "outreach" || containsAny(text, ["dx", "automation", "自動化", "ai", "業務"])

  if (isJapanTarget(input)) {
    return wantsDx
      ? [
          { code: "jp_dx_package", priority: 1, fitScore: 88, reason: "国内向けで営業自動化や業務改善の文脈が強いため。" },
          { code: "jp_web_production", priority: 2, fitScore: 78, reason: "診断レポートとデモサイトをWeb改善提案へ接続できるため。" },
        ]
      : [
          { code: "jp_web_production", priority: 1, fitScore: 86, reason: "国内企業のWeb診断、フォーム改善、Astroデモとの相性が高いため。" },
          { code: "jp_dx_package", priority: 2, fitScore: 72, reason: "Web改善後に業務改善や営業自動化へ拡張しやすいため。" },
        ]
  }

  return wantsVideo
    ? [
        { code: "global_video_subscription", priority: 1, fitScore: 88, reason: "海外向けで動画納品、字幕、短尺コンテンツの継続提案に接続しやすいため。" },
        { code: "global_jaas", priority: 2, fitScore: 76, reason: "動画提案後に日本市場参入支援へ展開できるため。" },
      ]
    : [
        { code: "global_jaas", priority: 1, fitScore: 88, reason: "海外SMB向けの日本市場参入診断、LP、営業導線構築と一致するため。" },
        { code: "global_video_subscription", priority: 2, fitScore: 74, reason: "日本向け訴求を動画や字幕付き営業資料へ拡張できるため。" },
      ]
}

export function productFromFallback(code: SalesProductCode): SalesProduct {
  return { id: code, ...FALLBACK_PRODUCTS[code] }
}

function rowProduct(row: RecommendationRow): SalesProduct | null {
  const product = Array.isArray(row.sales_products) ? row.sales_products[0] : row.sales_products
  return product ?? null
}

function toProjection(row: RecommendationRow, fallbackCode?: SalesProductCode): CompanyProductRecommendation | null {
  const product = rowProduct(row) ?? (fallbackCode ? productFromFallback(fallbackCode) : null)
  if (!product) return null
  return {
    id: row.id,
    productId: product.id,
    code: product.code,
    displayName: product.display_name,
    marketScope: product.market_scope,
    defaultCurrency: product.default_currency,
    defaultAmountYen: product.default_amount_yen,
    isSubscription: product.is_subscription,
    priority: row.priority,
    fitScore: row.fit_score,
    reason: row.reason,
    status: row.status,
    twentyOpportunityId: row.twenty_opportunity_id,
  }
}

export async function fetchCompanyProductRecommendations(
  sb: ServiceSupabase,
  companyId: string,
): Promise<CompanyProductRecommendation[]> {
  const { data, error } = await sb
    .from(DB_TABLES.SALES_COMPANY_PRODUCT_RECOMMENDATIONS)
    .select("id, product_id, priority, fit_score, reason, status, twenty_opportunity_id, sales_products(id, code, display_name, market_scope, template_variant, default_currency, default_amount_yen, is_subscription, description, sort_order, meta)")
    .eq("company_id", companyId)
    .neq("status", "dismissed")
    .order("priority", { ascending: true })

  if (error) {
    console.error("[sales-products] fetch recommendations failed:", error.message)
    return []
  }

  return ((data ?? []) as RecommendationRow[])
    .map((row) => toProjection(row))
    .filter((row): row is CompanyProductRecommendation => row !== null)
}

export async function ensureCompanyProductRecommendations(
  sb: ServiceSupabase,
  input: ProductRecommendationInput,
): Promise<CompanyProductRecommendation[]> {
  const inferred = inferCompanyProductRecommendations(input)
  const codes = inferred.map((item) => item.code)
  const productsRes = await sb.from(DB_TABLES.SALES_PRODUCTS).select("*").in("code", codes)
  if (productsRes.error) {
    console.error("[sales-products] product master fetch failed:", productsRes.error.message)
    return inferred.map((item) => {
      const fallback = productFromFallback(item.code)
      return {
        id: null,
        productId: fallback.id,
        code: fallback.code,
        displayName: fallback.display_name,
        marketScope: fallback.market_scope,
        defaultCurrency: fallback.default_currency,
        defaultAmountYen: fallback.default_amount_yen,
        isSubscription: fallback.is_subscription,
        priority: item.priority,
        fitScore: item.fitScore,
        reason: item.reason,
        status: "recommended",
        twentyOpportunityId: null,
      }
    })
  }

  const products = new Map(((productsRes.data ?? []) as SalesProduct[]).map((product) => [product.code, product]))
  const productIds = Array.from(products.values()).map((product) => product.id)
  if (productIds.length === 0) return []

  const existingRes = await sb
    .from(DB_TABLES.SALES_COMPANY_PRODUCT_RECOMMENDATIONS)
    .select("id, product_id, status, twenty_opportunity_id")
    .eq("company_id", input.companyId)
    .in("product_id", productIds)

  if (existingRes.error) {
    console.error("[sales-products] existing recommendation fetch failed:", existingRes.error.message)
    return []
  }
  const existingByProduct = new Map(
    ((existingRes.data ?? []) as Array<{ id: string; product_id: string; status: string; twenty_opportunity_id: string | null }>).map((row) => [row.product_id, row]),
  )

  for (const item of inferred) {
    const product = products.get(item.code)
    if (!product) continue
    const existing = existingByProduct.get(product.id)
    const payload = {
      priority: item.priority,
      fit_score: item.fitScore,
      reason: item.reason,
      source: "company_karte",
      meta: {
        template_variant: input.templateVariant,
        target_country: input.targetCountry,
        report_locale: input.reportLocale,
        inferred_at: new Date().toISOString(),
      },
    }

    const result = existing
      ? await sb.from(DB_TABLES.SALES_COMPANY_PRODUCT_RECOMMENDATIONS).update(payload).eq("id", existing.id)
      : await sb.from(DB_TABLES.SALES_COMPANY_PRODUCT_RECOMMENDATIONS).insert({
          company_id: input.companyId,
          product_id: product.id,
          status: "recommended",
          ...payload,
        })

    if (result.error) console.error("[sales-products] recommendation upsert failed:", result.error.message)
  }

  return fetchCompanyProductRecommendations(sb, input.companyId)
}

export async function markRecommendationOpportunityCreated(
  sb: ServiceSupabase,
  recommendationId: string | null,
  twentyOpportunityId: string,
): Promise<void> {
  if (!recommendationId) return
  const { error } = await sb
    .from(DB_TABLES.SALES_COMPANY_PRODUCT_RECOMMENDATIONS)
    .update({
      status: "opportunity_created",
      twenty_opportunity_id: twentyOpportunityId,
    })
    .eq("id", recommendationId)

  if (error) console.error("[sales-products] mark opportunity failed:", error.message)
}
