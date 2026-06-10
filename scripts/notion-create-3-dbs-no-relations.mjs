#!/usr/bin/env node
/**
 * scripts/notion-create-3-dbs-no-relations.mjs 窶・Sprint 17 3 譁ｰ DB (relation 謚懊″)
 *
 * 蠖ｹ蜑ｲ: Activities / Calendar / Contracts 繧・relation property 謚懊″縺ｧ菴懈・.
 *       relation 縺ｯ Notion UI 縺ｧ蠕後°繧画焔蜍輔〒霑ｽ蜉 (API 縺ｮ譁ｰ data_source 莉墓ｧ伜屓驕ｿ).
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

async function createActivities() {
  console.log("到 Activities (no relations)...")
  const r = await n("POST", "/databases", {
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "到" },
    cover: { type: "external", external: { url: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1500&q=80" } },
    title: [{ type: "text", text: { content: "到 繧｢繧ｯ繝・ぅ繝薙ユ繧｣繝ｭ繧ｰ" } }],
    description: [
      {
        type: "text",
        text: {
          content:
            "Salesforce Activity Timeline 逶ｸ蠖薙ょ・蝟ｶ讌ｭ豢ｻ蜍・(繝｡繝ｼ繝ｫ騾∽ｿ｡/譫ｶ髮ｻ/莨夊ｭｰ/繝｡繝｢/SMS/LinkedIn/繝・Δ/繝輔か繝ｭ繝ｼ繧｢繝・・) 繧呈凾邉ｻ蛻励Ο繧ｰ縲４upabase sales_activity_log 縺ｨ蜿梧婿蜷・sync縲Ｓelation (繝ｪ繝ｼ繝・鬘ｧ螳｢) 縺ｯ Notion UI 縺ｧ蠕瑚ｿｽ蜉蜿ｯ縲・,
        },
      },
    ],
    properties: {
      莉ｶ蜷・ { title: {} },
      遞ｮ蛻･: {
        select: {
          options: [
            { name: "email", color: "blue" },
            { name: "call", color: "green" },
            { name: "meeting", color: "purple" },
            { name: "note", color: "default" },
            { name: "sms", color: "yellow" },
            { name: "linkedin", color: "blue" },
            { name: "demo", color: "orange" },
            { name: "follow_up", color: "pink" },
          ],
        },
      },
      蝨ｰ蝓・ {
        select: {
          options: [
            { name: "jp", color: "red" },
            { name: "global", color: "blue" },
          ],
        },
      },
      莨夂､ｾ繝峨Γ繧､繝ｳ: { url: {} },
      鬘ｧ螳｢蜷・ { rich_text: {} },
      邨先棡: {
        select: {
          options: [
            { name: "success", color: "green" },
            { name: "no_answer", color: "gray" },
            { name: "follow_up", color: "yellow" },
            { name: "declined", color: "red" },
            { name: "completed", color: "blue" },
          ],
        },
      },
      逋ｺ逕滓律譎・ { date: {} },
      "謇隕∵凾髢・(蛻・": { number: {} },
      蜀・ｮｹ: { rich_text: {} },
      諡・ｽ楢・ { people: {} },
      譛邨よ峩譁ｰ: { last_edited_time: {} },
    },
  })
  if (r.ok) {
    console.log("  笨・, r.data.id)
    return r.data.id
  }
  console.error("  笶・, r.error?.slice(0, 200))
  return null
}

async function createCalendar() {
  console.log("套 Calendar (no relations)...")
  const r = await n("POST", "/databases", {
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "套" },
    cover: { type: "external", external: { url: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=1500&q=80" } },
    title: [{ type: "text", text: { content: "套 蝠・ｫ・き繝ｬ繝ｳ繝繝ｼ" } }],
    description: [
      {
        type: "text",
        text: {
          content:
            "cal.com 邨ｱ蜷医・蝠・ｫ・ｺ育ｴ・DB縲・iscovery / Demo / Proposal / Closing 縺ｮ蜷・ヵ繧ｧ繝ｼ繧ｺ蝠・ｫ・ｒ邂｡逅・４upabase sales_calendar_events 縺ｨ蜿梧婿蜷・sync縲・,
        },
      },
    ],
    properties: {
      繧ｿ繧､繝医Ν: { title: {} },
      繝輔ぉ繝ｼ繧ｺ: {
        select: {
          options: [
            { name: "discovery", color: "yellow" },
            { name: "demo", color: "orange" },
            { name: "proposal", color: "blue" },
            { name: "closing", color: "purple" },
            { name: "follow_up", color: "pink" },
            { name: "review", color: "green" },
            { name: "other", color: "default" },
          ],
        },
      },
      蝨ｰ蝓・ {
        select: {
          options: [
            { name: "jp", color: "red" },
            { name: "global", color: "blue" },
          ],
        },
      },
      莨夂､ｾ繝峨Γ繧､繝ｳ: { url: {} },
      鬘ｧ螳｢蜷・ { rich_text: {} },
      髢句ｧ区律譎・ { date: {} },
      "cal.com 莠育ｴ・URL": { url: {} },
      "莨夊ｭｰ URL": { url: {} },
      迥ｶ諷・ {
        select: {
          options: [
            { name: "scheduled", color: "yellow" },
            { name: "confirmed", color: "blue" },
            { name: "completed", color: "green" },
            { name: "no_show", color: "red" },
            { name: "cancelled", color: "gray" },
            { name: "rescheduled", color: "orange" },
          ],
        },
      },
      蜿ょ刈閠・ { rich_text: {} },
      邨先棡繝｡繝｢: { rich_text: {} },
      諡・ｽ楢・ { people: {} },
      譛邨よ峩譁ｰ: { last_edited_time: {} },
    },
  })
  if (r.ok) {
    console.log("  笨・, r.data.id)
    return r.data.id
  }
  console.error("  笶・, r.error?.slice(0, 200))
  return null
}

async function createContracts() {
  console.log("塘 Contracts (no relations)...")
  const r = await n("POST", "/databases", {
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "塘" },
    cover: { type: "external", external: { url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1500&q=80" } },
    title: [{ type: "text", text: { content: "塘 螂醍ｴ・嶌 DB" } }],
    description: [
      {
        type: "text",
        text: {
          content:
            "Salesforce Contracts + DocuSign 逶ｸ蠖薙１DF 縺ｯ Cloudflare R2 縺ｫ菫晏ｭ倥・Notion 縺ｯ URL 繝ｪ繝ｳ繧ｯ縺ｮ縺ｿ縲４upabase sales_contracts 縺ｨ蜿梧婿蜷・sync縲・,
        },
      },
    ],
    properties: {
      螂醍ｴ・嶌蜷・ { title: {} },
      螂醍ｴ・ｨｮ蛻･: {
        select: {
          options: [
            { name: "web_build", color: "blue" },
            { name: "meo", color: "green" },
            { name: "dx_ai", color: "purple" },
            { name: "video_sub", color: "orange" },
            { name: "japan_entry", color: "red" },
            { name: "wl_agency", color: "pink" },
            { name: "maintenance", color: "yellow" },
            { name: "other", color: "default" },
          ],
        },
      },
      蝨ｰ蝓・ {
        select: {
          options: [
            { name: "jp", color: "red" },
            { name: "global", color: "blue" },
          ],
        },
      },
      鬘ｧ螳｢蜷・ { rich_text: {} },
      "驥鷹｡・(JPY)": { number: { format: "yen" } },
      "驥鷹｡・(USD)": { number: { format: "dollar" } },
      騾夊ｲｨ: {
        select: {
          options: [
            { name: "JPY", color: "red" },
            { name: "USD", color: "blue" },
            { name: "EUR", color: "yellow" },
            { name: "GBP", color: "purple" },
            { name: "CNY", color: "orange" },
            { name: "KRW", color: "pink" },
            { name: "SGD", color: "green" },
          ],
        },
      },
      髢句ｧ区律: { date: {} },
      邨ゆｺ・律: { date: {} },
      閾ｪ蜍墓峩譁ｰ: { checkbox: {} },
      "PDF (R2)": { url: {} },
      "DocuSign Envelope": { rich_text: {} },
      迥ｶ諷・ {
        select: {
          options: [
            { name: "draft", color: "gray" },
            { name: "sent", color: "yellow" },
            { name: "partially_signed", color: "orange" },
            { name: "signed", color: "blue" },
            { name: "active", color: "green" },
            { name: "expired", color: "red" },
            { name: "cancelled", color: "default" },
            { name: "renewed", color: "purple" },
          ],
        },
      },
      鄂ｲ蜷崎・錐: { rich_text: {} },
      鄂ｲ蜷崎・Γ繝ｼ繝ｫ: { email: {} },
      鄂ｲ蜷肴律: { date: {} },
      譛邨よ峩譁ｰ: { last_edited_time: {} },
    },
  })
  if (r.ok) {
    console.log("  笨・, r.data.id)
    return r.data.id
  }
  console.error("  笶・, r.error?.slice(0, 200))
  return null
}

async function main() {
  const activitiesId = await createActivities()
  const calendarId = await createCalendar()
  const contractsId = await createContracts()

  console.log(`
笨・3 new DBs created:
  NOTION_DB_ACTIVITIES=${activitiesId ?? "(failed)"}
  NOTION_DB_CALENDAR=${calendarId ?? "(failed)"}
  NOTION_DB_CONTRACTS=${contractsId ?? "(failed)"}

邃ｹ・・relation 繝励Ο繝代ユ繧｣縺ｯ Notion UI 縺ｧ蠕瑚ｿｽ蜉 (API 縺ｮ data_source 莉墓ｧ伜屓驕ｿ):
  到 繧｢繧ｯ繝・ぅ繝薙ユ繧｣繝ｭ繧ｰ 竊・邏舌▼縺上Μ繝ｼ繝・(relation竊挺沁ｯ 繝ｪ繝ｼ繝・DB)
  到 繧｢繧ｯ繝・ぅ繝薙ユ繧｣繝ｭ繧ｰ 竊・邏舌▼縺城｡ｧ螳｢ (relation竊挺沛｢ 鬘ｧ螳｢ DB)
  套 蝠・ｫ・き繝ｬ繝ｳ繝繝ｼ 竊・蜷御ｸ・
  塘 螂醍ｴ・嶌 DB 竊・邏舌▼縺城｡ｧ螳｢ (relation竊挺沛｢ 鬘ｧ螳｢ DB)
`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
