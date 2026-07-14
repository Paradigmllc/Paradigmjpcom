/**
 * lib/sales/companies.ts — sales_companies CRUD wrapper (Sprint 8)
 *
 * 役割: sales_companies (リード DB) への型安全な書込/読込 API。
 *       API route / 内部スクリプトが共通で使う窓口。
 *
 * 設計:
 *   - getServiceSalesSupabase() で service_role 鍵を使う (RLS bypass)
 *   - upsertByDomain で「同じ domain は 1 行」を保証 (重複 insert 防止)
 */

import { getServiceSalesSupabase } from "@/lib/supabase"
import { normalizeDomain, normalizeCompanyName } from "./dedup"
import { DB_TABLES } from "@/lib/sales/db-tables"
import {
  buildCompanySlug,
  buildReportUrl,
  getRoutingMeta,
  inferVariant,
  normalizeReportLocale,
  normalizeTargetCountry,
  normalizeTemplateVariant,
  type ReportLocale,
  type TemplateVariant,
} from "./routing"
import type {
  SalesCompany,
  PipelineStatus,
  DealStage,
  Industry,
  IssueCode,
  Region,
} from "./types"

export interface UpsertCompanyInput {
  domain: string
  company_name: string
  region?: Region // Sprint 16: default 'jp' for backward compat
  slug?: string | null
  report_locale?: ReportLocale | string | null
  target_country?: string | null
  template_variant?: TemplateVariant | string | null
  industry?: Industry | null
  prefecture?: string | null
  pipeline_status?: PipelineStatus
  deal_stage?: DealStage
  pagespeed_mobile?: number | null
  pagespeed_desktop?: number | null
  detected_issues?: IssueCode[]
  source?: string | null
  meta?: Record<string, unknown>
  // ── migration_046: normalized meta columns ──
  tech_stack?: Record<string, unknown> | null
  pain_diagnosis?: Record<string, unknown> | null
  dify_result?: Record<string, unknown> | null
  japan_market_audit?: Record<string, unknown> | null
  demo_site?: Record<string, unknown> | null
  visual_evidence?: Record<string, unknown> | null
  report_generated_at?: string | null
  generate_report_url?: boolean
}

/** domain で既存リードを upsert (重複作成防止・region 必須 default 'jp') */
export async function upsertCompanyByDomain(
  input: UpsertCompanyInput,
): Promise<{ ok: boolean; company?: SalesCompany; error?: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }
  // canonical domain (www/proto 除去) で「同一企業 = 同一 domain 行」を物理担保
  const domain = normalizeDomain(input.domain) ?? input.domain.trim().toLowerCase()
  const { data: existing } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("*")
    .eq("domain", domain)
    .maybeSingle()
  const current = (existing as SalesCompany | null) ?? null
  const region = input.region ?? current?.region ?? "jp"
  const currentRouting = getRoutingMeta(current?.meta)
  const reportLocale = normalizeReportLocale(
    input.report_locale ?? current?.report_locale ?? currentRouting.report_locale,
    region,
  )
  const targetCountry = normalizeTargetCountry(
    input.target_country ?? current?.target_country ?? currentRouting.target_country,
    reportLocale,
  )
  const mergedMeta = {
    ...((current?.meta as Record<string, unknown> | null) ?? {}),
    ...(input.meta ?? {}),
  }
  const templateVariant = normalizeTemplateVariant(
    input.template_variant ??
      current?.template_variant ??
      currentRouting.template_variant ??
      inferVariant({
        targetCountry,
        reportLocale,
        issues: input.detected_issues ?? current?.detected_issues,
        meta: mergedMeta,
      }),
  )
  let slug = input.slug ?? current?.slug ?? buildCompanySlug(input.company_name, domain)
  // Ensure uniqueness: if another company already has this slug, append suffix
  if (!input.slug && !current?.slug) {
    let suffix = 1
    let candidate = slug
    while (true) {
      const { data: clash } = await sb
        .from(DB_TABLES.SALES_COMPANIES)
        .select("id")
        .eq("slug", candidate)
        .neq("domain", domain)
        .maybeSingle()
      if (!clash) break
      suffix++
      candidate = `${slug}-${suffix}`
    }
    slug = candidate
  }
  const reportUrl = input.generate_report_url === false
    ? null
    : buildReportUrl(reportLocale, slug)
  const metaWithRouting = {
    ...mergedMeta,
    routing: {
      ...((mergedMeta.routing as Record<string, unknown> | undefined) ?? {}),
      report_locale: reportLocale,
      target_country: targetCountry,
      template_variant: templateVariant,
      report_url: reportUrl,
    },
  }
  const payload: Record<string, unknown> = {
    region,
    domain,
    company_name: input.company_name,
    name_key: normalizeCompanyName(input.company_name),
    slug,
    report_url: reportUrl,
    report_locale: reportLocale,
    target_country: targetCountry,
    template_variant: templateVariant,
    industry: input.industry ?? current?.industry ?? null,
    prefecture: input.prefecture ?? current?.prefecture ?? null,
    pipeline_status: input.pipeline_status ?? current?.pipeline_status ?? "pending",
    pagespeed_mobile: input.pagespeed_mobile ?? current?.pagespeed_mobile ?? null,
    pagespeed_desktop: input.pagespeed_desktop ?? current?.pagespeed_desktop ?? null,
    detected_issues: input.detected_issues ?? current?.detected_issues ?? [],
    source: input.source ?? current?.source ?? null,
    meta: metaWithRouting,
    // ── migration_046: normalized columns ──
    tech_stack: input.tech_stack ?? current?.tech_stack ?? null,
    pain_diagnosis: input.pain_diagnosis ?? current?.pain_diagnosis ?? null,
    dify_result: input.dify_result ?? current?.dify_result ?? null,
    japan_market_audit: input.japan_market_audit ?? current?.japan_market_audit ?? null,
    demo_site: input.demo_site ?? current?.demo_site ?? null,
    visual_evidence: input.visual_evidence ?? current?.visual_evidence ?? null,
    report_generated_at: input.report_generated_at ?? current?.report_generated_at ?? null,
  }
  const dealStage = input.deal_stage ?? current?.deal_stage
  if (dealStage) payload.deal_stage = dealStage

  const { data, error } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .upsert(payload, { onConflict: "domain", ignoreDuplicates: false })
    .select()
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, company: data as SalesCompany }
}

