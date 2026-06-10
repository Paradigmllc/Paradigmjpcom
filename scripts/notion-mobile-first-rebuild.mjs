#!/usr/bin/env node
/**
 * scripts/notion-mobile-first-rebuild.mjs  ESprint 19 抜本実裁E
 *
 * 7 pages めEmobile-first + emoji policy 完�E準拠で rebuild:
 *   1. Parent Hub
 *   2. 📊 営業ダチE��ュボ�EチE(Daily View)
 *   3. 🎯 Pipeline Manager
 *   4. 💰 Revenue Dashboard
 *   5. 📞 Activity Hub
 *   6. 📖 使ぁE��ガイチE
 *   7. 🎓 業種別営業戦略
 *
 * 設訁ERule 8 つ (notion-audit.mjs と一致):
 *   R1: 2 column max
 *   R2: 1 emoji per section (3 block window で重褁ENG)
 *   R3: heading emoji ≠ adjacent linked DB icon
 *   R4: 1 h1 per page (h2/h3 で sub-section)
 *   R5: max 30 callouts/page
 *   R6: "Notion UI で" hint callout 撤去
 *   R7: heading は action-oriented (DB 名コピ�E NG)
 *   R8: max 60 top-level blocks/page
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY
if (!NOTION_API_KEY) {
  console.error('NOTION_API_KEY env var must be set')
  process.exit(1)
}

const PAGES = {
  parent: "35fa2b78-f3fc-8129-9d91-e457889ee393",
  dashboard: "35fa2b78-f3fc-81d0-b842-c0ed182103dc",
  pipeline: "35fa2b78-f3fc-81c0-a376-d292a748d066",
  revenue: "35fa2b78-f3fc-8125-a0b4-cea00429681d",
  activity: "35fa2b78-f3fc-817c-9cf4-f2f5fd17ae71",
  usage: "35fa2b78-f3fc-81c3-b26a-f80a3770208d",
  strategy: "35fa2b78-f3fc-819c-b5d6-e2f95e677265",
}

const DB = {
  leadsJp: "8cbab1f501144f83872c1738ce3e79c4",
  customersJp: "86b1d93e3b854862ae7b2750d2585677",
  deliveriesJp: "b3cbef9dd96f4e5bbbecc404c703a298",
  templatesJp: "115e2b0e79424bb0813fc05402096f95",
  leadsGl: "35fa2b78-f3fc-8107-aa0b-f28694e1009c",
  customersGl: "35fa2b78-f3fc-81aa-b57f-fcc729431181",
  templatesGl: "35fa2b78-f3fc-817f-8e05-ca06234adac4",
  activities: "35fa2b78-f3fc-81ae-99b6-cc9cfa653791",
  calendar: "35fa2b78-f3fc-81c7-91a2-eb80274298aa",
  contracts: "35fa2b78-f3fc-81fc-bb0a-f3880172557d",
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
  return { ok: res.ok, data: await res.json() }
}

/* ───── Block builders (Rule 準拠) ───── */
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
  // h1 は page で 1 回�Eみ・action-oriented・action emoji
  h1: (t) => ({ object: "block", type: "heading_1", heading_1: { rich_text: [T(t)] } }),
  h2: (t) => ({ object: "block", type: "heading_2", heading_2: { rich_text: [T(t)] } }),
  h3: (t) => ({ object: "block", type: "heading_3", heading_3: { rich_text: [T(t)] } }),
  p: (text) => ({
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: Array.isArray(text) ? text : [T(text)] },
  }),
  callout: (text, emoji, color = "default") => ({
    object: "block",
    type: "callout",
    callout: {
      rich_text: Array.isArray(text) ? text : [T(text)],
      icon: { type: "emoji", emoji },
      color,
    },
  }),
  bullet: (t) => ({
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: Array.isArray(t) ? t : [T(t)] },
  }),
  divider: () => ({ object: "block", type: "divider", divider: {} }),
  toc: () => ({ object: "block", type: "table_of_contents", table_of_contents: { color: "default" } }),
  linkedDb: (id) => ({ object: "block", type: "link_to_page", link_to_page: { type: "database_id", database_id: id } }),
  toggle: (t, kids) => ({ object: "block", type: "toggle", toggle: { rich_text: [T(t)], children: kids } }),

  // 2 column max (mobile-friendly)
  cols2: (a, b) => ({
    object: "block",
    type: "column_list",
    column_list: {
      children: [
        { object: "block", type: "column", column: { children: a.filter(Boolean) } },
        { object: "block", type: "column", column: { children: b.filter(Boolean) } },
      ],
    },
  }),

  // KPI Card: emoji 引数受取・吁Ecard 固朁Eemoji で R2 違反回避
  kpiCard: (label, value, emoji, color = "default") => ({
    object: "block",
    type: "callout",
    callout: {
      rich_text: [T(value, { bold: true, color }), T(`\n${label}`, { color: "gray" })],
      icon: { type: "emoji", emoji },
      color: `${color}_background`,
    },
  }),

  navCard: (label, sublabel, url, emoji, color) => ({
    object: "block",
    type: "callout",
    callout: {
      rich_text: [linkT(label, url), T(`\n${sublabel}`, { color: "gray" })],
      icon: { type: "emoji", emoji },
      color: `${color}_background`,
    },
  }),
}

