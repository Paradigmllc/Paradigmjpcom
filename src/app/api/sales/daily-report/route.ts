import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { notifySlack } from "@/lib/notify"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { runJapanOperatorAutomation } from "@/lib/sales/japan-operator-automation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 })

  try {
    const operatorAutomation = await runJapanOperatorAutomation().catch((error) => {
      console.error("[daily-report] Japan operator automation failed:", error)
      return null
    })
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000).toISOString()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString()

    // New companies in last 24h
    const { count: newToday } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("*", { count: "exact", head: true })
      .gte("created_at", dayAgo)

    // Companies enriched in last 24h
    const { count: enrichedToday } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("*", { count: "exact", head: true })
      .gte("updated_at", dayAgo)
      .eq("pipeline_status", "report_ready")

    // Companies with report_ready status
    const { count: reportReady } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("*", { count: "exact", head: true })
      .eq("pipeline_status", "report_ready")

    // Pipeline runs in last 24h
    const { count: pipelineToday } = await sb
      .from(DB_TABLES.SALES_PIPELINE_RUNS)
      .select("*", { count: "exact", head: true })
      .gte("created_at", dayAgo)

    // Enrichment jobs queued
    const { count: jobsQueued } = await sb
      .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
      .select("*", { count: "exact", head: true })
      .eq("status", "queued")

    // Lead batches this week
    const { data: batches } = await sb
      .from(DB_TABLES.SALES_LEAD_BATCHES)
      .select("name, item_count, status")
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: false })
      .limit(5)

    const reportLines = [
      `*📊 Twenty Sales OS 日次レポート — ${now.toLocaleDateString("ja-JP")}*`,
      ``,
      `*サマリー*`,
      `🆕 新規リード (24h): ${newToday ?? 0}件`,
      `✅ エンリッチ完了 (24h): ${enrichedToday ?? 0}件`,
      `📋 レポート準備完了: ${reportReady ?? 0}件`,
      `🔄 パイプライン実行 (24h): ${pipelineToday ?? 0}件`,
      `⏳ エンリッチ待ち: ${jobsQueued ?? 0}件`,
    ]

    if (batches && batches.length > 0) {
      reportLines.push(``, `*今週のリードバッチ*`)
      for (const b of batches) {
        reportLines.push(`• ${b.name}: ${b.item_count ?? 0}件 (${b.status})`)
      }
    }

    reportLines.push(``, `🔗 https://twenty.paradigmjp.com`)

    await notifySlack(reportLines.join("\n"))

    return NextResponse.json({
      ok: true,
      report: { newToday: newToday ?? 0, enrichedToday: enrichedToday ?? 0, reportReady: reportReady ?? 0, pipelineToday: pipelineToday ?? 0, jobsQueued: jobsQueued ?? 0 },
      operatorAutomation,
      slackSent: true,
    })
  } catch (e) {
    console.error("[daily-report] failed:", e)
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Report generation failed" }, { status: 500 })
  }
}
