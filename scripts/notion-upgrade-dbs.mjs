#!/usr/bin/env node
/**
 * scripts/notion-upgrade-dbs.mjs  ESprint 14 Notion 4 DB クオリチE��アチE�E
 *
 * 役割: 4 DB (リーチE顧客/納品/チE��プレ) に icon + cover + description + rich props 追加.
 *       Notion 公式テンプレ並みに整傁E Views 追加は API 制限�Eため別送Euser 手動 (UI).
 *
 * 入劁E NOTION_API_KEY env (or hardcode)
 * 出劁E stdout に upgrade 結果
 *
 * AE-PHP-4 準拠.
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY
if (!NOTION_API_KEY) {
  console.error('NOTION_API_KEY env var must be set')
  process.exit(1)
}

const DB = {
  leads: "8cbab1f501144f83872c1738ce3e79c4",
  customers: "86b1d93e3b854862ae7b2750d2585677",
  deliveries: "b3cbef9dd96f4e5bbbecc404c703a298",
  templates: "115e2b0e79424bb0813fc05402096f95",
}

/* Unsplash gradient cover URLs (高品質・無料商用利用 OK) */
const COVERS = {
  leads: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1500&q=80",        // 営業チ�Eム
  customers: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1500&q=80",   // ハンドシェイク
  deliveries: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1500&q=80", // 納品/配送E
  templates: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1500&q=80",  // ライチE��ング
}

async function patchDb(id, body) {
  const res = await fetch(`https://api.notion.com/v1/databases/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    console.error(`  ❁EPATCH ${id} failed:`, data.message || JSON.stringify(data).slice(0, 200))
    return false
  }
  return true
}

/* ───── 🎯 リーチEDB ───── */
async function upgradeLeads() {
  console.log("🎯 リーチEDB upgrading...")
  const ok = await patchDb(DB.leads, {
    icon: { type: "emoji", emoji: "🎯" },
    cover: { type: "external", external: { url: COVERS.leads } },
    description: [
      {
        type: "text",
        text: {
          content:
            "営業 OS の中忁EDB。paradigmjp.com/contact 経由でフォーム送信されぁESMB 法人ドメインを�E動エンリチE�� (PSI + gBizInfo + scanDomain) して蓁E��、EOT lead 自動判宁E(3+ views)。詳細レポ�EチE+ 60s 動画レポ�Eト�E slug ベ�Eス URL で配信、E,
        },
      },
    ],
    properties: {
      // Sprint 13: URL-safe 事業老E�� slug
      "slug (URL)": { rich_text: {} },
      "対象国": {
        select: {
          options: [
            { name: "JP", color: "red" },
            { name: "US", color: "blue" },
            { name: "KR", color: "purple" },
            { name: "CN", color: "yellow" },
            { name: "DE", color: "brown" },
            { name: "FR", color: "pink" },
            { name: "ES", color: "orange" },
            { name: "BR", color: "green" },
            { name: "AE", color: "gray" },
            { name: "VN", color: "green" },
            { name: "ID", color: "green" },
          ],
        },
      },
      "表示言誁E: {
        select: {
          options: [
            { name: "ja", color: "red" },
            { name: "en", color: "blue" },
            { name: "ko", color: "purple" },
            { name: "zh", color: "yellow" },
            { name: "de", color: "brown" },
            { name: "fr", color: "pink" },
            { name: "es", color: "orange" },
            { name: "pt", color: "green" },
            { name: "ru", color: "gray" },
            { name: "ar", color: "gray" },
            { name: "vi", color: "green" },
            { name: "id", color: "green" },
          ],
        },
      },
      "チE��プレ種別": {
        select: {
          options: [
            { name: "website_diagnostic", color: "blue" },
            { name: "meo", color: "green" },
            { name: "security", color: "red" },
            { name: "japan_entry", color: "purple" },
            { name: "video_subscription", color: "orange" },
            { name: "subsidy", color: "yellow" },
            { name: "outreach", color: "pink" },
          ],
        },
      },
      // Sprint 13: 自勁EURL (computed via formula)
      "📋 診断レポ�EチE: {
        formula: {
          expression: `if(empty(prop("slug (URL)")), "", "https://paradigmjp.com/" + if(empty(prop("表示言誁E)), "ja", format(prop("表示言誁E))) + "/report/" + prop("slug (URL)"))`,
        },
      },
      "🎬 動画レポ�EチE: {
        formula: {
          expression: `if(empty(prop("slug (URL)")), "", "https://paradigmjp.com/ja/report/" + prop("slug (URL)") + "/video")`,
        },
      },
      // gBizInfo enrichment
      "法人番号 (gBiz)": { rich_text: {} },
      "従業員数 (gBiz)": { number: { format: "number_with_commas" } },
      "賁E��釁E(gBiz・冁E": { number: { format: "yen" } },
      "設立年 (gBiz)": { rich_text: {} },
      // Last touched
      "同期状慁E: {
        formula: {
          expression: `if(empty(prop("ドメイン")), "URL不足", if(empty(prop("slug (URL)")), "slug生�E征E��", "公開URLあり"))`,
        },
      },
      "次アクション": {
        formula: {
          expression: `if(format(prop("パイプライン")) == "pending", "企業URLを確誁E, if(format(prop("パイプライン")) == "scanning", "自動診断征E��", if(format(prop("パイプライン")) == "report_ready", "レポ�Eト送仁E, if(format(prop("パイプライン")) == "manual_queue", "手動確誁E, "フォロー"))))`,
        },
      },
      "最終更新": { last_edited_time: {} },
    },
  })
  return ok
}

