/**
 * GET/POST /api/sales/weekly-digest — Sprint 11
 *
 * 役割: 過去 7 日間の sales_companies アクティビティを集計し,
 *       Slack に Block Kit で送信する週次ダイジェスト.
 *
 * 認証: X-Webhook-Secret header 必須 (n8n cron / Coolify cron から)
 *
 * 集計内容:
 *   - 🔥 HOT leads (is_hot_lead=true・report_views top 5)
 *   - 🌱 新規リード件数 (created_at >= 7 日前)
 *   - 📊 ステージ別件数 (deal_stage groupby)
 *   - 🎯 課題別件数 (detected_issues unnest groupby・top 5)
 *   - 📍 都道府県別件数 (prefecture groupby・top 5)
 *
 * 呼び方:
 *   curl -X POST -H "X-Webhook-Secret: $SECRET" https://paradigmjp.com/api/sales/weekly-digest
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { notifySlack } from "@/lib/notify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface DigestData {
  weekStart: string
  weekEnd: string
  totalCompanies: number
  newLeads: number
  hotLeads: {
    id: string
    slug: string | null
    company_name: string
    domain: string
    report_views: number
  }[]
  stageCounts: Record<string, number>
  issueCounts: Record<string, number>
  prefectureCounts: Record<string, number>
}

async function collectDigest(): Promise<DigestData | { error: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { error: "Supabase service_role not configured" }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekStart = weekAgo.toISOString()
  const weekEnd = now.toISOString()

  // 並列クエリ
  const [allRes, newRes, hotRes] = await Promise.all([
    sb.from("sales_companies").select("deal_stage, prefecture, detected_issues, created_at"),
    sb
      .from("sales_companies")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekStart),
    sb
      .from("sales_companies")
      .select("id, slug, company_name, domain, report_views")
      .eq("is_hot_lead", true)
      .order("report_views", { ascending: false })
      .limit(5),
  ])

  if (allRes.error) return { error: `all: ${allRes.error.message}` }

  const totalCompanies = allRes.data?.length ?? 0
  const newLeads = newRes.count ?? 0

  /* groupby */
  const stageCounts: Record<string, number> = {}
  const issueCounts: Record<string, number> = {}
  const prefectureCounts: Record<string, number> = {}

  for (const c of allRes.data ?? []) {
    if (c.deal_stage) stageCounts[c.deal_stage] = (stageCounts[c.deal_stage] ?? 0) + 1
    if (c.prefecture) prefectureCounts[c.prefecture] = (prefectureCounts[c.prefecture] ?? 0) + 1
    for (const iss of (c.detected_issues ?? []) as string[]) {
      issueCounts[iss] = (issueCounts[iss] ?? 0) + 1
    }
  }

  return {
    weekStart: weekStart.slice(0, 10),
    weekEnd: weekEnd.slice(0, 10),
    totalCompanies,
    newLeads,
    hotLeads: (hotRes.data ?? []) as DigestData["hotLeads"],
    stageCounts,
    issueCounts,
    prefectureCounts,
  }
}

function buildSlackBlocks(d: DigestData) {
  const top = (obj: Record<string, number>, n: number) =>
    Object.entries(obj)
      .sort(([, a], [, b]) => b - a)
      .slice(0, n)
      .map(([k, v]) => `• ${k}: ${v}`)
      .join("\n") || "(なし)"

  const hotLeadsLines =
    d.hotLeads.length === 0
      ? "今週は HOT lead なし"
      : d.hotLeads
          .map((h, i) => {
            // Sprint 13: slug があれば /report/[slug]・なければ Notion 直リンク
            const link = h.slug
              ? `https://paradigmjp.com/ja/report/${h.slug}`
              : `https://www.notion.so/8cbab1f501144f83872c1738ce3e79c4`
            return `${i + 1}. *<${link}|${h.company_name}>* — ${h.report_views} views`
          })
          .join("\n")

  return [
    {
      type: "header",
      text: { type: "plain_text", text: "📊 Paradigm 営業ダイジェスト (週次)" },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*期間*: ${d.weekStart} ~ ${d.weekEnd}\n*総リード数*: ${d.totalCompanies}\n*今週の新規*: +${d.newLeads}`,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*🔥 HOT Leads (top 5)*\n${hotLeadsLines}` },
    },
    { type: "divider" },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*📊 ステージ別 (top 5)*\n${top(d.stageCounts, 5)}` },
        { type: "mrkdwn", text: `*🎯 検出課題 (top 5)*\n${top(d.issueCounts, 5)}` },
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*📍 都道府県別 (top 5)*\n${top(d.prefectureCounts, 5)}` },
    },
    {
      type: "actions",
      elements: [
        // Sprint 13: 営業ダッシュボードは Notion に集約 (admin 撤廃)
        {
          type: "button",
          text: { type: "plain_text", text: "Notion で開く (リード DB)" },
          url: "https://www.notion.so/8cbab1f501144f83872c1738ce3e79c4",
          style: "primary",
        },
      ],
    },
  ]
}

async function handle(req: NextRequest) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  const d = await collectDigest()
  if ("error" in d) {
    return NextResponse.json({ ok: false, error: d.error }, { status: 500 })
  }

  const text = `📊 Paradigm 週次ダイジェスト: 総 ${d.totalCompanies} 社 / 新規 +${d.newLeads} / HOT ${d.hotLeads.length}`
  const blocks = buildSlackBlocks(d)
  await notifySlack(text, blocks)

  return NextResponse.json({ ok: true, digest: d })
}

export const GET = handle
export const POST = handle
