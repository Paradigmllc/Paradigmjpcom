#!/usr/bin/env node
/**
 * scripts/notion-create-global-dbs.mjs 窶・Sprint 16 繧ｰ繝ｭ繝ｼ繝舌Ν迚・4 DB 菴懈・
 *
 * 蠖ｹ蜑ｲ: 隕ｪ繝壹・繧ｸ "Paradigm 蝟ｶ讌ｭ OS" 驟堺ｸ九↓闍ｱ隱樒沿/繧ｰ繝ｭ繝ｼ繝舌Ν迚医・ 4 DB 繧呈眠隕丈ｽ懈・.
 *       譌｢蟄・jp 迚・4 DB 縺ｨ荳ｦ蛻励・region='global' 縺ｧ螳悟・蛻・屬.
 *
 * 菴懈・縺吶ｋ 4 DB:
 *   1. 訣 Leads (Global)
 *   2. 訣 Customers (Global)
 *   3. 訣 Deliveries (Global)
 *   4. 訣 Templates (Global)
 *
 * 蜈･蜉・ NOTION_API_KEY env
 * 蜃ｺ蜉・ 4 DB 縺ｮ Notion ID (env 縺ｫ謚募・縺吶ｋ逕ｨ)
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
  if (!res.ok) return { ok: false, error: data.message || JSON.stringify(data).slice(0, 200) }
  return { ok: true, data }
}

const COVERS = {
  leads: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1500&q=80",
  customers: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1500&q=80",
  deliveries: "https://images.unsplash.com/photo-1551636898-47668aa61de2?w=1500&q=80",
  templates: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1500&q=80",
}

async function createLeads() {
  console.log("訣 Creating Global Leads DB...")
  const r = await n("POST", "/databases", {
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "訣" },
    cover: { type: "external", external: { url: COVERS.leads } },
    title: [{ type: "text", text: { content: "訣 Leads (Global)" } }],
    description: [
      {
        type: "text",
        text: {
          content:
            "Global market leads (en/ko/zh/de/fr/es/pt/ru/ar/vi/id). region='global' in Supabase. Auto-enriched via 30+ APIs after CSV import or contact form submission.",
        },
      },
    ],
    properties: {
      "Company Name": { title: {} },
      "Domain": { url: {} },
      "Slug (URL)": { rich_text: {} },
      "Locale": {
        select: {
          options: [
            { name: "en", color: "blue" },
            { name: "ko", color: "purple" },
            { name: "zh", color: "red" },
            { name: "de", color: "yellow" },
            { name: "fr", color: "blue" },
            { name: "es", color: "orange" },
            { name: "pt", color: "green" },
            { name: "ru", color: "gray" },
            { name: "ar", color: "brown" },
            { name: "vi", color: "pink" },
            { name: "id", color: "default" },
          ],
        },
      },
      "Industry": {
        select: {
          options: [
            { name: "beauty_salon", color: "pink" },
            { name: "dental", color: "blue" },
            { name: "restaurant", color: "orange" },
            { name: "construction", color: "brown" },
            { name: "accounting", color: "gray" },
            { name: "retail", color: "purple" },
            { name: "cleaning", color: "green" },
            { name: "consulting", color: "yellow" },
          ],
        },
      },
      "Country": { rich_text: {} },
      "Pipeline": {
        select: {
          options: [
            { name: "pending", color: "default" },
            { name: "scanning", color: "yellow" },
            { name: "report_ready", color: "orange" },
            { name: "sent", color: "green" },
            { name: "manual_queue", color: "red" },
          ],
        },
      },
      "Deal Stage": {
        select: {
          options: [
            { name: "譛ｪ蟇ｾ蠢・, color: "default" },
            { name: "譫ｶ髮ｻ貂・, color: "yellow" },
            { name: "蝠・ｫ・ｸｭ", color: "orange" },
            { name: "謠先｡域ｸ・, color: "blue" },
            { name: "謌千ｴ・, color: "green" },
            { name: "螟ｱ豕ｨ", color: "red" },
          ],
        },
      },
      "Mobile Score": { number: {} },
      "Desktop Score": { number: {} },
      "Detected Issues": {
        multi_select: {
          options: [
            { name: "speed_critical", color: "red" },
            { name: "ua_谿句ｭ・, color: "red" },
            { name: "ssl_expired", color: "red" },
            { name: "wp_outdated", color: "orange" },
            { name: "no_ogp", color: "yellow" },
            { name: "no_sns", color: "default" },
            { name: "copyright_old", color: "yellow" },
          ],
        },
      },
      "Report Views": { number: { format: "number" } },
      "HOT Lead": { checkbox: {} },
      "Owner": { people: {} },
      "Follow-up Date": { date: {} },
      "搭 Report": {
        formula: {
          expression: `if(empty(prop("Slug (URL)")), "", "https://paradigmjp.com/" + if(empty(prop("Locale")), "en", prop("Locale")) + "/report/" + prop("Slug (URL)"))`,
        },
      },
      "汐 Video": {
        formula: {
          expression: `if(empty(prop("Slug (URL)")), "", "https://paradigmjp.com/" + if(empty(prop("Locale")), "en", prop("Locale")) + "/report/" + prop("Slug (URL)") + "/video")`,
        },
      },
      "Notes": { rich_text: {} },
      "Source": { rich_text: {} },
      "Created": { created_time: {} },
      "Updated": { last_edited_time: {} },
    },
  })
  if (r.ok) console.log("  笨・Leads (Global):", r.data.id)
  else console.error("  笶・, r.error?.slice(0, 200))
  return r.ok ? r.data.id : null
}

async function createCustomers() {
  console.log("訣 Creating Global Customers DB...")
  const r = await n("POST", "/databases", {
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "訣" },
    cover: { type: "external", external: { url: COVERS.customers } },
    title: [{ type: "text", text: { content: "訣 Customers (Global)" } }],
    description: [
      {
        type: "text",
        text: {
          content:
            "Global paid customers. MRR + health + WL agency contracts. Stripe Webhook auto-sync.",
        },
      },
    ],
    properties: {
      "Customer Name": { title: {} },
      "Locale": {
        select: {
          options: [
            { name: "en", color: "blue" },
            { name: "ko", color: "purple" },
            { name: "zh", color: "red" },
            { name: "de", color: "yellow" },
            { name: "fr", color: "blue" },
            { name: "es", color: "orange" },
            { name: "pt", color: "green" },
            { name: "ru", color: "gray" },
            { name: "ar", color: "brown" },
          ],
        },
      },
      "Products": {
        multi_select: {
          options: [
            { name: "Web Build", color: "blue" },
            { name: "MEO", color: "green" },
            { name: "DX/AI", color: "purple" },
            { name: "Video Sub", color: "orange" },
            { name: "Japan Entry", color: "red" },
          ],
        },
      },
      "Monthly (USD)": { number: { format: "dollar" } },
      "Contract Start": { date: {} },
      "Next Invoice": { date: {} },
      "Status": {
        select: {
          options: [
            { name: "Trial", color: "yellow" },
            { name: "Active", color: "green" },
            { name: "Pending Cancel", color: "orange" },
            { name: "Cancelled", color: "red" },
          ],
        },
      },
      "Health": {
        select: {
          options: [
            { name: "泙 Good", color: "green" },
            { name: "泯 Watch", color: "yellow" },
            { name: "閥 Action Required", color: "red" },
          ],
        },
      },
      "WL Agency": { checkbox: {} },
      "WL Client Count": { number: {} },
      "Owner": { people: {} },
      "Next Meeting": { date: {} },
      "Notes": { rich_text: {} },
      "Created": { created_time: {} },
      "Updated": { last_edited_time: {} },
    },
  })
  if (r.ok) console.log("  笨・Customers (Global):", r.data.id)
  else console.error("  笶・, r.error?.slice(0, 200))
  return r.ok ? r.data.id : null
}

async function createDeliveries() {
  console.log("訣 Creating Global Deliveries DB...")
  const r = await n("POST", "/databases", {
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "訣" },
    cover: { type: "external", external: { url: COVERS.deliveries } },
    title: [{ type: "text", text: { content: "訣 Deliveries (Global)" } }],
    description: [
      {
        type: "text",
        text: { content: "Global delivery tracking. R2 video / web build / MEO reports." },
      },
    ],
    properties: {
      "Delivery Name": { title: {} },
      "Type": {
        select: {
          options: [
            { name: "Video (HyperFrames)", color: "purple" },
            { name: "Video (Remotion)", color: "blue" },
            { name: "Web Build", color: "green" },
            { name: "MEO Report", color: "orange" },
            { name: "Proposal", color: "yellow" },
          ],
        },
      },
      "Status": {
        select: {
          options: [
            { name: "Not Started", color: "default" },
            { name: "In Progress", color: "yellow" },
            { name: "Review", color: "orange" },
            { name: "Delivered", color: "green" },
          ],
        },
      },
      "Due Date": { date: {} },
      "Delivery URL": { url: {} },
      "R2 Path": { rich_text: {} },
      "Progress %": { number: { format: "percent" } },
      "Public": { checkbox: {} },
      "Owner": { people: {} },
      "Updated": { last_edited_time: {} },
    },
  })
  if (r.ok) console.log("  笨・Deliveries (Global):", r.data.id)
  else console.error("  笶・, r.error?.slice(0, 200))
  return r.ok ? r.data.id : null
}

async function createTemplates() {
  console.log("訣 Creating Global Templates DB...")
  const r = await n("POST", "/databases", {
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "訣" },
    cover: { type: "external", external: { url: COVERS.templates } },
    title: [{ type: "text", text: { content: "訣 Templates (Global)" } }],
    description: [
      {
        type: "text",
        text: {
          content:
            "Global market sales copy templates (8 industries ﾃ・7 issues = 56). Despair竊辿ope 5-stage frame encoded. Edits sync to Supabase via webhook one-shot 竊・/report/[slug] reflects in 6 min.",
        },
      },
    ],
    properties: {
      "繝・Φ繝励Ξ蜷・: { title: {} },
      "讌ｭ遞ｮ": {
        select: {
          options: [
            { name: "beauty_salon", color: "pink" },
            { name: "dental", color: "blue" },
            { name: "restaurant", color: "orange" },
            { name: "construction", color: "brown" },
            { name: "accounting", color: "gray" },
            { name: "retail", color: "purple" },
            { name: "cleaning", color: "green" },
            { name: "consulting", color: "yellow" },
          ],
        },
      },
      "隱ｲ鬘後さ繝ｼ繝・: {
        select: {
          options: [
            { name: "speed_critical", color: "red" },
            { name: "ua_谿句ｭ・, color: "red" },
            { name: "ssl_expired", color: "red" },
            { name: "wp_outdated", color: "orange" },
            { name: "no_ogp", color: "yellow" },
            { name: "no_sns", color: "default" },
            { name: "copyright_old", color: "yellow" },
          ],
        },
      },
      "驥崎ｦ∝ｺｦ": {
        select: {
          options: [
            { name: "critical", color: "red" },
            { name: "warning", color: "yellow" },
            { name: "info", color: "blue" },
          ],
        },
      },
      "headline": { rich_text: {} },
      "pain": { rich_text: {} },
      "fear": { rich_text: {} },
      "loss": { rich_text: {} },
      "cta_text": { rich_text: {} },
      "譛牙柑": { checkbox: {} },
      "菴ｿ逕ｨ蝗樊焚": { number: {} },
      "蟷ｳ蝮・CVR (%)": { number: { format: "percent" } },
      "譛邨ゆｽｿ逕ｨ譌･": { date: {} },
      "蛯呵・: { rich_text: {} },
      "譛邨よ峩譁ｰ": { last_edited_time: {} },
    },
  })
  if (r.ok) console.log("  笨・Templates (Global):", r.data.id)
  else console.error("  笶・, r.error?.slice(0, 200))
  return r.ok ? r.data.id : null
}

async function main() {
  console.log("訣 Sprint 16: Global Notion DBs 菴懈・髢句ｧ欺n")
  const leadsId = await createLeads()
  const customersId = await createCustomers()
  const deliveriesId = await createDeliveries()
  const templatesId = await createTemplates()

  console.log(`
笨・Global Notion DBs created:

Coolify env 謚募・ (paradigm-hp i12am4vvcbggefnqdizhnv9a):
  NOTION_DB_COMPANIES_GLOBAL=${leadsId ?? "(failed)"}
  NOTION_DB_CUSTOMERS_GLOBAL=${customersId ?? "(failed)"}
  NOTION_DB_DELIVERIES_GLOBAL=${deliveriesId ?? "(failed)"}
  NOTION_DB_TEMPLATES_GLOBAL=${templatesId ?? "(failed)"}

蜿り・ 譌｢蟄・jp 迚・(Sprint 8-14 縺ｧ菴懈・貂・
  NOTION_DB_COMPANIES_JP=8cbab1f501144f83872c1738ce3e79c4
  NOTION_DB_CUSTOMERS_JP=86b1d93e3b854862ae7b2750d2585677
  NOTION_DB_DELIVERIES_JP=b3cbef9dd96f4e5bbbecc404c703a298
  NOTION_DB_TEMPLATES_JP=115e2b0e79424bb0813fc05402096f95

谺｡縺ｮ繧ｹ繝・ャ繝・
  node scripts/seed-global-templates.mjs       # 56 en templates 謚募・
  curl -X POST -H "X-Webhook-Secret: \$SECRET" \\
    -d '{"region":"global"}' \\
    https://paradigmjp.com/api/sales/sync-templates-from-notion
`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
