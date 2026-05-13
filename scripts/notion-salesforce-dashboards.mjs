#!/usr/bin/env node
/**
 * scripts/notion-salesforce-dashboards.mjs — Sprint 18 Salesforce 級ダッシュボード構築
 *
 * 役割: 1 ページ羅列を廃止し、4 つの role-based dashboard に再構築。
 *       各 dashboard は multi-column layout + KPI cards + filtered linked DBs。
 *
 * 構築する 4 dashboard:
 *   1. 📊 営業ダッシュボード — Daily Operating View (朝一画面)
 *   2. 🎯 Pipeline Manager — 商談ステージ管理 (Kanban スタイル)
 *   3. 💰 Revenue Dashboard — MRR/LTV/契約集計
 *   4. 📞 Activity Hub — 全活動 feed + filtered views
 *
 * 設計原則 (Salesforce Lightning Page 流):
 *   - 各画面は「単一目的・即決可能」設計
 *   - column layout で並列情報密度 max
 *   - KPI Card は大文字 + 色分け callout で目立たせる
 *   - linked DB を意図ごとに繰り返し embed (UI で filter 設定する誘導)
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY ?? "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"
const PARENT_PAGE_ID = "35fa2b78-f3fc-8129-9d91-e457889ee393"

const DB = {
  leadsJp: "8cbab1f501144f83872c1738ce3e79c4",
  customersJp: "86b1d93e3b854862ae7b2750d2585677",
  deliveriesJp: "b3cbef9dd96f4e5bbbecc404c703a298",
  templatesJp: "115e2b0e79424bb0813fc05402096f95",
  leadsGl: "35fa2b78-f3fc-8107-aa0b-f28694e1009c",
  customersGl: "35fa2b78-f3fc-81aa-b57f-fcc729431181",
  deliveriesGl: "35fa2b78-f3fc-81e2-a5c3-d7b9b9d7f5a9",
  templatesGl: "35fa2b78-f3fc-817f-8e05-ca06234adac4",
  activities: "35fa2b78-f3fc-81ae-99b6-cc9cfa653791",
  calendar: "35fa2b78-f3fc-81c7-91a2-eb80274298aa",
  contracts: "35fa2b78-f3fc-81fc-bb0a-f3880172557d",
}

// 既存 sub pages (Sprint 14-17)
const EXISTING_PAGES = {
  dashboard: "35fa2b78-f3fc-81d0-b842-c0ed182103dc",
  usage: "35fa2b78-f3fc-81c3-b26a-f80a3770208d",
  strategy: "35fa2b78-f3fc-819c-b5d6-e2f95e677265",
  setup: "35fa2b78-f3fc-81dd-8dda-e455d1f20d09",
  r2: "35fa2b78-f3fc-8163-8e90-c55cc0218ad5",
  syncFlow: "35fa2b78-f3fc-81ed-be7c-c636fadea0c8",
  faq: "35fa2b78-f3fc-81b2-abb1-dd0e837c6521",
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

/* ───── Block builders ───── */
const T = (content, opts = {}) => {
  const ann = {}
  if (opts.bold) ann.bold = true
  if (opts.italic) ann.italic = true
  if (opts.code) ann.code = true
  if (opts.color) ann.color = opts.color
  if (opts.underline) ann.underline = true
  return Object.keys(ann).length
    ? { type: "text", text: { content }, annotations: ann }
    : { type: "text", text: { content } }
}
const linkT = (content, url) => ({ type: "text", text: { content, link: { url } } })