/* ───── 🏢 顧客 DB ───── */
async function upgradeCustomers() {
  console.log("🏢 顧客 DB upgrading...")
  const ok = await patchDb(DB.customers, {
    icon: { type: "emoji", emoji: "🏢" },
    cover: { type: "external", external: { url: COVERS.customers } },
    description: [
      {
        type: "text",
        text: {
          content:
            "Paradigm の有料顧客 dashboard、ERR (月次経常収益) + 健全度 + WL (white-label) 代琁E��契紁E��一允E��琁E��Stripe Webhook から自動同期、月次請求�E契紁E��始日ベ�Eスで計算、E,
        },
      },
    ],
    properties: {
      "紐づくリーチE: {
        relation: {
          database_id: DB.leads,
          single_property: {},
        },
      },
      "紹介経由": { rich_text: {} },
      "LTV (試箁E": {
        formula: {
          expression: `if(empty(prop("月顁E)) or empty(prop("契紁E��始日")), 0, prop("月顁E) * (dateBetween(now(), prop("契紁E��始日"), "months") + 1))`,
        },
      },
      "契紁E��続月数": {
        formula: {
          expression: `if(empty(prop("契紁E��始日")), 0, dateBetween(now(), prop("契紁E��始日"), "months"))`,
        },
      },
      "最終更新": { last_edited_time: {} },
    },
  })
  return ok
}

/* ───── 📦 納品 DB ───── */
async function upgradeDeliveries() {
  console.log("📦 納品 DB upgrading...")
  const ok = await patchDb(DB.deliveries, {
    icon: { type: "emoji", emoji: "📦" },
    cover: { type: "external", external: { url: COVERS.deliveries } },
    description: [
      {
        type: "text",
        text: {
          content:
            "顧客への納品物 (60s 診断動画 / Web 制佁E/ MEO レポ�EチE/ 提案賁E�� / 動画サブスク) tracking、Eloudflare R2 にアチE�Eロード征EURL を記録、状態�E移 (制作中 ↁEレビュー征E�� ↁE納品渁E を可視化、E,
        },
      },
    ],
    properties: {
      "紐づく顧客": {
        relation: {
          database_id: DB.customers,
          single_property: {},
        },
      },
      "公閁E: { checkbox: {} },
      "レビュー Slack URL": { url: {} },
      "進捁E%": { number: { format: "percent" } },
    },
  })
  return ok
}

