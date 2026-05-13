#!/usr/bin/env node
/**
 * scripts/notion-clean-rebuild-hub.mjs — Sprint 17 親ハブ smart 再構築
 *
 * 役割: DBs (child_database) と sub pages (child_page) は **絶対に触らず**、
 *       テキスト系ブロック (paragraph/heading/callout/bullet/toggle/divider/link_to_page/toc) のみ削除して
 *       クリーンなハブ構造を再構築. 過去のミス再発防止.
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY ?? "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"
const PARENT_PAGE_ID = "35fa2b78-f3fc-8129-9d91-e457889ee393"

// 削除する block type (DBs と sub pages は除外)
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

/* Block builders */
const T = (content, opts = {}) => {
  const ann = {}
  if (opts.bold) ann.bold = true
  if (opts.code) ann.code = true
  if (opts.color) ann.color = opts.color
  return Object.keys(ann).length
    ? { type: "text", text: { content }, annotations: ann }
    : { type: "text", text: { content } }
}
const linkT = (content, url) => ({ type: "text", text: { content, link: { url } } })

const b = {
  h1: (t) => ({ object: "block", type: "heading_1", heading_1: { rich_text: [T(t)] } }),
  h2: (t) => ({ object: "block", type: "heading_2", heading_2: { rich_text: [T(t)] } }),
  h3: (t) => ({ object: "block", type: "heading_3", heading_3: { rich_text: [T(t)] } }),
  p: (t) => ({ object: "block", type: "paragraph", paragraph: { rich_text: Array.isArray(t) ? t : [T(t)] } }),
  callout: (t, e, c = "default") => ({
    object: "block",
    type: "callout",
    callout: { rich_text: [T(t)], icon: { type: "emoji", emoji: e }, color: c },
  }),
  calloutR: (r, e, c = "default") => ({
    object: "block",
    type: "callout",
    callout: { rich_text: r, icon: { type: "emoji", emoji: e }, color: c },
  }),
  bullet: (t) => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [T(t)] } }),
  bulletR: (r) => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: r } }),
  divider: () => ({ object: "block", type: "divider", divider: {} }),
  toc: () => ({ object: "block", type: "table_of_contents", table_of_contents: { color: "default" } }),
}

const SUB_PAGE_LINK = (id, title, desc, emoji) =>
  b.calloutR(
    [linkT(title, `https://www.notion.so/${id.replace(/-/g, "")}`), T("\n"), T(desc, { color: "gray" })],
    emoji,
    "gray_background",
  )

/* Step 1: smart clear (DBs/sub pages 除外) */
async function smartClear() {
  console.log("🧹 Smart clear (DBs/sub pages を保護)...")
  const r = await n("GET", `/blocks/${PARENT_PAGE_ID}/children?page_size=100`)
  if (!r.ok) {
    console.error("  ❌ Get children failed")
    return
  }
  const blocks = r.data.results || []
  const toDelete = blocks.filter((bl) => SAFE_TO_DELETE.has(bl.type))
  const toKeep = blocks.filter((bl) => !SAFE_TO_DELETE.has(bl.type))

  console.log(`  Found ${blocks.length} blocks: ${toDelete.length} to delete / ${toKeep.length} to keep`)
  console.log(`  Keeping: ${toKeep.map((b) => b.type).join(", ")}`)

  for (const block of toDelete) {
    await n("DELETE", `/blocks/${block.id}`)
  }
  console.log(`  ✅ ${toDelete.length} text blocks deleted・DBs と sub pages は完全保護`)
}