const blk = {
  h1: (t, color) => ({
    object: "block",
    type: "heading_1",
    heading_1: { rich_text: [T(t, color ? { color } : {})], color: color ?? "default" },
  }),
  h2: (t, color) => ({
    object: "block",
    type: "heading_2",
    heading_2: { rich_text: [T(t, color ? { color } : {})], color: color ?? "default" },
  }),
  h3: (t, color) => ({
    object: "block",
    type: "heading_3",
    heading_3: { rich_text: [T(t, color ? { color } : {})], color: color ?? "default" },
  }),
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
  toggle: (t, kids = []) => ({
    object: "block",
    type: "toggle",
    toggle: { rich_text: [T(t)], children: kids },
  }),
  quote: (t) => ({ object: "block", type: "quote", quote: { rich_text: [T(t)] } }),
  divider: () => ({ object: "block", type: "divider", divider: {} }),
  toc: () => ({ object: "block", type: "table_of_contents", table_of_contents: { color: "default" } }),
  code: (text, lang = "bash") => ({
    object: "block",
    type: "code",
    code: { rich_text: [T(text)], language: lang },
  }),
  linkedDb: (id) => ({
    object: "block",
    type: "link_to_page",
    link_to_page: { type: "database_id", database_id: id },
  }),
  /* 2-4 column layout */
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
  /* KPI Card (大きな数字 + ラベル + アイコン) */
  kpiCard: (label, value, emoji, color = "default") =>
    blk.callout(
      [T(`${value}\n`, { bold: true, color }), T(label, { color: "gray" })],
      emoji,
      `${color}_background`,
    ),
  /* Quick action button-like callout */
  action: (label, url, emoji, color = "blue") =>
    blk.callout([linkT(label, url)], emoji, `${color}_background`),
}

/* ───── 現状データ query (Notion から件数取得) ───── */
async function queryCounts() {
  console.log("📊 KPI データ取得中...")
  const counts = {}

  // jp リード件数
  const leadsJpAll = await n("POST", `/databases/${DB.leadsJp}/query`, { page_size: 100 })
  counts.leadsJp = leadsJpAll.ok ? leadsJpAll.data.results?.length ?? 0 : 0
  // HOT
  const leadsJpHot = await n("POST", `/databases/${DB.leadsJp}/query`, {
    filter: { property: "HOTリード", checkbox: { equals: true } },
    page_size: 100,
  })
  counts.leadsJpHot = leadsJpHot.ok ? leadsJpHot.data.results?.length ?? 0 : 0

  // 顧客
  const customersJp = await n("POST", `/databases/${DB.customersJp}/query`, { page_size: 100 })
  counts.customersJp = customersJp.ok ? customersJp.data.results?.length ?? 0 : 0

  // テンプレ
  const templatesJp = await n("POST", `/databases/${DB.templatesJp}/query`, { page_size: 100 })
  counts.templatesJp = templatesJp.ok ? templatesJp.data.results?.length ?? 0 : 0
  const templatesGl = await n("POST", `/databases/${DB.templatesGl}/query`, { page_size: 100 })
  counts.templatesGl = templatesGl.ok ? templatesGl.data.results?.length ?? 0 : 0

  console.log(`  Leads jp: ${counts.leadsJp} (HOT ${counts.leadsJpHot})`)
  console.log(`  Customers jp: ${counts.customersJp}`)
  console.log(`  Templates: jp ${counts.templatesJp} + global ${counts.templatesGl}`)
  return counts
}

/* ───── smart clear: child_database / child_page は触らない ───── */
const SAFE_TO_DELETE = new Set([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "callout",
  "bulleted_list_item",
  "numbered_list_item",
  "toggle",
  "divider",
  "link_to_page",
  "table_of_contents",
  "column_list",
  "quote",
  "code",
])

async function smartClear(pageId, label) {
  console.log(`🧹 Smart clear: ${label}...`)
  let cursor = undefined
  const toDelete = []
  do {
    const r = await n(
      "GET",
      `/blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`,
    )
    if (!r.ok) break
    for (const block of r.data.results || []) {
      if (SAFE_TO_DELETE.has(block.type)) toDelete.push(block.id)
    }
    cursor = r.data.has_more ? r.data.next_cursor : undefined
  } while (cursor)
  console.log(`  Deleting ${toDelete.length} text blocks (DBs/sub pages 保護)`)
  for (const id of toDelete) {
    await n("DELETE", `/blocks/${id}`)
  }
}

/* ───── ハブ navigation 部分の append (chunk-safe) ───── */
async function appendBlocks(pageId, blocks, label = "") {
  console.log(`  ${label} appending ${blocks.length} blocks...`)
  for (let i = 0; i < blocks.length; i += 90) {
    const chunk = blocks.slice(i, i + 90)
    const r = await n("PATCH", `/blocks/${pageId}/children`, { children: chunk })
    if (!r.ok) {
      console.error(`  ❌ chunk: ${JSON.stringify(r.data).slice(0, 200)}`)
      return false
    }
  }
  console.log(`  ✅ ${blocks.length} blocks added to ${label}`)
  return true
}

