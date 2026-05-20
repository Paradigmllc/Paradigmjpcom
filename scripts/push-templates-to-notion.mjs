/**
 * scripts/push-templates-to-notion.mjs — Supabase sales_templates → Notion 📝 テンプレDB push
 *
 * 役割: seed 済の sales_templates を Notion テンプレDB に作成し、非エンジニアが
 *       Notion 上で文面編集できる状態にする (以降は cron で Notion→Supabase 逆同期)。
 *
 * 冪等: 既存 Notion ページ (業種+課題コード 一致) はスキップ。
 *
 * 実行:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="..."; $env:NOTION_API_KEY="..."; node scripts/push-templates-to-notion.mjs
 */

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://yihdmgtxiqfdgdueolub.supabase.co"
const SKEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const NKEY = process.env.NOTION_API_KEY
const DB = process.env.NOTION_DB_TEMPLATES_JP ?? "115e2b0e79424bb0813fc05402096f95"
const REGION = process.env.PUSH_REGION ?? "jp"

if (!SKEY || !NKEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY と NOTION_API_KEY が必要です")
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const txt = (s) => ({ rich_text: [{ text: { content: (s ?? "").slice(0, 1900) } }] })

async function fetchTemplates() {
  const r = await fetch(`${SUPA}/rest/v1/sales_templates?region=eq.${REGION}&select=*`, {
    headers: { apikey: SKEY, Authorization: `Bearer ${SKEY}` },
  })
  if (!r.ok) throw new Error(`Supabase fetch ${r.status}: ${await r.text()}`)
  return r.json()
}

async function fetchExistingKeys() {
  const keys = new Set()
  let cursor
  do {
    const r = await fetch(`https://api.notion.com/v1/databases/${DB}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${NKEY}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    })
    if (!r.ok) throw new Error(`Notion query ${r.status}: ${await r.text()}`)
    const d = await r.json()
    for (const p of d.results) {
      const ind = p.properties?.["業種"]?.select?.name
      const iss = p.properties?.["課題コード"]?.select?.name
      if (ind && iss) keys.add(`${ind}|${iss}`)
    }
    cursor = d.has_more ? d.next_cursor : null
    await sleep(350)
  } while (cursor)
  return keys
}

async function createPage(t) {
  const r = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: { Authorization: `Bearer ${NKEY}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
    body: JSON.stringify({
      parent: { database_id: DB },
      properties: {
        "テンプレ名": { title: [{ text: { content: t.template_name || `${t.industry}_${t.issue_code}` } }] },
        "業種": { select: { name: t.industry } },
        "課題コード": { select: { name: t.issue_code } },
        "重要度": { select: { name: t.severity || "warning" } },
        "headline": txt(t.headline),
        "pain": txt(t.pain),
        "fear": txt(t.fear),
        "loss": txt(t.loss),
        "cta_text": txt(t.cta_text),
        "有効": { checkbox: t.is_active !== false },
      },
    }),
  })
  if (!r.ok) throw new Error(`create ${r.status}: ${(await r.text()).slice(0, 200)}`)
}

async function main() {
  const tpls = await fetchTemplates()
  console.log(`Supabase templates (${REGION}): ${tpls.length}`)
  const existing = await fetchExistingKeys()
  console.log(`Notion 既存: ${existing.size}`)
  let created = 0, skipped = 0, failed = 0
  for (const t of tpls) {
    const key = `${t.industry}|${t.issue_code}`
    if (existing.has(key)) { skipped++; continue }
    try {
      await createPage(t)
      created++
      existing.add(key)
    } catch (e) {
      failed++
      console.error(`  ✗ ${key}: ${e.message}`)
    }
    await sleep(350)
  }
  console.log(`✅ created=${created} skipped=${skipped} failed=${failed}`)
}

main().catch((e) => { console.error("FATAL:", e.message); process.exit(1) })