/* Step 2: clean hub 構築 */
async function buildHub() {
  console.log("🏛️ Clean hub 構築中...")

  // Sub page IDs (Sprint 14 + Sprint 17)
  const SUB = {
    quickStart: null, // 旧 Sprint 14 で作成・ID 不明・skip
    dashboard: "35fa2b78-f3fc-81d0-b842-c0ed182103dc",
    usage: "35fa2b78-f3fc-81c3-b26a-f80a3770208d",
    strategy: "35fa2b78-f3fc-819c-b5d6-e2f95e677265",
    setup: "35fa2b78-f3fc-81dd-8dda-e455d1f20d09",
    r2: "35fa2b78-f3fc-8163-8e90-c55cc0218ad5",
    syncFlow: "35fa2b78-f3fc-81ed-be7c-c636fadea0c8",
    faq: "35fa2b78-f3fc-81b2-abb1-dd0e837c6521",
  }

  const blocks = [
    // ── Hero ──
    b.calloutR(
      [
        T("Paradigm 営業 OS — Salesforce × Apollo × DocuSign × cal.com 統合", { bold: true }),
        T("\n3 層分業設計: ", { color: "gray" }),
        T("Supabase = SSOT", { bold: true }),
        T(" (機械可読・整合性) / "),
        T("Notion = GUI", { bold: true }),
        T(" (人間操作 UI) / "),
        T("Cloudflare R2 = 大ファイル", { bold: true }),
        T(" (動画/PDF). 5min cron で完全双方向 sync."),
      ],
      "🎯",
      "blue_background",
    ),
    b.p(""),

    // ── TOC ──
    b.toc(),
    b.divider(),

    // ── ナビゲーション (sub pages) ──
    b.h1("📂 ナビゲーション"),
    b.p("配下サブページから目的に応じて開いてください。本ページは「全 DB を一覧する hub」です。"),
    b.p(""),

    b.h2("🎓 学習・運用"),
    SUB_PAGE_LINK(SUB.usage, "📖 使い方ガイド", "営業フロー 5 ステップ (リード獲得→診断→営業→成約→納品)", "📖"),
    SUB_PAGE_LINK(SUB.strategy, "🎓 業種別営業戦略", "8 業種 (美容/歯科/飲食/建設/会計/小売/清掃/コンサル) × Hook 知識", "🎓"),
    SUB_PAGE_LINK(SUB.dashboard, "📊 営業ダッシュボード", "朝一画面・4 DB 主要 view を 1 画面集約", "📊"),
    SUB_PAGE_LINK(SUB.faq, "❓ FAQ", "7 質問: 業種追加 / A/B テスト / MP4 化 / cal.com / DocuSign 等", "❓"),
    b.p(""),

    b.h2("🛠️ システム仕様"),
    SUB_PAGE_LINK(SUB.setup, "🔧 Setup & Environment", "Coolify env (15 vars) + 6 cron + Slack 設定の完全リファレンス", "🔧"),
    SUB_PAGE_LINK(SUB.r2, "🗄️ R2 Storage Spec", "動画/PDF/提案資料の保存先仕様 + R2 セットアップ + コスト試算", "🗄️"),
    SUB_PAGE_LINK(SUB.syncFlow, "📚 Architecture & Sync Flow", "Supabase ↔ Notion 双方向 sync 仕様 + 編集可能フィールド + Conflict 解決", "📚"),
    b.p(""),

    b.divider(),

    // ── 8 main DBs section header (DBs 自体は既に child_database として下に表示される) ──
    b.h1("🗄️ メインデータベース"),
    b.calloutR(
      [
        T("8 main DBs (Supabase 双方向 sync 対象)", { bold: true }),
        T(" + Sprint 17 で 3 新 DB 追加 (Activities / Calendar / Contracts)."),
        T("\n下記に Notion DBs が自動表示されます (child_database)。各 DB をクリックして詳細 view に入る。"),
      ],
      "📊",
      "yellow_background",
    ),
    b.p(""),

    b.h3("🇯🇵 日本市場 (region='jp')"),
    b.bullet("🎯 リード DB — Paradigm 営業の中心 / 7 leads + 30+ API 自動エンリッチ"),
    b.bullet("🏢 顧客 DB — MRR + 健全度 + WL 一元管理 / LTV/契約継続月 自動計算"),
    b.bullet("📦 納品 DB — 60s 動画 / Web 制作 / MEO レポート tracking"),
    b.bullet("📝 テンプレ DB — 8 業種 × 7 課題 = 56 templates / 編集 → 5min で本番反映"),
    b.p(""),

    b.h3("🌍 海外市場 (region='global'・11 locale 共通)"),
    b.bullet("🌍 Leads — 11 locale 対応 / 同じく 30+ API auto-enrich"),
    b.bullet("🌍 Customers — USD 月額 / 5 商品 multi-select / WL 海外代理店"),
    b.bullet("🌍 Deliveries — 同上・en 表示"),
    b.bullet("🌍 Templates — 56 en templates (5 段階フレーム encode 済)"),
    b.p(""),

    b.h3("🆕 Salesforce × Apollo 級装備 (Sprint 17)"),
    b.bullet("📞 アクティビティログ — 全営業活動を時系列ログ (Salesforce Activity Timeline 相当)"),
    b.bullet("📅 商談カレンダー — cal.com 統合・Discovery/Demo/Proposal/Closing 一元管理"),
    b.bullet("📄 契約書 DB — DocuSign 統合・PDF (R2) + 7 通貨 + 9 状態管理"),
    b.p(""),

    b.divider(),

    // ── Sync 統計 ──
    b.h1("📊 現状データ集計"),
    b.bulletR([T("Templates: ", { bold: true }), T("112 件 (jp 56 + global 56)")]),
    b.bulletR([T("Companies: ", { bold: true }), T("7 leads (seed) + Apollo CSV import で随時拡張")]),
    b.bulletR([T("Notion DBs: ", { bold: true }), T("11 個 (jp 4 + global 4 + Sprint 17 新 3)")]),
    b.bulletR([T("Sub pages: ", { bold: true }), T("7 個 (Dashboard / 使い方 / 戦略 / Setup / R2 / SyncFlow / FAQ)")]),
    b.bulletR([T("Source plugins (30+ API): ", { bold: true }), T("8 source 実装済 (PSI + gBizInfo + HTML + Wappalyzer + Hunter + SSL + Whois + Places)")]),
    b.p(""),

    b.divider(),

    // ── Footer ──
    b.calloutR(
      [
        T("Repository: ", { bold: true }),
        linkT("Paradigmllc/Paradigmjpcom", "https://github.com/Paradigmllc/Paradigmjpcom"),
        T(" · Production: "),
        linkT("paradigmjp.com", "https://paradigmjp.com"),
        T(" · Sprint 17 完了 2026-05-13"),
      ],
      "🚀",
      "default",
    ),
  ]

  // Notion API は children 一括追加で最大 100 blocks/req
  console.log(`  Appending ${blocks.length} blocks...`)
  for (let i = 0; i < blocks.length; i += 90) {
    const chunk = blocks.slice(i, i + 90)
    const r = await n("PATCH", `/blocks/${PARENT_PAGE_ID}/children`, { children: chunk })
    if (!r.ok) {
      console.error(`  ❌ chunk:`, JSON.stringify(r.data).slice(0, 200))
      return false
    }
  }
  console.log(`  ✅ ${blocks.length} blocks added`)
  return true
}

async function main() {
  console.log("🚀 Sprint 17 親ハブ smart 再構築開始 (DBs/sub pages 保護)\n")
  await smartClear()
  await buildHub()
  console.log(`
✅ 完了:
  - DBs: 全 11 個保護 (削除されない)
  - Sub pages: 全 7 個保護
  - 親ハブ: クリーンな構造 (Hero + TOC + Sub pages nav + DB 概観 + 集計)

  親ハブ: https://www.notion.so/35fa2b78f3fc81299d91e457889ee393
`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
