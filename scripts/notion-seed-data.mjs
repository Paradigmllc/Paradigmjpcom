#!/usr/bin/env node
/**
 * scripts/notion-seed-data.mjs  ESprint 14 Notion 4 DB に initial チE�Eタ投�E
 *
 * 役割: Supabase の seed 6 companies + 56 templates めENotion 4 DB に reflect.
 *       ユーザーぁENotion を開ぁE��瞬間「使える状態」が出来てぁE��.
 *
 * 入劁E NOTION_API_KEY + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * 出劁E stdout に reflect 件数
 *
 * 流れ:
 *   1. Supabase から seed 6 companies + 56 templates 取征E
 *   2. Notion リーチEDB に 6 ペ�Eジ作�E (重褁E�E domain でスキチE�E)
 *   3. Notion チE��プレ DB に 56 ペ�Eジ作�E (重褁E�E template_name でスキチE�E)
 *   4. sample customer 1 件 + sample delivery 1 件追加 (Notion UI で「使ぁE��が�Eかる」状慁E
 */

import { createClient } from "@supabase/supabase-js"

const NOTION_API_KEY = process.env.NOTION_API_KEY
if (!NOTION_API_KEY) {
  console.error('NOTION_API_KEY env var must be set')
  process.exit(1)
}
const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://yihdmgtxiqfdgdueolub.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

const DB = {
  leads: "8cbab1f501144f83872c1738ce3e79c4",
  customers: "86b1d93e3b854862ae7b2750d2585677",
  deliveries: "b3cbef9dd96f4e5bbbecc404c703a298",
  templates: "115e2b0e79424bb0813fc05402096f95",
}

if (!SUPABASE_KEY) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY env required")
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

let lastNotion = 0
async function notionThrottle() {
  const now = Date.now()
  const elapsed = now - lastNotion
  if (elapsed < 350) await new Promise((r) => setTimeout(r, 350 - elapsed))
  lastNotion = Date.now()
}

async function notionPost(path, body) {
  await notionThrottle()
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    return { ok: false, error: data.message || JSON.stringify(data).slice(0, 200) }
  }
  return { ok: true, data }
}

/** Industry コーチEↁE日本誁Eselect 値 */
const INDUSTRY_LABEL = {
  beauty_salon: "美容室",
  dental: "歯科医院",
  restaurant: "飲食庁E,
  construction: "建設業",
  accounting: "会計事務所",
  retail: "小売庁E,
  cleaning: "渁E��業",
  consulting: "コンサル業",
}

const STAGE_LABEL = {
  未対忁E "未対忁E,
  架電渁E "架電渁E,
  啁E��E��: "啁E��E��",
  提案渁E "提案渁E,
  成紁E "成紁E,
  失注: "失注",
}

const PIPELINE_LABEL = {
  pending: "pending",
  scanning: "scanning",
  report_ready: "report_ready",
  sent: "sent",
  manual_queue: "manual_queue",
}

