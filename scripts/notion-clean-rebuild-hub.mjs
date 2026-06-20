#!/usr/bin/env node
/**
 * scripts/notion-clean-rebuild-hub.mjs 窶・Sprint 17 隕ｪ繝上ヶ smart 蜀肴ｧ狗ｯ・
 *
 * 蠖ｹ蜑ｲ: DBs (child_database) 縺ｨ sub pages (child_page) 縺ｯ **邨ｶ蟇ｾ縺ｫ隗ｦ繧峨★**縲・
 *       繝・く繧ｹ繝育ｳｻ繝悶Ο繝・け (paragraph/heading/callout/bullet/toggle/divider/link_to_page/toc) 縺ｮ縺ｿ蜑企勁縺励※
 *       繧ｯ繝ｪ繝ｼ繝ｳ縺ｪ繝上ヶ讒矩繧貞・讒狗ｯ・ 驕主悉縺ｮ繝溘せ蜀咲匱髦ｲ豁｢.
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY
if (!NOTION_API_KEY) {
  console.error('NOTION_API_KEY env var must be set')
  process.exit(1)
}
const PARENT_PAGE_ID = "35fa2b78-f3fc-8129-9d91-e457889ee393"

// 蜑企勁縺吶ｋ block type (DBs 縺ｨ sub pages 縺ｯ髯､螟・
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

/* Step 1: smart clear (DBs/sub pages 髯､螟・ */
async function smartClear() {
  console.log("ｧｹ Smart clear (DBs/sub pages 繧剃ｿ晁ｭｷ)...")
  const r = await n("GET", `/blocks/${PARENT_PAGE_ID}/children?page_size=100`)
  if (!r.ok) {
    console.error("  笶・Get children failed")
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
  console.log(`  笨・${toDelete.length} text blocks deleted繝ｻDBs 縺ｨ sub pages 縺ｯ螳悟・菫晁ｭｷ`)
}

/* Step 2: clean hub 讒狗ｯ・*/
async function buildHub() {
  console.log("鋤・・Clean hub 讒狗ｯ我ｸｭ...")

  // Sub page IDs (Sprint 14 + Sprint 17)
  const SUB = {
    quickStart: null, // 譌ｧ Sprint 14 縺ｧ菴懈・繝ｻID 荳肴・繝ｻskip
    dashboard: "35fa2b78-f3fc-81d0-b842-c0ed182103dc",
    usage: "35fa2b78-f3fc-81c3-b26a-f80a3770208d",
    strategy: "35fa2b78-f3fc-819c-b5d6-e2f95e677265",
    setup: "35fa2b78-f3fc-81dd-8dda-e455d1f20d09",
    r2: "35fa2b78-f3fc-8163-8e90-c55cc0218ad5",
    syncFlow: "35fa2b78-f3fc-81ed-be7c-c636fadea0c8",
    faq: "35fa2b78-f3fc-81b2-abb1-dd0e837c6521",
  }

  const blocks = [
    // 笏笏 Hero 笏笏
    b.calloutR(
      [
        T("Paradigm 蝟ｶ讌ｭ OS 窶・Salesforce ﾃ・Apollo ﾃ・DocuSign ﾃ・cal.com 邨ｱ蜷・, { bold: true }),
        T("\n3 螻､蛻・･ｭ險ｭ險・ ", { color: "gray" }),
        T("Supabase = SSOT", { bold: true }),
        T(" (讖滓｢ｰ蜿ｯ隱ｭ繝ｻ謨ｴ蜷域ｧ) / "),
        T("Notion = GUI", { bold: true }),
        T(" (莠ｺ髢捺桃菴・UI) / "),
        T("Cloudflare R2 = 螟ｧ繝輔ぃ繧､繝ｫ", { bold: true }),
        T(" (蜍慕判/PDF). webhook one-shot 縺ｧ螳悟・蜿梧婿蜷・sync."),
      ],
      "識",
      "blue_background",
    ),
    b.p(""),

    // 笏笏 TOC 笏笏
    b.toc(),
    b.divider(),

    // 笏笏 繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ (sub pages) 笏笏
    b.h1("唐 繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ"),
    b.p("驟堺ｸ九し繝悶・繝ｼ繧ｸ縺九ｉ逶ｮ逧・↓蠢懊§縺ｦ髢九＞縺ｦ縺上□縺輔＞縲よ悽繝壹・繧ｸ縺ｯ縲悟・ DB 繧剃ｸ隕ｧ縺吶ｋ hub縲阪〒縺吶・),
    b.p(""),

    b.h2("雌 蟄ｦ鄙偵・驕狗畑"),
    SUB_PAGE_LINK(SUB.usage, "当 菴ｿ縺・婿繧ｬ繧､繝・, "蝟ｶ讌ｭ繝輔Ο繝ｼ 5 繧ｹ繝・ャ繝・(繝ｪ繝ｼ繝臥佐蠕冷・險ｺ譁ｭ竊貞霧讌ｭ竊呈・邏・・邏榊刀)", "当"),
    SUB_PAGE_LINK(SUB.strategy, "雌 讌ｭ遞ｮ蛻･蝟ｶ讌ｭ謌ｦ逡･", "8 讌ｭ遞ｮ (鄒主ｮｹ/豁ｯ遘・鬟ｲ鬟・蟒ｺ險ｭ/莨夊ｨ・蟆丞｣ｲ/貂・祉/繧ｳ繝ｳ繧ｵ繝ｫ) ﾃ・Hook 遏･隴・, "雌"),
    SUB_PAGE_LINK(SUB.dashboard, "投 蝟ｶ讌ｭ繝繝・す繝･繝懊・繝・, "譛昜ｸ逕ｻ髱｢繝ｻ4 DB 荳ｻ隕・view 繧・1 逕ｻ髱｢髮・ｴ・, "投"),
    SUB_PAGE_LINK(SUB.faq, "笶・FAQ", "7 雉ｪ蝠・ 讌ｭ遞ｮ霑ｽ蜉 / A/B 繝・せ繝・/ MP4 蛹・/ cal.com / DocuSign 遲・, "笶・),
    b.p(""),

    b.h2("屏・・繧ｷ繧ｹ繝・Β莉墓ｧ・),
    SUB_PAGE_LINK(SUB.setup, "肌 Setup & Environment", "Coolify env (15 vars) + 6 event webhook + Slack 險ｭ螳壹・螳悟・繝ｪ繝輔ぃ繝ｬ繝ｳ繧ｹ", "肌"),
    SUB_PAGE_LINK(SUB.r2, "淀・・R2 Storage Spec", "蜍慕判/PDF/謠先｡郁ｳ・侭縺ｮ菫晏ｭ伜・莉墓ｧ・+ R2 繧ｻ繝・ヨ繧｢繝・・ + 繧ｳ繧ｹ繝郁ｩｦ邂・, "淀・・),
    SUB_PAGE_LINK(SUB.syncFlow, "答 Architecture & Sync Flow", "Supabase 竊・Notion 蜿梧婿蜷・sync 莉墓ｧ・+ 邱ｨ髮・庄閭ｽ繝輔ぅ繝ｼ繝ｫ繝・+ Conflict 隗｣豎ｺ", "答"),
    b.p(""),

    b.divider(),

    // 笏笏 8 main DBs section header (DBs 閾ｪ菴薙・譌｢縺ｫ child_database 縺ｨ縺励※荳九↓陦ｨ遉ｺ縺輔ｌ繧・ 笏笏
    b.h1("淀・・繝｡繧､繝ｳ繝・・繧ｿ繝吶・繧ｹ"),
    b.calloutR(
      [
        T("8 main DBs (Supabase 蜿梧婿蜷・sync 蟇ｾ雎｡)", { bold: true }),
        T(" + Sprint 17 縺ｧ 3 譁ｰ DB 霑ｽ蜉 (Activities / Calendar / Contracts)."),
        T("\n荳玖ｨ倥↓ Notion DBs 縺瑚・蜍戊｡ｨ遉ｺ縺輔ｌ縺ｾ縺・(child_database)縲ょ推 DB 繧偵け繝ｪ繝・け縺励※隧ｳ邏ｰ view 縺ｫ蜈･繧九・),
      ],
      "投",
      "yellow_background",
    ),
    b.p(""),

    b.h3("・・ 譌･譛ｬ蟶ょｴ (region='jp')"),
    b.bullet("識 繝ｪ繝ｼ繝・DB 窶・Paradigm 蝟ｶ讌ｭ縺ｮ荳ｭ蠢・/ 7 leads + 30+ API 閾ｪ蜍輔お繝ｳ繝ｪ繝・メ"),
    b.bullet("召 鬘ｧ螳｢ DB 窶・MRR + 蛛･蜈ｨ蠎ｦ + WL 荳蜈・ｮ｡逅・/ LTV/螂醍ｴ・ｶ咏ｶ壽怦 閾ｪ蜍戊ｨ育ｮ・),
    b.bullet("逃 邏榊刀 DB 窶・60s 蜍慕判 / Web 蛻ｶ菴・/ MEO 繝ｬ繝昴・繝・tracking"),
    b.bullet("統 繝・Φ繝励Ξ DB 窶・8 讌ｭ遞ｮ ﾃ・7 隱ｲ鬘・= 56 templates / 邱ｨ髮・竊・5min 縺ｧ譛ｬ逡ｪ蜿肴丐"),
    b.p(""),

    b.h3("訣 豬ｷ螟門ｸょｴ (region='global'繝ｻ11 locale 蜈ｱ騾・"),
    b.bullet("訣 Leads 窶・11 locale 蟇ｾ蠢・/ 蜷後§縺・30+ API auto-enrich"),
    b.bullet("訣 Customers 窶・USD 譛磯｡・/ 5 蝠・刀 multi-select / WL 豬ｷ螟紋ｻ｣逅・ｺ・),
    b.bullet("訣 Deliveries 窶・蜷御ｸ翫・en 陦ｨ遉ｺ"),
    b.bullet("訣 Templates 窶・56 en templates (5 谿ｵ髫弱ヵ繝ｬ繝ｼ繝 encode 貂・"),
    b.p(""),

    b.h3("・ Salesforce ﾃ・Apollo 邏夊｣・ｙ (Sprint 17)"),
    b.bullet("到 繧｢繧ｯ繝・ぅ繝薙ユ繧｣繝ｭ繧ｰ 窶・蜈ｨ蝟ｶ讌ｭ豢ｻ蜍輔ｒ譎らｳｻ蛻励Ο繧ｰ (Salesforce Activity Timeline 逶ｸ蠖・"),
    b.bullet("套 蝠・ｫ・き繝ｬ繝ｳ繝繝ｼ 窶・cal.com 邨ｱ蜷医・Discovery/Demo/Proposal/Closing 荳蜈・ｮ｡逅・),
    b.bullet("塘 螂醍ｴ・嶌 DB 窶・DocuSign 邨ｱ蜷医・PDF (R2) + 7 騾夊ｲｨ + 9 迥ｶ諷狗ｮ｡逅・),
    b.p(""),

    b.divider(),

    // 笏笏 Sync 邨ｱ險・笏笏
    b.h1("投 迴ｾ迥ｶ繝・・繧ｿ髮・ｨ・),
    b.bulletR([T("Templates: ", { bold: true }), T("112 莉ｶ (jp 56 + global 56)")]),
    b.bulletR([T("Companies: ", { bold: true }), T("7 leads (seed) + Apollo CSV import 縺ｧ髫乗凾諡｡蠑ｵ")]),
    b.bulletR([T("Notion DBs: ", { bold: true }), T("11 蛟・(jp 4 + global 4 + Sprint 17 譁ｰ 3)")]),
    b.bulletR([T("Sub pages: ", { bold: true }), T("7 蛟・(Dashboard / 菴ｿ縺・婿 / 謌ｦ逡･ / Setup / R2 / SyncFlow / FAQ)")]),
    b.bulletR([T("Source plugins (30+ API): ", { bold: true }), T("8 source 螳溯｣・ｸ・(PSI + gBizInfo + HTML + Wappalyzer + Hunter + SSL + Whois + Places)")]),
    b.p(""),

    b.divider(),

    // 笏笏 Footer 笏笏
    b.calloutR(
      [
        T("Repository: ", { bold: true }),
        linkT("Paradigmllc/Paradigmjpcom", "https://github.com/Paradigmllc/Paradigmjpcom"),
        T(" ﾂｷ Production: "),
        linkT("paradigmjp.com", "https://paradigmjp.com"),
        T(" ﾂｷ Sprint 17 螳御ｺ・2026-05-13"),
      ],
      "噫",
      "default",
    ),
  ]

  // Notion API 縺ｯ children 荳諡ｬ霑ｽ蜉縺ｧ譛螟ｧ 100 blocks/req
  console.log(`  Appending ${blocks.length} blocks...`)
  for (let i = 0; i < blocks.length; i += 90) {
    const chunk = blocks.slice(i, i + 90)
    const r = await n("PATCH", `/blocks/${PARENT_PAGE_ID}/children`, { children: chunk })
    if (!r.ok) {
      console.error(`  笶・chunk:`, JSON.stringify(r.data).slice(0, 200))
      return false
    }
  }
  console.log(`  笨・${blocks.length} blocks added`)
  return true
}

async function main() {
  console.log("噫 Sprint 17 隕ｪ繝上ヶ smart 蜀肴ｧ狗ｯ蛾幕蟋・(DBs/sub pages 菫晁ｭｷ)\n")
  await smartClear()
  await buildHub()
  console.log(`
笨・螳御ｺ・
  - DBs: 蜈ｨ 11 蛟倶ｿ晁ｭｷ (蜑企勁縺輔ｌ縺ｪ縺・
  - Sub pages: 蜈ｨ 7 蛟倶ｿ晁ｭｷ
  - 隕ｪ繝上ヶ: 繧ｯ繝ｪ繝ｼ繝ｳ縺ｪ讒矩 (Hero + TOC + Sub pages nav + DB 讎りｦｳ + 髮・ｨ・

  隕ｪ繝上ヶ: https://www.notion.so/35fa2b78f3fc81299d91e457889ee393
`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
