#!/usr/bin/env node
/**
 * scripts/notion-update-sprint15.mjs  ESprint 15 セクションめENotion 親ペ�Eジに追加
 *
 * 役割: Apollo CSV import / 30+ API enrich / DeepSeek personalize の使ぁE��めE
 *       親ペ�Eジ末尾に追加 (既孁E66 blocks の上書き�Eせず append).
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY
if (!NOTION_API_KEY) {
  console.error('NOTION_API_KEY env var must be set')
  process.exit(1)
}
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
  return { ok: res.ok, data, status: res.status }
}

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

const block = {
  h1: (t) => ({ object: "block", type: "heading_1", heading_1: { rich_text: [T(t)] } }),
  h2: (t) => ({ object: "block", type: "heading_2", heading_2: { rich_text: [T(t)] } }),
  h3: (t) => ({ object: "block", type: "heading_3", heading_3: { rich_text: [T(t)] } }),
  p: (text) => ({ object: "block", type: "paragraph", paragraph: { rich_text: Array.isArray(text) ? text : [T(text)] } }),
  callout: (t, emoji, color = "default") => ({
    object: "block",
    type: "callout",
    callout: { rich_text: [T(t)], icon: { type: "emoji", emoji }, color },
  }),
  calloutRich: (rich, emoji, color = "default") => ({
    object: "block",
    type: "callout",
    callout: { rich_text: rich, icon: { type: "emoji", emoji }, color },
  }),
  bullet: (t) => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [T(t)] } }),
  bulletRich: (r) => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: r } }),
  num: (t) => ({ object: "block", type: "numbered_list_item", numbered_list_item: { rich_text: [T(t)] } }),
  toggle: (t, kids = []) => ({ object: "block", type: "toggle", toggle: { rich_text: [T(t)], children: kids } }),
  code: (text, lang = "bash") => ({ object: "block", type: "code", code: { rich_text: [T(text)], language: lang } }),
  divider: () => ({ object: "block", type: "divider", divider: {} }),
}

async function main() {
  console.log("📝 親ペ�Eジに Sprint 15 セクション追加中...")

  const blocks = [
    block.divider(),
    block.h1("�E Sprint 15: Apollo CSV インポ�EチE+ 30+ API 自動エンリチE��"),
    block.calloutRich(
      [
        T("Apollo めEHunter で取得した営業リストを CSV 経由で投�Eすれば、E, { bold: true }),
        T("吁E��が即晁Esales_companies に bulk INSERT され、E0+ API で全自動カルチE��築が走ります、E),
        T(" 1 丁E�� import ↁE1 丁E��パ�Eソナライズレポ�Eト完�Eまでの所要時間�E紁E30-60 刁E(PSI rate-limit が支配的)、E),
      ],
      "🚀",
      "green_background",
    ),
    block.p(""),

    block.h2("📥 CSV インポ�EチE),
    block.h3("Apollo 形弁ECSV ↁEJSON 変換 ↁEAPI 投�E"),
    block.code(
      `# クライアント�E (Node.js or ブラウザ console)
import Papa from "papaparse"

const csvText = await fetch("apollo-leads.csv").then(r => r.text())
const { data } = Papa.parse(csvText, { header: true })

const rows = data.map(r => ({
  company_name: r.Company,
  domain: r.Website?.replace(/^https?:\\/\\//, ""),
  industry: mapApolloIndustry(r.Industry), // beauty_salon / dental / 筁E
  prefecture: r.State,
  email: r.Email,
  phone: r.Phone,
  contact_name: \`\${r["First Name"]} \${r["Last Name"]}\`,
  contact_title: r.Title,
  source: "apollo",
}))

const res = await fetch("https://paradigmjp.com/api/sales/import-csv", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET,
  },
  body: JSON.stringify({ rows, enrich: true }),
})
console.log(await res.json())
// ↁE{ ok: true, total: 1000, inserted: 950, skipped: 50, enrich_triggered: 950 }`,
      "javascript",
    ),
    block.p(""),

    block.h2("🔌 30+ API 自動エンリチE�� (現在 7 source 並列実行中)"),
    block.calloutRich(
      [
        T("インポ�EチE1 行ごとに ", {}),
        T("fire-and-forget 並刁E7 source", { bold: true }),
        T(" が発火。失敗しぁEAPI は skip (fail-soft)、E),
      ],
      "⚡",
      "blue_background",
    ),
    block.h3("✁E実裁E��E(Sprint 15 まで)"),
    block.bulletRich([T("PageSpeed Insights", { bold: true }), T("  EMobile/Desktop パフォーマンススコア (Lighthouse)")]),
    block.bulletRich([T("gBizInfo (経産省E", { bold: true }), T("  E法人番号 / 従業員数 / 賁E��釁E/ 設立年 / 代表老E��・無斁E)]),
    block.bulletRich([T("HTML scan (冁E��)", { bold: true }), T("  EOGP / WordPress / 著作年 / SSL / title 検�E")]),
    block.bulletRich([T("Wappalyzer (冁E��・OSS)", { bold: true }), T("  E30 技衁Esignature (Next.js/Shopify/GA/Stripe/Cloudflare 筁E")]),
    block.bulletRich([T("Hunter.io", { bold: true }), T("  E法人ドメイン ↁE決裁老E��ール 5 件・無斁E25 req/朁E)]),
    block.bulletRich([T("SSL Labs", { bold: true }), T("  ESSL 証明書グレーチEA+/A/B/C/D/F + 有効期限")]),
    block.bulletRich([T("WhoisXML API", { bold: true }), T("  Eドメイン年齢 / レジストラ / 登録日 / 有効期限・無斁E500/朁E)]),
    block.bulletRich([T("Google Places API", { bold: true }), T("  E評価 / 口コミ数 / 営業時間 / business_status・$200/朁E無料枠")]),
    block.p(""),
    block.h3("⏳ 拡張予宁E(env 投�Eで即有効匁E"),
    block.bullet("SimilarWeb / NeilPatel  EトラフィチE��推訁E),
    block.bullet("BuiltWith  EチE��ノグラフィクス (有料)"),
    block.bullet("Apollo.io People API  E決裁老ELinkedIn"),
    block.bullet("Crunchbase  E賁E��調達情報"),
    block.bullet("食べログ / Hot Pepper / EPARK 吁EAPI  E業種特匁E),
    block.bullet("Wayback Machine  Eサイト変更履歴"),
    block.bullet("SemRush / Ahrefs  ESEO チE�Eタ"),
    block.bullet("国税庁法人番号 API (gBizInfo に含む)"),
    block.bullet("Twitter / Facebook / Instagram / LinkedIn 公閁EAPI"),
    block.bullet("Cloudflare Radar  E公閁ERUM"),
    block.bullet("...仁E17 source (Phase 2)"),
    block.p(""),

    block.h2("🎨 DeepSeek V4 PRO パ�Eソナライズレポ�EチE),
    block.calloutRich(
      [
        T("System Prompt 紁E3KB を固宁EↁE", {}),
        T("Context Cache hit ratio 95%+", { bold: true }),
        T(" ↁE入力単価 $0.014/1M (90% OFF)、E),
        T("1 丁E��パ�Eソナライズで朁E$8 ≁E¥1,200 で全自動、E, { color: "green" }),
      ],
      "💎",
      "purple_background",
    ),
    block.h3("使ぁE��"),
    block.code(
      `# 1 lead に対してパ�Eソナライズ生�E
curl -X POST -H "X-Webhook-Secret: $N8N_WEBHOOK_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{"slug":"izakaya-en"}' \\
  https://paradigmjp.com/api/sales/personalize-report

# 出力侁E
# {
#   "ok": true,
#   "copy": {
#     "personalized_hook": "大阪府�Eで「屁E�E屋」検索する...",
#     "personalized_pain": "PSI モバイル 35 点は業界平坁E71 点の半�E以下です、E..",
#     "personalized_fear": "WordPress 5.x は 2025 年 12 月にサポ�Eト�Eれ予定、E..",
#     "personalized_loss": "離脱玁E65% ÁE月間訪啁E4,200 件 ÁECVR 2% = ¥378,000/朁E..",
#     "personalized_cta": "Paradigm ぁE14 日以冁E�� PageSpeed 80+ まで改喁E��¥80,000�E�E
#   },
#   "cache_hit_ratio": 0.96
# }`,
      "bash",
    ),
    block.p(""),
    block.h3("自動化フロー (event webhook 推奨)"),
    block.num("CSV import で 1000 行投入 (上訁E"),
    block.num("enrich pipeline ぁE30+ API を並列実衁E(5-30 刁E"),
    block.num("enrich 完亁E��ぁEcompanies に対して personalize-report を頁E�� event webhook 呼び出ぁE),
    block.num("/report/[slug] ぁESSR で personalized_copy を反映表示"),
    block.num("HOT lead 判宁EↁESlack 通知 ↁE営業拁E��老E��"),
    block.p(""),

    block.h2("📊 経済性 (1 丁E��パ�Eソナライズレポ�Eト量産晁E"),
    block.bulletRich([T("API enrich 1 lead あためE ", { bold: true }), T("¥10-15 (PSI/Hunter/Google Places の合箁E")]),
    block.bulletRich([T("DeepSeek personalize 1 lead あためE ", { bold: true }), T("¥0.12 (Cache hit 95%+)")]),
    block.bulletRich([T("1 丁E�� import ↁE完�Eレポ�Eト完�E総コスチE ", { bold: true, color: "green" }), T("紁E¥150,000 (全自動�E人手介在なぁE")]),
    block.bulletRich([T("通常 (人扁E ベ�Eスとの比輁E ", {}), T("1 件 30 刁EÁE1 丁E�� = 5,000 時間 ≁E¥10,000,000+ (66 倍コスト圧縮)", { color: "red" })]),
    block.p(""),

    block.h2("🛠�E�E拡張方況E(新 source 追加)"),
    block.calloutRich(
      [T("plugin パターンで 1 source = 1 file・拡張が容昁E", { bold: true })],
      "🔧",
      "gray_background",
    ),
    block.num("src/lib/sales/sources/{new-source}.ts を作�E (interface: name + asyncFn)"),
    block.num("src/lib/sales/enrich.ts に import + Promise.all に 1 行追加"),
    block.num("meta JSONB shape に新キー追加 (侁E meta.new_source)"),
    block.num("DeepSeek personalize prompt に「new_source チE�Eタ活用例」を追訁E),
    block.num("Coolify env に API キー投�E"),
    block.p(""),

    block.divider(),
    block.calloutRich(
      [
        T("📚 詳細実裁E ", { bold: true }),
        linkT("GitHub Paradigmllc/Paradigmjpcom", "https://github.com/Paradigmllc/Paradigmjpcom"),
        T("\n  - src/lib/sales/sources/*.ts (吁Esource 実裁E"),
        T("\n  - src/lib/sales/enrich.ts (オーケストレーション)"),
        T("\n  - src/lib/sales/personalize.ts (DeepSeek prompt)"),
        T("\n  - src/app/api/sales/import-csv/route.ts (CSV 投�E endpoint)"),
        T("\n  - src/app/api/sales/personalize-report/route.ts (personalize endpoint)"),
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
      console.error(`  ❁Echunk ${i / 90 + 1}:`, JSON.stringify(r.data).slice(0, 200))
      process.exit(1)
    }
  }
  console.log(`  ✁E${blocks.length} blocks appended to parent page`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