/* ───── リーチEDB: 6 companies sync ───── */
async function syncLeads() {
  const { data: companies, error } = await sb
    .from("sales_companies")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)
  if (error) {
    console.error("Fetch companies failed:", error.message)
    return 0
  }
  console.log(`Found ${companies.length} companies in Supabase`)

  // 既孁ENotion ペ�EジめEdomain で取征E(重褁E��止)
  const existingByDomain = new Set()
  let cursor = undefined
  do {
    const q = await notionPost(`/databases/${DB.leads}/query`, {
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    })
    if (!q.ok) break
    for (const r of q.data.results) {
      const url = r.properties?.["ドメイン"]?.url
      if (url) existingByDomain.add(url)
    }
    cursor = q.data.has_more ? q.data.next_cursor : undefined
  } while (cursor)
  console.log(`Existing Notion pages with domain: ${existingByDomain.size}`)

  let created = 0
  let skipped = 0
  for (const c of companies) {
    if (existingByDomain.has(c.domain)) {
      skipped++
      continue
    }
    const props = {
      "企業吁E: { title: [{ text: { content: c.company_name } }] },
      "ドメイン": { url: c.domain.startsWith("http") ? c.domain : `https://${c.domain}` },
      "slug (URL)": c.slug ? { rich_text: [{ text: { content: c.slug } }] } : { rich_text: [] },
      "業種": c.industry
        ? { select: { name: INDUSTRY_LABEL[c.industry] ?? c.industry } }
        : { select: null },
      "都道府県": c.prefecture ? { select: { name: c.prefecture } } : { select: null },
      "パイプライン": { select: { name: PIPELINE_LABEL[c.pipeline_status] ?? c.pipeline_status } },
      "啁E��E��チE�Eジ": { select: { name: STAGE_LABEL[c.deal_stage] ?? c.deal_stage } },
      "モバイルスコア": c.pagespeed_mobile !== null ? { number: c.pagespeed_mobile } : { number: null },
      "PCスコア": c.pagespeed_desktop !== null ? { number: c.pagespeed_desktop } : { number: null },
      "検�E課顁E:
        c.detected_issues && c.detected_issues.length
          ? { multi_select: c.detected_issues.map((i) => ({ name: i })) }
          : { multi_select: [] },
      "レポ�Eト閲覧数": { number: c.report_views ?? 0 },
      "HOTリーチE: { checkbox: !!c.is_hot_lead },
      "ソース": c.source ? { select: { name: c.source } } : { select: null },
      "メモ": c.memo ? { rich_text: [{ text: { content: c.memo } }] } : { rich_text: [] },
    }
    const r = await notionPost("/pages", { parent: { database_id: DB.leads }, properties: props })
    if (r.ok) {
      created++
      // 作�E征Esales_companies に notion_page_id を書込 (双方吁Esync 準備)
      await sb.from("sales_companies").update({ notion_page_id: r.data.id }).eq("id", c.id)
    } else {
      console.error(`  ❁E${c.company_name}:`, r.error.slice(0, 150))
    }
  }
  console.log(`✁ELeads: ${created} created / ${skipped} skipped (already exists)`)
  return created
}

