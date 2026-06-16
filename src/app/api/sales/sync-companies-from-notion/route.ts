/**
 * POST /api/sales/sync-companies-from-notion — Notion → Supabase 同期 + 新規エンリッチ
 *
 * 役割: Notion リード DB を Supabase sales_companies に反映する。2 経路:
 *   1. **既存リード**: 編集可フィールド (deal_stage/memo/follow_up/industry/prefecture) を Supabase へ反映
 *   2. **新規リード (CSV を Notion にアップロード等)**: Supabase に **新規作成** し、
 *      30+ API enrich pipeline を fire-and-forget で発火 → カルテ自動生成
 *
 *   → これにより「Notion に CSV をアップロード → 自動で Supabase 追加 + 各社カルテ生成」が成立。
 *
 * Notion = GUI / Supabase = SSOT。新規判定は notion_page_id (無ければ domain) で照合。
 * 認証: X-Webhook-Secret 必須 / Body: { region?: "jp"|"global" }
 * cron (n8n / pg_cron) が 数分間隔で叩く想定 → アップロードから数分でカルテ完成。
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { notionQueryDatabaseAll, extractProperty } from "@/lib/notion"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { upsertCompanyByDomain, setNotionPageId, batchFindExistingByDomains } from "@/lib/sales/companies"
import { enrichFromContact } from "@/lib/sales/enrich"
import { normalizeDomain, normalizeCompanyName } from "@/lib/sales/dedup"
import {
  buildCompanySlug,
  buildReportUrl,
  normalizeReportLocale,
  normalizeTargetCountry,
  normalizeTemplateVariant,
} from "@/lib/sales/routing"
import {
  isValidDealStage,
  isValidIndustry,
  isValidRegion,
  type Industry,
  type Region,
} from "@/lib/sales/types"
import { isNotionLegacySyncEnabled, notionLegacyDisabledResponse } from "@/lib/sales/notion-legacy-guard"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const DB_JP = process.env.NOTION_COMPANIES_DB_ID ?? "8cbab1f501144f83872c1738ce3e79c4"
const DB_GLOBAL = process.env.NOTION_COMPANIES_DB_VIEW_ID ?? "35fa2b78-f3fc-8107-aa0b-f28694e1009c"

export async function POST(req: NextRequest) {
  if (!isNotionLegacySyncEnabled()) return notionLegacyDisabledResponse()

  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  const body = (await req.json().catch((e) => {
    console.error("[sync-companies-from-notion] invalid JSON body:", e)
    return {}
  })) as { region?: string }
  const region: Region = isValidRegion(body.region ?? "") ? (body.region as Region) : "jp"
  const dbId =
    region === "jp"
      ? process.env.NOTION_DB_COMPANIES_JP ?? DB_JP
      : process.env.NOTION_DB_COMPANIES_GLOBAL ?? DB_GLOBAL

  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 })

  // Notion 全件取得 (cursor pagination 対応・最大 2000 件)
  const q = await notionQueryDatabaseAll(dbId, undefined, 100, 20)
  if (!q.ok || !q.data) {
    return NextResponse.json({ ok: false, error: `Notion query failed: ${q.error}` }, { status: 500 })
  }
  const seen = new Set<string>()
  const rows = q.data.results.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))

  let updated = 0
  let created = 0
  let enrichTriggered = 0
  let skipped = 0
  const errors: { notion_page_id: string; reason: string }[] = []

  // Batch preload existing companies by domain (N+1 prevention)
  const candidateDomains = rows
    .map((r) => {
      const props = r.properties
      const raw = extractProperty(props, "ドメイン") || extractProperty(props, "Website") || extractProperty(props, "Domain") || extractProperty(props, "URL")
      return normalizeDomain(typeof raw === "string" ? raw : null)
    })
    .filter((d): d is string => d !== null && d !== undefined && d.length > 0)
  const existingMap = await batchFindExistingByDomains(candidateDomains)

  for (const row of rows) {
    const props = row.properties

    // 共通抽出
    const name =
      extractProperty(props, "企業名") ||
      extractProperty(props, "会社名") ||
      extractProperty(props, "Company") ||
      extractProperty(props, "Name")
    const domain = normalizeDomain(
      extractProperty(props, "ドメイン") ||
        extractProperty(props, "Website") ||
        extractProperty(props, "Domain") ||
        extractProperty(props, "URL"),
    )
    const dealStageRaw = extractProperty(props, "商談ステージ") || extractProperty(props, "Deal Stage")
    const memo = extractProperty(props, "メモ") || extractProperty(props, "Notes")
    const followUp = extractProperty(props, "フォローアップ日") || extractProperty(props, "Follow-up Date")
    const industryRaw = extractProperty(props, "業種") || extractProperty(props, "Industry")
    const prefecture = extractProperty(props, "都道府県") || extractProperty(props, "Country")
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
    const slugRaw = extractProperty(props, "slug (URL)") || extractProperty(props, "Slug")
    const industry: Industry | null =
      typeof industryRaw === "string" && isValidIndustry(industryRaw) ? industryRaw : null

    // 既存判定: domain Map (batch preload) → name_key fallback
    const nameKey = normalizeCompanyName(typeof name === "string" ? name : null)
    const existing = domain ? (existingMap.get(domain) ?? null) : null

    if (existing) {
      // ── 既存: 編集可フィールドのみ反映 ──
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (typeof dealStageRaw === "string" && isValidDealStage(dealStageRaw)) update.deal_stage = dealStageRaw
      if (typeof memo === "string") update.memo = memo
      if (typeof followUp === "string") update.follow_up_date = followUp
      if (industry) update.industry = industry
      if (typeof prefecture === "string") update.prefecture = prefecture
      const nextSlug =
        typeof slugRaw === "string" && slugRaw.trim()
          ? slugRaw.trim()
          : domain && typeof name === "string" && name
            ? buildCompanySlug(name, domain)
            : existing.slug
      if (nextSlug) {
        update.slug = nextSlug
        update.report_url = buildReportUrl(reportLocale, nextSlug)
      }
      update.meta = {
        ...(existing.meta ?? {}),
        routing: {
          ...(((existing.meta ?? {}).routing as Record<string, unknown> | undefined) ?? {}),
          report_locale: reportLocale,
          target_country: targetCountry,
          template_variant: templateVariant,
          report_url: nextSlug ? buildReportUrl(reportLocale, nextSlug) : existing.report_url,
        },
      }
      if (!existing.notion_page_id) update.notion_page_id = row.id // domain 一致なら紐付け
      const { error } = await sb.from(DB_TABLES.SALES_COMPANIES).update(update).eq("id", existing.id)
      if (error) errors.push({ notion_page_id: row.id, reason: error.message })
      else updated++
      continue
    }

    // ── 新規: domain があれば作成 + enrich 発火 ──
    if (!domain) {
      skipped++
      continue
    }
    const companyName = typeof name === "string" && name ? name : domain
    const result = await upsertCompanyByDomain({
      domain,
      company_name: companyName,
      region,
      industry,
      prefecture: typeof prefecture === "string" ? prefecture : null,
      report_locale: reportLocale,
      target_country: targetCountry,
      template_variant: templateVariant,
      slug:
        typeof slugRaw === "string" && slugRaw.trim()
          ? slugRaw.trim()
          : buildCompanySlug(companyName, domain),
      pipeline_status: "scanning",
      source: "notion_csv",
      meta: { notion_origin: row.id, created_via: "notion_sync", received_at: new Date().toISOString() },
    })
    if (!result.ok || !result.company) {
      errors.push({ notion_page_id: row.id, reason: result.error ?? "create failed" })
      continue
    }
    created++
    await setNotionPageId(result.company.id, row.id)

    // 🚀 30+ API enrich pipeline (fire-and-forget) → カルテ生成
    enrichTriggered++
    void enrichFromContact({
      email: `info@${domain}`,
      company: companyName,
      message: "Notion CSV import",
      source: "notion_csv",
    }).catch((e) => console.error(`[sync-from-notion] enrich ${domain} failed:`, e))
  }

  return NextResponse.json({
    ok: true,
    region,
    total: rows.length,
    updated,
    created,
    enrich_triggered: enrichTriggered,
    skipped,
    errors_count: errors.length,
    errors: errors.slice(0, 10),
    note: "既存=編集フィールド反映 / 新規(domain有)=作成+enrich発火。新規は数分でカルテ完成。cursor 非対応のため1回最大100件。",
  })
}
