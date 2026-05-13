#!/usr/bin/env node
/**
 * scripts/notion-create-3-dbs-no-relations.mjs — Sprint 17 3 新 DB (relation 抜き)
 *
 * 役割: Activities / Calendar / Contracts を relation property 抜きで作成.
 *       relation は Notion UI で後から手動で追加 (API の新 data_source 仕様回避).
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY ?? "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"
const PARENT_PAGE_ID = "35fa2b78-f3fc-8129-9d91-e457889ee393"

let lastCall = 0
async function n(method, path, body) {
  const now = Date.now()
  if (now - lastCall < 350) await new Promise((r) => setTimeout(r, 350 - (now - lastCall)))
  lastCall = Date.now()
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`https://api.notion.com/v1${path}`, opts)
  const data = await res.json()
  if (!res.ok) return { ok: false, error: data.message || JSON.stringify(data).slice(0, 200) }
  return { ok: true, data }
}

async function createActivities() {
  console.log("📞 Activities (no relations)...")
  const r = await n("POST", "/databases", {
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "📞" },
    cover: { type: "external", external: { url: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1500&q=80" } },
    title: [{ type: "text", text: { content: "📞 アクティビティログ" } }],
    description: [
      {
        type: "text",
        text: {
          content:
            "Salesforce Activity Timeline 相当。全営業活動 (メール送信/架電/会議/メモ/SMS/LinkedIn/デモ/フォローアップ) を時系列ログ。Supabase sales_activity_log と双方向 sync。relation (リード/顧客) は Notion UI で後追加可。",
        },
      },
    ],
    properties: {
      件名: { title: {} },
      種別: {
        select: {
          options: [
            { name: "email", color: "blue" },
            { name: "call", color: "green" },
            { name: "meeting", color: "purple" },
            { name: "note", color: "default" },
            { name: "sms", color: "yellow" },
            { name: "linkedin", color: "blue" },
            { name: "demo", color: "orange" },
            { name: "follow_up", color: "pink" },
          ],
        },
      },
      地域: {
        select: {
          options: [
            { name: "jp", color: "red" },
            { name: "global", color: "blue" },
          ],
        },
      },
      会社ドメイン: { url: {} },
      顧客名: { rich_text: {} },
      結果: {
        select: {
          options: [
            { name: "success", color: "green" },
            { name: "no_answer", color: "gray" },
            { name: "follow_up", color: "yellow" },
            { name: "declined", color: "red" },
            { name: "completed", color: "blue" },
          ],
        },
      },
      発生日時: { date: {} },
      "所要時間 (分)": { number: {} },
      内容: { rich_text: {} },
      担当者: { people: {} },
      最終更新: { last_edited_time: {} },
    },
  })
  if (r.ok) {
    console.log("  ✅", r.data.id)
    return r.data.id
  }
  console.error("  ❌", r.error?.slice(0, 200))
  return null
}

async function createCalendar() {
  console.log("📅 Calendar (no relations)...")
  const r = await n("POST", "/databases", {
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "📅" },
    cover: { type: "external", external: { url: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=1500&q=80" } },
    title: [{ type: "text", text: { content: "📅 商談カレンダー" } }],
    description: [
      {
        type: "text",
        text: {
          content:
            "cal.com 統合の商談予約 DB。Discovery / Demo / Proposal / Closing の各フェーズ商談を管理。Supabase sales_calendar_events と双方向 sync。",
        },
      },
    ],
    properties: {
      タイトル: { title: {} },
      フェーズ: {
        select: {
          options: [
            { name: "discovery", color: "yellow" },
            { name: "demo", color: "orange" },
            { name: "proposal", color: "blue" },
            { name: "closing", color: "purple" },
            { name: "follow_up", color: "pink" },
            { name: "review", color: "green" },
            { name: "other", color: "default" },
          ],
        },
      },
      地域: {
        select: {
          options: [
            { name: "jp", color: "red" },
            { name: "global", color: "blue" },
          ],
        },
      },
      会社ドメイン: { url: {} },
      顧客名: { rich_text: {} },
      開始日時: { date: {} },
      "cal.com 予約 URL": { url: {} },
      "会議 URL": { url: {} },
      状態: {
        select: {
          options: [
            { name: "scheduled", color: "yellow" },
            { name: "confirmed", color: "blue" },
            { name: "completed", color: "green" },
            { name: "no_show", color: "red" },
            { name: "cancelled", color: "gray" },
            { name: "rescheduled", color: "orange" },
          ],
        },
      },
      参加者: { rich_text: {} },
      結果メモ: { rich_text: {} },
      担当者: { people: {} },
      最終更新: { last_edited_time: {} },
    },
  })
  if (r.ok) {
    console.log("  ✅", r.data.id)
    return r.data.id
  }
  console.error("  ❌", r.error?.slice(0, 200))
  return null
}

async function createContracts() {
  console.log("📄 Contracts (no relations)...")
  const r = await n("POST", "/databases", {
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "📄" },
    cover: { type: "external", external: { url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1500&q=80" } },
    title: [{ type: "text", text: { content: "📄 契約書 DB" } }],
    description: [
      {
        type: "text",
        text: {
          content:
            "Salesforce Contracts + DocuSign 相当。PDF は Cloudflare R2 に保存・Notion は URL リンクのみ。Supabase sales_contracts と双方向 sync。",
        },
      },
    ],
    properties: {
      契約書名: { title: {} },
      契約種別: {
        select: {
          options: [
            { name: "web_build", color: "blue" },
            { name: "meo", color: "green" },
            { name: "dx_ai", color: "purple" },
            { name: "video_sub", color: "orange" },
            { name: "japan_entry", color: "red" },
            { name: "wl_agency", color: "pink" },
            { name: "maintenance", color: "yellow" },
            { name: "other", color: "default" },
          ],
        },
      },
      地域: {
        select: {
          options: [
            { name: "jp", color: "red" },
            { name: "global", color: "blue" },
          ],
        },
      },
      顧客名: { rich_text: {} },
      "金額 (JPY)": { number: { format: "yen" } },
      "金額 (USD)": { number: { format: "dollar" } },
      通貨: {
        select: {
          options: [
            { name: "JPY", color: "red" },
            { name: "USD", color: "blue" },
            { name: "EUR", color: "yellow" },
            { name: "GBP", color: "purple" },
            { name: "CNY", color: "orange" },
            { name: "KRW", color: "pink" },
            { name: "SGD", color: "green" },
          ],
        },
      },
      開始日: { date: {} },
      終了日: { date: {} },
      自動更新: { checkbox: {} },
      "PDF (R2)": { url: {} },
      "DocuSign Envelope": { rich_text: {} },
      状態: {
        select: {
          options: [
            { name: "draft", color: "gray" },
            { name: "sent", color: "yellow" },
            { name: "partially_signed", color: "orange" },
            { name: "signed", color: "blue" },
            { name: "active", color: "green" },
            { name: "expired", color: "red" },
            { name: "cancelled", color: "default" },
            { name: "renewed", color: "purple" },
          ],
        },
      },
      署名者名: { rich_text: {} },
      署名者メール: { email: {} },
      署名日: { date: {} },
      最終更新: { last_edited_time: {} },
    },
  })
  if (r.ok) {
    console.log("  ✅", r.data.id)
    return r.data.id
  }
  console.error("  ❌", r.error?.slice(0, 200))
  return null
}

async function main() {
  const activitiesId = await createActivities()
  const calendarId = await createCalendar()
  const contractsId = await createContracts()

  console.log(`
✅ 3 new DBs created:
  NOTION_DB_ACTIVITIES=${activitiesId ?? "(failed)"}
  NOTION_DB_CALENDAR=${calendarId ?? "(failed)"}
  NOTION_DB_CONTRACTS=${contractsId ?? "(failed)"}

ℹ️ relation プロパティは Notion UI で後追加 (API の data_source 仕様回避):
  📞 アクティビティログ → 紐づくリード (relation→🎯 リード DB)
  📞 アクティビティログ → 紐づく顧客 (relation→🏢 顧客 DB)
  📅 商談カレンダー → 同上
  📄 契約書 DB → 紐づく顧客 (relation→🏢 顧客 DB)
`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
