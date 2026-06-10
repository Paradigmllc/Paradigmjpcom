#!/usr/bin/env node
/**
 * scripts/notion-sprint17-restructure.mjs  ESprint 17 親ハブ再構造匁E+ 3 新 DB
 *
 * 1. 親ペ�Eジの既孁E171 blocks を�E削除 (縦長 1 ペ�Eジ問題解涁E
 * 2. 親ハブめE30-40 blocks の凝縮 hub にする (TOC + DB cards + sub page links)
 * 3. 3 新 DB を作�E:
 *    - 📞 Activities (Salesforce Activity Timeline 相彁E
 *    - 📅 Calendar (cal.com 統吁E
 *    - 📄 Contracts (DocuSign + R2 PDF)
 * 4. 新 sub pages:
 *    - 🔧 Setup & Environment (Coolify env / cron 筁E
 *    - ❁EFAQ
 *    - 📚 Architecture & Sync Flow (Supabase↔Notion 双方吁Esync 仕槁E
 *    - 🗄�E�ER2 Storage Spec (動画/PDF 保存�E仕槁E
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY
if (!NOTION_API_KEY) {
  console.error('NOTION_API_KEY env var must be set')
  process.exit(1)
}
const PARENT_PAGE_ID = "35fa2b78-f3fc-8129-9d91-e457889ee393"

const DB = {
  // jp
  leadsJp: "8cbab1f501144f83872c1738ce3e79c4",
  customersJp: "86b1d93e3b854862ae7b2750d2585677",
  deliveriesJp: "b3cbef9dd96f4e5bbbecc404c703a298",
  templatesJp: "115e2b0e79424bb0813fc05402096f95",
  // global
  leadsGl: "35fa2b78-f3fc-8107-aa0b-f28694e1009c",
  customersGl: "35fa2b78-f3fc-81aa-b57f-fcc729431181",
  deliveriesGl: "35fa2b78-f3fc-81e2-a5c3-d7b9b9d7f5a9",
  templatesGl: "35fa2b78-f3fc-817f-8e05-ca06234adac4",
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
  if (!res.ok) return { ok: false, error: data.message || JSON.stringify(data).slice(0, 200) }
  return { ok: true, data }
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
  p: (text) => ({
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: Array.isArray(text) ? text : [T(text)] },
  }),
  callout: (t, emoji, color = "default") => ({
    object: "block",
    type: "callout",
    callout: { rich_text: [T(t)], icon: { type: "emoji", emoji }, color },
  }),
  calloutR: (rich, emoji, color = "default") => ({
    object: "block",
    type: "callout",
    callout: { rich_text: rich, icon: { type: "emoji", emoji }, color },
  }),
  bullet: (t) => ({
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: [T(t)] },
  }),
  bulletR: (r) => ({
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: r },
  }),
  num: (t) => ({
    object: "block",
    type: "numbered_list_item",
    numbered_list_item: { rich_text: [T(t)] },
  }),
  toggle: (t, kids = []) => ({
    object: "block",
    type: "toggle",
    toggle: { rich_text: [T(t)], children: kids },
  }),
  code: (text, lang = "bash") => ({
    object: "block",
    type: "code",
    code: { rich_text: [T(text)], language: lang },
  }),
  divider: () => ({ object: "block", type: "divider", divider: {} }),
  toc: () => ({ object: "block", type: "table_of_contents", table_of_contents: { color: "default" } }),
  linkedDb: (id) => ({
    object: "block",
    type: "link_to_page",
    link_to_page: { type: "database_id", database_id: id },
  }),
  columnList: (columns) => ({
    object: "block",
    type: "column_list",
    column_list: { children: columns.map((children) => ({ object: "block", type: "column", column: { children } })) },
  }),
}

/* ───── Step 1: 親ペ�Eジ既孁Eblocks 全削除 ───── */
async function clearParentPage() {
  console.log("🧹 親ペ�Eジ既孁Eblocks 削除中...")
  let cursor = undefined
  const allIds = []
  do {
    const r = await n(
      "GET",
      `/blocks/${PARENT_PAGE_ID}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`,
    )
    if (!r.ok) break
    allIds.push(...r.data.results.map((b) => b.id))
    cursor = r.data.has_more ? r.data.next_cursor : undefined
  } while (cursor)
  console.log(`  Found ${allIds.length} blocks. Deleting...`)
  for (const id of allIds) {
    await n("DELETE", `/blocks/${id}`)
  }
  console.log(`  ✁E${allIds.length} blocks archived`)
}

