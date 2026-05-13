#!/usr/bin/env node
/**
 * scripts/notion-restore-trashed.mjs — Sprint 17 復旧: 誤って archive した DB / page を戻す
 *
 * 役割: 私のミスで親ページから DB / sub page を全 archive してしまったので
 *       PATCH archived: false で全部復旧.
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY ?? "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"

// 復旧対象 (4 jp DBs + 4 global DBs + 3 new DBs + 4 Sprint 17 sub pages + 3 older sub pages)
const TARGETS = {
  databases: [
    // jp 4
    { id: "8cbab1f501144f83872c1738ce3e79c4", name: "🎯 リード DB (jp)" },
    { id: "86b1d93e3b854862ae7b2750d2585677", name: "🏢 顧客 DB (jp)" },
    { id: "b3cbef9dd96f4e5bbbecc404c703a298", name: "📦 納品 DB (jp)" },
    { id: "115e2b0e79424bb0813fc05402096f95", name: "📝 テンプレ DB (jp)" },
    // global 4
    { id: "35fa2b78-f3fc-8107-aa0b-f28694e1009c", name: "🌍 Leads (Global)" },
    { id: "35fa2b78-f3fc-81aa-b57f-fcc729431181", name: "🌍 Customers (Global)" },
    { id: "35fa2b78-f3fc-81e2-a5c3-d7b9b9d7f5a9", name: "🌍 Deliveries (Global)" },
    { id: "35fa2b78-f3fc-817f-8e05-ca06234adac4", name: "🌍 Templates (Global)" },
    // Sprint 17 new 3
    { id: "35fa2b78-f3fc-81ae-99b6-cc9cfa653791", name: "📞 Activities" },
    { id: "35fa2b78-f3fc-81c7-91a2-eb80274298aa", name: "📅 Calendar" },
    { id: "35fa2b78-f3fc-81fc-bb0a-f3880172557d", name: "📄 Contracts" },
  ],
  pages: [
    // Sprint 14 older sub pages (may have been archived)
    { id: "35fa2b78-f3fc-81d0-b842-c0ed182103dc", name: "📊 営業ダッシュボード" },
    { id: "35fa2b78-f3fc-81c3-b26a-f80a3770208d", name: "📖 使い方ガイド" },
    { id: "35fa2b78-f3fc-819c-b5d6-e2f95e677265", name: "🎓 業種別営業戦略" },
    // Sprint 17 new sub pages (should be intact but check)
    { id: "35fa2b78-f3fc-81dd-8dda-e455d1f20d09", name: "🔧 Setup & Environment" },
    { id: "35fa2b78-f3fc-8163-8e90-c55cc0218ad5", name: "🗄️ R2 Storage Spec" },
    { id: "35fa2b78-f3fc-81ed-be7c-c636fadea0c8", name: "📚 Architecture & Sync Flow" },
    { id: "35fa2b78-f3fc-81b2-abb1-dd0e837c6521", name: "❓ FAQ" },
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
    console.log(`  ✅ DB restored: ${name}`)
    return true
  }
  console.error(`  ❌ DB failed: ${name} →`, r.data.message?.slice(0, 100))
  return false
}

async function restorePage(id, name) {
  const r = await n("PATCH", `/pages/${id}`, { archived: false })
  if (r.ok) {
    console.log(`  ✅ Page restored: ${name}`)
    return true
  }
  console.error(`  ❌ Page failed: ${name} →`, r.data.message?.slice(0, 100))
  return false
}

async function main() {
  console.log("🔄 Notion archived items 復旧開始\n")

  console.log("📊 11 DBs 復旧中...")
  let dbOk = 0
  for (const t of TARGETS.databases) {
    if (await restoreDatabase(t.id, t.name)) dbOk++
  }

  console.log(`\n📂 ${TARGETS.pages.length} sub pages 復旧中...`)
  let pageOk = 0
  for (const t of TARGETS.pages) {
    if (await restorePage(t.id, t.name)) pageOk++
  }

  console.log(`
✅ 復旧完了:
  Databases: ${dbOk}/${TARGETS.databases.length}
  Sub pages: ${pageOk}/${TARGETS.pages.length}

親ハブ: https://www.notion.so/35fa2b78f3fc81299d91e457889ee393
全 DB / sub page がゴミ箱から復元されているはず.
`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