/* ───── 📝 チE��プレ DB ───── */
async function upgradeTemplates() {
  console.log("📝 チE��プレ DB upgrading...")
  const ok = await patchDb(DB.templates, {
    icon: { type: "emoji", emoji: "📝" },
    cover: { type: "external", external: { url: COVERS.templates } },
    description: [
      {
        type: "text",
        text: {
          content:
            "業種 ÁE課題コーチE= 56 パターンの営業斁E��チE��プレ。「絶望�E希望、E 段階フレーム (headline / pain / fear / loss / cta) めEencode。Supabase sales_templates と双方吁Esync。新規追加・編雁E�E Notion 側で行い、Coolify ぁEn8n 経由で自動反映、E,
        },
      },
    ],
    properties: {
      "使用回数": { number: { format: "number" } },
      "平坁ECVR (%)": { number: { format: "percent" } },
      "チE��プレ種別": {
        select: {
          options: [
            { name: "website_diagnostic", color: "blue" },
            { name: "meo", color: "green" },
            { name: "security", color: "red" },
            { name: "japan_entry", color: "purple" },
            { name: "video_subscription", color: "orange" },
            { name: "subsidy", color: "yellow" },
            { name: "outreach", color: "pink" },
          ],
        },
      },
      "対象国": {
        select: {
          options: [
            { name: "JP", color: "red" },
            { name: "US", color: "blue" },
            { name: "KR", color: "purple" },
            { name: "CN", color: "yellow" },
            { name: "DE", color: "brown" },
            { name: "FR", color: "pink" },
            { name: "ES", color: "orange" },
            { name: "BR", color: "green" },
            { name: "AE", color: "gray" },
            { name: "VN", color: "green" },
            { name: "ID", color: "green" },
          ],
        },
      },
      "表示言誁E: {
        select: {
          options: [
            { name: "ja", color: "red" },
            { name: "en", color: "blue" },
            { name: "ko", color: "purple" },
            { name: "zh", color: "yellow" },
            { name: "de", color: "brown" },
            { name: "fr", color: "pink" },
            { name: "es", color: "orange" },
            { name: "pt", color: "green" },
            { name: "ru", color: "gray" },
            { name: "ar", color: "gray" },
            { name: "vi", color: "green" },
            { name: "id", color: "green" },
          ],
        },
      },
      "自動適用キー": {
        formula: {
          expression: `format(prop("チE��プレ種別")) + " / " + format(prop("対象国")) + " / " + format(prop("表示言誁E)) + " / " + format(prop("業種")) + " / " + format(prop("課題コーチE))`,
        },
      },
      "最終使用日": { date: {} },
      "備老E: { rich_text: {} },
    },
  })
  return ok
}

/* ───── Run ───── */
async function main() {
  console.log("🚀 Notion 4 DB めENotion 公式テンプレ並みにアチE�Eグレード開始\n")
  const results = await Promise.all([
    upgradeLeads(),
    upgradeCustomers(),
    upgradeDeliveries(),
    upgradeTemplates(),
  ])
  const passed = results.filter(Boolean).length
  console.log(`\n✁E${passed}/4 DB upgraded`)
  console.log(`
  Next steps (Notion UI で手動):
  - 吁EDB に view 追加 (Board/Calendar/Gallery)
  - リーチEDB: 🔥 HOT leads / 📊 スチE�Eジ別 / 🗾 都道府県別 / 📅 フォローアチE�E予宁E
  - 顧客 DB: 💰 MRR 一覧 / 🏥 health モニター / 📅 請求カレンダー / 🤁EWL のみ
  - 納品 DB: 🚧 進行中 / 📅 締刁E��レンダー / 🎬 動画納品のみ / ✁E完亁E��E
  - チE��プレ DB: 🎯 業種別 / 🚨 critical のみ / ⭁E有効チE��プレ
  `)
  process.exit(passed === 4 ? 0 : 1)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
