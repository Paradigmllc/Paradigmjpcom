/**
 * lib/sales/companies.ts — sales_companies CRUD wrapper (Sprint 8)
 *
 * 役割: sales_companies (リード DB) への型安全な書込/読込 API。
 *       n8n webhook / API route / 内部スクリプトが共通で使う窓口。
 *
 * 設計:
 *   - getServiceSupabase() で service_role 鍵を使う (RLS bypass)
 *   - upsertByDomain で「同じ domain は 1 行」を保証 (重複 insert 防止)
 *   - notion_page_id の round-trip を意識した update/fetch を提供
 */

import { getServiceSupabase } from "@/lib/supabase"
import { normalizeDomain, normalizeCompanyName } from "./dedup"
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
  industry?: Industry | null
  prefecture?: string | null
  pipeline_status?: PipelineStatus
  deal_stage?: DealStage
  pagespeed_mobile?: number | null
  pagespeed_desktop?: number | null
  detected_issues?: IssueCode[]
  source?: string | null
  meta?: Record<string, unknown>
}

/** domain で既存リードを upsert (重複作成防止・region 必須 default 'jp') */
export async function upsertCompanyByDomain(
  input: UpsertCompanyInput,
): Promise<{ ok: boolean; company?: SalesCompany; error?: string }> {
  const sb = getServiceSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }
  // canonical domain (www/proto 除去) で「同一企業 = 同一 domain 行」を物理担保
  const domain = normalizeDomain(input.domain) ?? input.domain.trim().toLowerCase()
  const { data, error } = await sb
    .from("sales_companies")
    .upsert(
      {
        region: input.region ?? "jp", // Sprint 16: default 'jp' for backward compat
        domain,
        company_name: input.company_name,
        name_key: normalizeCompanyName(input.company_name), // dedup 鍵 (同名異表記の統合)
        industry: input.industry ?? null,
        prefecture: input.prefecture ?? null,
        pipeline_status: input.pipeline_status ?? "pending",
        deal_stage: input.deal_stage ?? "未対応",
        pagespeed_mobile: input.pagespeed_mobile ?? null,
        pagespeed_desktop: input.pagespeed_desktop ?? null,
        detected_issues: input.detected_issues ?? [],
        source: input.source ?? null,
        meta: input.meta ?? {},
      },
      { onConflict: "domain", ignoreDuplicates: false },
    )
    .select()
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, company: data as SalesCompany }
}

/** domain で 1 件取得 (Notion 側 round-trip で notion_page_id 確認用) */
export async function findCompanyByDomain(
  domain: string,
): Promise<SalesCompany | null> {
  const sb = getServiceSupabase()
  if (!sb) return null
  const { data } = await sb
    .from("sales_companies")
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
  const sb = getServiceSupabase()
  if (!sb) return null
  const { data } = await sb
    .from("sales_companies")
    .select("*")
    .eq("slug", slug)
    .eq("region", region)
    .maybeSingle()
  return (data as SalesCompany) ?? null
}

/** id で 1 件取得 */
export async function findCompanyById(id: string): Promise<SalesCompany | null> {
  const sb = getServiceSupabase()
  if (!sb) return null
  const { data } = await sb
    .from("sales_companies")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  return (data as SalesCompany) ?? null
}

/** notion_page_id を後付けで紐付け (Notion 側でページ作成後に呼ぶ) */
export async function setNotionPageId(
  companyId: string,
  notionPageId: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getServiceSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }
  const { error } = await sb
    .from("sales_companies")
    .update({ notion_page_id: notionPageId })
    .eq("id", companyId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Notion から逆流: deal_stage / follow_up_date / memo / assigned_to のみ更新 */
export interface NotionReverseInput {
  deal_stage?: DealStage
  follow_up_date?: string | null
  memo?: string | null
  assigned_to?: string | null
}

export async function updateCompanyFromNotion(
  notionPageId: string,
  input: NotionReverseInput,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getServiceSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }
  // 編集可能 4 field 以外は無視 (safety: Notion 側から domain 等を上書きさせない)
  const safePayload: Record<string, unknown> = {}
  if (input.deal_stage !== undefined) safePayload.deal_stage = input.deal_stage
  if (input.follow_up_date !== undefined) safePayload.follow_up_date = input.follow_up_date
  if (input.memo !== undefined) safePayload.memo = input.memo
  if (input.assigned_to !== undefined) safePayload.assigned_to = input.assigned_to
  if (Object.keys(safePayload).length === 0) {
    return { ok: true } // 変更なし
  }
  const { error } = await sb
    .from("sales_companies")
    .update(safePayload)
    .eq("notion_page_id", notionPageId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** HOT lead 検出 (report_views >= threshold) */
export async function markHotLead(
  companyId: string,
  isHot: boolean = true,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getServiceSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }
  const { error } = await sb
    .from("sales_companies")
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
  const sb = getServiceSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }
  const { error } = await sb
    .from("sales_companies")
    .update({ pipeline_status: status })
    .eq("id", companyId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * dedup resolver: notion_page_id → canonical domain → name_key の順で既存企業を 1 件特定。
 * リスト内重複・同名異表記・www 差を吸収し「1 企業 = 1 行」を保証する照合の中核。
 * create 前に必ずこれで照合し、ヒットしたら update・無ければ create する。
 */
export async function findExistingCompany(input: {
  notionPageId?: string | null
  domain?: string | null
  nameKey?: string | null
  region?: Region
}): Promise<SalesCompany | null> {
  const sb = getServiceSupabase()
  if (!sb) return null
  const region = input.region ?? "jp"
  if (input.notionPageId) {
    const { data } = await sb
      .from("sales_companies")
      .select("*")
      .eq("notion_page_id", input.notionPageId)
      .maybeSingle()
    if (data) return data as SalesCompany
  }
  const domain = normalizeDomain(input.domain)
  if (domain) {
    const { data } = await sb.from("sales_companies").select("*").eq("domain", domain).maybeSingle()
    if (data) return data as SalesCompany
  }
  if (input.nameKey) {
    const { data } = await sb
      .from("sales_companies")
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
  const sb = getServiceSupabase()
  if (!sb) return []
  const { data } = await sb
    .from("sales_companies")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit)
  return (data as SalesCompany[]) ?? []
}