/* ───── 📊 営業ダッシュボード (Daily Operating View) ───── */
async function buildDailyDashboard(counts, newPages) {
  await smartClear(EXISTING_PAGES.dashboard, "📊 営業ダッシュボード")

  const blocks = [
    blk.callout(
      [
        T("朝一に開く画面。", { bold: true }),
        T(" 今日アクションすべきリード・商談・タスクを 1 画面に集約。"),
        T("KPI は Notion API 経由で自動更新 (run script with cron)。"),
      ],
      "☀️",
      "yellow_background",
    ),
    blk.p(""),

    /* ── Row 1: KPI Cards (4 columns) ── */
    blk.h2("📊 今日の KPI"),
    blk.columns(
      [blk.kpiCard("総リード", String(counts.leadsJp), "🎯", "blue")],
      [blk.kpiCard("🔥 HOT", String(counts.leadsJpHot), "🔥", "red")],
      [blk.kpiCard("アクティブ顧客", String(counts.customersJp), "🏢", "green")],
      [blk.kpiCard("テンプレ計", `${counts.templatesJp + counts.templatesGl}`, "📝", "purple")],
    ),
    blk.p(""),

    /* ── Row 2: Pipeline + Activity Feed ── */
    blk.h2("🎯 今日の動き"),
    blk.columns(
      [
        blk.h3("🎯 商談パイプライン", "blue"),
        blk.callout(
          "下記 DB の Notion UI で「ボード」view → グループ化「商談ステージ」を設定して Kanban 化推奨。",
          "💡",
          "gray_background",
        ),
        blk.linkedDb(DB.leadsJp),
      ],
      [
        blk.h3("📞 最近のアクティビティ", "green"),
        blk.callout(
          "全営業活動 (メール/架電/会議/メモ) の時系列ログ。最新 20 件が見える view を作成推奨。",
          "💡",
          "gray_background",
        ),
        blk.linkedDb(DB.activities),
      ],
    ),
    blk.p(""),

    /* ── Row 3: Calendar + Tasks ── */
    blk.h2("📅 今日と今週"),
    blk.columns(
      [
        blk.h3("📅 今日の商談", "orange"),
        blk.callout(
          "Notion UI で「カレンダー」view → 期間プロパティ「開始日時」を設定して時刻別表示。",
          "💡",
          "gray_background",
        ),
        blk.linkedDb(DB.calendar),
      ],
      [
        blk.h3("📋 今週フォローアップすべきリード", "red"),
        blk.callout(
          "Notion UI で「カレンダー」view → 期間プロパティ「フォローアップ日」を設定。期限切れは赤色化。",
          "💡",
          "gray_background",
        ),
        blk.linkedDb(DB.leadsJp),
      ],
    ),
    blk.p(""),

    /* ── Row 4: Quick Actions ── */
    blk.h2("⚡ クイックアクション"),
    blk.columns(
      [
        blk.action(
          "+ 新規リード追加",
          `https://www.notion.so/${DB.leadsJp.replace(/-/g, "")}`,
          "🎯",
          "blue",
        ),
      ],
      [
        blk.action(
          "+ 活動ログ追加",
          `https://www.notion.so/${DB.activities.replace(/-/g, "")}`,
          "📞",
          "green",
        ),
      ],
      [
        blk.action(
          "+ 商談予約追加",
          `https://www.notion.so/${DB.calendar.replace(/-/g, "")}`,
          "📅",
          "orange",
        ),
      ],
      [
        blk.action(
          "+ 契約書作成",
          `https://www.notion.so/${DB.contracts.replace(/-/g, "")}`,
          "📄",
          "purple",
        ),
      ],
    ),
    blk.p(""),

    /* ── Row 5: Recent Wins + Templates A/B ── */
    blk.divider(),
    blk.h2("🏆 直近の成果"),
    blk.columns(
      [
        blk.h3("✅ 成約済リード (last 30 days)", "green"),
        blk.callout("Notion UI で filter: 商談ステージ=成約・期間=過去 30 日", "💡", "gray_background"),
        blk.linkedDb(DB.leadsJp),
      ],
      [
        blk.h3("🔥 ホットテンプレ (使用回数 top)", "red"),
        blk.callout("Notion UI で sort: 使用回数 ↓ 降順", "💡", "gray_background"),
        blk.linkedDb(DB.templatesJp),
      ],
    ),
    blk.p(""),

    /* ── Footer navigation ── */
    blk.divider(),
    blk.h2("🔗 他のダッシュボードへ"),
    blk.columns(
      [
        newPages?.pipeline
          ? blk.callout(
              [
                linkT("🎯 Pipeline Manager", `https://www.notion.so/${newPages.pipeline.replace(/-/g, "")}`),
                T("\n商談ステージ別 Kanban", { color: "gray" }),
              ],
              "🎯",
              "gray_background",
            )
          : blk.p(""),
      ],
      [
        newPages?.revenue
          ? blk.callout(
              [
                linkT("💰 Revenue Dashboard", `https://www.notion.so/${newPages.revenue.replace(/-/g, "")}`),
                T("\nMRR/LTV/契約集計", { color: "gray" }),
              ],
              "💰",
              "gray_background",
            )
          : blk.p(""),
      ],
      [
        newPages?.activity
          ? blk.callout(
              [
                linkT("📞 Activity Hub", `https://www.notion.so/${newPages.activity.replace(/-/g, "")}`),
                T("\n全活動 feed", { color: "gray" }),
              ],
              "📞",
              "gray_background",
            )
          : blk.p(""),
      ],
    ),
  ]

  return appendBlocks(EXISTING_PAGES.dashboard, blocks, "📊 営業ダッシュボード")
}

