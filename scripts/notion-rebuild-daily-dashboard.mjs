#!/usr/bin/env node
/**
 * scripts/notion-rebuild-daily-dashboard.mjs 窶・Daily Dashboard 蜀阪ン繝ｫ繝・(URL 菫ｮ豁｣迚・
 *
 * 蠖ｹ蜑ｲ: 譌｢蟄倥・ Sprint 18 daily dashboard 縺ｧ URL anchor 縺檎┌蜉ｹ縺縺｣縺溘・縺ｧ
 *       螳・page URL 縺ｧ蜀咲函謌・ 莉悶・ 3 dashboards 縺ｯ譌｢縺ｫ謌仙粥貂・
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY
if (!NOTION_API_KEY) {
  console.error('NOTION_API_KEY env var must be set')
  process.exit(1)
}
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
  console.log("ｧｹ Smart clear...")
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
  console.log(`  笨・${toDelete.length} blocks deleted`)
}

async function queryCounts() {
  const counts = {}
  const all = await n("POST", `/databases/${DB.leadsJp}/query`, { page_size: 100 })
  counts.leadsJp = all.ok ? all.data.results?.length ?? 0 : 0
  const hot = await n("POST", `/databases/${DB.leadsJp}/query`, {
    filter: { property: "HOT繝ｪ繝ｼ繝・, checkbox: { equals: true } },
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
  console.log("噫 Daily Dashboard 蜀阪ン繝ｫ繝・(URL 菫ｮ豁｣迚・\n")
  await smartClear(DASHBOARD_ID)
  const counts = await queryCounts()

  const blocks = [
    blk.callout(
      [
        T("譛昜ｸ縺ｫ髢九￥逕ｻ髱｢縲・, { bold: true }),
        T(" 莉頑律繧｢繧ｯ繧ｷ繝ｧ繝ｳ縺吶∋縺阪Μ繝ｼ繝峨・蝠・ｫ・・繧ｿ繧ｹ繧ｯ繧・1 逕ｻ髱｢縺ｫ髮・ｴ・・),
      ],
      "笘・・,
      "yellow_background",
    ),
    blk.p(""),

    blk.h2("投 莉頑律縺ｮ KPI"),
    blk.columns(
      [blk.kpiCard("邱上Μ繝ｼ繝・, String(counts.leadsJp), "識", "blue")],
      [blk.kpiCard("櫨 HOT", String(counts.leadsJpHot), "櫨", "red")],
      [blk.kpiCard("繧｢繧ｯ繝・ぅ繝夜｡ｧ螳｢", String(counts.customersJp), "召", "green")],
      [blk.kpiCard("繝・Φ繝励Ξ險・, String(counts.templatesJp + counts.templatesGl), "統", "purple")],
    ),
    blk.p(""),

    blk.h2("識 莉頑律縺ｮ蜍輔″"),
    blk.columns(
      [
        blk.h3("識 蝠・ｫ・ヱ繧､繝励Λ繧､繝ｳ", "blue"),
        blk.callout("Notion UI 縺ｧ縲後・繝ｼ繝峨貢iew 竊・繧ｰ繝ｫ繝ｼ繝怜喧縲悟膚隲・せ繝・・繧ｸ縲崎ｨｭ螳壹〒 Kanban 蛹匁耳螂ｨ", "庁", "gray_background"),
        blk.linkedDb(DB.leadsJp),
      ],
      [
        blk.h3("到 譛霑代・繧｢繧ｯ繝・ぅ繝薙ユ繧｣", "green"),
        blk.callout("譛譁ｰ 20 莉ｶ sort: 逋ｺ逕滓律譎・竊・髯埼・, "庁", "gray_background"),
        blk.linkedDb(DB.activities),
      ],
    ),
    blk.p(""),

    blk.h2("套 莉頑律縺ｨ莉企ｱ"),
    blk.columns(
      [
        blk.h3("套 莉頑律縺ｮ蝠・ｫ・, "orange"),
        blk.callout("Notion UI 縺ｧ縲後き繝ｬ繝ｳ繝繝ｼ縲貢iew 竊・譛滄俣繝励Ο繝代ユ繧｣縲碁幕蟋区律譎ゅ・, "庁", "gray_background"),
        blk.linkedDb(DB.calendar),
      ],
      [
        blk.h3("搭 莉企ｱ繝輔か繝ｭ繝ｼ繧｢繝・・", "red"),
        blk.callout("Notion UI 縺ｧ filter: 繝輔か繝ｭ繝ｼ繧｢繝・・譌･ 蜀・竊・驕主悉/譛ｪ譚･ 7 譌･", "庁", "gray_background"),
        blk.linkedDb(DB.leadsJp),
      ],
    ),
    blk.p(""),

    blk.h2("笞｡ 繧ｯ繧､繝・け繧｢繧ｯ繧ｷ繝ｧ繝ｳ"),
    blk.columns(
      [blk.action("+ 譁ｰ隕上Μ繝ｼ繝芽ｿｽ蜉", `https://www.notion.so/${DB.leadsJp.replace(/-/g, "")}`, "識", "blue")],
      [blk.action("+ 豢ｻ蜍輔Ο繧ｰ霑ｽ蜉", `https://www.notion.so/${DB.activities.replace(/-/g, "")}`, "到", "green")],
      [blk.action("+ 蝠・ｫ・ｺ育ｴ・ｿｽ蜉", `https://www.notion.so/${DB.calendar.replace(/-/g, "")}`, "套", "orange")],
      [blk.action("+ 螂醍ｴ・嶌菴懈・", `https://www.notion.so/${DB.contracts.replace(/-/g, "")}`, "塘", "purple")],
    ),
    blk.p(""),

    blk.divider(),
    blk.h2("醇 逶ｴ霑代・謌先棡"),
    blk.columns(
      [
        blk.h3("笨・謌千ｴ・ｸ医Μ繝ｼ繝・, "green"),
        blk.callout("filter: 蝠・ｫ・せ繝・・繧ｸ=謌千ｴ・・譛滄俣=驕主悉 30 譌･", "庁", "gray_background"),
        blk.linkedDb(DB.leadsJp),
      ],
      [
        blk.h3("櫨 繝帙ャ繝医ユ繝ｳ繝励Ξ", "red"),
        blk.callout("sort: 菴ｿ逕ｨ蝗樊焚 竊・髯埼・, "庁", "gray_background"),
        blk.linkedDb(DB.templatesJp),
      ],
    ),
    blk.p(""),

    blk.divider(),
    blk.h2("迫 莉悶・繝繝・す繝･繝懊・繝峨∈"),
    blk.columns(
      [
        blk.callout(
          [linkT("識 Pipeline Manager", `https://www.notion.so/${PAGES.pipeline.replace(/-/g, "")}`), T("\n蝠・ｫ・せ繝・・繧ｸ蛻･ Kanban", { color: "gray" })],
          "識",
          "purple_background",
        ),
      ],
      [
        blk.callout(
          [linkT("腸 Revenue Dashboard", `https://www.notion.so/${PAGES.revenue.replace(/-/g, "")}`), T("\nMRR/LTV/螂醍ｴ・寔險・, { color: "gray" })],
          "腸",
          "green_background",
        ),
      ],
      [
        blk.callout(
          [linkT("到 Activity Hub", `https://www.notion.so/${PAGES.activity.replace(/-/g, "")}`), T("\n蜈ｨ豢ｻ蜍・feed", { color: "gray" })],
          "到",
          "orange_background",
        ),
      ],
    ),
  ]

  console.log(`統 Appending ${blocks.length} blocks...`)
  for (let i = 0; i < blocks.length; i += 90) {
    const chunk = blocks.slice(i, i + 90)
    const r = await n("PATCH", `/blocks/${DASHBOARD_ID}/children`, { children: chunk })
    if (!r.ok) {
      console.error("笶・, JSON.stringify(r.data).slice(0, 400))
      process.exit(1)
    }
  }
  console.log(`\n笨・Daily Dashboard 蜀阪ン繝ｫ繝牙ｮ御ｺ・
  KPI: leads ${counts.leadsJp} / HOT ${counts.leadsJpHot} / customers ${counts.customersJp} / templates ${counts.templatesJp + counts.templatesGl}
  桃 https://www.notion.so/${DASHBOARD_ID.replace(/-/g, "")}`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