/* ───── チE��プレ DB: 56 templates sync ───── */
async function syncTemplates() {
  const { data: templates, error } = await sb
    .from("sales_templates")
    .select("*")
    .eq("is_active", true)
    .order("industry", { ascending: true })
  if (error) {
    console.error("Fetch templates failed:", error.message)
    return 0
  }
  console.log(`Found ${templates.length} templates in Supabase`)

  // 既孁ENotion チE��プレめEtemplate_name で取征E
  const existingByName = new Set()
  let cursor = undefined
  do {
    const q = await notionPost(`/databases/${DB.templates}/query`, {
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    })
    if (!q.ok) break
    for (const r of q.data.results) {
      const title = r.properties?.["チE��プレ吁E]?.title?.[0]?.plain_text
      if (title) existingByName.add(title)
    }
    cursor = q.data.has_more ? q.data.next_cursor : undefined
  } while (cursor)
  console.log(`Existing Notion templates: ${existingByName.size}`)

  let created = 0
  let skipped = 0
  for (const t of templates) {
    if (existingByName.has(t.template_name)) {
      skipped++
      continue
    }
    const props = {
      "チE��プレ吁E: { title: [{ text: { content: t.template_name } }] },
      "業種": { select: { name: INDUSTRY_LABEL[t.industry] ?? t.industry } },
      "課題コーチE: { select: { name: t.issue_code } },
      "重要度": { select: { name: t.severity } },
      "headline": t.headline ? { rich_text: [{ text: { content: t.headline.slice(0, 2000) } }] } : { rich_text: [] },
      "pain": t.pain ? { rich_text: [{ text: { content: t.pain.slice(0, 2000) } }] } : { rich_text: [] },
      "fear": t.fear ? { rich_text: [{ text: { content: t.fear.slice(0, 2000) } }] } : { rich_text: [] },
      "loss": t.loss ? { rich_text: [{ text: { content: t.loss.slice(0, 2000) } }] } : { rich_text: [] },
      "cta_text": t.cta_text ? { rich_text: [{ text: { content: t.cta_text.slice(0, 2000) } }] } : { rich_text: [] },
      "有効": { checkbox: !!t.is_active },
    }
    const r = await notionPost("/pages", { parent: { database_id: DB.templates }, properties: props })
    if (r.ok) {
      created++
      await sb.from("sales_templates").update({ notion_page_id: r.data.id }).eq("id", t.id)
    } else {
      console.error(`  ❁E${t.template_name}:`, r.error.slice(0, 150))
    }
  }
  console.log(`✁ETemplates: ${created} created / ${skipped} skipped`)
  return created
}

/* ───── 顧客 DB: sample 1 件 (使ぁE��が�Eかるよう) ───── */
async function seedSampleCustomer() {
  console.log("👤 Creating sample customer...")
  const props = {
    "顧客吁E: { title: [{ text: { content: "[サンプル] 屁E�E屁E縁E(HOT lead からの成紁E��E" } }] },
    "契紁E��杁E: {
      multi_select: [
        { name: "Web制佁E },
        { name: "MEO対筁E },
      ],
    },
    "月顁E: { number: 50000 },
    "契紁E��始日": { date: { start: "2026-05-01" } },
    "次回請求日": { date: { start: "2026-06-01" } },
    "契紁E��チE�Eタス": { select: { name: "継続中" } },
    "健全度": { select: { name: "🟢 良好" } },
    "WL対忁E: { checkbox: false },
    "WLクライアント数": { number: 0 },
    "補助金申請状況E: { select: { name: "申請中" } },
    "紹介経由": { rich_text: [{ text: { content: "Web 経由・診断レポ�Eト閲覧 7 回後にコンタクチE } }] },
  }
  const r = await notionPost("/pages", { parent: { database_id: DB.customers }, properties: props })
  if (r.ok) {
    console.log("✁ESample customer created:", r.data.id)
    return 1
  }
  console.error("  ❁ESample customer failed:", r.error?.slice(0, 200))
  return 0
}

/* ───── 納品 DB: sample 1 件 ───── */
async function seedSampleDelivery() {
  console.log("📦 Creating sample delivery...")
  const props = {
    "納品物吁E: { title: [{ text: { content: "[サンプル] 屁E�E屁E縁E60s 診断動画" } }] },
    "種別": { select: { name: "動画(HyperFrames)" } },
    "スチE�Eタス": { select: { name: "納品渁E } },
    "納品期限": { date: { start: "2026-05-10" } },
    "納品URL": { url: "https://paradigmjp.com/ja/report/izakaya-en/video" },
    "Cloudflare R2 パス": { rich_text: [{ text: { content: "(HTML preview 配信中・MP4 化�E HyperFrames 設定征E" } }] },
    "進捁E%": { number: 1.0 },
    "公閁E: { checkbox: true },
  }
  const r = await notionPost("/pages", { parent: { database_id: DB.deliveries }, properties: props })
  if (r.ok) {
    console.log("✁ESample delivery created:", r.data.id)
    return 1
  }
  console.error("  ❁ESample delivery failed:", r.error?.slice(0, 200))
  return 0
}

/* ───── Run ───── */
async function main() {
  console.log("🚀 Notion 4 DB に Supabase seed data 反映開始\n")
  const leadCount = await syncLeads()
  const templateCount = await syncTemplates()
  const customerCount = await seedSampleCustomer()
  const deliveryCount = await seedSampleDelivery()
  console.log(`\n✁E完亁E
  🎯 リーチE ${leadCount} 件新要E
  📝 チE��プレ: ${templateCount} 件新要E
  🏢 顧客: ${customerCount} 件 (sample)
  📦 納品: ${deliveryCount} 件 (sample)`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
