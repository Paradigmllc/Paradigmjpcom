/**
 * lib/sales/templates.ts — sales_templates lookup + Notion 同期 (Sprint 8・Sprint 16 region 拡張)
 *
 * 役割: 業種×課題コードで診断レポートのテンプレ文言を取得.
 *       Notion 📝 テンプレDB が主管・cron で Supabase に upsert.
 *
 * Sprint 16: region (jp / global) スコープ必須.
 *           jp = 日本語テンプレ (paradigmjp.com/ja/report)
 *           global = 英語ベース・他 11 locale fill 用 (paradigmjp.com/en|ko|...)
 */

import { getServiceSupabase } from "@/lib/supabase"
import type { SalesTemplate, Industry, IssueCode, Region } from "./types"

/** 業種×課題コードで 1 件取得 (region scope 必須・default 'jp') */
export async function matchTemplate(
  industry: Industry,
  issueCode: IssueCode,
  region: Region = "jp",
): Promise<SalesTemplate | null> {
  const sb = getServiceSupabase()
  if (!sb) return null
  const { data } = await sb
    .from("sales_templates")
    .select("*")
    .eq("region", region)
    .eq("industry", industry)
    .eq("issue_code", issueCode)
    .eq("is_active", true)
    .maybeSingle()
  return (data as SalesTemplate) ?? null
}

/** 業種 1 つで複数 issue を一括取得 (診断レポートの 3-Act 構成用・region scope) */
export async function getTemplatesByIndustry(
  industry: Industry,
  issueCodes?: IssueCode[],
  region: Region = "jp",
): Promise<SalesTemplate[]> {
  const sb = getServiceSupabase()
  if (!sb) return []
  let q = sb
    .from("sales_templates")
    .select("*")
    .eq("region", region)
    .eq("industry", industry)
    .eq("is_active", true)
  if (issueCodes && issueCodes.length > 0) {
    q = q.in("issue_code", issueCodes)
  }
  const { data } = await q
  return (data as SalesTemplate[]) ?? []
}

/** Notion → Supabase upsert (cron が呼ぶ・notion_page_id で重複防止) */
export async function upsertTemplateFromNotion(input: {
  notion_page_id: string
  region?: Region
  template_name: string
  industry: Industry
  issue_code: IssueCode
  severity?: "critical" | "warning" | "info"
  headline?: string | null
  pain?: string | null
  fear?: string | null
  loss?: string | null
  cta_text?: string | null
  is_active?: boolean
}): Promise<{ ok: boolean; error?: string }> {
  const sb = getServiceSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }
  const { error } = await sb.from("sales_templates").upsert(
    {
      notion_page_id: input.notion_page_id,
      region: input.region ?? "jp",
      template_name: input.template_name,
      industry: input.industry,
      issue_code: input.issue_code,
      severity: input.severity ?? "warning",
      headline: input.headline ?? null,
      pain: input.pain ?? null,
      fear: input.fear ?? null,
      loss: input.loss ?? null,
      cta_text: input.cta_text ?? null,
      is_active: input.is_active ?? true,
      last_synced: new Date().toISOString(),
    },
    { onConflict: "notion_page_id", ignoreDuplicates: false },
  )
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** 全テンプレ取得 (admin / debug 用・region scope・最大 1000 件) */
export async function listAllTemplates(region?: Region): Promise<SalesTemplate[]> {
  const sb = getServiceSupabase()
  if (!sb) return []
  let q = sb
    .from("sales_templates")
    .select("*")
    .order("industry", { ascending: true })
    .order("issue_code", { ascending: true })
    .limit(1000)
  if (region) q = q.eq("region", region)
  const { data } = await q
  return (data as SalesTemplate[]) ?? []
}
