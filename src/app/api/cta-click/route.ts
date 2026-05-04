import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getDB() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// POST /api/cta-click — CTAボタンクリック → HOT LEAD化 + 通知
export async function POST(request: Request) {
  try {
    const { prospect_id, slug, action, contact } = await request.json()
    const db = getDB()
    if (!db) return NextResponse.json({ error: "DB未設定" }, { status: 500 })

    // prospect更新
    const { data: prospect } = await db.from("prospects")
      .update({ status: "hot_lead", cta_clicked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq(slug ? "slug" : "id", slug || prospect_id)
      .select("id, business_name, slug, lead_id")
      .single()

    if (!prospect) return NextResponse.json({ error: "not found" }, { status: 404 })

    const actionLabels: Record<string, string> = {
      consult: "📅 オンライン相談を予約",
      chat: "💬 チャットで相談を開始",
      docs_request: "📄 資料請求",
    }
    const actionLabel = actionLabels[action] || "CTAクリック"

    // prospect_viewsに記録
    await db.from("prospect_views").insert({
      prospect_id: prospect.id, slug: prospect.slug, cta_clicked: true,
    })

    // leads更新
    if (contact?.email && prospect.lead_id) {
      try {
        await db.from("leads").update({
          email: contact.email,
          phone: contact.phone || undefined,
          pipeline_stage: "hot",
          updated_at: new Date().toISOString(),
        }).eq("id", prospect.lead_id)
      } catch { /* ignore */ }
    }

    // DB通知
    const contactInfo = contact?.name ? ` (${contact.name}${contact.email ? ` / ${contact.email}` : ""})` : ""
    await db.from("notifications").insert({
      type: "hot_lead",
      title: `🔥 ${actionLabel}: ${prospect.business_name}`,
      message: `提案ページで「${actionLabel}」がクリックされました${contactInfo}。即座にフォローアップしてください。`,
      link: prospect.lead_id ? `/sales/leads/${prospect.lead_id}` : `/p/${prospect.slug}`,
      read: false,
    })

    // 営業活動ログ
    if (prospect.lead_id) {
      try {
        await db.from("sales_activities").insert({
          lead_id: prospect.lead_id,
          type: "cta_click",
          subject: actionLabel,
          body: `提案ページ(${prospect.slug})で${actionLabel}${contactInfo}`,
        })
      } catch { /* ignore */ }
    }

    // Slack通知
    const slackToken = process.env.SLACK_BOT_TOKEN
    if (slackToken) {
      fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: { "Authorization": `Bearer ${slackToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: process.env.SLACK_CHANNEL || "C0B1JJ1L276",
          text: `🔥 *HOT LEAD — ${actionLabel}*\n*${prospect.business_name}*${contactInfo}\n提案ページ: https://paradigmjp.com/p/${prospect.slug}`,
        }),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