/* ───── Step 2: 3 新 DB 作�E ───── */
async function createActivitiesDB() {
  console.log("📞 Creating Activities DB...")
  const r = await n("POST", "/databases", {
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "📞" },
    cover: {
      type: "external",
      external: { url: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1500&q=80" },
    },
    title: [{ type: "text", text: { content: "📞 アクチE��ビティログ" } }],
    description: [
      {
        type: "text",
        text: {
          content:
            "Salesforce Activity Timeline 相当。�E営業活勁E(メール送信/架電/会議/メモ/SMS/LinkedIn DM/チE��実施) をリードごとに時系列ログ。Supabase sales_activity_log と双方吁Esync、E,
        },
      },
    ],
    properties: {
      件吁E { title: {} },
      種別: {
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
      地埁E {
        select: {
          options: [
            { name: "jp", color: "red" },
            { name: "global", color: "blue" },
          ],
        },
      },
      紐づくリーチE { relation: { database_id: DB.leadsJp, single_property: {} } },
      紐づく顧客: { relation: { database_id: DB.customersJp, single_property: {} } },
      結果: {
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
      発生日晁E { date: {} },
      "所要時閁E(刁E": { number: {} },
      冁E��: { rich_text: {} },
      拁E��老E { people: {} },
      最終更新: { last_edited_time: {} },
    },
  })
  if (r.ok) {
    console.log("  ✁EActivities:", r.data.id)
    return r.data.id
  }
  console.error("  ❁E, r.error?.slice(0, 200))
  return null
}

async function createCalendarDB() {
  console.log("📅 Creating Calendar DB...")
  const r = await n("POST", "/databases", {
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "📅" },
    cover: {
      type: "external",
      external: { url: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=1500&q=80" },
    },
    title: [{ type: "text", text: { content: "📅 啁E��E��レンダー" } }],
    description: [
      {
        type: "text",
        text: {
          content:
            "cal.com 統合�E啁E��E��紁EDB、Eiscovery / Demo / Proposal / Closing の吁E��ェーズ啁E��E��管琁E��Supabase sales_calendar_events と双方吁Esync、E,
        },
      },
    ],
    properties: {
      タイトル: { title: {} },
      フェーズ: {
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
      地埁E {
        select: {
          options: [
            { name: "jp", color: "red" },
            { name: "global", color: "blue" },
          ],
        },
      },
      紐づくリーチE { relation: { database_id: DB.leadsJp, single_property: {} } },
      紐づく顧客: { relation: { database_id: DB.customersJp, single_property: {} } },
      開始日晁E { date: {} },
      終亁E��晁E { date: {} },
      "cal.com 予紁EURL": { url: {} },
      "会議 URL": { url: {} },
      状慁E {
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
      参加老E { rich_text: {} },
      結果メモ: { rich_text: {} },
      拁E��老E { people: {} },
      最終更新: { last_edited_time: {} },
    },
  })
  if (r.ok) {
    console.log("  ✁ECalendar:", r.data.id)
    return r.data.id
  }
  console.error("  ❁E, r.error?.slice(0, 200))
  return null
}

async function createContractsDB() {
  console.log("📄 Creating Contracts DB...")
  const r = await n("POST", "/databases", {
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "📄" },
    cover: {
      type: "external",
      external: { url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1500&q=80" },
    },
    title: [{ type: "text", text: { content: "📄 契紁E�� DB" } }],
    description: [
      {
        type: "text",
        text: {
          content:
            "Salesforce Contracts + DocuSign 相当。PDF は Cloudflare R2 に保存�ENotion は URL リンクのみ保持 (大ファイル不適)。Supabase sales_contracts と双方吁Esync、E,
        },
      },
    ],
    properties: {
      契紁E��吁E { title: {} },
      契紁E��別: {
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
      地埁E {
        select: {
          options: [
            { name: "jp", color: "red" },
            { name: "global", color: "blue" },
          ],
        },
      },
      紐づく顧客: { relation: { database_id: DB.customersJp, single_property: {} } },
      "金顁E(JPY)": { number: { format: "yen" } },
      "金顁E(USD)": { number: { format: "dollar" } },
      通貨: {
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
      開始日: { date: {} },
      終亁E��: { date: {} },
      自動更新: { checkbox: {} },
      "PDF (R2)": { url: {} },
      "DocuSign Envelope": { rich_text: {} },
      状慁E {
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
      署名老E��: { rich_text: {} },
      署名老E��ール: { email: {} },
      署名日: { date: {} },
      最終更新: { last_edited_time: {} },
    },
  })
  if (r.ok) {
    console.log("  ✁EContracts:", r.data.id)
    return r.data.id
  }
  console.error("  ❁E, r.error?.slice(0, 200))
  return null
}

/* ───── Step 3: Sub pages 作�E (3 新要E ───── */
async function createSubPage(title, emoji, coverUrl, children) {
  const r = await n("POST", "/pages", {
    parent: { page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji },
    cover: { type: "external", external: { url: coverUrl } },
    properties: { title: { title: [{ text: { content: title } }] } },
    children,
  })
  if (r.ok) {
    console.log(`  ✁E${title}: ${r.data.id}`)
    return r.data.id
  }
  console.error(`  ❁E${title}:`, r.error?.slice(0, 200))
  return null
}

async function createSetupPage() {
  return createSubPage(
    "🔧 Setup & Environment",
    "🔧",
    "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1500&q=80",
    [
      block.callout("Coolify 環墁E��数 + cron + Slack 設定�E完�Eリファレンス、E, "⚙︁E, "blue_background"),
      block.p(""),
      block.h2("✁E投�E渁E(Sprint 8-16)"),
      block.bullet("NOTION_API_KEY ✁E(Internal Integration Token)"),
      block.bullet("N8N_WEBHOOK_SECRET ✁E(64 hex secret)"),
      block.bullet("SLACK_BOT_TOKEN ✁E+ SLACK_CHANNEL_ID ✁E(#all-paradigm C0B1JJ1L276)"),
      block.bullet("SUPABASE_SERVICE_ROLE_KEY ✁E+ NEXT_PUBLIC_SUPABASE_URL ✁E),
      block.bullet("DEEPSEEK_API_KEY ✁E(V4 PRO 永乁E��宁E"),
      block.bullet("NOTION_DB_{COMPANIES,CUSTOMERS,DELIVERIES,TEMPLATES}_{JP,GLOBAL} ✁E8 vars"),
      block.p(""),
      block.h2("⏳ 任愁E(機�E追加時に投�E)"),
      block.bullet("HYPERFRAMES_API_URL  EMP4 化サーバ�E (現状は HTML preview で代替)"),
      block.bullet("STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + PRICE_* (5 plans)"),
      block.bullet("GOOGLE_PSI_API_KEY (rate-limit 緩咁E"),
      block.bullet("GBIZ_API_TOKEN (経産省EAPI・無料申諁E"),
      block.bullet("HUNTER_API_KEY (free 25 req/朁E"),
      block.bullet("WHOISXML_API_KEY (free 500 req/朁E"),
      block.bullet("GOOGLE_PLACES_API_KEY ($200/朁E無料枠)"),
      block.bullet("CAL_COM_API_KEY (cal.com webhook 連携)"),
      block.bullet("DOCUSIGN_INTEGRATION_KEY (契紁E��電子署吁E"),
      block.bullet("CLOUDFLARE_R2_ACCESS_KEY + R2_SECRET_KEY + R2_BUCKET_NAME"),
      block.p(""),
      block.h2("⏰ Coolify Scheduled Tasks (5 min cron)"),
      block.calloutR(
        [
          T("以丁E6 cron めECoolify Scheduled Tasks に登録すると、Notion ↁESupabase 双方吁Esync が完�E自動化:"),
        ],
        "🤁E,
        "yellow_background",
      ),
      block.code(
        `# 5 min ごとに 6 sync を回ぁE(jp + global ÁE{templates, companies, customers, deliveries})
*/5 * * * *  curl -X POST -H "X-Webhook-Secret: $N8N_WEBHOOK_SECRET" -d '{"region":"jp"}' https://paradigmjp.com/api/sales/sync-templates-from-notion
*/5 * * * *  curl -X POST -H "X-Webhook-Secret: $N8N_WEBHOOK_SECRET" -d '{"region":"global"}' https://paradigmjp.com/api/sales/sync-templates-from-notion
*/5 * * * *  curl -X POST -H "X-Webhook-Secret: $N8N_WEBHOOK_SECRET" -d '{"region":"jp"}' https://paradigmjp.com/api/sales/sync-companies-from-notion
*/5 * * * *  curl -X POST -H "X-Webhook-Secret: $N8N_WEBHOOK_SECRET" -d '{"region":"global"}' https://paradigmjp.com/api/sales/sync-companies-from-notion
*/5 * * * *  curl -X POST -H "X-Webhook-Secret: $N8N_WEBHOOK_SECRET" -d '{"region":"jp"}' https://paradigmjp.com/api/sales/sync-customers-from-notion
*/5 * * * *  curl -X POST -H "X-Webhook-Secret: $N8N_WEBHOOK_SECRET" -d '{"region":"global"}' https://paradigmjp.com/api/sales/sync-customers-from-notion`,
        "bash",
      ),
      block.p(""),
      block.h2("📅 週次 cron"),
      block.code(
        `# 月曜 09:00 JST (=00:00 UTC) Slack 週次ダイジェスチE
0 0 * * 1   curl -X POST -H "X-Webhook-Secret: $N8N_WEBHOOK_SECRET" https://paradigmjp.com/api/sales/weekly-digest`,
        "bash",
      ),
    ],
  )
}

async function createR2Page() {
  return createSubPage(
    "🗄�E�ER2 Storage Spec",
    "🗄�E�E,
    "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1500&q=80",
    [
      block.callout(
        "Notion = チE�Eタ GUI (人間可読) / Supabase = 機械可読 SSOT / Cloudflare R2 = 大ファイル (動画 / PDF / 画僁E 保存�E、E,
        "🏗�E�E,
        "blue_background",
      ),
      block.p(""),
      block.h2("📦 保存�Eの役割刁E��"),
      block.h3("動画 (60s 診断動画)"),
      block.bulletR([
        T("✁E", { bold: true }),
        T("HTML 自動�E生�Eレビュー: ", {}),
        T("paradigmjp.com/[locale]/report/[slug]/video", { code: true }),
        T(" (HyperFrames 未設定でも完絁E"),
      ]),
      block.bulletR([
        T("⏳ ", { bold: true }),
        T("MP4 (HyperFrames API 設定征E: ", {}),
        T("r2://paradigm-sales-videos/[locale]/[slug]-[timestamp].mp4", { code: true }),
      ]),
      block.bulletR([
        T("Notion 納品 DB 「納品 URL、E ", { bold: true }),
        T("R2 公閁EURL or HTML preview URL のぁE��れか"),
      ]),
      block.p(""),
      block.h3("契紁E�� PDF"),
      block.bulletR([
        T("✁E", { bold: true }),
        T("R2 保孁E ", {}),
        T("r2://paradigm-sales-contracts/[region]/[customer_id]/[contract_id]-[version].pdf", { code: true }),
      ]),
      block.bulletR([
        T("Notion 契紁E�� DB 「PDF (R2)、Efield: ", { bold: true }),
        T("R2 公閁EURL リンクのみ (Notion 上書きアチE�Eロード不要E"),
      ]),
      block.bulletR([T("DocuSign envelope ID も保存して電子署吁Eaudit trail 維持E)]),
      block.p(""),
      block.h3("提案賁E�� (Slidev PDF)"),
      block.bulletR([
        T("R2 保孁E ", { bold: true }),
        T("r2://paradigm-sales-proposals/[slug]/proposal-[timestamp].pdf", { code: true }),
      ]),
      block.bulletR([T("Notion 納品 DB 種別 = 「提案賁E��」で URL 紐づぁE)]),
      block.p(""),
      block.h2("🔧 R2 セチE��アチE�E"),
      block.num("Cloudflare ダチE��ュボ�EチEↁER2 ↁECreate Bucket ÁE3"),
      block.bullet("  - paradigm-sales-videos (動画)"),
      block.bullet("  - paradigm-sales-contracts (契紁EPDF・private)"),
      block.bullet("  - paradigm-sales-proposals (提案賁E�� PDF)"),
      block.num("R2 API Token 作�E ↁECLOUDFLARE_R2_ACCESS_KEY / R2_SECRET_KEY めECoolify env 投�E"),
      block.num("public bucket は public.r2.dev でカスタムドメイン (videos.paradigmjp.com 筁E"),
      block.num("private bucket は presigned URL で配信 (契紁E��は presigned 推奨)"),
      block.p(""),
      block.h2("📊 容量�EコスチE),
      block.bullet("R2 storage: $0.015/GB/朁E(10GB で朁E$0.15 ≁E¥22)"),
      block.bullet("R2 egress: 無斁E(S3 毁E90% 削渁E"),
      block.bullet("1 video MP4 60s ≁E30MB · 朁E1000 件 = 30GB = 朁E$0.45 ≁E¥66"),
      block.bullet("1 PDF 契紁E�� ≁E1MB · 朁E1000 件 = 1GB = 朁E$0.015 ≁E¥2"),
    ],
  )
}

async function createSyncFlowPage() {
  return createSubPage(
    "📚 Architecture & Sync Flow",
    "📚",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1500&q=80",
    [
      block.callout(
        "Supabase = SSOT (整合性) / Notion = GUI (操佁EUI) / R2 = 大ファイル、E 層刁E��設計、E,
        "🏛�E�E,
        "purple_background",
      ),
      block.p(""),
      block.h2("🔄 双方吁Esync 仕槁E),
      block.h3("Supabase ↁENotion (リアルタイム)"),
      block.bullet("contact form 送信 ↁEenrich ↁEsales_companies INSERT"),
      block.bullet("n8n webhook ↁENotion リーチEDB に新ペ�Eジ作�E"),
      block.bullet("Stripe Webhook ↁEsales_customers INSERT ↁE顧客 DB に新ペ�Eジ"),
      block.bullet("R2 video upload 完亁EↁEsales_deliveries INSERT ↁE納品 DB に新ペ�Eジ"),
      block.p(""),
      block.h3("Notion ↁESupabase (5 min cron)"),
      block.bulletR([T("/api/sales/sync-templates-from-notion", { code: true }), T("  ENotion で斁E��編雁EↁE5min cron ↁESupabase upsert")]),
      block.bulletR([T("/api/sales/sync-companies-from-notion", { code: true }), T("  ENotion で deal_stage / メモ / フォローアチE�E日 更新 ↁESupabase 反映")]),
      block.bulletR([T("/api/sales/sync-customers-from-notion", { code: true }), T("  E健全度 / 次回ミーチE��ング / 補助金状況E等�E更新 sync")]),
      block.bulletR([T("/api/sales/sync-deliveries-from-notion", { code: true }), T("  EスチE�Eタス / 進捁E% 更新 sync")]),
      block.p(""),
      block.h2("📊 Sync field 仕槁E(Notion ↁESupabase 編雁E��可フィールチE"),
      block.h3("リーチEDB から編雁E��"),
      block.bullet("啁E��E��チE�Eジ: 未対忁EↁE架電渁EↁE啁E��E�� ↁE提案渁EↁE成紁E/ 失注"),
      block.bullet("メモ (rich_text)"),
      block.bullet("フォローアチE�E日 (date)"),
      block.bullet("拁E��老E(people)"),
      block.callout("⚠�E�E上訁E4 フィールド以外を Notion で編雁E��てめESupabase には反映されなぁE(safety: dropdown / 値の整合性保持)、E, "🛡�E�E, "yellow_background"),
      block.p(""),
      block.h3("顧客 DB から編雁E��"),
      block.bullet("契紁E��チE�Eタス / 健全度 / 次回ミーチE��ング / 補助金申請状況E),
      block.bullet("月顁E/ WL クライアント数 / 拁E��老E),
      block.bullet("メモ"),
      block.p(""),
      block.h3("チE��プレ DB から編雁E�� (全フィールチE"),
      block.bullet("headline / pain / fear / loss / cta_text (5 段階フレーム本斁E"),
      block.bullet("有効 (checkbox) / 重要度 / 業種 / 課題コーチE),
      block.callout("チE��プレ編雁EↁE5min cron ↁE/report/[slug] 最大 6 刁E��本番反映、E, "🎯", "green_background"),
      block.p(""),
      block.h3("納品 DB から編雁E��"),
      block.bullet("スチE�Eタス / 進捁E% / 公開フラグ"),
      block.bullet("納品 URL / レビュー Slack URL"),
      block.bullet("制作老E),
      block.p(""),
      block.h2("⚠�E�EConflict resolution"),
      block.bulletR([T("Notion 編雁E> Supabase 既存値", { bold: true }), T(" (Notion を正とする)")]),
      block.bulletR([T("ただぁE", {}), T("create-only フィールチE(id / domain / slug / 法人番号)", { bold: true }), T(" は Notion 編雁E��要E)]),
      block.bullet("conflict 発生時は sales_sync_logs に audit 記録"),
    ],
  )
}

async function createFAQPage() {
  return createSubPage(
    "❁EFAQ",
    "❁E,
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1500&q=80",
    [
      block.callout("よくある質問。新規メンバ�Eの onboarding に、E, "💡", "blue_background"),
      block.p(""),
      block.toggle("Q: 新しい業種・課題コードを追加したぁE, [
        block.p("A: 3 箁E��に同時追加 (型安�Eのため):"),
        block.bullet("Supabase: ALTER TABLE sales_companies の CHECK 制紁E��新 enum 値を追加"),
        block.bullet("TypeScript: src/lib/sales/types.ts の INDUSTRIES / ISSUE_CODES に追加"),
        block.bullet("scripts/seed-*.mjs を更新して再投入"),
      ]),
      block.toggle("Q: チE��プレ斁E��めEA/B チE��トしたい", [
        block.p("A: チE��プレ DB の使用回数 / 平坁ECVR フィールド活用。テンプレを褁E��→微修正→月次で CVR 比輁E��E),
      ]),
      block.toggle("Q: 既存リードを CSV エクスポ�Eトしたい", [
        block.p("A: リーチEDB の ⋮ ↁEエクスポ�EチEↁECSV 形式。Supabase からめEpsql で直接取得可、E),
      ]),
      block.toggle("Q: グローバル版で新 locale を追加したぁE, [
        block.p("A: messages/{locale}.json + i18n/routing.ts + paradigm-blocks の localeToRegion 対忁EↁEDeepSeek 翻訳実行、E),
      ]),
      block.toggle("Q: 動画レポ�Eトを MP4 で出したぁE(現状 HTML preview のみ)", [
        block.p("A: HyperFrames-like サービスめE1 つ立てめE Coolify 上に node + puppeteer + ffmpeg の単独 Express サーバ�E or Remotion Lambda、EYPERFRAMES_API_URL を投入すると自勁EMP4 化に刁E��、E),
      ]),
      block.toggle("Q: cal.com の予紁E��啁E��E��レンダーを連携したぁE, [
        block.p("A: cal.com Webhook めECoolify endpoint に向けめEↁE/api/sales/cal-webhook で sales_calendar_events に INSERT、Eotion 啁E��E��レンダー DB にも�E動同期、E),
      ]),
      block.toggle("Q: DocuSign で契紁E��送信したぁE, [
        block.p("A: DOCUSIGN_INTEGRATION_KEY 投�E後、契紁E�� DB の状態を draft ↁEsent に変更で自勁Eenvelope 送信。署名完亁E�E webhook で sales_contracts.signed_at 更新、E),
      ]),
    ],
  )
}

/* ───── Step 4: 親ハブの構篁E(コンパクト�E30-40 blocks) ───── */
async function buildCompactHub(newDbIds, newSubPageIds) {
  console.log("🏛�E�Eコンパクト親ハブ構築中...")
  const { activitiesId, calendarId, contractsId } = newDbIds
  const { setupId, r2Id, syncFlowId, faqId } = newSubPageIds

  const blocks = [
    // Hero
    block.calloutR(
      [
        T("Paradigm 営業 OS", { bold: true }),
        T("  ESalesforce ÁEApollo ÁEDocuSign ÁEcal.com めENotion 上で完�E裁E��。Supabase = SSOT・R2 = 大ファイル・Notion = GUI の 3 層刁E��、E),
      ],
      "🎯",
      "blue_background",
    ),
    block.p(""),
    block.toc(),
    block.divider(),

    // 8 main DBs (jp 4 + global 4)
    block.h1("🗄�E�EメインチE�Eタベ�Eス"),
    block.calloutR(
      [
        T("Supabase との双方吁Esync 対象、E, { bold: true }),
        T(" Notion 編雁EↁE5min cron ↁE本番 /report/[slug] が最大 6 刁E��反映、E),
      ],
      "🔄",
      "default",
    ),

    block.h2("�E�E 日本市場 (region='jp')"),
    block.h3("🎯 リーチEDB"),
    block.linkedDb(DB.leadsJp),
    block.h3("🏢 顧客 DB"),
    block.linkedDb(DB.customersJp),
    block.h3("📦 納品 DB"),
    block.linkedDb(DB.deliveriesJp),
    block.h3("📝 チE��プレ DB"),
    block.linkedDb(DB.templatesJp),
    block.p(""),

    block.h2("🌍 海外市場 (region='global'・11 locale 共送E"),
    block.h3("🌍 Leads (Global)"),
    block.linkedDb(DB.leadsGl),
    block.h3("🌍 Customers (Global)"),
    block.linkedDb(DB.customersGl),
    block.h3("🌍 Deliveries (Global)"),
    block.linkedDb(DB.deliveriesGl),
    block.h3("🌍 Templates (Global)"),
    block.linkedDb(DB.templatesGl),
    block.p(""),

    block.divider(),

    // 3 new DBs (Sprint 17)
    block.h1("�E Salesforce ÁEApollo 級裁E�� (Sprint 17)"),
    block.callout("啁E��E�E契紁E��・営業活動ログめENotion に完�E統合、E, "⚡", "green_background"),

    block.h3("📞 アクチE��ビティログ"),
    block.calloutR(
      [
        T("Salesforce Activity Timeline 相当、E, { bold: true }),
        T(" 全営業活勁E(メール / 架電 / 会議 / メモ / SMS / LinkedIn / チE�� / フォローアチE�E) をリードごとに時系列で記録、E),
      ],
      "📞",
      "gray_background",
    ),
    activitiesId ? block.linkedDb(activitiesId) : block.p("(activities DB 作�E失敁E"),

    block.h3("📅 啁E��E��レンダー"),
    block.calloutR(
      [
        T("cal.com 統合、E, { bold: true }),
        T(" Discovery / Demo / Proposal / Closing の吁E��ェーズ啁E��E��予紁E�E実施・結果まで一允E��琁E��cal.com の予紁EURL も保存して顧客に共有、E),
      ],
      "📅",
      "gray_background",
    ),
    calendarId ? block.linkedDb(calendarId) : block.p("(calendar DB 作�E失敁E"),

    block.h3("📄 契紁E�� DB"),
    block.calloutR(
      [
        T("Salesforce Contracts + DocuSign 統合、E, { bold: true }),
        T(" PDF は Cloudflare R2 に保存、Notion は URL リンクのみ保持 (大ファイル不適)。draft ↁEsent ↁEsigned ↁEactive の status 管琁E��E),
      ],
      "📄",
      "gray_background",
    ),
    contractsId ? block.linkedDb(contractsId) : block.p("(contracts DB 作�E失敁E"),
    block.p(""),

    block.divider(),

    // Sub pages navigation
    block.h1("📂 詳細ドキュメンチE),
    block.callout(
      "親ハブを軽量に保つため、詳細は配下サブ�Eージに刁E��。クリチE��で展開、E,
      "🗂�E�E,
      "default",
    ),
    setupId
      ? block.calloutR(
          [linkT("🔧 Setup & Environment", `https://www.notion.so/${setupId.replace(/-/g, "")}`), T("  ECoolify env / cron / Slack 設定�E完�Eリファレンス")],
          "🔧",
          "gray_background",
        )
      : block.p(""),
    r2Id
      ? block.calloutR(
          [linkT("🗄�E�ER2 Storage Spec", `https://www.notion.so/${r2Id.replace(/-/g, "")}`), T("  E動画 / PDF / 提案賁E��の保存�E仕槁E)],
          "🗄�E�E,
          "gray_background",
        )
      : block.p(""),
    syncFlowId
      ? block.calloutR(
          [linkT("📚 Architecture & Sync Flow", `https://www.notion.so/${syncFlowId.replace(/-/g, "")}`), T("  ESupabase ↁENotion 双方吁Esync 仕槁E+ Conflict 解決ルール")],
          "📚",
          "gray_background",
        )
      : block.p(""),
    faqId
      ? block.calloutR(
          [linkT("❁EFAQ", `https://www.notion.so/${faqId.replace(/-/g, "")}`), T("  Eよくある質問�E新メンバ�E onboarding")],
          "❁E,
          "gray_background",
        )
      : block.p(""),
    block.p(""),

    block.calloutR(
      [
        T("📊 既存サブ�Eージ:", { bold: true }),
        T(" Quick Start / 営業ダチE��ュボ�EチE/ 使ぁE��ガイチE/ 業種別営業戦略 (Sprint 14 で作�E渁E"),
      ],
      "📑",
      "purple_background",
    ),

    block.divider(),

    // Footer
    block.calloutR(
      [
        T("Repository: ", { bold: true }),
        linkT("Paradigmllc/Paradigmjpcom", "https://github.com/Paradigmllc/Paradigmjpcom"),
        T(" · Production: "),
        linkT("paradigmjp.com", "https://paradigmjp.com"),
      ],
      "🚀",
      "default",
    ),
  ]

  console.log(`  Appending ${blocks.length} blocks...`)
  for (let i = 0; i < blocks.length; i += 90) {
    const chunk = blocks.slice(i, i + 90)
    const r = await n("PATCH", `/blocks/${PARENT_PAGE_ID}/children`, { children: chunk })
    if (!r.ok) {
      console.error(`  ❁Echunk ${i / 90 + 1}:`, JSON.stringify(r.data).slice(0, 200))
      return false
    }
  }
  console.log(`  ✁E${blocks.length} blocks added (compact hub)`)
  return true
}

/* ───── Run ───── */
async function main() {
  console.log("🚀 Sprint 17 親ハブ再構造匁E+ 3 新 DB 開始\n")

  // Step 1: clear
  await clearParentPage()

  // Step 2: 3 new DBs (in parallel for speed)
  const [activitiesId, calendarId, contractsId] = await Promise.all([
    createActivitiesDB(),
    createCalendarDB(),
    createContractsDB(),
  ])

  // Step 3: 4 new sub pages
  const [setupId, r2Id, syncFlowId, faqId] = await Promise.all([
    createSetupPage(),
    createR2Page(),
    createSyncFlowPage(),
    createFAQPage(),
  ])

  // Step 4: compact hub
  await buildCompactHub({ activitiesId, calendarId, contractsId }, { setupId, r2Id, syncFlowId, faqId })

  console.log(`
✁ESprint 17 再構造化完亁E

NOTION_DB_ACTIVITIES=${activitiesId ?? "(failed)"}
NOTION_DB_CALENDAR=${calendarId ?? "(failed)"}
NOTION_DB_CONTRACTS=${contractsId ?? "(failed)"}

Sub pages:
- 🔧 Setup & Environment: ${setupId ?? "(failed)"}
- 🗄�E�ER2 Storage Spec: ${r2Id ?? "(failed)"}
- 📚 Architecture & Sync Flow: ${syncFlowId ?? "(failed)"}
- ❁EFAQ: ${faqId ?? "(failed)"}

親ハブ: https://www.notion.so/35fa2b78f3fc81299d91e457889ee393
`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
