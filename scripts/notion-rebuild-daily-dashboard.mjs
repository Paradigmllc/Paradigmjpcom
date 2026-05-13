#!/usr/bin/env node
/**
 * scripts/notion-rebuild-daily-dashboard.mjs — Daily Dashboard 再ビルド (URL 修正版)
 *
 * 役割: 既存の Sprint 18 daily dashboard で URL anchor が無効だったので
 *       実 page URL で再生成. 他の 3 dashboards は既に成功済.
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY ?? "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"
const DASHBOARD_ID = "35fa2b78-f3fc-81d0-b842-c0ed182103dc"

const DB = {
  leadsJp: "8cbab1f501144f83872c1738ce3e79c4",
  customersJp: "86b1d93e3b854862ae7b2750d2585677",
  templatesJp: "115e2b0e79424bb0813fc05402096f95",
  templatesGl: "35fa2b78-f3fc-817f-8e05-ca06234adac4",
  activities: "35fa2b78-f3fc-81ae-99b6-cc9cfa653791",
  calendar: "35fa2b78-f3fc-81c7-91a2-eb80274298aa",
  contracts: "35fa2b78-f3fc-81fc-bb0a-f3880172557d",
}

const PAGES = {
  pipeline: "35fa2b78-f3fc-81c0-a376-d292a748d066",
  revenue: "35fa2b78-f3fc-8125-a0b4-cea00429681d",
  activity: "35fa2b78-f3fc-817c-9cf4-f2f5fd17ae71",
}

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
  return { ok: res.ok, data }
}

const T = (content, opts = {}) => {
  const ann = {}
  if (opts.bold) ann.bold = true
  if (opts.italic) ann.italic = true
  if (opts.code) ann.code = true
  if (opts.color) ann.color = opts.color
  return Object.keys(ann).length
    ? { type: "text", text: { content }, annotations: ann }
    : { type: "text", text: { content } }
}
const linkT = (content, url) => ({ type: "text", text: { content, link: { url } } })

const blk = {
  h1: (t, c) => ({ object: "block", type: "heading_1", heading_1: { rich_text: [T(t)], color: c ?? "default" } }),
  h2: (t, c) => ({ object: "block", type: "heading_2", heading_2: { rich_text: [T(t)], color: c ?? "default" } }),
  h3: (t, c) => ({ object: "block", type: "heading_3", heading_3: { rich_text: [T(t)], color: c ?? "default" } }),
  p: (t) => ({ object: "block", type: "paragraph", paragraph: { rich_text: Array.isArray(t) ? t : [T(t)] } }),
  callout: (text, emoji, color = "default") => ({
    object: "block",
    type: "callout",
    callout: { rich_text: Array.isArray(text) ? text : [T(text)], icon: { type: "emoji", emoji }, color },
  }),
  divider: () => ({ object: "block", type: "divider", divider: {} }),
  toc: () => ({ object: "block", type: "table_of_contents", table_of_contents: { color: "default" } }),
  linkedDb: (id) => ({ object: "block", type: "link_to_page", link_to_page: { type: "database_id", database_id: id } }),
  columns: (...cols) => ({
    object: "block",
    type: "column_list",
    column_list: {
      children: cols.map((children) => ({
        object: "block",
        type: "column",
        column: { children: children.filter(Boolean) },
      })),
    },
  }),
  kpiCard: (label, value, emoji, color = "default") => ({
    object: "block",
    type: "callout",
    callout: {
      rich_text: [T(`${value}\n`, { bold: true, color }), T(label, { color: "gray" })],
      icon: { type: "emoji", emoji },
      color: `${color}_background`,
    },
  }),
  action: (label, url, emoji, color = "blue") => ({
    object: "block",
    type: "callout",
    callout: {
      rich_text: [linkT(label, url)],
      icon: { type: "emoji", emoji },
      color: `${color}_background`,
    },
  }),
}

const SAFE_TO_DELETE = new Set([
  "paragraph", "heading_1", "heading_2", "heading_3",
  "callout", "bulleted_list_item", "numbered_list_item",
  "toggle", "divider", "link_to_page",
  "table_of_contents", "column_list", "quote", "code",
])

async function smartClear(pageId) {
  console.log("🧹 Smart clear...")
  let cursor
  const toDelete = []
  do {
    const r = await n("GET", `/blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`)
    if (!r.ok) break
    for (const b of r.data.results || []) {
      if (SAFE_TO_DELETE.has(b.type)) toDelete.push(b.id)
    }
    cursor = r.data.has_more ? r.data.next_cursor : undefined
  } while (cursor)
  for (const id of toDelete) await n("DELETE", `/blocks/${id}`)
  console.log(`  ✅ ${toDelete.length} blocks deleted`)
}

async function queryCounts() {
  const counts = {}
  const all = await n("POST", `/databases/${DB.leadsJp}/query`, { page_size: 100 })
  counts.leadsJp = all.ok ? all.data.results?.length ?? 0 : 0
  const hot = await n("POST", `/databases/${DB.leadsJp}/query`, {
    filter: { property: "HOTリード", checkbox: { equals: true } },
    page_size: 100,
  })
  counts.leadsJpHot = hot.ok ? hot.data.results?.length ?? 0 : 0
  const cus = await n("POST", `/databases/${DB.customersJp}/query`, { page_size: 100 })
  counts.customersJp = cus.ok ? cus.data.results?.length ?? 0 : 0
  const tj = await n("POST", `/databases/${DB.templatesJp}/query`, { page_size: 100 })
  counts.templatesJp = tj.ok ? tj.data.results?.length ?? 0 : 0
  const tg = await n("POST", `/databases/${DB.templatesGl}/query`, { page_size: 100 })
  counts.templatesGl = tg.ok ? tg.data.results?.length ?? 0 : 0
  return counts
}

async function main() {
  console.log("🚀 Daily Dashboard 再ビルド (URL 修正版)\n")
  await smartClear(DASHBOARD_ID)
  const counts = await queryCounts()

  const blocks = [
    blk.callout(
      [
        T("朝一に開く画面。", { bold: true }),
        T(" 今日アクションすべきリード・商談・タスクを 1 画面に集約。"),
      ],
      "☀️",
      "yellow_background",
    ),
    blk.p(""),

    blk.h2("📊 今日の KPI"),
    blk.columns(
      [blk.kpiCard("総リード", String(counts.leadsJp), "🎯", "blue")],
      [blk.kpiCard("🔥 HOT", String(counts.leadsJpHot), "🔥", "red")],
      [blk.kpiCard("アクティブ顧客", String(counts.customersJp), "🏢", "green")],
      [blk.kpiCard("テンプレ計", String(counts.templatesJp + counts.templatesGl), "📝", "purple")],
    ),
    blk.p(""),

    blk.h2("🎯 今日の動き"),
    blk.columns(
      [
        blk.h3("🎯 商談パイプライン", "blue"),
        blk.callout("Notion UI で「ボード」view → グループ化「商談ステージ」設定で Kanban 化推奨", "💡", "gray_background"),
        blk.linkedDb(DB.leadsJp),
      ],
      [
        blk.h3("📞 最近のアクティビティ", "green"),
        blk.callout("最新 20 件 sort: 発生日時 ↓ 降順", "💡", "gray_background"),
        blk.linkedDb(DB.activities),
      ],
    ),
    blk.p(""),

    blk.h2("📅 今日と今週"),
    blk.columns(
      [
        blk.h3("📅 今日の商談", "orange"),
        blk.callout("Notion UI で「カレンダー」view → 期間プロパティ「開始日時」", "💡", "gray_background"),
        blk.linkedDb(DB.calendar),
      ],
      [
        blk.h3("📋 今週フォローアップ", "red"),
        blk.callout("Notion UI で filter: フォローアップ日 内 → 過去/未来 7 日", "💡", "gray_background"),
        blk.linkedDb(DB.leadsJp),
      ],
    ),
    blk.p(""),

    blk.h2("⚡ クイックアクション"),
    blk.columns(
      [blk.action("+ 新規リード追加", `https://www.notion.so/${DB.leadsJp.replace(/-/g, "")}`, "🎯", "blue")],
      [blk.action("+ 活動ログ追加", `https://www.notion.so/${DB.activities.replace(/-/g, "")}`, "📞", "green")],
      [blk.action("+ 商談予約追加", `https://www.notion.so/${DB.calendar.replace(/-/g, "")}`, "📅", "orange")],
      [blk.action("+ 契約書作成", `https://www.notion.so/${DB.contracts.replace(/-/g, "")}`, "📄", "purple")],
    ),
    blk.p(""),

    blk.divider(),
    blk.h2("🏆 直近の成果"),
    blk.columns(
      [
        blk.h3("✅ 成約済リード", "green"),
        blk.callout("filter: 商談ステージ=成約・期間=過去 30 日", "💡", "gray_background"),
        blk.linkedDb(DB.leadsJp),
      ],
      [
        blk.h3("🔥 ホットテンプレ", "red"),
        blk.callout("sort: 使用回数 ↓ 降順", "💡", "gray_background"),
        blk.linkedDb(DB.templatesJp),
      ],
    ),
    blk.p(""),

    blk.divider(),
    blk.h2("🔗 他のダッシュボードへ"),
    blk.columns(
      [
        blk.callout(
          [linkT("🎯 Pipeline Manager", `https://www.notion.so/${PAGES.pipeline.replace(/-/g, "")}`), T("\n商談ステージ別 Kanban", { color: "gray" })],
          "🎯",
          "purple_background",
        ),
      ],
      [
        blk.callout(
          [linkT("💰 Revenue Dashboard", `https://www.notion.so/${PAGES.revenue.replace(/-/g, "")}`), T("\nMRR/LTV/契約集計", { color: "gray" })],
          "💰",
          "green_background",
        ),
      ],
      [
        blk.callout(
          [linkT("📞 Activity Hub", `https://www.notion.so/${PAGES.activity.replace(/-/g, "")}`), T("\n全活動 feed", { color: "gray" })],
          "📞",
          "orange_background",
        ),
      ],
    ),
  ]

  console.log(`📝 Appending ${blocks.length} blocks...`)
  for (let i = 0; i < blocks.length; i += 90) {
    const chunk = blocks.slice(i, i + 90)
    const r = await n("PATCH", `/blocks/${DASHBOARD_ID}/children`, { children: chunk })
    if (!r.ok) {
      console.error("❌", JSON.stringify(r.data).slice(0, 400))
      process.exit(1)
    }
  }
  console.log(`\n✅ Daily Dashboard 再ビルド完了:
  KPI: leads ${counts.leadsJp} / HOT ${counts.leadsJpHot} / customers ${counts.customersJp} / templates ${counts.templatesJp + counts.templatesGl}
  📍 https://www.notion.so/${DASHBOARD_ID.replace(/-/g, "")}`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
