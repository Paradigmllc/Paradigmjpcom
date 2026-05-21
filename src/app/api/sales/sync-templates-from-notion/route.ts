/**
 * POST /api/sales/sync-templates-from-notion — Sprint 16 Notion テンプレ編集 → Supabase 反映
 *
 * 役割: Notion テンプレ DB を full sync して Supabase sales_templates に upsert.
 *       営業担当者が Notion で文面を編集すると、cron (5min) で本番 /report/[slug] に反映.
 *
 * 認証: X-Webhook-Secret 必須 (n8n cron or 手動 trigger)
 *
 * Body: { db_id?: string, region?: "jp"|"global" }
 *   - db_id 未指定: 環境変数 NOTION_DB_TEMPLATES_JP / NOTION_DB_TEMPLATES_GLOBAL から取得
 *   - region 未指定: jp default
 *
 * 出力: { ok, synced, errors, total }
 *
 * 運用フロー (5min cron で自動・人間介在ゼロ):
 *   1. 営業担当が Notion テンプレ DB で headline / pain / fear / loss / cta を編集
 *   2. cron が 5min ごとに本 endpoint を叩く
 *   3. 全テンプレを取得 → notion_page_id で upsert
 *   4. /report/[slug] が次回 SSR (revalidate=60s) で新文面表示
 *   5. 編集から最大 6 分で本番反映
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { notionQueryDatabase, extractProperty } from "@/lib/notion"
import { upsertTemplateFromNotion } from "@/lib/sales/templates"
import {
  normalizeReportLocale,
  normalizeTargetCountry,
  normalizeTemplateVariant,
} from "@/lib/sales/routing"
import {
  isValidIndustry,
  isValidIssueCode,
  isValidRegion,
  type Region,
} from "@/lib/sales/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const DEFAULT_DB_JP = "115e2b0e79424bb0813fc05402096f95" // 既存テンプレ DB (ja)
// グローバル版 DB はあとで作成・env から取得

export async function POST(req: NextRequest) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  let body: { db_id?: string; region?: string }
  try {
    body = (await req.json().catch(() => ({}))) as { db_id?: string; region?: string }
  } catch {
    body = {}
  }
  const region: Region = isValidRegion(body.region ?? "") ? (body.region as Region) : "jp"
  const dbId =
    body.db_id ??
    (region === "jp"
      ? process.env.NOTION_DB_TEMPLATES_JP ?? DEFAULT_DB_JP
      : process.env.NOTION_DB_TEMPLATES_GLOBAL ?? "")

  if (!dbId) {
    return NextResponse.json(
      {
        ok: false,
        error: `Notion templates DB not configured for region=${region}. Set NOTION_DB_TEMPLATES_${region.toUpperCase()} env or pass db_id in body.`,
      },
      { status: 400 },
    )
  }

  // ───── 全ページを cursor で fetch ─────
  const allRows: Array<{
    id: string
    properties: Record<string, unknown>
    last_edited_time: string
  }> = []
  let cursor: string | undefined = undefined
  let pageCount = 0
  do {
    const r = await notionQueryDatabase(dbId, undefined, 100)
    if (!r.ok || !r.data) {
      return NextResponse.json(
        { ok: false, error: `Notion query failed: ${r.error}` },
        { status: 500 },
      )
    }
    allRows.push(...r.data.results)
    cursor = r.data.has_more ? r.data.next_cursor ?? undefined : undefined
    pageCount++
    if (pageCount > 20) break // safety: max 2000 件
  } while (cursor)

  // ───── 各行を Supabase upsert ─────
  let synced = 0
  const errors: { notion_page_id: string; reason: string }[] = []

  for (const row of allRows) {
    const props = row.properties
    const template_name = extractProperty(props, "テンプレ名") as string | null
    const industry = extractProperty(props, "業種") as string | null
    const issue_code = extractProperty(props, "課題コード") as string | null
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
    const severity = extractProperty(props, "重要度") as string | null
    const headline = extractProperty(props, "headline") as string | null
    const pain = extractProperty(props, "pain") as string | null
    const fear = extractProperty(props, "fear") as string | null
    const loss = extractProperty(props, "loss") as string | null
    const cta_text = extractProperty(props, "cta_text") as string | null
    const is_active = extractProperty(props, "有効")

    if (!template_name) {
      errors.push({ notion_page_id: row.id, reason: "テンプレ名 missing" })
      continue
    }
    // Notion select 値は日本語ラベル (美容室 / 歯科医院 等) の可能性あり → 内部コードへ map
    const industryCode = mapIndustryLabel(industry ?? "")
    const issueCodeNormalized = mapIssueLabel(issue_code ?? "")

    if (!industryCode || !isValidIndustry(industryCode)) {
      errors.push({
        notion_page_id: row.id,
        reason: `invalid industry: ${industry}`,
      })
      continue
    }
    if (!issueCodeNormalized || !isValidIssueCode(issueCodeNormalized)) {
      errors.push({
        notion_page_id: row.id,
        reason: `invalid issue_code: ${issue_code}`,
      })
      continue
    }

    const severityNormalized: "critical" | "warning" | "info" =
      severity === "critical" || severity === "warning" || severity === "info"
        ? (severity as "critical" | "warning" | "info")
        : "warning"

    const result = await upsertTemplateFromNotion({
      notion_page_id: row.id,
      region,
      template_variant: templateVariant,
      report_locale: reportLocale,
      target_country: targetCountry,
      template_name,
      industry: industryCode,
      issue_code: issueCodeNormalized,
      severity: severityNormalized,
      headline,
      pain,
      fear,
      loss,
      cta_text,
      is_active: typeof is_active === "boolean" ? is_active : true,
    })

    if (!result.ok) {
      errors.push({ notion_page_id: row.id, reason: result.error ?? "upsert failed" })
    } else {
      synced++
    }
  }

  return NextResponse.json({
    ok: true,
    region,
    total: allRows.length,
    synced,
    errors_count: errors.length,
    errors: errors.slice(0, 10),
    note: `Templates sync'd. /report/[slug] will reflect changes in next SSR (revalidate=60s).`,
  })
}

/* ───── Notion select 日本語ラベル → 内部 industry コード ───── */
function mapIndustryLabel(label: string): string | null {
  const map: Record<string, string> = {
    美容室: "beauty_salon",
    beauty_salon: "beauty_salon",
    歯科医院: "dental",
    dental: "dental",
    飲食店: "restaurant",
    restaurant: "restaurant",
    建設業: "construction",
    工務店: "construction",
    construction: "construction",
    会計事務所: "accounting",
    accounting: "accounting",
    小売店: "retail",
    retail: "retail",
    清掃業: "cleaning",
    清掃業者: "cleaning",
    cleaning: "cleaning",
    コンサル業: "consulting",
    コンサル会社: "consulting",
    consulting: "consulting",
  }
  return map[label] ?? null
}

/* ───── issue label normalize (Notion 側に同名で OK・safety) ───── */
function mapIssueLabel(label: string): string | null {
  const valid = [
    "speed_critical",
    "ua_残存",
    "ssl_expired",
    "wp_outdated",
    "no_ogp",
    "no_sns",
    "copyright_old",
  ]
  return valid.includes(label) ? label : null
}
