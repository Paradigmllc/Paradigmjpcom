import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { DB_TABLES } from "@/lib/sales/db-tables"

function getDB() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("[demo-view] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured")
    return null
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

// POST /api/demo-view — 閲覧ビーコン（sendBeacon対応）
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { prospect_id, slug, duration_sec, pattern_id, pattern_name } = body

    const db = getDB()
    if (!db) return NextResponse.json({ ok: false })

    // prospect_viewsに記録
    await db.from(DB_TABLES.PROSPECT_VIEWS).insert({
      prospect_id, slug, duration_sec: duration_sec || 0,
      pattern_id: pattern_id || null,
    })

    // 30秒以上 → 閲覧通知
    if (duration_sec >= 30) {
      const { data: prospect } = await db.from(DB_TABLES.PROSPECTS)
        .select("id, business_name, slug, view_count, lead_id")
        .eq(slug ? "slug" : "id", slug || prospect_id)
        .single()

      if (prospect) {
        // 3回以上閲覧 or 30秒以上滞在 → HOT LEAD化
        const isHot = (prospect.view_count || 0) >= 3 || duration_sec >= 30
        if (isHot) {
          await db.from(DB_TABLES.PROSPECTS).update({ status: "hot_lead", updated_at: new Date().toISOString() }).eq("id", prospect.id)

          await db.from(DB_TABLES.NOTIFICATIONS).insert({
            type: "engagement",
            title: `👀 長時間閲覧: ${prospect.business_name}`,
            message: `提案ページを${duration_sec}秒閲覧${pattern_name ? `（パターン: ${pattern_name}）` : ""}`,
            link: prospect.lead_id ? `/sales/leads/${prospect.lead_id}` : `/p/${prospect.slug}`,
            read: false,
          })

          // Slack通知
          const slackToken = process.env.SLACK_BOT_TOKEN
          if (slackToken) {
            fetch("https://slack.com/api/chat.postMessage", {
              method: "POST",
              headers: { "Authorization": `Bearer ${slackToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                channel: process.env.SLACK_CHANNEL || "C0B1JJ1L276",
                text: `👀 *提案ページ閲覧* — *${prospect.business_name}* が${duration_sec}秒閲覧中\nhttps://paradigmjp.com/p/${prospect.slug}`,
              }),
            })
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[demo-view] POST failed:", e)
    return NextResponse.json({ ok: false })
  }
}