/** domain で 1 件取得 */
export async function findCompanyByDomain(
  domain: string,
): Promise<SalesCompany | null> {
  const sb = getServiceSalesSupabase()
  if (!sb) return null
  const { data } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("*")
    .eq("domain", domain)
    .maybeSingle()
  return (data as SalesCompany) ?? null
}

/** slug で 1 件取得 (Sprint 16: region scope 必須・default 'jp') */
export async function findCompanyBySlug(
  slug: string,
  region: Region = "jp",
): Promise<SalesCompany | null> {
  const sb = getServiceSalesSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("*")
    .eq("slug", slug)
    .eq("region", region)
    .maybeSingle()
  if (error) {
    console.error("[sales-companies] scoped slug fetch failed:", error.message)
    return null
  }
  if (data) return data as SalesCompany

  const fallback = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("*")
    .eq("slug", slug)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (fallback.error) {
    console.error("[sales-companies] fallback slug fetch failed:", fallback.error.message)
    return null
  }
  if (fallback.data) return fallback.data as SalesCompany

  // Third fallback: search by report_url containing the slug
  // (companies with NULL slug may still have valid report URLs)
  const urlFallback = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("*")
    .like("report_url", `%/${slug}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (urlFallback.error) {
    console.error("[sales-companies] report_url fallback fetch failed:", urlFallback.error.message)
    return null
  }
  if (urlFallback.data) {
    const found = urlFallback.data as SalesCompany
    // Auto-repair: set slug for future lookups
    if (!found.slug) {
      const { error: repairError } = await sb
        .from(DB_TABLES.SALES_COMPANIES)
        .update({ slug })
        .eq("id", found.id)
      if (repairError) {
        console.error("[sales-companies] auto-repair slug failed:", repairError.message)
      } else {
        found.slug = slug
      }
    }
    return found
  }

  return null
}

/** id で 1 件取得 */
export async function findCompanyById(id: string): Promise<SalesCompany | null> {
  const sb = getServiceSalesSupabase()
  if (!sb) return null
  const { data } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("*")
    .eq("id", id)
    .maybeSingle()
  return (data as SalesCompany) ?? null
}

/** HOT lead 検出 (report_views >= threshold) */
export async function markHotLead(
  companyId: string,
  isHot: boolean = true,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }
  const { error } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .update({ is_hot_lead: isHot })
    .eq("id", companyId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** pipeline_status を更新 (scanning → report_ready → sent の状態遷移) */
export async function setPipelineStatus(
  companyId: string,
  status: PipelineStatus,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }
  const { error } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .update({ pipeline_status: status })
    .eq("id", companyId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Dedup resolver: canonical domain → name_key. */
export async function findExistingCompany(input: {
  domain?: string | null
  nameKey?: string | null
  region?: Region
}): Promise<SalesCompany | null> {
  const sb = getServiceSalesSupabase()
  if (!sb) return null
  const region = input.region ?? "jp"
  const domain = normalizeDomain(input.domain)
  if (domain) {
    const { data } = await sb.from(DB_TABLES.SALES_COMPANIES).select("*").eq("domain", domain).maybeSingle()
    if (data) return data as SalesCompany
  }
  if (input.nameKey) {
    const { data } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("*")
      .eq("region", region)
      .eq("name_key", input.nameKey)
      .limit(1)
      .maybeSingle()
    if (data) return data as SalesCompany
  }
  return null
}

/** 最近更新された companies を取得 (debug/monitoring 用) */
export async function listRecentlyUpdatedCompanies(
  limit: number = 50,
): Promise<SalesCompany[]> {
  const sb = getServiceSalesSupabase()
  if (!sb) return []
  const { data } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit)
  return (data as SalesCompany[]) ?? []
}

/**
 * 複数 domain の既存在否を一括チェック (N+1 防止)。
 * 最大 1000 件までバッチ可。domain → SalesCompany の Map を返す。
 */
export async function batchFindExistingByDomains(
  domains: string[],
): Promise<Map<string, SalesCompany>> {
  const map = new Map<string, SalesCompany>()
  if (domains.length === 0) return map
  const sb = getServiceSalesSupabase()
  if (!sb) return map

  // Supabase `.in()` 上限に配慮して 300 件ずつ分割
  const chunkSize = 300
  for (let i = 0; i < domains.length; i += chunkSize) {
    const chunk = domains.slice(i, i + chunkSize)
    const { data, error } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("*")
      .in("domain", chunk)
    if (error) {
      console.error("[companies] batchFindExistingByDomains chunk failed:", error.message)
      continue
    }
    for (const row of (data as SalesCompany[]) ?? []) {
      if (row.domain) map.set(row.domain, row)
    }
  }
  return map
}
