#!/usr/bin/env node
/**
 * scripts/notion-update-sprint16.mjs 窶・Sprint 16 繧ｰ繝ｭ繝ｼ繝舌Ν迚・+ 繝・Φ繝励Ξ邱ｨ髮・ヵ繝ｭ繝ｼ繧・Notion 隕ｪ繝壹・繧ｸ縺ｫ霑ｽ蜉
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
  console.log("統 隕ｪ繝壹・繧ｸ縺ｫ Sprint 16 繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ霑ｽ蜉荳ｭ...")

  const blocks = [
    b.divider(),
    b.h1("訣 Sprint 16: 繧ｰ繝ｭ繝ｼ繝舌Ν迚・+ 繝・Φ繝励Ξ邱ｨ髮・・蜍・sync"),
    b.calloutR(
      [
        T("Sprint 16 縺ｧ 2 螟ｧ讖溯・霑ｽ蜉:", { bold: true }),
        T("\n1. "),
        T("Region 蛻・屬 (jp / global)", { bold: true }),
        T(": Supabase + Notion 荳｡譁ｹ縺ｧ 4 DB 繧・2 蛟榊喧縲Ｋp = 譌･譛ｬ蟶ょｴ / global = 豬ｷ螟・11 locale縲・),
        T("\n2. "),
        T("繝・Φ繝励Ξ邱ｨ髮・竊・5min 閾ｪ蜍・sync", { bold: true }),
        T(": Notion 縺ｧ譁・擇邱ｨ髮・竊・event webhook 縺ｧ Supabase 蜿肴丐 竊・/report/[slug] 縺梧怙螟ｧ 6 蛻・〒譖ｴ譁ｰ縲・),
      ],
      "訣",
      "green_background",
    ),
    b.p(""),

    b.h2("亮・・Region 蛻・屬繧｢繝ｼ繧ｭ繝・け繝√Ε"),
    b.calloutR(
      [
        T("s10-5 SALES-CENTER 豌ｸ荵・Ν繝ｼ繝ｫ貅匁侠 (蝗ｽ繝峨Μ繝悶Φ):", { bold: true }),
        T("\n窶｢ Supabase 4 繝・・繝悶Ν蜈ｨ縺ｦ縺ｫ region TEXT NOT NULL CHECK ('jp', 'global')"),
        T("\n窶｢ Notion 4 DB 繧・jp / global 縺ｧ 2 繧ｻ繝・ヨ荳ｦ蛻・(蜷郁ｨ・8 DB)"),
        T("\n窶｢ /[locale]/report/[slug] 縺・locale 竊・region 閾ｪ蜍募愛螳・(ja=jp / others=global)"),
        T("\n窶｢ 豺ｷ蝨ｨ縺ｯ silently-leak 繝舌げ縺ｮ貂ｩ蠎・竊・邨ｶ蟇ｾ遖∵ｭ｢"),
      ],
      "白",
      "purple_background",
    ),

    b.h3("・・ 譌･譛ｬ蟶ょｴ (region='jp')"),
    b.bulletR([T("識 繝ｪ繝ｼ繝・DB: ", { bold: true }), linkT("8cbab1f5...", "https://www.notion.so/8cbab1f501144f83872c1738ce3e79c4")]),
    b.bulletR([T("召 鬘ｧ螳｢ DB: ", { bold: true }), linkT("86b1d93e...", "https://www.notion.so/86b1d93e3b854862ae7b2750d2585677")]),
    b.bulletR([T("逃 邏榊刀 DB: ", { bold: true }), linkT("b3cbef9d...", "https://www.notion.so/b3cbef9dd96f4e5bbbecc404c703a298")]),
    b.bulletR([T("統 繝・Φ繝励Ξ DB: ", { bold: true }), linkT("115e2b0e...", "https://www.notion.so/115e2b0e79424bb0813fc05402096f95"), T(" (56 莉ｶ ja)")]),
    b.bullet("URL: paradigmjp.com/ja/report/[莠区･ｭ閠・錐]"),
    b.p(""),

    b.h3("訣 豬ｷ螟門ｸょｴ (region='global'繝ｻ11 locale 蜈ｱ騾・"),
    b.bulletR([T("訣 Leads (Global): ", { bold: true }), linkT("35fa2b78-...8107", "https://www.notion.so/35fa2b78f3fc8107aa0bf28694e1009c")]),
    b.bulletR([T("訣 Customers (Global): ", { bold: true }), linkT("35fa2b78-...81aa", "https://www.notion.so/35fa2b78f3fc81aab57ffcc729431181")]),
    b.bulletR([T("訣 Deliveries (Global): ", { bold: true }), linkT("35fa2b78-...81e2", "https://www.notion.so/35fa2b78f3fc81e2a5c3d7b9b9d7f5a9")]),
    b.bulletR([T("訣 Templates (Global): ", { bold: true }), linkT("35fa2b78-...817f", "https://www.notion.so/35fa2b78f3fc817f8e05ca06234adac4"), T(" (56 莉ｶ en)")]),
    b.bullet("URL: paradigmjp.com/{en|ko|zh|de|fr|es|pt|ru|ar|vi|id}/report/[slug]"),
    b.p(""),

    b.h2("統 繝・Φ繝励Ξ邱ｨ髮・竊・5min 閾ｪ蜍・sync"),
    b.calloutR(
      [T("Notion 縺ｧ譁・擇邱ｨ髮・☆繧九→縲・ min event webhook 縺・Supabase 縺ｫ蜿肴丐縲∵怙螟ｧ 6 蛻・〒譛ｬ逡ｪ /report/[slug] 縺梧峩譁ｰ縺輔ｌ縺ｾ縺吶・, { bold: true })],
      "売",
      "blue_background",
    ),
    b.h3("驕狗畑繝輔Ο繝ｼ"),
    b.num("Notion 統 / 訣 繝・Φ繝励Ξ DB 繧帝幕縺・),
    b.num("蟇ｾ雎｡繝・Φ繝励Ξ縺ｮ縲敬eadline縲阪継ain縲阪掲ear縲阪畦oss縲阪慶ta_text縲阪・繝ｭ繝代ユ繧｣繧堤ｷｨ髮・),
    b.num("Notion 縺・last_edited_time 繧定・蜍墓峩譁ｰ"),
    b.num("event webhook (n8n or Coolify scheduled task) 縺・/api/sales/sync-templates-from-notion 繧貞娼縺・),
    b.num("Supabase sales_templates 縺悟・莉ｶ upsert (notion_page_id 縺ｧ驥崎､・亟豁｢)"),
    b.num("/report/[slug] 縺梧ｬ｡蝗・SSR (revalidate=60s) 縺ｧ譁ｰ譁・擇陦ｨ遉ｺ"),
    b.num("邱ｨ髮・°繧画怙螟ｧ 6 蛻・〒譛ｬ逡ｪ蜿肴丐螳御ｺ・),
    b.p(""),

    b.h3("謇句虚 trigger (蜊ｳ譎ょ渚譏縺励◆縺・凾)"),
    b.code(
      `# jp templates 蜈ｨ莉ｶ sync (5min 蠕・◆縺壹↓莉翫☆縺仙渚譏)
curl -X POST -H "X-Webhook-Secret: $N8N_WEBHOOK_SECRET" \\
  -H "Content-Type: application/json" -d '{"region":"jp"}' \\
  https://paradigmjp.com/api/sales/sync-templates-from-notion

# global templates 蜈ｨ莉ｶ sync
curl -X POST -H "X-Webhook-Secret: $N8N_WEBHOOK_SECRET" \\
  -H "Content-Type: application/json" -d '{"region":"global"}' \\
  https://paradigmjp.com/api/sales/sync-templates-from-notion

# 蜃ｺ蜉帑ｾ・ { ok: true, region, total: 56, synced: 56, errors_count: 0 }`,
      "bash",
    ),
    b.p(""),

    b.h2("屏・・Coolify event webhook 縺ｧ閾ｪ蜍募喧"),
    b.toggle("event webhook 險ｭ螳壽焔鬆・(Event Webhooks)", [
      b.num("Coolify 繝繝・す繝･繝懊・繝・竊・paradigm-hp app 竊・Scheduled Tasks"),
      b.num("Add Scheduled Task 竊・Cron: */5 * * * * (5 min 縺斐→)"),
      b.num("Command: curl -X POST -H 'X-Webhook-Secret: $N8N_WEBHOOK_SECRET' -d '{\"region\":\"jp\"}' https://paradigmjp.com/api/sales/sync-templates-from-notion"),
      b.num("Save 竊・5 min 縺斐→縺ｫ閾ｪ蜍募ｮ溯｡・(jp + global 繧貞挨 task 縺ｨ縺励※逋ｻ骭ｲ謗ｨ螂ｨ)"),
    ]),
    b.p(""),

    b.h2("投 迴ｾ迥ｶ繝・・繧ｿ髮・ｨ・),
    b.bulletR([T("Templates 邱乗焚: ", { bold: true }), T("112 莉ｶ (jp 56 + global 56繝ｻ8 industries ﾃ・7 issues ﾃ・2 region)")]),
    b.bulletR([T("Companies: ", { bold: true }), T("8 莉ｶ (jp 7 seed + 1 demo) 繝ｻglobal 縺ｯ import 蠕・■")]),
    b.bulletR([T("Notion DBs: ", { bold: true }), T("8 蛟・(jp 4 + global 4)")]),
    b.p(""),

    b.divider(),
    b.calloutR(
      [
        T("答 隧ｳ邏ｰ螳溯｣・(Sprint 16):", { bold: true }),
        T("\n窶｢ migration: "),
        linkT("supabase/migrations/sales_region_split_jp_global.sql", "https://github.com/Paradigmllc/Paradigmjpcom/blob/main/supabase/migrations"),
        T("\n窶｢ lib/sales/types.ts (REGIONS + localeToRegion)"),
        T("\n窶｢ lib/sales/{companies,templates,diagnostic}.ts (region-aware filter)"),
        T("\n窶｢ src/app/api/sales/sync-templates-from-notion/route.ts"),
        T("\n窶｢ scripts/notion-create-global-dbs.mjs"),
        T("\n窶｢ scripts/seed-global-templates.mjs"),
      ],
      "唐",
      "default",
    ),
  ]

  console.log(`  Appending ${blocks.length} blocks...`)
  for (let i = 0; i < blocks.length; i += 90) {
    const chunk = blocks.slice(i, i + 90)
    const r = await n("PATCH", `/blocks/${PARENT_PAGE_ID}/children`, { children: chunk })
    if (!r.ok) {
      console.error(`  笶・chunk ${i / 90 + 1}:`, JSON.stringify(r.data).slice(0, 200))
      process.exit(1)
    }
  }
  console.log(`  笨・${blocks.length} blocks appended`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