/* ───── Smart clear (DBs/sub pages 保護) ───── */
const SAFE_TO_DELETE = new Set([
  "paragraph", "heading_1", "heading_2", "heading_3",
  "callout", "bulleted_list_item", "numbered_list_item",
  "toggle", "divider", "link_to_page",
  "table_of_contents", "column_list", "quote", "code",
])

async function smartClear(pageId, label) {
  console.log(`🧹 ${label} clear...`)
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
  console.log(`   ${toDelete.length} blocks deleted (DBs/sub pages preserved)`)
}

async function appendChunked(pageId, blocks, label) {
  for (let i = 0; i < blocks.length; i += 90) {
    const chunk = blocks.slice(i, i + 90)
    const r = await n("PATCH", `/blocks/${pageId}/children`, { children: chunk })
    if (!r.ok) {
      console.error(`❁E${label}:`, JSON.stringify(r.data).slice(0, 200))
      return false
    }
  }
  console.log(`   ✁E${blocks.length} blocks ↁE${label}`)
  return true
}

/* ───── Real KPI query ───── */
async function queryCounts() {
  const c = {}
  const all = await n("POST", `/databases/${DB.leadsJp}/query`, { page_size: 100 })
  c.leads = all.ok ? all.data.results?.length ?? 0 : 0
  const hot = await n("POST", `/databases/${DB.leadsJp}/query`, {
    filter: { property: "HOTリーチE, checkbox: { equals: true } },
    page_size: 100,
  })
  c.hot = hot.ok ? hot.data.results?.length ?? 0 : 0
  const cus = await n("POST", `/databases/${DB.customersJp}/query`, { page_size: 100 })
  c.customers = cus.ok ? cus.data.results?.length ?? 0 : 0
  const tj = await n("POST", `/databases/${DB.templatesJp}/query`, { page_size: 100 })
  c.templatesJp = tj.ok ? tj.data.results?.length ?? 0 : 0
  const tg = await n("POST", `/databases/${DB.templatesGl}/query`, { page_size: 100 })
  c.templatesGl = tg.ok ? tg.data.results?.length ?? 0 : 0
  return c
}

const U = (id) => `https://www.notion.so/${id.replace(/-/g, "")}`

/* ──────────────── PAGE 1: Parent Hub ──────────────── */
function parentHubBlocks() {
  return [
    blk.callout(
      [
        T("Paradigm 営業 OS", { bold: true }),
        T("  ESalesforce ÁEApollo ÁEDocuSign ÁEcal.com 統吁E),
        T("\n3 層刁E��: Supabase = SSOT / Notion = GUI / R2 = 大ファイル", { color: "gray" }),
      ],
      "🎯",
      "blue_background",
    ),
    blk.p(""),

    blk.h1("4 つのダチE��ュボ�EチE),
    blk.cols2(
      [
        blk.navCard("営業ダチE��ュボ�EチE, "朝一画面・KPI + Pipeline + Activity + Calendar", U(PAGES.dashboard), "📊", "blue"),
      ],
      [
        blk.navCard("Pipeline Manager", "啁E��E��チE�Eジ管琁E�EKanban + Forecast", U(PAGES.pipeline), "🎯", "purple"),
      ],
    ),
    blk.cols2(
      [
        blk.navCard("Revenue Dashboard", "経営視点・MRR + LTV + 契紁E��琁E, U(PAGES.revenue), "💰", "green"),
      ],
      [
        blk.navCard("Activity Hub", "全活勁Efeed + filtered views", U(PAGES.activity), "📞", "orange"),
      ],
    ),
    blk.p(""),

    blk.h2("運用リファレンス"),
    blk.cols2(
      [
        blk.navCard("使ぁE��ガイチE, "営業フロー 5 step", U(PAGES.usage), "📖", "default"),
        blk.navCard("業種別営業戦略", "8 業種 ÁEHook 知譁E, U(PAGES.strategy), "🎓", "default"),
      ],
      [
        blk.navCard("Setup & Environment", "env / cron / Slack 設宁E, U("35fa2b78-f3fc-81dd-8dda-e455d1f20d09"), "🔧", "default"),
        blk.navCard("R2 Storage Spec", "動画 / PDF 保存仕槁E, U("35fa2b78-f3fc-8163-8e90-c55cc0218ad5"), "🗄�E�E, "default"),
      ],
    ),
    blk.cols2(
      [blk.navCard("Architecture & Sync", "双方吁Esync + Conflict 解決", U("35fa2b78-f3fc-81ed-be7c-c636fadea0c8"), "📚", "default")],
      [blk.navCard("FAQ", "業種追加 / A/B / MP4 匁E筁E, U("35fa2b78-f3fc-81b2-abb1-dd0e837c6521"), "❁E, "default")],
    ),
    blk.p(""),

    blk.h2("チE�Eタベ�Eス全 11 倁E),
    blk.callout(
      [
        T("下記に Notion DBs 11 個が自動表示されます、E, { color: "gray" }),
        T(" 通常閲覧はダチE��ュボ�Eド経由 (上訁E4 つ) 推奨、E),
      ],
      "💡",
      "gray_background",
    ),
    blk.p(""),
    blk.callout(
      [
        T("Repository: ", { bold: true }),
        linkT("Paradigmllc/Paradigmjpcom", "https://github.com/Paradigmllc/Paradigmjpcom"),
        T(" · Production: "),
        linkT("paradigmjp.com", "https://paradigmjp.com"),
      ],
      "🚀",
      "default",
    ),
  ]
}

/* ──────────────── PAGE 2: 📊 営業ダチE��ュボ�EチE──────────────── */
function dashboardBlocks(counts) {
  return [
    blk.callout(
      [T("朝一に開く画面", { bold: true }), T("。今日アクションすべきリード�E啁E��E�� 1 画面に雁E��E��E)],
      "☀�E�E,
      "yellow_background",
    ),
    blk.p(""),

    blk.h1("今日の数孁E),
    blk.cols2(
      [blk.kpiCard("総リーチE, String(counts.leads), "📈", "blue")],
      [blk.kpiCard("HOT リーチE, String(counts.hot), "🔥", "red")],
    ),
    blk.cols2(
      [blk.kpiCard("アクチE��ブ顧客", String(counts.customers), "🏆", "green")],
      [blk.kpiCard("チE��プレ訁E, String(counts.templatesJp + counts.templatesGl), "💎", "purple")],
    ),
    blk.p(""),

    blk.h2("動かすべきリーチE),
    blk.linkedDb(DB.leadsJp),
    blk.p(""),

    blk.h2("最近�E動き"),
    blk.linkedDb(DB.activities),
    blk.p(""),

    blk.h2("今日と今週の予宁E),
    blk.cols2(
      [blk.h3("啁E��E��ケジュール"), blk.linkedDb(DB.calendar)],
      [blk.h3("フォローアチE�E期限"), blk.linkedDb(DB.leadsJp)],
    ),
    blk.p(""),

    blk.h2("クイチE��アクション"),
    blk.cols2(
      [blk.navCard("リード追加", "新しい見込み顧客を登録", U(DB.leadsJp), "➁E, "blue")],
      [blk.navCard("活動ログ", "メール/架電/会議を記録", U(DB.activities), "📝", "green")],
    ),
    blk.cols2(
      [blk.navCard("啁E��E��紁E, "cal.com 経由 or 直接登録", U(DB.calendar), "🗓", "orange")],
      [blk.navCard("契紁E��作�E", "DocuSign で署名送仁E, U(DB.contracts), "🖊", "purple")],
    ),
    blk.p(""),

    blk.divider(),
    blk.h2("直近�E成果"),
    blk.cols2(
      [blk.h3("成紁E��E(last 30 days)"), blk.linkedDb(DB.leadsJp)],
      [blk.h3("ホットテンプレ (使用頁E"), blk.linkedDb(DB.templatesJp)],
    ),
    blk.p(""),

    blk.divider(),
    blk.h2("他�EダチE��ュボ�Eドへ"),
    blk.cols2(
      [blk.navCard("Pipeline Manager", "啁E��E��チE�Eジ Kanban", U(PAGES.pipeline), "🎯", "purple")],
      [blk.navCard("Revenue Dashboard", "MRR/LTV/契紁E, U(PAGES.revenue), "💰", "green")],
    ),
    blk.cols2(
      [blk.navCard("Activity Hub", "全活勁Efeed", U(PAGES.activity), "📞", "orange")],
      [blk.p("")],
    ),
  ]
}

/* ──────────────── PAGE 3: 🎯 Pipeline Manager ──────────────── */
function pipelineBlocks() {
  return [
    blk.callout(
      [T("啁E��E��チE�Eジ別 Kanban 管琁E��E, { bold: true }), T(" スチE�Eジ間ドラチE��で進捗を可視化、E)],
      "🎯",
      "purple_background",
    ),
    blk.p(""),

    blk.h1("啁E��E��チE�Eジ別"),
    blk.cols2(
      [blk.kpiCard("未対忁E, "?", "📥", "default")],
      [blk.kpiCard("架電渁E, "?", "☎︁E, "yellow")],
    ),
    blk.cols2(
      [blk.kpiCard("啁E��E��", "?", "💬", "orange")],
      [blk.kpiCard("提案渁E, "?", "📋", "blue")],
    ),
    blk.cols2(
      [blk.kpiCard("成紁E, "?", "✁E, "green")],
      [blk.kpiCard("失注", "?", "❁E, "red")],
    ),
    blk.p(""),

    blk.h2("Kanban Board"),
    blk.p("リーチEDB めENotion UI で「�Eード」view にして「商諁E��チE�Eジ」でグループ化。スチE�Eジ間ドラチE��で Supabase 自動反映 (5min cron)、E),
    blk.linkedDb(DB.leadsJp),
    blk.p(""),

    blk.h2("業種別パイプライン"),
    blk.linkedDb(DB.leadsJp),
    blk.p(""),

    blk.h2("海外市場の啁E��E),
    blk.linkedDb(DB.leadsGl),
    blk.p(""),

    blk.divider(),
    blk.h2("HOT Lead Spotlight"),
    blk.callout(
      [T("3+ 回閲覧された優先度 max リード、E, { bold: true }), T(" 今すぐ架電 / メール送付推奨、E)],
      "🔥",
      "red_background",
    ),
    blk.linkedDb(DB.leadsJp),
    blk.p(""),

    blk.divider(),
    blk.h2("月次予測"),
    blk.cols2(
      [
        blk.h3("見込みリーチE),
        blk.bullet([T("提案済件数: ", { bold: true }), T("? 件")]),
        blk.bullet([T("平坁E�E紁E��: ", { bold: true }), T("紁E30%")]),
        blk.bullet([T("予測新規顧客: ", { bold: true }), T("? 件")]),
      ],
      [
        blk.h3("予想売丁E),
        blk.bullet([T("Web 制作平坁E ", { bold: true }), T("¥150 丁E/ 案件")]),
        blk.bullet([T("MEO 月顁E ", { bold: true }), T("¥3-5 丁E/ 朁E)]),
        blk.bullet([T("動画サブスク: ", { bold: true }), T("¥30/50/80 丁E/ 朁E)]),
      ],
    ),
  ]
}

/* ──────────────── PAGE 4: 💰 Revenue Dashboard ──────────────── */
function revenueBlocks() {
  return [
    blk.callout(
      [T("経営視点ダチE��ュボ�Eド、E, { bold: true }), T(" CFO / 経営老E��見る数字を 1 画面に、E)],
      "💰",
      "green_background",
    ),
    blk.p(""),

    blk.h1("経営 KPI"),
    blk.cols2(
      [blk.kpiCard("緁EMRR", "¥? 丁E, "💴", "green")],
      [blk.kpiCard("予想 ARR", "¥? 丁E, "📊", "blue")],
    ),
    blk.cols2(
      [blk.kpiCard("アクチE��ブ顧客", "?", "🤁E, "purple")],
      [blk.kpiCard("WL 顧客数", "?", "🏷", "orange")],
    ),
    blk.p(""),

    blk.h2("顧客健全度モニター"),
    blk.cols2(
      [blk.kpiCard("良好", "?", "🟢", "green")],
      [blk.kpiCard("要注愁E, "?", "🟡", "yellow")],
    ),
    blk.cols2(
      [blk.kpiCard("要対忁E, "?", "🔴", "red")],
      [blk.p("")],
    ),
    blk.linkedDb(DB.customersJp),
    blk.p(""),

    blk.h2("MRR 推移"),
    blk.callout(
      [
        T("Notion チャート機�Eなし、E, { bold: true }),
        T(" 代替: 顧客 DB の「契紁E��始日」カレンダー view で月別 MRR 視覚化、また�E Tableau/Looker Studio で BI 連携推奨、E),
      ],
      "📈",
      "yellow_background",
    ),
    blk.linkedDb(DB.customersJp),
    blk.p(""),

    blk.divider(),
    blk.h2("契紁E��琁E),
    blk.cols2(
      [blk.kpiCard("Active 契紁E, "?", "✁E, "green")],
      [blk.kpiCard("Pending 署吁E, "?", "✁E, "yellow")],
    ),
    blk.cols2(
      [blk.kpiCard("今月期限刁E��", "?", "⏰", "red")],
      [blk.kpiCard("自動更新 ON", "?", "🔄", "blue")],
    ),
    blk.linkedDb(DB.contracts),
    blk.p(""),

    blk.h2("補助金申請状況E),
    blk.callout(
      [T("IT 導�E / チE��タル化補助金、E, { bold: true }), T(" 採択でクライアント費用 2/3 邁E��E+ Paradigm に紹介手数料、E)],
      "🎁",
      "purple_background",
    ),
    blk.linkedDb(DB.customersJp),
  ]
}

/* ──────────────── PAGE 5: 📞 Activity Hub ──────────────── */
function activityBlocks() {
  return [
    blk.callout(
      [T("Salesforce Chatter 相当�E全営業活勁Efeed、E, { bold: true })],
      "📞",
      "orange_background",
    ),
    blk.p(""),

    blk.h1("活勁EKPI"),
    blk.cols2(
      [blk.kpiCard("今日の活勁E, "?", "📅", "blue")],
      [blk.kpiCard("今週の活勁E, "?", "📆", "purple")],
    ),
    blk.cols2(
      [blk.kpiCard("通話成功玁E, "?%", "📈", "green")],
      [blk.kpiCard("会議実施数", "?", "💼", "orange")],
    ),
    blk.p(""),

    blk.h2("種別別アクチE��ビティ"),
    blk.cols2(
      [blk.h3("メール送信"), blk.linkedDb(DB.activities)],
      [blk.h3("架電"), blk.linkedDb(DB.activities)],
    ),
    blk.cols2(
      [blk.h3("会議"), blk.linkedDb(DB.activities)],
      [blk.h3("チE��実施"), blk.linkedDb(DB.activities)],
    ),
    blk.p(""),

    blk.divider(),
    blk.h2("全タイムライン"),
    blk.linkedDb(DB.activities),
    blk.p(""),

    blk.divider(),
    blk.h2("フォローアチE�E忁E��E),
    blk.callout(
      [T("結果 = follow_up", { code: true }), T(" の活勁E= 後追ぁE��スク残。今週中にアクション、E)],
      "⏰",
      "red_background",
    ),
    blk.linkedDb(DB.activities),
  ]
}

/* ──────────────── PAGE 6: 📖 使ぁE��ガイチE──────────────── */
function usageBlocks() {
  return [
    blk.callout(
      [T("初日に忁E��、E, { bold: true }), T(" 営業フロー 5 スチE��プで独り立ち可、E)],
      "🎓",
      "purple_background",
    ),
    blk.p(""),
    blk.toc(),
    blk.p(""),

    blk.h1("営業フロー 5 スチE��チE),

    blk.h2("Step 1  Eリード獲征E(自勁E"),
    blk.p("顧客ぁEparadigmjp.com/contact からフォーム送信すると、以下が自動で動きまぁE(Sprint 12 enrich pipeline):"),
    blk.bullet("法人ドメイン検�E (自由メール 28 ドメインは skip)"),
    blk.bullet("PageSpeed Insights mobile/desktop スコア取征E),
    blk.bullet("HTML inspect: OGP / WordPress / 著作年 / SSL 検�E"),
    blk.bullet("gBizInfo: 法人番号 / 従業員数 / 賁E��釁E/ 設立年"),
    blk.bullet("Supabase sales_companies に UPSERT"),
    blk.bullet("Notion リーチEDB に新規�Eージ作�E"),
    blk.bullet("Slack #all-paradigm に 🌱 新規リード通知"),
    blk.p(""),

    blk.h2("Step 2  E診断レポ�Eト確誁E),
    blk.p("リーチEDB から HOT view を開き、上位リード�EドメインをクリチE��:"),
    blk.bullet("診断レポ�EチE(リチE�� HTML LP・3-Act 構造): /ja/report/[slug]"),
    blk.bullet("動画レポ�EチE(60s HTML 自動�E甁E: /ja/report/[slug]/video"),
    blk.bullet("OG image (Slack/LINE シェアで自動展開・1200ÁE30 PNG)"),
    blk.p(""),

    blk.h2("Step 3  E営業アクション"),
    blk.p("対象リード�E diagnostic_url をメール送信 ↁE反応征E��、E),
    blk.bullet("3+ views で is_hot_lead 自勁Etrue ↁESlack 通知"),
    blk.bullet("啁E��E��チE�Eジを「未対忁EↁE架電渁EↁE啁E��E�� ↁE提案済」と更新"),
    blk.bullet("メモ欁E��顧客との会話冁E��を逐次記録"),
    blk.bullet("フォローアチE�E日を設宁EↁEカレンダー view で漏れなぁE),
    blk.p(""),

    blk.h2("Step 4  E成紁E),
    blk.p("成紁E��たら:"),
    blk.bullet("リーチEDB の啁E��E��チE�Eジ = 成紁E),
    blk.bullet("顧客 DB に新規レコード追加"),
    blk.bullet("「紐づくリード」relation で リーチEↁE顧客 を紐づぁE),
    blk.bullet("月額�E契紁E��材�E契紁E��始日・健全度を�E劁E),
    blk.bullet("LTV / 契紁E��続月数 は formula で自動計箁E),
    blk.p(""),

    blk.h2("Step 5  E納品"),
    blk.p("契紁E��材ごとに納品 DB にレコード追加:"),
    blk.bullet("動画(HyperFrames): 60s 診断動画 ↁER2 にアチE�E ↁEURL 記録"),
    blk.bullet("Web 制佁E 完�EサイチEURL"),
    blk.bullet("MEO レポ�EチE 月次レポ�EチEPDF"),
    blk.bullet("スチE�Eタス: 制作中 ↁEレビュー征E�� ↁE納品渁E),
    blk.bullet("「紐づく顧客」relation で顧客とリンク"),
    blk.p(""),

    blk.divider(),
    blk.callout(
      [T("困ったら: ", { bold: true }), T("Slack #all-paradigm で `@Paradigm` メンション、EAQ も親ペ�Eジから、E)],
      "💬",
      "yellow_background",
    ),
  ]
}

/* ──────────────── PAGE 7: 🎓 業種別営業戦略 ──────────────── */
function strategyBlocks() {
  return [
    blk.callout(
      [T("業種ごとに雁E��動線�E客単価・主要課題が異なる、E, { bold: true }), T(" アウトリーチ前に該当業種を確認、E)],
      "🎓",
      "purple_background",
    ),
    blk.p(""),
    blk.toc(),
    blk.p(""),

    blk.h1("8 業種別 Hook 知譁E),

    blk.h2("美容室"),
    blk.callout(
      [T("Hook フレーズ: 「今この瞬間、御社サイトを訪れた 10 人のぁE�� 6 人は冁E��を見る前に帰ってぁE��す、E, { bold: true })],
      "💡",
      "yellow_background",
    ),
    blk.bullet([T("雁E��動緁E ", { bold: true }), T("Instagram (DM 予紁E / Hot Pepper Beauty")]),
    blk.bullet([T("客単価平坁E ", { bold: true }), T("¥8,000")]),
    blk.bullet([T("主要課顁E ", { bold: true }), T("速度遁E��・SNS 導線なし�EOGP 未設宁E)]),
    blk.p(""),

    blk.h2("歯科医院"),
    blk.callout(
      [T("Hook フレーズ: 「近隣の歯科医院を探してぁE��患老E�E 70% が御社のサイトに辿り着けてぁE��せん、E, { bold: true })],
      "💡",
      "yellow_background",
    ),
    blk.bullet([T("雁E��動緁E ", { bold: true }), T("EPARK / Google ビジネスプロフィール / Web 予紁E)]),
    blk.bullet([T("客単価平坁E ", { bold: true }), T("¥12,000")]),
    blk.bullet([T("主要課顁E ", { bold: true }), T("SSL 期限刁E��・速度遁E��・ua_残孁E(GA4 移行漏れ)")]),
    blk.p(""),

    blk.h2("飲食庁E),
    blk.callout(
      [T("Hook フレーズ: 「ランチ時間�E検索流�Eが月間推宁E4,200 件、漏れてぁE��す、E, { bold: true })],
      "💡",
      "yellow_background",
    ),
    blk.bullet([T("雁E��動緁E ", { bold: true }), T("食べログ / Google Map / Instagram")]),
    blk.bullet([T("客単価平坁E ", { bold: true }), T("¥4,500")]),
    blk.bullet([T("主要課顁E ", { bold: true }), T("OGP なし�ESNS 連携なし�E速度遁E�� (ランチ時間アクセス急墁E")]),
    blk.p(""),

    blk.h2("工務庁E/ 建設業"),
    blk.callout(
      [T("Hook フレーズ: 「施工事例を探す施主の 80% が御社のサイトを 5 秒で閉じてぁE��す、E, { bold: true })],
      "💡",
      "yellow_background",
    ),
    blk.bullet([T("雁E��動緁E ", { bold: true }), T("Web 見積依頼 / 允E��紹仁E/ 自治体登録")]),
    blk.bullet([T("客単価平坁E ", { bold: true }), T("¥800,000")]),
    blk.bullet([T("主要課顁E ", { bold: true }), T("WordPress 旧牁E(改ざんリスク)・施工事例�Eージの SEO 不足")]),
    blk.p(""),

    blk.h2("会計事務所"),
    blk.callout(
      [T("Hook フレーズ: 「決算前の顧問�E候補が御社を比輁E��討した結果、E 割が他事務所に流れてぁE��す、E, { bold: true })],
      "💡",
      "yellow_background",
    ),
    blk.bullet([T("雁E��動緁E ", { bold: true }), T("Web 相諁E��紁E/ 紹仁E)]),
    blk.bullet([T("客単価平坁E ", { bold: true }), T("¥360,000")]),
    blk.bullet([T("主要課顁E ", { bold: true }), T("コピ�Eライト年ぁE3+ 年剁E(廁E��疑惑)・GA4 未移衁E)]),
    blk.p(""),

    blk.h2("小売庁E),
    blk.callout(
      [T("Hook フレーズ: 「オンライン購買意欲のある顧客の 60% が御社のサイトを完亁E��ずに離脱してぁE��す、E, { bold: true })],
      "💡",
      "yellow_background",
    ),
    blk.bullet([T("雁E��動緁E ", { bold: true }), T("Google Map / Instagram / EC モール")]),
    blk.bullet([T("客単価平坁E ", { bold: true }), T("¥6,000")]),
    blk.bullet([T("主要課顁E ", { bold: true }), T("速度遁E��・OGP なし�ESNS 連携なぁE)]),
    blk.p(""),

    blk.h2("渁E��業老E),
    blk.callout(
      [T("Hook フレーズ: 「見積もり依頼の問い合わせフォームに 50% 以上が到達せず離脱してぁE��す、E, { bold: true })],
      "💡",
      "yellow_background",
    ),
    blk.bullet([T("雁E��動緁E ", { bold: true }), T("くらし�Eマ�EケチE�� / Web 見穁E)]),
    blk.bullet([T("客単価平坁E ", { bold: true }), T("¥28,000")]),
    blk.bullet([T("主要課顁E ", { bold: true }), T("フォーム機�E不�E・速度遁E��・SSL 期限")]),
    blk.p(""),

    blk.h2("コンサル会社"),
    blk.callout(
      [T("Hook フレーズ: 「新規問ぁE��わせの大半が、御社の専門性に気付かなぁE��ま競合へ流れてぁE��す、E, { bold: true })],
      "💡",
      "yellow_background",
    ),
    blk.bullet([T("雁E��動緁E ", { bold: true }), T("LinkedIn / Web 問い合わぁE/ 紹仁E)]),
    blk.bullet([T("客単価平坁E ", { bold: true }), T("¥1,200,000")]),
    blk.bullet([T("主要課顁E ", { bold: true }), T("WordPress 旧版�E事例�Eージ無し�EOGP / Twitter Card なぁE)]),
  ]
}

/* ──────────────── Main ──────────────── */
async function main() {
  console.log("🚀 Sprint 19 抜本 rebuild 開始\n")
  const counts = await queryCounts()
  console.log(`KPI: leads ${counts.leads} / HOT ${counts.hot} / customers ${counts.customers} / templates ${counts.templatesJp + counts.templatesGl}\n`)

  const tasks = [
    { id: PAGES.parent, name: "Parent Hub", blocks: parentHubBlocks() },
    { id: PAGES.dashboard, name: "📊 営業ダチE��ュボ�EチE, blocks: dashboardBlocks(counts) },
    { id: PAGES.pipeline, name: "🎯 Pipeline Manager", blocks: pipelineBlocks() },
    { id: PAGES.revenue, name: "💰 Revenue Dashboard", blocks: revenueBlocks() },
    { id: PAGES.activity, name: "📞 Activity Hub", blocks: activityBlocks() },
    { id: PAGES.usage, name: "📖 使ぁE��ガイチE, blocks: usageBlocks() },
    { id: PAGES.strategy, name: "🎓 業種別営業戦略", blocks: strategyBlocks() },
  ]

  for (const task of tasks) {
    console.log(`📝 ${task.name}`)
    await smartClear(task.id, task.name)
    await appendChunked(task.id, task.blocks, task.name)
  }

  console.log("\n✁E7 pages 抜本 rebuild 完亁E��次は audit script で再検証推奨:")
  console.log("   node scripts/notion-audit.mjs")
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
