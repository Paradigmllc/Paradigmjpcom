#!/usr/bin/env node
/**
 * scripts/notion-restore-trashed.mjs 窶・Sprint 17 蠕ｩ譌ｧ: 隱､縺｣縺ｦ archive 縺励◆ DB / page 繧呈綾縺・
 *
 * 蠖ｹ蜑ｲ: 遘√・繝溘せ縺ｧ隕ｪ繝壹・繧ｸ縺九ｉ DB / sub page 繧貞・ archive 縺励※縺励∪縺｣縺溘・縺ｧ
 *       PATCH archived: false 縺ｧ蜈ｨ驛ｨ蠕ｩ譌ｧ.
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY
if (!NOTION_API_KEY) {
  console.error('NOTION_API_KEY env var must be set')
  process.exit(1)
}

// 蠕ｩ譌ｧ蟇ｾ雎｡ (4 jp DBs + 4 global DBs + 3 new DBs + 4 Sprint 17 sub pages + 3 older sub pages)
const TARGETS = {
  databases: [
    // jp 4
    { id: "8cbab1f501144f83872c1738ce3e79c4", name: "識 繝ｪ繝ｼ繝・DB (jp)" },
    { id: "86b1d93e3b854862ae7b2750d2585677", name: "召 鬘ｧ螳｢ DB (jp)" },
    { id: "b3cbef9dd96f4e5bbbecc404c703a298", name: "逃 邏榊刀 DB (jp)" },
    { id: "115e2b0e79424bb0813fc05402096f95", name: "統 繝・Φ繝励Ξ DB (jp)" },
    // global 4
    { id: "35fa2b78-f3fc-8107-aa0b-f28694e1009c", name: "訣 Leads (Global)" },
    { id: "35fa2b78-f3fc-81aa-b57f-fcc729431181", name: "訣 Customers (Global)" },
    { id: "35fa2b78-f3fc-81e2-a5c3-d7b9b9d7f5a9", name: "訣 Deliveries (Global)" },
    { id: "35fa2b78-f3fc-817f-8e05-ca06234adac4", name: "訣 Templates (Global)" },
    // Sprint 17 new 3
    { id: "35fa2b78-f3fc-81ae-99b6-cc9cfa653791", name: "到 Activities" },
    { id: "35fa2b78-f3fc-81c7-91a2-eb80274298aa", name: "套 Calendar" },
    { id: "35fa2b78-f3fc-81fc-bb0a-f3880172557d", name: "塘 Contracts" },
  ],
  pages: [
    // Sprint 14 older sub pages (may have been archived)
    { id: "35fa2b78-f3fc-81d0-b842-c0ed182103dc", name: "投 蝟ｶ讌ｭ繝繝・す繝･繝懊・繝・ },
    { id: "35fa2b78-f3fc-81c3-b26a-f80a3770208d", name: "当 菴ｿ縺・婿繧ｬ繧､繝・ },
    { id: "35fa2b78-f3fc-819c-b5d6-e2f95e677265", name: "雌 讌ｭ遞ｮ蛻･蝟ｶ讌ｭ謌ｦ逡･" },
    // Sprint 17 new sub pages (should be intact but check)
    { id: "35fa2b78-f3fc-81dd-8dda-e455d1f20d09", name: "肌 Setup & Environment" },
    { id: "35fa2b78-f3fc-8163-8e90-c55cc0218ad5", name: "淀・・R2 Storage Spec" },
    { id: "35fa2b78-f3fc-81ed-be7c-c636fadea0c8", name: "答 Architecture & Sync Flow" },
    { id: "35fa2b78-f3fc-81b2-abb1-dd0e837c6521", name: "笶・FAQ" },
  ],
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
  return { ok: res.ok, data, status: res.status }
}

async function restoreDatabase(id, name) {
  const r = await n("PATCH", `/databases/${id}`, { archived: false })
  if (r.ok) {
    console.log(`  笨・DB restored: ${name}`)
    return true
  }
  console.error(`  笶・DB failed: ${name} 竊蛋, r.data.message?.slice(0, 100))
  return false
}

async function restorePage(id, name) {
  const r = await n("PATCH", `/pages/${id}`, { archived: false })
  if (r.ok) {
    console.log(`  笨・Page restored: ${name}`)
    return true
  }
  console.error(`  笶・Page failed: ${name} 竊蛋, r.data.message?.slice(0, 100))
  return false
}

async function main() {
  console.log("売 Notion archived items 蠕ｩ譌ｧ髢句ｧ欺n")

  console.log("投 11 DBs 蠕ｩ譌ｧ荳ｭ...")
  let dbOk = 0
  for (const t of TARGETS.databases) {
    if (await restoreDatabase(t.id, t.name)) dbOk++
  }

  console.log(`\n唐 ${TARGETS.pages.length} sub pages 蠕ｩ譌ｧ荳ｭ...`)
  let pageOk = 0
  for (const t of TARGETS.pages) {
    if (await restorePage(t.id, t.name)) pageOk++
  }

  console.log(`
笨・蠕ｩ譌ｧ螳御ｺ・
  Databases: ${dbOk}/${TARGETS.databases.length}
  Sub pages: ${pageOk}/${TARGETS.pages.length}

隕ｪ繝上ヶ: https://www.notion.so/35fa2b78f3fc81299d91e457889ee393
蜈ｨ DB / sub page 縺後ざ繝溽ｮｱ縺九ｉ蠕ｩ蜈・＆繧後※縺・ｋ縺ｯ縺・
`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
