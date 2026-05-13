#!/usr/bin/env node
/**
 * scripts/notion-sprint17-restructure.mjs — Sprint 17 親ハブ再構造化 + 3 新 DB
 *
 * 1. 親ページの既存 171 blocks を全削除 (縦長 1 ページ問題解消)
 * 2. 親ハブを 30-40 blocks の凝縮 hub にする (TOC + DB cards + sub page links)
 * 3. 3 新 DB を作成:
 *    - 📞 Activities (Salesforce Activity Timeline 相当)
 *    - 📅 Calendar (cal.com 統合)
 *    - 📄 Contracts (DocuSign + R2 PDF)
 * 4. 新 sub pages:
 *    - 🔧 Setup & Environment (Coolify env / cron 等)
 *    - ❓ FAQ
 *    - 📚 Architecture & Sync Flow (Supabase↔Notion 双方向 sync 仕様)
 *    - 🗄️ R2 Storage Spec (動画/PDF 保存先仕様)
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY ?? "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"
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

/* ───── Step 1: 親ページ既存 blocks 全削除 ───── */
async function clearParentPage() {
  console.log("🧹 親ページ既存 blocks 削除中...")
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
  console.log(`  ✅ ${allIds.length} blocks archived`)
}

/* ───── Step 2: 3 新 DB 作成 ───── */
async function createActivitiesDB() {
  console.log("📞 Creating Activities DB...")
  const r = await n("POST", "/databases", {
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "📞" },
    cover: {
      type: "external",
      external: { url: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1500&q=80" },
    },
    title: [{ type: "text", text: { content: "📞 アクティビティログ" } }],
    description: [
      {
        type: "text",
        text: {
          content:
            "Salesforce Activity Timeline 相当。全営業活動 (メール送信/架電/会議/メモ/SMS/LinkedIn DM/デモ実施) をリードごとに時系列ログ。Supabase sales_activity_log と双方向 sync。",
        },
      },
    ],
    properties: {
      件名: { title: {} },
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
      地域: {
        select: {
          options: [
            { name: "jp", color: "red" },
            { name: "global", color: "blue" },
          ],
        },
      },
      紐づくリード: { relation: { database_id: DB.leadsJp, single_property: {} } },
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
      発生日時: { date: {} },
      "所要時間 (分)": { number: {} },
      内容: { rich_text: {} },
      担当者: { people: {} },
      最終更新: { last_edited_time: {} },
    },
  })
  if (r.ok) {
    console.log("  ✅ Activities:", r.data.id)
    return r.data.id
  }
  console.error("  ❌", r.error?.slice(0, 200))
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
    title: [{ type: "text", text: { content: "📅 商談カレンダー" } }],
    description: [
      {
        type: "text",
        text: {
          content:
            "cal.com 統合の商談予約 DB。Discovery / Demo / Proposal / Closing の各フェーズ商談を管理。Supabase sales_calendar_events と双方向 sync。",
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
      地域: {
        select: {
          options: [
            { name: "jp", color: "red" },
            { name: "global", color: "blue" },
          ],
        },
      },
      紐づくリード: { relation: { database_id: DB.leadsJp, single_property: {} } },
      紐づく顧客: { relation: { database_id: DB.customersJp, single_property: {} } },
      開始日時: { date: {} },
      終了日時: { date: {} },
      "cal.com 予約 URL": { url: {} },
      "会議 URL": { url: {} },
      状態: {
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
      参加者: { rich_text: {} },
      結果メモ: { rich_text: {} },
      担当者: { people: {} },
      最終更新: { last_edited_time: {} },
    },
  })
  if (r.ok) {
    console.log("  ✅ Calendar:", r.data.id)
    return r.data.id
  }
  console.error("  ❌", r.error?.slice(0, 200))
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
    title: [{ type: "text", text: { content: "📄 契約書 DB" } }],
    description: [
      {
        type: "text",
        text: {
          content:
            "Salesforce Contracts + DocuSign 相当。PDF は Cloudflare R2 に保存・Notion は URL リンクのみ保持 (大ファイル不適)。Supabase sales_contracts と双方向 sync。",
        },
      },
    ],
    properties: {
      契約書名: { title: {} },
      契約種別: {
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
      地域: {
        select: {
          options: [
            { name: "jp", color: "red" },
            { name: "global", color: "blue" },
          ],
        },
      },
      紐づく顧客: { relation: { database_id: DB.customersJp, single_property: {} } },
      "金額 (JPY)": { number: { format: "yen" } },
      "金額 (USD)": { number: { format: "dollar" } },
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
      終了日: { date: {} },
      自動更新: { checkbox: {} },
      "PDF (R2)": { url: {} },
      "DocuSign Envelope": { rich_text: {} },
      状態: {
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
      署名者名: { rich_text: {} },
      署名者メール: { email: {} },
      署名日: { date: {} },
      最終更新: { last_edited_time: {} },
    },
  })
  if (r.ok) {
    console.log("  ✅ Contracts:", r.data.id)
    return r.data.id
  }
  console.error("  ❌", r.error?.slice(0, 200))
  return null
}

/* ───── Step 3: Sub pages 作成 (3 新規) ───── */
async function createSubPage(title, emoji, coverUrl, children) {
  const r = await n("POST", "/pages", {
    parent: { page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji },
    cover: { type: "external", external: { url: coverUrl } },
    properties: { title: { title: [{ text: { content: title } }] } },
    children,
  })
  if (r.ok) {
    console.log(`  ✅ ${title}: ${r.data.id}`)
    return r.data.id
  }
  console.error(`  ❌ ${title}:`, r.error?.slice(0, 200))
  return null
}

async function createSetupPage() {
  return createSubPage(
    "🔧 Setup & Environment",
    "🔧",
    "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1500&q=80",
    [
      block.callout("Coolify 環境変数 + cron + Slack 設定の完全リファレンス。", "⚙️", "blue_background"),
      block.p(""),
      block.h2("✅ 投入済 (Sprint 8-16)"),
      block.bullet("NOTION_API_KEY ✅ (Internal Integration Token)"),
      block.bullet("N8N_WEBHOOK_SECRET ✅ (64 hex secret)"),
      block.bullet("SLACK_BOT_TOKEN ✅ + SLACK_CHANNEL_ID ✅ (#all-paradigm C0B1JJ1L276)"),
      block.bullet("SUPABASE_SERVICE_ROLE_KEY ✅ + NEXT_PUBLIC_SUPABASE_URL ✅"),
      block.bullet("DEEPSEEK_API_KEY ✅ (V4 PRO 永久指定)"),
      block.bullet("NOTION_DB_{COMPANIES,CUSTOMERS,DELIVERIES,TEMPLATES}_{JP,GLOBAL} ✅ 8 vars"),
      block.p(""),
      block.h2("⏳ 任意 (機能追加時に投入)"),
      block.bullet("HYPERFRAMES_API_URL — MP4 化サーバー (現状は HTML preview で代替)"),
      block.bullet("STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + PRICE_* (5 plans)"),
      block.bullet("GOOGLE_PSI_API_KEY (rate-limit 緩和)"),
      block.bullet("GBIZ_API_TOKEN (経産省 API・無料申請)"),
      block.bullet("HUNTER_API_KEY (free 25 req/月)"),
      block.bullet("WHOISXML_API_KEY (free 500 req/月)"),
      block.bullet("GOOGLE_PLACES_API_KEY ($200/月 無料枠)"),
      block.bullet("CAL_COM_API_KEY (cal.com webhook 連携)"),
      block.bullet("DOCUSIGN_INTEGRATION_KEY (契約書電子署名)"),
      block.bullet("CLOUDFLARE_R2_ACCESS_KEY + R2_SECRET_KEY + R2_BUCKET_NAME"),
      block.p(""),
      block.h2("⏰ Coolify Scheduled Tasks (5 min cron)"),
      block.calloutR(
        [
          T("以下 6 cron を Coolify Scheduled Tasks に登録すると、Notion ↔ Supabase 双方向 sync が完全自動化:"),
        ],
        "🤖",
        "yellow_background",
      ),
      block.code(
        `# 5 min ごとに 6 sync を回す (jp + global × {templates, companies, customers, deliveries})
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
        `# 月曜 09:00 JST (=00:00 UTC) Slack 週次ダイジェスト
0 0 * * 1   curl -X POST -H "X-Webhook-Secret: $N8N_WEBHOOK_SECRET" https://paradigmjp.com/api/sales/weekly-digest`,
        "bash",
      ),
    ],
  )
}

async function createR2Page() {
  return createSubPage(
    "🗄️ R2 Storage Spec",
    "🗄️",
    "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1500&q=80",
    [
      block.callout(
        "Notion = データ GUI (人間可読) / Supabase = 機械可読 SSOT / Cloudflare R2 = 大ファイル (動画 / PDF / 画像) 保存先。",
        "🏗️",
        "blue_background",
      ),
      block.p(""),
      block.h2("📦 保存先の役割分担"),
      block.h3("動画 (60s 診断動画)"),
      block.bulletR([
        T("✅ ", { bold: true }),
        T("HTML 自動再生プレビュー: ", {}),
        T("paradigmjp.com/[locale]/report/[slug]/video", { code: true }),
        T(" (HyperFrames 未設定でも完結)"),
      ]),
      block.bulletR([
        T("⏳ ", { bold: true }),
        T("MP4 (HyperFrames API 設定後): ", {}),
        T("r2://paradigm-sales-videos/[locale]/[slug]-[timestamp].mp4", { code: true }),
      ]),
      block.bulletR([
        T("Notion 納品 DB 「納品 URL」: ", { bold: true }),
        T("R2 公開 URL or HTML preview URL のいずれか"),
      ]),
      block.p(""),
      block.h3("契約書 PDF"),
      block.bulletR([
        T("✅ ", { bold: true }),
        T("R2 保存: ", {}),
        T("r2://paradigm-sales-contracts/[region]/[customer_id]/[contract_id]-[version].pdf", { code: true }),
      ]),
      block.bulletR([
        T("Notion 契約書 DB 「PDF (R2)」 field: ", { bold: true }),
        T("R2 公開 URL リンクのみ (Notion 上書きアップロード不要)"),
      ]),
      block.bulletR([T("DocuSign envelope ID も保存して電子署名 audit trail 維持")]),
      block.p(""),
      block.h3("提案資料 (Slidev PDF)"),
      block.bulletR([
        T("R2 保存: ", { bold: true }),
        T("r2://paradigm-sales-proposals/[slug]/proposal-[timestamp].pdf", { code: true }),
      ]),
      block.bulletR([T("Notion 納品 DB 種別 = 「提案資料」で URL 紐づけ")]),
      block.p(""),
      block.h2("🔧 R2 セットアップ"),
      block.num("Cloudflare ダッシュボード → R2 → Create Bucket × 3"),
      block.bullet("  - paradigm-sales-videos (動画)"),
      block.bullet("  - paradigm-sales-contracts (契約 PDF・private)"),
      block.bullet("  - paradigm-sales-proposals (提案資料 PDF)"),
      block.num("R2 API Token 作成 → CLOUDFLARE_R2_ACCESS_KEY / R2_SECRET_KEY を Coolify env 投入"),
      block.num("public bucket は public.r2.dev でカスタムドメイン (videos.paradigmjp.com 等)"),
      block.num("private bucket は presigned URL で配信 (契約書は presigned 推奨)"),
      block.p(""),
      block.h2("📊 容量・コスト"),
      block.bullet("R2 storage: $0.015/GB/月 (10GB で月 $0.15 ≈ ¥22)"),
      block.bullet("R2 egress: 無料 (S3 比 90% 削減)"),
      block.bullet("1 video MP4 60s ≈ 30MB · 月 1000 件 = 30GB = 月 $0.45 ≈ ¥66"),
      block.bullet("1 PDF 契約書 ≈ 1MB · 月 1000 件 = 1GB = 月 $0.015 ≈ ¥2"),
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
        "Supabase = SSOT (整合性) / Notion = GUI (操作 UI) / R2 = 大ファイル。3 層分業設計。",
        "🏛️",
        "purple_background",
      ),
      block.p(""),
      block.h2("🔄 双方向 sync 仕様"),
      block.h3("Supabase → Notion (リアルタイム)"),
      block.bullet("contact form 送信 → enrich → sales_companies INSERT"),
      block.bullet("n8n webhook → Notion リード DB に新ページ作成"),
      block.bullet("Stripe Webhook → sales_customers INSERT → 顧客 DB に新ページ"),
      block.bullet("R2 video upload 完了 → sales_deliveries INSERT → 納品 DB に新ページ"),
      block.p(""),
      block.h3("Notion → Supabase (5 min cron)"),
      block.bulletR([T("/api/sales/sync-templates-from-notion", { code: true }), T(" — Notion で文面編集 → 5min cron → Supabase upsert")]),
      block.bulletR([T("/api/sales/sync-companies-from-notion", { code: true }), T(" — Notion で deal_stage / メモ / フォローアップ日 更新 → Supabase 反映")]),
      block.bulletR([T("/api/sales/sync-customers-from-notion", { code: true }), T(" — 健全度 / 次回ミーティング / 補助金状況 等の更新 sync")]),
      block.bulletR([T("/api/sales/sync-deliveries-from-notion", { code: true }), T(" — ステータス / 進捗 % 更新 sync")]),
      block.p(""),
      block.h2("📊 Sync field 仕様 (Notion → Supabase 編集許可フィールド)"),
      block.h3("リード DB から編集可"),
      block.bullet("商談ステージ: 未対応 → 架電済 → 商談中 → 提案済 → 成約 / 失注"),
      block.bullet("メモ (rich_text)"),
      block.bullet("フォローアップ日 (date)"),
      block.bullet("担当者 (people)"),
      block.callout("⚠️ 上記 4 フィールド以外を Notion で編集しても Supabase には反映されない (safety: dropdown / 値の整合性保持)。", "🛡️", "yellow_background"),
      block.p(""),
      block.h3("顧客 DB から編集可"),
      block.bullet("契約ステータス / 健全度 / 次回ミーティング / 補助金申請状況"),
      block.bullet("月額 / WL クライアント数 / 担当者"),
      block.bullet("メモ"),
      block.p(""),
      block.h3("テンプレ DB から編集可 (全フィールド)"),
      block.bullet("headline / pain / fear / loss / cta_text (5 段階フレーム本文)"),
      block.bullet("有効 (checkbox) / 重要度 / 業種 / 課題コード"),
      block.callout("テンプレ編集 → 5min cron → /report/[slug] 最大 6 分で本番反映。", "🎯", "green_background"),
      block.p(""),
      block.h3("納品 DB から編集可"),
      block.bullet("ステータス / 進捗 % / 公開フラグ"),
      block.bullet("納品 URL / レビュー Slack URL"),
      block.bullet("制作者"),
      block.p(""),
      block.h2("⚠️ Conflict resolution"),
      block.bulletR([T("Notion 編集 > Supabase 既存値", { bold: true }), T(" (Notion を正とする)")]),
      block.bulletR([T("ただし ", {}), T("create-only フィールド (id / domain / slug / 法人番号)", { bold: true }), T(" は Notion 編集無視")]),
      block.bullet("conflict 発生時は sales_sync_logs に audit 記録"),
    ],
  )
}

