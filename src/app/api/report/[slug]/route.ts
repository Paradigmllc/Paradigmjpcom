/**
 * /api/report/[slug] — 公開診断レポート API (paradigmjp.com)
 *
 * 設計メモ:
 *   - appexx.me と同じ `diagnostic_reports` テーブルを共有（Supabase 1個）
 *   - paradigmjp.com はマーケ面/多言語レンダラー、appexx.me は営業DB/トラッキング
 *   - ビュー数・HOT判定・滞在時間は両サイトのアクセスを合算して信頼度を上げる
 *   - Slack通知はハブ（appexx.me）に集約したいが、/report/{token} の一次閲覧が
 *     こちら側で発生するため、初回 HOT 検出時だけここからも打つ（冪等ガード付き）
 */

import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const db = getServiceSupabase()
    if (!db) {
      return NextResponse.json({ error: "server_not_configured" }, { status: 500 })
    }

    const { data: report, error } = await db
      .from("diagnostic_reports")
      .select("*")
      .eq("token", slug)
      .eq("status", "active")
      .single()

    if (error || !report) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    if (report.expires_at && new Date(report.expires_at) < new Date()) {
      return NextResponse.json({ error: "expired" }, { status: 410 })
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("cf-connecting-ip") ||
      "unknown"
    const viewerIps = Array.isArray(report.viewer_ips) ? report.viewer_ips : []
    const isNewViewer = !viewerIps.includes(ip)
    const nextViewCount = (report.view_count || 0) + 1
    const justBecameHot = nextViewCount >= 3 && !report.is_hot

    await db
      .from("diagnostic_reports")
      .update({
        view_count: nextViewCount,
        unique_views: isNewViewer ? (report.unique_views || 0) + 1 : report.unique_views,
        last_viewed_at: new Date().toISOString(),
        viewer_ips: isNewViewer ? [...viewerIps, ip] : viewerIps,
        is_hot: justBecameHot ? true : report.is_hot,
        hot_detected_at: justBecameHot
          ? new Date().toISOString()
          : report.hot_detected_at,
      })
      .eq("id", report.id)

    if (justBecameHot) {
      try {
        await db.from("notifications").insert({
          type: "hot_lead",
          title: `🔥 HOT LEAD (paradigmjp.com): ${report.business_name}`,
          message: `診断レポートが paradigmjp.com 側で3回閲覧されました。`,
          link: `/sales/leads/${report.lead_id}`,
          read: false,
        })
      } catch (e) {
        console.error("hot_lead notification insert failed:", e)
      }

      const slackToken = process.env.SLACK_BOT_TOKEN
      const slackChannel = process.env.SLACK_CHANNEL || "C0B1JJ1L276"
      if (slackToken) {
        try {
          await fetch("https://slack.com/api/chat.postMessage", {
            method: "POST",
            signal: AbortSignal.timeout(5000),
            headers: {
              Authorization: `Bearer ${slackToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              channel: slackChannel,
              text: `🔥 *HOT LEAD (paradigmjp.com)* — *${report.business_name}* が診断レポートを3回閲覧。\nhttps://appexx.me/sales/leads/${report.lead_id}`,
            }),
          })
        } catch (e) {
          console.error("slack postMessage failed:", e)
        }
      }
    }

    return NextResponse.json({ report })
  } catch (e) {
    console.error("GET /api/report/[slug] failed:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

/**
 * POST /api/report/[slug] — 滞在時間 beacon
 * navigator.sendBeacon 経由で Content-Type が text/plain になる可能性があるため
 * JSON.parse を try-catch で包む。
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const db = getServiceSupabase()
    if (!db) return NextResponse.json({ success: false }, { status: 500 })

    const raw = await request.text()
    let body: { duration_seconds?: number } = {}
    try {
      body = JSON.parse(raw)
    } catch {
      // 無効 beacon は握り潰して 200（beacon は常に投げ捨てで OK）
    }
    const duration = body.duration_seconds

    if (typeof duration === "number" && duration > 0) {
      const { data: report } = await db
        .from("diagnostic_reports")
        .select("id, avg_duration_seconds, view_count, is_hot, lead_id, business_name")
        .eq("token", slug)
        .single()

      if (report) {
        const count = Math.max(1, report.view_count || 1)
        const newAvg = Math.round(
          ((report.avg_duration_seconds || 0) * Math.max(1, count - 1) + duration) /
            count,
        )
        const becameHot = !report.is_hot && duration >= 30

        await db
          .from("diagnostic_reports")
          .update({
            avg_duration_seconds: newAvg,
            is_hot: becameHot ? true : report.is_hot,
            hot_detected_at: becameHot
              ? new Date().toISOString()
              : undefined,
          })
          .eq("id", report.id)

        if (becameHot) {
          try {
            await db.from("notifications").insert({
              type: "hot_lead",
              title: `🔥 HOT (paradigmjp.com): ${report.business_name} ${duration}秒閲覧`,
              message: `診断レポートに ${duration} 秒滞在しました。`,
              link: `/sales/leads/${report.lead_id}`,
              read: false,
            })
          } catch (e) {
            console.error("notification insert failed:", e)
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("POST /api/report/[slug] failed:", e)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