/* ───── 🎯 Pipeline Manager (新規 sub page) ───── */
async function createPipelinePage() {
  console.log("🎯 Creating Pipeline Manager...")
  const r = await n("POST", "/pages", {
    parent: { page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "🎯" },
    cover: {
      type: "external",
      external: { url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1500&q=80" },
    },
    properties: { title: { title: [{ text: { content: "🎯 Pipeline Manager" } }] } },
    children: [
      blk.callout(
        [
          T("商談ステージ別 Kanban 管理画面。", { bold: true }),
          T(" 商談を「未対応 → 架電済 → 商談中 → 提案済 → 成約 / 失注」のレーンで動かして進捗管理。"),
        ],
        "🎯",
        "blue_background",
      ),
      blk.p(""),
      blk.toc(),
      blk.divider(),

      /* Stage KPI Cards */
      blk.h1("📊 ステージ別件数"),
      blk.columns(
        [blk.kpiCard("未対応", "?", "📥", "default")],
        [blk.kpiCard("架電済", "?", "📞", "yellow")],
        [blk.kpiCard("商談中", "?", "💬", "orange")],
        [blk.kpiCard("提案済", "?", "📋", "blue")],
        [blk.kpiCard("成約", "?", "✅", "green")],
        [blk.kpiCard("失注", "?", "❌", "red")],
      ),
      blk.callout(
        "Notion UI でステージ別 view を作成すると、各 KPI Card に件数が動的反映 (UI でフィルタ&カウント表示)。",
        "💡",
        "gray_background",
      ),
      blk.p(""),

      /* Main Kanban */
      blk.h1("🗂️ Kanban Board"),
      blk.callout(
        [
          T("セットアップ手順:", { bold: true }),
          T("\n1. 下記 DB を開く → 右上「+ view を追加」"),
          T("\n2. ボード形式 → グループ化「商談ステージ」"),
          T("\n3. カードに表示: 業種 / モバイルスコア / 検出課題 / フォローアップ日"),
          T("\n4. ステージ間のドラッグでステージ自動更新 (= Supabase 反映 in 5min cron)"),
        ],
        "📖",
        "yellow_background",
      ),
      blk.linkedDb(DB.leadsJp),
      blk.p(""),

      /* By industry */
      blk.h1("🎓 業種別パイプライン"),
      blk.callout(
        "Notion UI でグループ化「業種」のボード view を作成すると、業種別の進捗が一目瞭然。",
        "💡",
        "gray_background",
      ),
      blk.linkedDb(DB.leadsJp),
      blk.p(""),

      /* By region */
      blk.h1("🌍 海外パイプライン"),
      blk.callout(
        "海外市場 (en/ko/zh/de/fr/es/pt/ru/ar/vi/id) の商談状況。Locale 別 view 推奨。",
        "🌍",
        "blue_background",
      ),
      blk.linkedDb(DB.leadsGl),
      blk.p(""),

      /* HOT lead spotlight */
      blk.divider(),
      blk.h1("🔥 HOT Lead Spotlight"),
      blk.callout(
        [
          T("診断レポート閲覧 3+ 回 = HOT 判定済リード。", { bold: true }),
          T(" 今すぐ架電 / メール送付すべき優先度 max のリード。"),
        ],
        "🔥",
        "red_background",
      ),
      blk.linkedDb(DB.leadsJp),
      blk.callout("Notion UI で filter: HOTリード=✓・sort: レポート閲覧数 ↓", "💡", "gray_background"),
      blk.p(""),

      /* Forecast */
      blk.divider(),
      blk.h1("📈 月次予測 (Forecast)"),
      blk.columns(
        [
          blk.h3("今月の見込みリード"),
          blk.bullet([T("提案済件数: ", { bold: true }), T("? 件")]),
          blk.bullet([T("平均成約率: ", { bold: true }), T("約 30% (Paradigm 業界平均)")]),
          blk.bullet([T("予測新規顧客: ", { bold: true }), T("? 件 × 30%")]),
        ],
        [
          blk.h3("予想売上"),
          blk.bullet([T("Web 制作平均: ", { bold: true }), T("¥150 万 / 案件")]),
          blk.bullet([T("MEO 月額: ", { bold: true }), T("¥3-5 万 / 月")]),
          blk.bullet([T("動画サブスク: ", { bold: true }), T("¥30/50/80 万 / 月")]),
        ],
      ),
    ],
  })
  if (r.ok) {
    console.log(`  ✅ Pipeline Manager: ${r.data.id}`)
    return r.data.id
  }
  console.error(`  ❌ Pipeline: ${r.data.message?.slice(0, 200)}`)
  return null
}

/* ───── 💰 Revenue Dashboard ───── */
async function createRevenuePage() {
  console.log("💰 Creating Revenue Dashboard...")
  const r = await n("POST", "/pages", {
    parent: { page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "💰" },
    cover: {
      type: "external",
      external: { url: "https://images.unsplash.com/photo-1554224155-1696413565d3?w=1500&q=80" },
    },
    properties: { title: { title: [{ text: { content: "💰 Revenue Dashboard" } }] } },
    children: [
      blk.callout(
        [
          T("MRR (月次経常収益) + LTV + 契約 + 健全度の経営視点画面。", { bold: true }),
          T(" CFO/経営者が見る数字を 1 画面に集約。"),
        ],
        "💰",
        "green_background",
      ),
      blk.p(""),
      blk.toc(),
      blk.divider(),

      /* Top KPI Row */
      blk.h1("📊 経営 KPI"),
      blk.columns(
        [blk.kpiCard("総 MRR", "¥? 万", "💰", "green")],
        [blk.kpiCard("予想 ARR", "¥? 万", "📈", "blue")],
        [blk.kpiCard("アクティブ顧客", "?", "🏢", "purple")],
        [blk.kpiCard("WL 顧客数", "?", "🤝", "orange")],
      ),
      blk.callout(
        "MRR は顧客 DB の「月額」列を合計。LTV は「契約継続月数 × 月額」formula で自動計算 (Sprint 16 で追加済)。",
        "💡",
        "gray_background",
      ),
      blk.p(""),

      /* Customer Health */
      blk.h1("🏥 顧客健全度モニター"),
      blk.columns(
        [blk.kpiCard("🟢 良好", "?", "🟢", "green")],
        [blk.kpiCard("🟡 要注意", "?", "🟡", "yellow")],
        [blk.kpiCard("🔴 要対応", "?", "🔴", "red")],
      ),
      blk.linkedDb(DB.customersJp),
      blk.callout("Notion UI でグループ化「健全度」のボード view を作成すると 3 列 Kanban 表示。", "💡", "gray_background"),
      blk.p(""),

      /* MRR Trend (text only - Notion チャート不可) */
      blk.h1("📈 MRR 推移"),
      blk.callout(
        [
          T("Notion ネイティブのチャート機能なし。", { bold: true }),
          T(" 代替: ① 顧客 DB の「契約開始日」でカレンダー view → 月別 MRR が視覚化 / ② Supabase のデータを Tableau / Looker Studio で BI ダッシュボード化推奨"),
        ],
        "📊",
        "yellow_background",
      ),
      blk.linkedDb(DB.customersJp),
      blk.p(""),

      /* Contracts */
      blk.divider(),
      blk.h1("📄 契約管理"),
      blk.columns(
        [blk.kpiCard("Active 契約", "?", "✅", "green")],
        [blk.kpiCard("Pending 署名", "?", "✍️", "yellow")],
        [blk.kpiCard("今月期限切れ", "?", "⏰", "red")],
        [blk.kpiCard("自動更新 ON", "?", "🔄", "blue")],
      ),
      blk.linkedDb(DB.contracts),
      blk.callout(
        [
          T("Notion UI で view 推奨:", { bold: true }),
          T("\n• 進行中契約 (status=signed or active)"),
          T("\n• 今月期限切れ (filter: end_date 内 → 過去/未来 30 日)"),
          T("\n• 通貨別グループ化 (JPY/USD/EUR 等)"),
        ],
        "📖",
        "yellow_background",
      ),
      blk.p(""),

      /* Subsidies */
      blk.h1("🎁 補助金申請状況"),
      blk.callout(
        "IT 導入補助金 / デジタル化補助金等の申請進捗。採択でクライアント費用 2/3 還付 + Paradigm に紹介手数料.",
        "🎁",
        "purple_background",
      ),
      blk.linkedDb(DB.customersJp),
      blk.callout("Notion UI で filter: 補助金申請状況 != 未申請", "💡", "gray_background"),
    ],
  })
  if (r.ok) {
    console.log(`  ✅ Revenue Dashboard: ${r.data.id}`)
    return r.data.id
  }
  console.error(`  ❌ Revenue: ${r.data.message?.slice(0, 200)}`)
  return null
}

/* ───── 📞 Activity Hub ───── */
async function createActivityHubPage() {
  console.log("📞 Creating Activity Hub...")
  const r = await n("POST", "/pages", {
    parent: { page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "📞" },
    cover: {
      type: "external",
      external: { url: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1500&q=80" },
    },
    properties: { title: { title: [{ text: { content: "📞 Activity Hub" } }] } },
    children: [
      blk.callout(
        [
          T("Salesforce Chatter / Activity Feed 相当。", { bold: true }),
          T(" 全営業活動を時系列 + 種別別に多角的に確認。"),
        ],
        "📞",
        "blue_background",
      ),
      blk.p(""),
      blk.toc(),
      blk.divider(),

      /* Today KPI */
      blk.h1("📊 活動 KPI"),
      blk.columns(
        [blk.kpiCard("今日の活動", "?", "📅", "blue")],
        [blk.kpiCard("今週の活動", "?", "📆", "purple")],
        [blk.kpiCard("通話成功率", "?%", "📞", "green")],
        [blk.kpiCard("会議実施数", "?", "💬", "orange")],
      ),
      blk.p(""),

      /* Activity Type Breakdown */
      blk.h1("🔍 種別別アクティビティ"),
      blk.columns(
        [
          blk.h3("📧 メール送信", "blue"),
          blk.linkedDb(DB.activities),
          blk.callout("filter: 種別=email", "💡", "gray_background"),
        ],
        [
          blk.h3("📞 架電", "green"),
          blk.linkedDb(DB.activities),
          blk.callout("filter: 種別=call", "💡", "gray_background"),
        ],
      ),
      blk.columns(
        [
          blk.h3("💬 会議", "purple"),
          blk.linkedDb(DB.activities),
          blk.callout("filter: 種別=meeting", "💡", "gray_background"),
        ],
        [
          blk.h3("🎬 デモ実施", "orange"),
          blk.linkedDb(DB.activities),
          blk.callout("filter: 種別=demo", "💡", "gray_background"),
        ],
      ),
      blk.p(""),

      /* Full timeline */
      blk.divider(),
      blk.h1("📜 全アクティビティタイムライン"),
      blk.callout(
        "全種別の活動を発生日時 ↓ 降順で表示。Salesforce Chatter 相当の feed view。",
        "📖",
        "yellow_background",
      ),
      blk.linkedDb(DB.activities),
      blk.p(""),

      /* Follow-up needed */
      blk.divider(),
      blk.h1("⏰ フォローアップ必須"),
      blk.callout(
        [
          T("結果 = follow_up", { code: true }),
          T(" になっている活動 = 後追いタスクが残っているリード。今週中にアクション実施。"),
        ],
        "⏰",
        "red_background",
      ),
      blk.linkedDb(DB.activities),
      blk.callout("Notion UI で filter: 結果=follow_up", "💡", "gray_background"),
    ],
  })
  if (r.ok) {
    console.log(`  ✅ Activity Hub: ${r.data.id}`)
    return r.data.id
  }
  console.error(`  ❌ Activity Hub: ${r.data.message?.slice(0, 200)}`)
  return null
}

/* ───── 親ハブ simplification: navigation のみ ───── */
async function simplifyParentHub(newPages) {
  await smartClear(PARENT_PAGE_ID, "親ハブ")

  const blocks = [
    /* Hero */
    blk.callout(
      [
        T("Paradigm 営業 OS", { bold: true }),
        T(" — Salesforce × Apollo × DocuSign × cal.com 統合"),
        T("\n3 層分業: ", { color: "gray" }),
        T("Supabase = SSOT / Notion = GUI / R2 = 大ファイル", { color: "gray" }),
        T("・5min cron で完全双方向 sync", { color: "gray" }),
      ],
      "🎯",
      "blue_background",
    ),
    blk.p(""),

    /* 4 Main Dashboards Grid */
    blk.h1("🎬 4 つのダッシュボード"),
    blk.callout(
      "目的に応じてダッシュボードを選択。各画面は単一目的・即決可能設計。",
      "🎬",
      "gray_background",
    ),
    blk.columns(
      [
        blk.callout(
          [
            linkT("📊 営業ダッシュボード", `https://www.notion.so/${EXISTING_PAGES.dashboard.replace(/-/g, "")}`),
            T("\n朝一画面", { color: "gray" }),
            T("\n4 KPI cards + Pipeline + Activity + Calendar + Quick Actions", { color: "gray" }),
          ],
          "📊",
          "blue_background",
        ),
      ],
      [
        newPages.pipeline
          ? blk.callout(
              [
                linkT("🎯 Pipeline Manager", `https://www.notion.so/${newPages.pipeline.replace(/-/g, "")}`),
                T("\n商談管理", { color: "gray" }),
                T("\n6 ステージ KPI + Kanban + 業種/地域別 + HOT Spotlight + Forecast", { color: "gray" }),
              ],
              "🎯",
              "purple_background",
            )
          : blk.p(""),
      ],
      [
        newPages.revenue
          ? blk.callout(
              [
                linkT("💰 Revenue Dashboard", `https://www.notion.so/${newPages.revenue.replace(/-/g, "")}`),
                T("\n経営視点", { color: "gray" }),
                T("\nMRR/ARR/LTV + 健全度 3 lane + 契約管理 + 補助金", { color: "gray" }),
              ],
              "💰",
              "green_background",
            )
          : blk.p(""),
      ],
      [
        newPages.activity
          ? blk.callout(
              [
                linkT("📞 Activity Hub", `https://www.notion.so/${newPages.activity.replace(/-/g, "")}`),
                T("\n活動 feed", { color: "gray" }),
                T("\n種別別 + 全タイムライン + フォローアップ必須", { color: "gray" }),
              ],
              "📞",
              "orange_background",
            )
          : blk.p(""),
      ],
    ),
    blk.p(""),

    blk.divider(),

    /* Reference & Setup section */
    blk.h1("📚 リファレンス"),
    blk.columns(
      [
        blk.callout(
          [
            linkT("📖 使い方ガイド", `https://www.notion.so/${EXISTING_PAGES.usage.replace(/-/g, "")}`),
            T("\n営業フロー 5 step (リード→診断→営業→成約→納品)", { color: "gray" }),
          ],
          "📖",
          "gray_background",
        ),
        blk.callout(
          [
            linkT("🎓 業種別営業戦略", `https://www.notion.so/${EXISTING_PAGES.strategy.replace(/-/g, "")}`),
            T("\n8 業種 × Hook フレーズ / 客単価 / 主要課題", { color: "gray" }),
          ],
          "🎓",
          "gray_background",
        ),
      ],
      [
        blk.callout(
          [
            linkT("🔧 Setup & Environment", `https://www.notion.so/${EXISTING_PAGES.setup.replace(/-/g, "")}`),
            T("\nCoolify env + cron + Slack 完全リファレンス", { color: "gray" }),
          ],
          "🔧",
          "gray_background",
        ),
        blk.callout(
          [
            linkT("🗄️ R2 Storage Spec", `https://www.notion.so/${EXISTING_PAGES.r2.replace(/-/g, "")}`),
            T("\n動画/PDF/提案資料の保存先 + コスト", { color: "gray" }),
          ],
          "🗄️",
          "gray_background",
        ),
      ],
      [
        blk.callout(
          [
            linkT("📚 Architecture & Sync Flow", `https://www.notion.so/${EXISTING_PAGES.syncFlow.replace(/-/g, "")}`),
            T("\nSupabase ↔ Notion 仕様 + Conflict 解決", { color: "gray" }),
          ],
          "📚",
          "gray_background",
        ),
        blk.callout(
          [
            linkT("❓ FAQ", `https://www.notion.so/${EXISTING_PAGES.faq.replace(/-/g, "")}`),
            T("\n業種追加 / A/B / MP4 化 / cal.com 等 7 質問", { color: "gray" }),
          ],
          "❓",
          "gray_background",
        ),
      ],
    ),
    blk.p(""),

    blk.divider(),

    /* DB list at the bottom (auto-displayed below as child_database) */
    blk.h1("🗄️ データベース全 11 個"),
    blk.callout(
      [
        T("下記に Notion のデータベース 11 個が自動表示されます。", { color: "gray" }),
        T("\n通常の閲覧はダッシュボード経由 (上記 4 つ) を推奨。DB を直接編集する時のみ下記から開く。"),
      ],
      "ℹ️",
      "gray_background",
    ),
    blk.h3("🇯🇵 日本市場"),
    blk.bullet([T("🎯 リード DB / 🏢 顧客 DB / 📦 納品 DB / 📝 テンプレ DB")]),
    blk.h3("🌍 海外市場 (11 locale 共通)"),
    blk.bullet([T("🌍 Leads / 🌍 Customers / 🌍 Deliveries / 🌍 Templates")]),
    blk.h3("🆕 Sprint 17 装備 (Salesforce 級)"),
    blk.bullet([T("📞 アクティビティログ / 📅 商談カレンダー / 📄 契約書 DB")]),
    blk.p(""),

    blk.divider(),

    /* Footer */
    blk.callout(
      [
        T("Repository: ", { bold: true }),
        linkT("Paradigmllc/Paradigmjpcom", "https://github.com/Paradigmllc/Paradigmjpcom"),
        T(" · Production: "),
        linkT("paradigmjp.com", "https://paradigmjp.com"),
        T(" · Sprint 18 完了 2026-05-13"),
      ],
      "🚀",
      "default",
    ),
  ]

  return appendBlocks(PARENT_PAGE_ID, blocks, "親ハブ")
}

/* ───── Main ───── */
async function main() {
  console.log("🚀 Sprint 18 Salesforce 級ダッシュボード構築開始\n")

  const counts = await queryCounts()

  console.log("\n📊 Building dashboards...")
  // 並列で 3 新ページ作成
  const [pipelineId, revenueId, activityId] = await Promise.all([
    createPipelinePage(),
    createRevenuePage(),
    createActivityHubPage(),
  ])

  // 既存 📊 ダッシュボードを rich化 (newPages 引数渡す)
  await buildDailyDashboard(counts, { pipeline: pipelineId, revenue: revenueId, activity: activityId })

  // 親ハブを simplification
  await simplifyParentHub({
    pipeline: pipelineId,
    revenue: revenueId,
    activity: activityId,
  })

  console.log(`
✅ Sprint 18 完了:

新 dashboards:
  🎯 Pipeline Manager:  ${pipelineId ?? "(failed)"}
  💰 Revenue Dashboard: ${revenueId ?? "(failed)"}
  📞 Activity Hub:      ${activityId ?? "(failed)"}

既存 📊 営業ダッシュボード rich 化済 (4 KPI cards + 5 sections + multi-column)

親ハブ simplification 済 (4 dashboards へのナビゲーション + リファレンス 6 個 + DB 一覧)

📍 https://www.notion.so/35fa2b78f3fc81299d91e457889ee393
`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
