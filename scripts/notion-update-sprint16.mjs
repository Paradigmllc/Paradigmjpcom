#!/usr/bin/env node
/**
 * scripts/notion-update-sprint16.mjs — Sprint 16 グローバル版 + テンプレ編集フローを Notion 親ページに追加
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY ?? "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"
const PARENT_PAGE_ID = "35fa2b78-f3fc-8129-9d91-e457889ee393"

let lastCall = 0
async function n(method, path, body) {
  const now = Date.now()
  if (now - lastCall < 350) await new Promise((r) => setTimeout(r, 350 - (now - lastCall)))
  lastCall = Date.now()
  const opts = { method, headers: { Authorization: `Bearer ${NOTION_API_KEY}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" } }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`https://api.notion.com/v1${path}`, opts)
  return res.json().then((data) => ({ ok: res.ok, data }))
}

const T = (content, opts = {}) => {
  const ann = {}
  if (opts.bold) ann.bold = true
  if (opts.code) ann.code = true
  if (opts.color) ann.color = opts.color
  return Object.keys(ann).length ? { type: "text", text: { content }, annotations: ann } : { type: "text", text: { content } }
}
const linkT = (content, url) => ({ type: "text", text: { content, link: { url } } })
const b = {
  h1: (t) => ({ object: "block", type: "heading_1", heading_1: { rich_text: [T(t)] } }),
  h2: (t) => ({ object: "block", type: "heading_2", heading_2: { rich_text: [T(t)] } }),
  h3: (t) => ({ object: "block", type: "heading_3", heading_3: { rich_text: [T(t)] } }),
  p: (t) => ({ object: "block", type: "paragraph", paragraph: { rich_text: Array.isArray(t) ? t : [T(t)] } }),
  callout: (t, e, c = "default") => ({ object: "block", type: "callout", callout: { rich_text: [T(t)], icon: { type: "emoji", emoji: e }, color: c } }),
  calloutR: (r, e, c = "default") => ({ object: "block", type: "callout", callout: { rich_text: r, icon: { type: "emoji", emoji: e }, color: c } }),
  bullet: (t) => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [T(t)] } }),
  bulletR: (r) => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: r } }),
  num: (t) => ({ object: "block", type: "numbered_list_item", numbered_list_item: { rich_text: [T(t)] } }),
  toggle: (t, kids = []) => ({ object: "block", type: "toggle", toggle: { rich_text: [T(t)], children: kids } }),
  code: (text, lang = "bash") => ({ object: "block", type: "code", code: { rich_text: [T(text)], language: lang } }),
  divider: () => ({ object: "block", type: "divider", divider: {} }),
  linkedDb: (id) => ({ object: "block", type: "link_to_page", link_to_page: { type: "database_id", database_id: id } }),
}

async function main() {
  console.log("📝 親ページに Sprint 16 セクション追加中...")

  const blocks = [
    b.divider(),
    b.h1("🌍 Sprint 16: グローバル版 + テンプレ編集自動 sync"),
    b.calloutR(
      [
        T("Sprint 16 で 2 大機能追加:", { bold: true }),
        T("\n1. "),
        T("Region 分離 (jp / global)", { bold: true }),
        T(": Supabase + Notion 両方で 4 DB を 2 倍化。jp = 日本市場 / global = 海外 11 locale。"),
        T("\n2. "),
        T("テンプレ編集 → 5min 自動 sync", { bold: true }),
        T(": Notion で文面編集 → cron で Supabase 反映 → /report/[slug] が最大 6 分で更新。"),
      ],
      "🌍",
      "green_background",
    ),
    b.p(""),

    b.h2("🗺️ Region 分離アーキテクチャ"),
    b.calloutR(
      [
        T("s10-5 SALES-CENTER 永久ルール準拠 (国ドリブン):", { bold: true }),
        T("\n• Supabase 4 テーブル全てに region TEXT NOT NULL CHECK ('jp', 'global')"),
        T("\n• Notion 4 DB を jp / global で 2 セット並列 (合計 8 DB)"),
        T("\n• /[locale]/report/[slug] が locale → region 自動判定 (ja=jp / others=global)"),
        T("\n• 混在は silently-leak バグの温床 → 絶対禁止"),
      ],
      "🔒",
      "purple_background",
    ),

    b.h3("🇯🇵 日本市場 (region='jp')"),
    b.bulletR([T("🎯 リード DB: ", { bold: true }), linkT("8cbab1f5...", "https://www.notion.so/8cbab1f501144f83872c1738ce3e79c4")]),
    b.bulletR([T("🏢 顧客 DB: ", { bold: true }), linkT("86b1d93e...", "https://www.notion.so/86b1d93e3b854862ae7b2750d2585677")]),
    b.bulletR([T("📦 納品 DB: ", { bold: true }), linkT("b3cbef9d...", "https://www.notion.so/b3cbef9dd96f4e5bbbecc404c703a298")]),
    b.bulletR([T("📝 テンプレ DB: ", { bold: true }), linkT("115e2b0e...", "https://www.notion.so/115e2b0e79424bb0813fc05402096f95"), T(" (56 件 ja)")]),
    b.bullet("URL: paradigmjp.com/ja/report/[事業者名]"),
    b.p(""),

    b.h3("🌍 海外市場 (region='global'・11 locale 共通)"),
    b.bulletR([T("🌍 Leads (Global): ", { bold: true }), linkT("35fa2b78-...8107", "https://www.notion.so/35fa2b78f3fc8107aa0bf28694e1009c")]),
    b.bulletR([T("🌍 Customers (Global): ", { bold: true }), linkT("35fa2b78-...81aa", "https://www.notion.so/35fa2b78f3fc81aab57ffcc729431181")]),
    b.bulletR([T("🌍 Deliveries (Global): ", { bold: true }), linkT("35fa2b78-...81e2", "https://www.notion.so/35fa2b78f3fc81e2a5c3d7b9b9d7f5a9")]),
    b.bulletR([T("🌍 Templates (Global): ", { bold: true }), linkT("35fa2b78-...817f", "https://www.notion.so/35fa2b78f3fc817f8e05ca06234adac4"), T(" (56 件 en)")]),
    b.bullet("URL: paradigmjp.com/{en|ko|zh|de|fr|es|pt|ru|ar|vi|id}/report/[slug]"),
    b.p(""),

    b.h2("📝 テンプレ編集 → 5min 自動 sync"),
    b.calloutR(
      [T("Notion で文面編集すると、5 min cron が Supabase に反映、最大 6 分で本番 /report/[slug] が更新されます。", { bold: true })],
      "🔄",
      "blue_background",
    ),
    b.h3("運用フロー"),
    b.num("Notion 📝 / 🌍 テンプレ DB を開く"),
    b.num("対象テンプレの「headline」「pain」「fear」「loss」「cta_text」プロパティを編集"),
    b.num("Notion が last_edited_time を自動更新"),
    b.num("5 min cron (n8n or Coolify scheduled task) が /api/sales/sync-templates-from-notion を叩く"),
    b.num("Supabase sales_templates が全件 upsert (notion_page_id で重複防止)"),
    b.num("/report/[slug] が次回 SSR (revalidate=60s) で新文面表示"),
    b.num("編集から最大 6 分で本番反映完了"),
    b.p(""),

    b.h3("手動 trigger (即時反映したい時)"),
    b.code(
      `# jp templates 全件 sync (5min 待たずに今すぐ反映)
curl -X POST -H "X-Webhook-Secret: $N8N_WEBHOOK_SECRET" \\
  -H "Content-Type: application/json" -d '{"region":"jp"}' \\
  https://paradigmjp.com/api/sales/sync-templates-from-notion

# global templates 全件 sync
curl -X POST -H "X-Webhook-Secret: $N8N_WEBHOOK_SECRET" \\
  -H "Content-Type: application/json" -d '{"region":"global"}' \\
  https://paradigmjp.com/api/sales/sync-templates-from-notion

# 出力例: { ok: true, region, total: 56, synced: 56, errors_count: 0 }`,
      "bash",
    ),
    b.p(""),

    b.h2("🛠️ Coolify cron で自動化"),
    b.toggle("5 min cron 設定手順 (Coolify Scheduled Tasks)", [
      b.num("Coolify ダッシュボード → paradigm-hp app → Scheduled Tasks"),
      b.num("Add Scheduled Task → Cron: */5 * * * * (5 min ごと)"),
      b.num("Command: curl -X POST -H 'X-Webhook-Secret: $N8N_WEBHOOK_SECRET' -d '{\"region\":\"jp\"}' https://paradigmjp.com/api/sales/sync-templates-from-notion"),
      b.num("Save → 5 min ごとに自動実行 (jp + global を別 task として登録推奨)"),
    ]),
    b.p(""),

    b.h2("📊 現状データ集計"),
    b.bulletR([T("Templates 総数: ", { bold: true }), T("112 件 (jp 56 + global 56・8 industries × 7 issues × 2 region)")]),
    b.bulletR([T("Companies: ", { bold: true }), T("8 件 (jp 7 seed + 1 demo) ・global は import 待ち")]),
    b.bulletR([T("Notion DBs: ", { bold: true }), T("8 個 (jp 4 + global 4)")]),
    b.p(""),

    b.divider(),
    b.calloutR(
      [
        T("📚 詳細実装 (Sprint 16):", { bold: true }),
        T("\n• migration: "),
        linkT("supabase/migrations/sales_region_split_jp_global.sql", "https://github.com/Paradigmllc/Paradigmjpcom/blob/main/supabase/migrations"),
        T("\n• lib/sales/types.ts (REGIONS + localeToRegion)"),
        T("\n• lib/sales/{companies,templates,diagnostic}.ts (region-aware filter)"),
        T("\n• src/app/api/sales/sync-templates-from-notion/route.ts"),
        T("\n• scripts/notion-create-global-dbs.mjs"),
        T("\n• scripts/seed-global-templates.mjs"),
      ],
      "📂",
      "default",
    ),
  ]

  console.log(`  Appending ${blocks.length} blocks...`)
  for (let i = 0; i < blocks.length; i += 90) {
    const chunk = blocks.slice(i, i + 90)
    const r = await n("PATCH", `/blocks/${PARENT_PAGE_ID}/children`, { children: chunk })
    if (!r.ok) {
      console.error(`  ❌ chunk ${i / 90 + 1}:`, JSON.stringify(r.data).slice(0, 200))
      process.exit(1)
    }
  }
  console.log(`  ✅ ${blocks.length} blocks appended`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