async function createFAQPage() {
  return createSubPage(
    "❓ FAQ",
    "❓",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1500&q=80",
    [
      block.callout("よくある質問。新規メンバーの onboarding に。", "💡", "blue_background"),
      block.p(""),
      block.toggle("Q: 新しい業種・課題コードを追加したい", [
        block.p("A: 3 箇所に同時追加 (型安全のため):"),
        block.bullet("Supabase: ALTER TABLE sales_companies の CHECK 制約に新 enum 値を追加"),
        block.bullet("TypeScript: src/lib/sales/types.ts の INDUSTRIES / ISSUE_CODES に追加"),
        block.bullet("scripts/seed-*.mjs を更新して再投入"),
      ]),
      block.toggle("Q: テンプレ文面を A/B テストしたい", [
        block.p("A: テンプレ DB の使用回数 / 平均 CVR フィールド活用。テンプレを複製→微修正→月次で CVR 比較。"),
      ]),
      block.toggle("Q: 既存リードを CSV エクスポートしたい", [
        block.p("A: リード DB の ⋮ → エクスポート → CSV 形式。Supabase からも psql で直接取得可。"),
      ]),
      block.toggle("Q: グローバル版で新 locale を追加したい", [
        block.p("A: messages/{locale}.json + i18n/routing.ts + paradigm-blocks の localeToRegion 対応 → DeepSeek 翻訳実行。"),
      ]),
      block.toggle("Q: 動画レポートを MP4 で出したい (現状 HTML preview のみ)", [
        block.p("A: HyperFrames-like サービスを 1 つ立てる: Coolify 上に node + puppeteer + ffmpeg の単独 Express サーバー or Remotion Lambda。HYPERFRAMES_API_URL を投入すると自動 MP4 化に切替。"),
      ]),
      block.toggle("Q: cal.com の予約と商談カレンダーを連携したい", [
        block.p("A: cal.com Webhook を Coolify endpoint に向ける → /api/sales/cal-webhook で sales_calendar_events に INSERT。Notion 商談カレンダー DB にも自動同期。"),
      ]),
      block.toggle("Q: DocuSign で契約書送信したい", [
        block.p("A: DOCUSIGN_INTEGRATION_KEY 投入後、契約書 DB の状態を draft → sent に変更で自動 envelope 送信。署名完了は webhook で sales_contracts.signed_at 更新。"),
      ]),
    ],
  )
}

