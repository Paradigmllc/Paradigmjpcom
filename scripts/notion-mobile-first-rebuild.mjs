#!/usr/bin/env node
/**
 * scripts/notion-mobile-first-rebuild.mjs — Sprint 19 抜本実装
 *
 * 7 pages を mobile-first + emoji policy 完全準拠で rebuild:
 *   1. Parent Hub
 *   2. 📊 営業ダッシュボード (Daily View)
 *   3. 🎯 Pipeline Manager
 *   4. 💰 Revenue Dashboard
 *   5. 📞 Activity Hub
 *   6. 📖 使い方ガイド
 *   7. 🎓 業種別営業戦略
 *
 * 設計 Rule 8 つ (notion-audit.mjs と一致):
 *   R1: 2 column max
 *   R2: 1 emoji per section (3 block window で重複 NG)
 *   R3: heading emoji ≠ adjacent linked DB icon
 *   R4: 1 h1 per page (h2/h3 で sub-section)
 *   R5: max 30 callouts/page
 *   R6: "Notion UI で" hint callout 撤去
 *   R7: heading は action-oriented (DB 名コピー NG)
 *   R8: max 60 top-level blocks/page
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY ?? "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"

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
  // h1 は page で 1 回のみ・action-oriented・action emoji
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

  // KPI Card: emoji 引数受取・各 card 固有 emoji で R2 違反回避
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
      console.error(`❌ ${label}:`, JSON.stringify(r.data).slice(0, 200))
      return false
    }
  }
  console.log(`   ✅ ${blocks.length} blocks → ${label}`)
  return true
}

/* ───── Real KPI query ───── */
async function queryCounts() {
  const c = {}
  const all = await n("POST", `/databases/${DB.leadsJp}/query`, { page_size: 100 })
  c.leads = all.ok ? all.data.results?.length ?? 0 : 0
  const hot = await n("POST", `/databases/${DB.leadsJp}/query`, {
    filter: { property: "HOTリード", checkbox: { equals: true } },
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
        T(" — Salesforce × Apollo × DocuSign × cal.com 統合"),
        T("\n3 層分業: Supabase = SSOT / Notion = GUI / R2 = 大ファイル", { color: "gray" }),
      ],
      "🎯",
      "blue_background",
    ),
    blk.p(""),

    blk.h1("4 つのダッシュボード"),
    blk.cols2(
      [
        blk.navCard("営業ダッシュボード", "朝一画面・KPI + Pipeline + Activity + Calendar", U(PAGES.dashboard), "📊", "blue"),
      ],
      [
        blk.navCard("Pipeline Manager", "商談ステージ管理・Kanban + Forecast", U(PAGES.pipeline), "🎯", "purple"),
      ],
    ),
    blk.cols2(
      [
        blk.navCard("Revenue Dashboard", "経営視点・MRR + LTV + 契約管理", U(PAGES.revenue), "💰", "green"),
      ],
      [
        blk.navCard("Activity Hub", "全活動 feed + filtered views", U(PAGES.activity), "📞", "orange"),
      ],
    ),
    blk.p(""),

    blk.h2("運用リファレンス"),
    blk.cols2(
      [
        blk.navCard("使い方ガイド", "営業フロー 5 step", U(PAGES.usage), "📖", "default"),
        blk.navCard("業種別営業戦略", "8 業種 × Hook 知識", U(PAGES.strategy), "🎓", "default"),
      ],
      [
        blk.navCard("Setup & Environment", "env / cron / Slack 設定", U("35fa2b78-f3fc-81dd-8dda-e455d1f20d09"), "🔧", "default"),
        blk.navCard("R2 Storage Spec", "動画 / PDF 保存仕様", U("35fa2b78-f3fc-8163-8e90-c55cc0218ad5"), "🗄️", "default"),
      ],
    ),
    blk.cols2(
      [blk.navCard("Architecture & Sync", "双方向 sync + Conflict 解決", U("35fa2b78-f3fc-81ed-be7c-c636fadea0c8"), "📚", "default")],
      [blk.navCard("FAQ", "業種追加 / A/B / MP4 化 等", U("35fa2b78-f3fc-81b2-abb1-dd0e837c6521"), "❓", "default")],
    ),
    blk.p(""),

    blk.h2("データベース全 11 個"),
    blk.callout(
      [
        T("下記に Notion DBs 11 個が自動表示されます。", { color: "gray" }),
        T(" 通常閲覧はダッシュボード経由 (上記 4 つ) 推奨。"),
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

/* ──────────────── PAGE 2: 📊 営業ダッシュボード ──────────────── */
function dashboardBlocks(counts) {
  return [
    blk.callout(
      [T("朝一に開く画面", { bold: true }), T("。今日アクションすべきリード・商談を 1 画面に集約。")],
      "☀️",
      "yellow_background",
    ),
    blk.p(""),

    blk.h1("今日の数字"),
    blk.cols2(
      [blk.kpiCard("総リード", String(counts.leads), "📈", "blue")],
      [blk.kpiCard("HOT リード", String(counts.hot), "🔥", "red")],
    ),
    blk.cols2(
      [blk.kpiCard("アクティブ顧客", String(counts.customers), "🏆", "green")],
      [blk.kpiCard("テンプレ計", String(counts.templatesJp + counts.templatesGl), "💎", "purple")],
    ),
    blk.p(""),

    blk.h2("動かすべきリード"),
    blk.linkedDb(DB.leadsJp),
    blk.p(""),

    blk.h2("最近の動き"),
    blk.linkedDb(DB.activities),
    blk.p(""),

    blk.h2("今日と今週の予定"),
    blk.cols2(
      [blk.h3("商談スケジュール"), blk.linkedDb(DB.calendar)],
      [blk.h3("フォローアップ期限"), blk.linkedDb(DB.leadsJp)],
    ),
    blk.p(""),

    blk.h2("クイックアクション"),
    blk.cols2(
      [blk.navCard("リード追加", "新しい見込み顧客を登録", U(DB.leadsJp), "➕", "blue")],
      [blk.navCard("活動ログ", "メール/架電/会議を記録", U(DB.activities), "📝", "green")],
    ),
    blk.cols2(
      [blk.navCard("商談予約", "cal.com 経由 or 直接登録", U(DB.calendar), "🗓", "orange")],
      [blk.navCard("契約書作成", "DocuSign で署名送付", U(DB.contracts), "🖊", "purple")],
    ),
    blk.p(""),

    blk.divider(),
    blk.h2("直近の成果"),
    blk.cols2(
      [blk.h3("成約済 (last 30 days)"), blk.linkedDb(DB.leadsJp)],
      [blk.h3("ホットテンプレ (使用順)"), blk.linkedDb(DB.templatesJp)],
    ),
    blk.p(""),

    blk.divider(),
    blk.h2("他のダッシュボードへ"),
    blk.cols2(
      [blk.navCard("Pipeline Manager", "商談ステージ Kanban", U(PAGES.pipeline), "🎯", "purple")],
      [blk.navCard("Revenue Dashboard", "MRR/LTV/契約", U(PAGES.revenue), "💰", "green")],
    ),
    blk.cols2(
      [blk.navCard("Activity Hub", "全活動 feed", U(PAGES.activity), "📞", "orange")],
      [blk.p("")],
    ),
  ]
}

/* ──────────────── PAGE 3: 🎯 Pipeline Manager ──────────────── */
function pipelineBlocks() {
  return [
    blk.callout(
      [T("商談ステージ別 Kanban 管理。", { bold: true }), T(" ステージ間ドラッグで進捗を可視化。")],
      "🎯",
      "purple_background",
    ),
    blk.p(""),

    blk.h1("商談ステージ別"),
    blk.cols2(
      [blk.kpiCard("未対応", "?", "📥", "default")],
      [blk.kpiCard("架電済", "?", "☎️", "yellow")],
    ),
    blk.cols2(
      [blk.kpiCard("商談中", "?", "💬", "orange")],
      [blk.kpiCard("提案済", "?", "📋", "blue")],
    ),
    blk.cols2(
      [blk.kpiCard("成約", "?", "✅", "green")],
      [blk.kpiCard("失注", "?", "❌", "red")],
    ),
    blk.p(""),

    blk.h2("Kanban Board"),
    blk.p("リード DB を Notion UI で「ボード」view にして「商談ステージ」でグループ化。ステージ間ドラッグで Supabase 自動反映 (5min cron)。"),
    blk.linkedDb(DB.leadsJp),
    blk.p(""),

    blk.h2("業種別パイプライン"),
    blk.linkedDb(DB.leadsJp),
    blk.p(""),

    blk.h2("海外市場の商談"),
    blk.linkedDb(DB.leadsGl),
    blk.p(""),

    blk.divider(),
    blk.h2("HOT Lead Spotlight"),
    blk.callout(
      [T("3+ 回閲覧された優先度 max リード。", { bold: true }), T(" 今すぐ架電 / メール送付推奨。")],
      "🔥",
      "red_background",
    ),
    blk.linkedDb(DB.leadsJp),
    blk.p(""),

    blk.divider(),
    blk.h2("月次予測"),
    blk.cols2(
      [
        blk.h3("見込みリード"),
        blk.bullet([T("提案済件数: ", { bold: true }), T("? 件")]),
        blk.bullet([T("平均成約率: ", { bold: true }), T("約 30%")]),
        blk.bullet([T("予測新規顧客: ", { bold: true }), T("? 件")]),
      ],
      [
        blk.h3("予想売上"),
        blk.bullet([T("Web 制作平均: ", { bold: true }), T("¥150 万 / 案件")]),
        blk.bullet([T("MEO 月額: ", { bold: true }), T("¥3-5 万 / 月")]),
        blk.bullet([T("動画サブスク: ", { bold: true }), T("¥30/50/80 万 / 月")]),
      ],
    ),
  ]
}

/* ──────────────── PAGE 4: 💰 Revenue Dashboard ──────────────── */
function revenueBlocks() {
  return [
    blk.callout(
      [T("経営視点ダッシュボード。", { bold: true }), T(" CFO / 経営者が見る数字を 1 画面に。")],
      "💰",
      "green_background",
    ),
    blk.p(""),

    blk.h1("経営 KPI"),
    blk.cols2(
      [blk.kpiCard("総 MRR", "¥? 万", "💴", "green")],
      [blk.kpiCard("予想 ARR", "¥? 万", "📊", "blue")],
    ),
    blk.cols2(
      [blk.kpiCard("アクティブ顧客", "?", "🤝", "purple")],
      [blk.kpiCard("WL 顧客数", "?", "🏷", "orange")],
    ),
    blk.p(""),

    blk.h2("顧客健全度モニター"),
    blk.cols2(
      [blk.kpiCard("良好", "?", "🟢", "green")],
      [blk.kpiCard("要注意", "?", "🟡", "yellow")],
    ),
    blk.cols2(
      [blk.kpiCard("要対応", "?", "🔴", "red")],
      [blk.p("")],
    ),
    blk.linkedDb(DB.customersJp),
    blk.p(""),

    blk.h2("MRR 推移"),
    blk.callout(
      [
        T("Notion チャート機能なし。", { bold: true }),
        T(" 代替: 顧客 DB の「契約開始日」カレンダー view で月別 MRR 視覚化、または Tableau/Looker Studio で BI 連携推奨。"),
      ],
      "📈",
      "yellow_background",
    ),
    blk.linkedDb(DB.customersJp),
    blk.p(""),

    blk.divider(),
    blk.h2("契約管理"),
    blk.cols2(
      [blk.kpiCard("Active 契約", "?", "✔", "green")],
      [blk.kpiCard("Pending 署名", "?", "✍", "yellow")],
    ),
    blk.cols2(
      [blk.kpiCard("今月期限切れ", "?", "⏰", "red")],
      [blk.kpiCard("自動更新 ON", "?", "🔄", "blue")],
    ),
    blk.linkedDb(DB.contracts),
    blk.p(""),

    blk.h2("補助金申請状況"),
    blk.callout(
      [T("IT 導入 / デジタル化補助金。", { bold: true }), T(" 採択でクライアント費用 2/3 還付 + Paradigm に紹介手数料。")],
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
      [T("Salesforce Chatter 相当の全営業活動 feed。", { bold: true })],
      "📞",
      "orange_background",
    ),
    blk.p(""),

    blk.h1("活動 KPI"),
    blk.cols2(
      [blk.kpiCard("今日の活動", "?", "📅", "blue")],
      [blk.kpiCard("今週の活動", "?", "📆", "purple")],
    ),
    blk.cols2(
      [blk.kpiCard("通話成功率", "?%", "📈", "green")],
      [blk.kpiCard("会議実施数", "?", "💼", "orange")],
    ),
    blk.p(""),

    blk.h2("種別別アクティビティ"),
    blk.cols2(
      [blk.h3("メール送信"), blk.linkedDb(DB.activities)],
      [blk.h3("架電"), blk.linkedDb(DB.activities)],
    ),
    blk.cols2(
      [blk.h3("会議"), blk.linkedDb(DB.activities)],
      [blk.h3("デモ実施"), blk.linkedDb(DB.activities)],
    ),
    blk.p(""),

    blk.divider(),
    blk.h2("全タイムライン"),
    blk.linkedDb(DB.activities),
    blk.p(""),

    blk.divider(),
    blk.h2("フォローアップ必須"),
    blk.callout(
      [T("結果 = follow_up", { code: true }), T(" の活動 = 後追いタスク残。今週中にアクション。")],
      "⏰",
      "red_background",
    ),
    blk.linkedDb(DB.activities),
  ]
}

/* ──────────────── PAGE 6: 📖 使い方ガイド ──────────────── */
function usageBlocks() {
  return [
    blk.callout(
      [T("初日に必読。", { bold: true }), T(" 営業フロー 5 ステップで独り立ち可。")],
      "🎓",
      "purple_background",
    ),
    blk.p(""),
    blk.toc(),
    blk.p(""),

    blk.h1("営業フロー 5 ステップ"),

    blk.h2("Step 1 — リード獲得 (自動)"),
    blk.p("顧客が paradigmjp.com/contact からフォーム送信すると、以下が自動で動きます (Sprint 12 enrich pipeline):"),
    blk.bullet("法人ドメイン検出 (自由メール 28 ドメインは skip)"),
    blk.bullet("PageSpeed Insights mobile/desktop スコア取得"),
    blk.bullet("HTML inspect: OGP / WordPress / 著作年 / SSL 検出"),
    blk.bullet("gBizInfo: 法人番号 / 従業員数 / 資本金 / 設立年"),
    blk.bullet("Supabase sales_companies に UPSERT"),
    blk.bullet("Notion リード DB に新規ページ作成"),
    blk.bullet("Slack #all-paradigm に 🌱 新規リード通知"),
    blk.p(""),

    blk.h2("Step 2 — 診断レポート確認"),
    blk.p("リード DB から HOT view を開き、上位リードのドメインをクリック:"),
    blk.bullet("診断レポート (リッチ HTML LP・3-Act 構造): /ja/report/[slug]"),
    blk.bullet("動画レポート (60s HTML 自動再生): /ja/report/[slug]/video"),
    blk.bullet("OG image (Slack/LINE シェアで自動展開・1200×630 PNG)"),
    blk.p(""),

    blk.h2("Step 3 — 営業アクション"),
    blk.p("対象リードの diagnostic_url をメール送信 → 反応待ち。"),
    blk.bullet("3+ views で is_hot_lead 自動 true → Slack 通知"),
    blk.bullet("商談ステージを「未対応 → 架電済 → 商談中 → 提案済」と更新"),
    blk.bullet("メモ欄に顧客との会話内容を逐次記録"),
    blk.bullet("フォローアップ日を設定 → カレンダー view で漏れなし"),
    blk.p(""),

    blk.h2("Step 4 — 成約"),
    blk.p("成約したら:"),
    blk.bullet("リード DB の商談ステージ = 成約"),
    blk.bullet("顧客 DB に新規レコード追加"),
    blk.bullet("「紐づくリード」relation で リード ↔ 顧客 を紐づけ"),
    blk.bullet("月額・契約商材・契約開始日・健全度を入力"),
    blk.bullet("LTV / 契約継続月数 は formula で自動計算"),
    blk.p(""),

    blk.h2("Step 5 — 納品"),
    blk.p("契約商材ごとに納品 DB にレコード追加:"),
    blk.bullet("動画(HyperFrames): 60s 診断動画 → R2 にアップ → URL 記録"),
    blk.bullet("Web 制作: 完成サイト URL"),
    blk.bullet("MEO レポート: 月次レポート PDF"),
    blk.bullet("ステータス: 制作中 → レビュー待ち → 納品済"),
    blk.bullet("「紐づく顧客」relation で顧客とリンク"),
    blk.p(""),

    blk.divider(),
    blk.callout(
      [T("困ったら: ", { bold: true }), T("Slack #all-paradigm で `@Paradigm` メンション。FAQ も親ページから。")],
      "💬",
      "yellow_background",
    ),
  ]
}

/* ──────────────── PAGE 7: 🎓 業種別営業戦略 ──────────────── */
function strategyBlocks() {
  return [
    blk.callout(
      [T("業種ごとに集客動線・客単価・主要課題が異なる。", { bold: true }), T(" アウトリーチ前に該当業種を確認。")],
      "🎓",
      "purple_background",
    ),
    blk.p(""),
    blk.toc(),
    blk.p(""),

    blk.h1("8 業種別 Hook 知識"),

    blk.h2("美容室"),
    blk.callout(
      [T("Hook フレーズ: 「今この瞬間、御社サイトを訪れた 10 人のうち 6 人は内容を見る前に帰っています」", { bold: true })],
      "💡",
      "yellow_background",
    ),
    blk.bullet([T("集客動線: ", { bold: true }), T("Instagram (DM 予約) / Hot Pepper Beauty")]),
    blk.bullet([T("客単価平均: ", { bold: true }), T("¥8,000")]),
    blk.bullet([T("主要課題: ", { bold: true }), T("速度遅い・SNS 導線なし・OGP 未設定")]),
    blk.p(""),

    blk.h2("歯科医院"),
    blk.callout(
      [T("Hook フレーズ: 「近隣の歯科医院を探している患者の 70% が御社のサイトに辿り着けていません」", { bold: true })],
      "💡",
      "yellow_background",
    ),
    blk.bullet([T("集客動線: ", { bold: true }), T("EPARK / Google ビジネスプロフィール / Web 予約")]),
    blk.bullet([T("客単価平均: ", { bold: true }), T("¥12,000")]),
    blk.bullet([T("主要課題: ", { bold: true }), T("SSL 期限切れ・速度遅い・ua_残存 (GA4 移行漏れ)")]),
    blk.p(""),

    blk.h2("飲食店"),
    blk.callout(
      [T("Hook フレーズ: 「ランチ時間の検索流入が月間推定 4,200 件、漏れています」", { bold: true })],
      "💡",
      "yellow_background",
    ),
    blk.bullet([T("集客動線: ", { bold: true }), T("食べログ / Google Map / Instagram")]),
    blk.bullet([T("客単価平均: ", { bold: true }), T("¥4,500")]),
    blk.bullet([T("主要課題: ", { bold: true }), T("OGP なし・SNS 連携なし・速度遅い (ランチ時間アクセス急増)")]),
    blk.p(""),

    blk.h2("工務店 / 建設業"),
    blk.callout(
      [T("Hook フレーズ: 「施工事例を探す施主の 80% が御社のサイトを 5 秒で閉じています」", { bold: true })],
      "💡",
      "yellow_background",
    ),
    blk.bullet([T("集客動線: ", { bold: true }), T("Web 見積依頼 / 元請紹介 / 自治体登録")]),
    blk.bullet([T("客単価平均: ", { bold: true }), T("¥800,000")]),
    blk.bullet([T("主要課題: ", { bold: true }), T("WordPress 旧版 (改ざんリスク)・施工事例ページの SEO 不足")]),
    blk.p(""),

    blk.h2("会計事務所"),
    blk.callout(
      [T("Hook フレーズ: 「決算前の顧問先候補が御社を比較検討した結果、7 割が他事務所に流れています」", { bold: true })],
      "💡",
      "yellow_background",
    ),
    blk.bullet([T("集客動線: ", { bold: true }), T("Web 相談予約 / 紹介")]),
    blk.bullet([T("客単価平均: ", { bold: true }), T("¥360,000")]),
    blk.bullet([T("主要課題: ", { bold: true }), T("コピーライト年が 3+ 年前 (廃業疑惑)・GA4 未移行")]),
    blk.p(""),

    blk.h2("小売店"),
    blk.callout(
      [T("Hook フレーズ: 「オンライン購買意欲のある顧客の 60% が御社のサイトを完了せずに離脱しています」", { bold: true })],
      "💡",
      "yellow_background",
    ),
    blk.bullet([T("集客動線: ", { bold: true }), T("Google Map / Instagram / EC モール")]),
    blk.bullet([T("客単価平均: ", { bold: true }), T("¥6,000")]),
    blk.bullet([T("主要課題: ", { bold: true }), T("速度遅い・OGP なし・SNS 連携なし")]),
    blk.p(""),

    blk.h2("清掃業者"),
    blk.callout(
      [T("Hook フレーズ: 「見積もり依頼の問い合わせフォームに 50% 以上が到達せず離脱しています」", { bold: true })],
      "💡",
      "yellow_background",
    ),
    blk.bullet([T("集客動線: ", { bold: true }), T("くらしのマーケット / Web 見積")]),
    blk.bullet([T("客単価平均: ", { bold: true }), T("¥28,000")]),
    blk.bullet([T("主要課題: ", { bold: true }), T("フォーム機能不全・速度遅い・SSL 期限")]),
    blk.p(""),

    blk.h2("コンサル会社"),
    blk.callout(
      [T("Hook フレーズ: 「新規問い合わせの大半が、御社の専門性に気付かないまま競合へ流れています」", { bold: true })],
      "💡",
      "yellow_background",
    ),
    blk.bullet([T("集客動線: ", { bold: true }), T("LinkedIn / Web 問い合わせ / 紹介")]),
    blk.bullet([T("客単価平均: ", { bold: true }), T("¥1,200,000")]),
    blk.bullet([T("主要課題: ", { bold: true }), T("WordPress 旧版・事例ページ無し・OGP / Twitter Card なし")]),
  ]
}

/* ──────────────── Main ──────────────── */
async function main() {
  console.log("🚀 Sprint 19 抜本 rebuild 開始\n")
  const counts = await queryCounts()
  console.log(`KPI: leads ${counts.leads} / HOT ${counts.hot} / customers ${counts.customers} / templates ${counts.templatesJp + counts.templatesGl}\n`)

  const tasks = [
    { id: PAGES.parent, name: "Parent Hub", blocks: parentHubBlocks() },
    { id: PAGES.dashboard, name: "📊 営業ダッシュボード", blocks: dashboardBlocks(counts) },
    { id: PAGES.pipeline, name: "🎯 Pipeline Manager", blocks: pipelineBlocks() },
    { id: PAGES.revenue, name: "💰 Revenue Dashboard", blocks: revenueBlocks() },
    { id: PAGES.activity, name: "📞 Activity Hub", blocks: activityBlocks() },
    { id: PAGES.usage, name: "📖 使い方ガイド", blocks: usageBlocks() },
    { id: PAGES.strategy, name: "🎓 業種別営業戦略", blocks: strategyBlocks() },
  ]

  for (const task of tasks) {
    console.log(`📝 ${task.name}`)
    await smartClear(task.id, task.name)
    await appendChunked(task.id, task.blocks, task.name)
  }

  console.log("\n✅ 7 pages 抜本 rebuild 完了。次は audit script で再検証推奨:")
  console.log("   node scripts/notion-audit.mjs")
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