/* ───── Step 4: 親ハブの構築 (コンパクト・30-40 blocks) ───── */
async function buildCompactHub(newDbIds, newSubPageIds) {
  console.log("🏛️ コンパクト親ハブ構築中...")
  const { activitiesId, calendarId, contractsId } = newDbIds
  const { setupId, r2Id, syncFlowId, faqId } = newSubPageIds

  const blocks = [
    // Hero
    block.calloutR(
      [
        T("Paradigm 営業 OS", { bold: true }),
        T(" — Salesforce × Apollo × DocuSign × cal.com を Notion 上で完全装備。Supabase = SSOT・R2 = 大ファイル・Notion = GUI の 3 層分業。"),
      ],
      "🎯",
      "blue_background",
    ),
    block.p(""),
    block.toc(),
    block.divider(),

    // 8 main DBs (jp 4 + global 4)
    block.h1("🗄️ メインデータベース"),
    block.calloutR(
      [
        T("Supabase との双方向 sync 対象。", { bold: true }),
        T(" Notion 編集 → 5min cron → 本番 /report/[slug] が最大 6 分で反映。"),
      ],
      "🔄",
      "default",
    ),

    block.h2("🇯🇵 日本市場 (region='jp')"),
    block.h3("🎯 リード DB"),
    block.linkedDb(DB.leadsJp),
    block.h3("🏢 顧客 DB"),
    block.linkedDb(DB.customersJp),
    block.h3("📦 納品 DB"),
    block.linkedDb(DB.deliveriesJp),
    block.h3("📝 テンプレ DB"),
    block.linkedDb(DB.templatesJp),
    block.p(""),

    block.h2("🌍 海外市場 (region='global'・11 locale 共通)"),
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
    block.h1("🆕 Salesforce × Apollo 級装備 (Sprint 17)"),
    block.callout("商談・契約書・営業活動ログを Notion に完全統合。", "⚡", "green_background"),

    block.h3("📞 アクティビティログ"),
    block.calloutR(
      [
        T("Salesforce Activity Timeline 相当。", { bold: true }),
        T(" 全営業活動 (メール / 架電 / 会議 / メモ / SMS / LinkedIn / デモ / フォローアップ) をリードごとに時系列で記録。"),
      ],
      "📞",
      "gray_background",
    ),
    activitiesId ? block.linkedDb(activitiesId) : block.p("(activities DB 作成失敗)"),

    block.h3("📅 商談カレンダー"),
    block.calloutR(
      [
        T("cal.com 統合。", { bold: true }),
        T(" Discovery / Demo / Proposal / Closing の各フェーズ商談を予約・実施・結果まで一元管理。cal.com の予約 URL も保存して顧客に共有。"),
      ],
      "📅",
      "gray_background",
    ),
    calendarId ? block.linkedDb(calendarId) : block.p("(calendar DB 作成失敗)"),

    block.h3("📄 契約書 DB"),
    block.calloutR(
      [
        T("Salesforce Contracts + DocuSign 統合。", { bold: true }),
        T(" PDF は Cloudflare R2 に保存、Notion は URL リンクのみ保持 (大ファイル不適)。draft → sent → signed → active の status 管理。"),
      ],
      "📄",
      "gray_background",
    ),
    contractsId ? block.linkedDb(contractsId) : block.p("(contracts DB 作成失敗)"),
    block.p(""),

    block.divider(),

    // Sub pages navigation
    block.h1("📂 詳細ドキュメント"),
    block.callout(
      "親ハブを軽量に保つため、詳細は配下サブページに分離。クリックで展開。",
      "🗂️",
      "default",
    ),
    setupId
      ? block.calloutR(
          [linkT("🔧 Setup & Environment", `https://www.notion.so/${setupId.replace(/-/g, "")}`), T(" — Coolify env / cron / Slack 設定の完全リファレンス")],
          "🔧",
          "gray_background",
        )
      : block.p(""),
    r2Id
      ? block.calloutR(
          [linkT("🗄️ R2 Storage Spec", `https://www.notion.so/${r2Id.replace(/-/g, "")}`), T(" — 動画 / PDF / 提案資料の保存先仕様")],
          "🗄️",
          "gray_background",
        )
      : block.p(""),
    syncFlowId
      ? block.calloutR(
          [linkT("📚 Architecture & Sync Flow", `https://www.notion.so/${syncFlowId.replace(/-/g, "")}`), T(" — Supabase ↔ Notion 双方向 sync 仕様 + Conflict 解決ルール")],
          "📚",
          "gray_background",
        )
      : block.p(""),
    faqId
      ? block.calloutR(
          [linkT("❓ FAQ", `https://www.notion.so/${faqId.replace(/-/g, "")}`), T(" — よくある質問・新メンバー onboarding")],
          "❓",
          "gray_background",
        )
      : block.p(""),
    block.p(""),

    block.calloutR(
      [
        T("📊 既存サブページ:", { bold: true }),
        T(" Quick Start / 営業ダッシュボード / 使い方ガイド / 業種別営業戦略 (Sprint 14 で作成済)"),
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
      console.error(`  ❌ chunk ${i / 90 + 1}:`, JSON.stringify(r.data).slice(0, 200))
      return false
    }
  }
  console.log(`  ✅ ${blocks.length} blocks added (compact hub)`)
  return true
}

/* ───── Run ───── */
async function main() {
  console.log("🚀 Sprint 17 親ハブ再構造化 + 3 新 DB 開始\n")

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
✅ Sprint 17 再構造化完了:

NOTION_DB_ACTIVITIES=${activitiesId ?? "(failed)"}
NOTION_DB_CALENDAR=${calendarId ?? "(failed)"}
NOTION_DB_CONTRACTS=${contractsId ?? "(failed)"}

Sub pages:
- 🔧 Setup & Environment: ${setupId ?? "(failed)"}
- 🗄️ R2 Storage Spec: ${r2Id ?? "(failed)"}
- 📚 Architecture & Sync Flow: ${syncFlowId ?? "(failed)"}
- ❓ FAQ: ${faqId ?? "(failed)"}

親ハブ: https://www.notion.so/35fa2b78f3fc81299d91e457889ee393
`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
