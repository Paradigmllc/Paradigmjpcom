#!/usr/bin/env node
/**
 * scripts/notion-upgrade-dbs.mjs — Sprint 14 Notion 4 DB クオリティアップ
 *
 * 役割: 4 DB (リード/顧客/納品/テンプレ) に icon + cover + description + rich props 追加.
 *       Notion 公式テンプレ並みに整備. Views 追加は API 制限のため別途 user 手動 (UI).
 *
 * 入力: NOTION_API_KEY env (or hardcode)
 * 出力: stdout に upgrade 結果
 *
 * AE-PHP-4 準拠.
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY ?? "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"

const DB = {
  leads: "8cbab1f501144f83872c1738ce3e79c4",
  customers: "86b1d93e3b854862ae7b2750d2585677",
  deliveries: "b3cbef9dd96f4e5bbbecc404c703a298",
  templates: "115e2b0e79424bb0813fc05402096f95",
}

/* Unsplash gradient cover URLs (高品質・無料商用利用 OK) */
const COVERS = {
  leads: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1500&q=80",        // 営業チーム
  customers: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1500&q=80",   // ハンドシェイク
  deliveries: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1500&q=80", // 納品/配送
  templates: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1500&q=80",  // ライティング
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
    console.error(`  ❌ PATCH ${id} failed:`, data.message || JSON.stringify(data).slice(0, 200))
    return false
  }
  return true
}

/* ───── 🎯 リード DB ───── */
async function upgradeLeads() {
  console.log("🎯 リード DB upgrading...")
  const ok = await patchDb(DB.leads, {
    icon: { type: "emoji", emoji: "🎯" },
    cover: { type: "external", external: { url: COVERS.leads } },
    description: [
      {
        type: "text",
        text: {
          content:
            "営業 OS の中心 DB。paradigmjp.com/contact 経由でフォーム送信された SMB 法人ドメインを自動エンリッチ (PSI + gBizInfo + scanDomain) して蓄積。HOT lead 自動判定 (3+ views)。詳細レポート + 60s 動画レポートは slug ベース URL で配信。",
        },
      },
    ],
    properties: {
      // Sprint 13: URL-safe 事業者名 slug
      "slug (URL)": { rich_text: {} },
      // Sprint 13: 自動 URL (computed via formula)
      "📋 診断レポート": {
        formula: {
          expression: `if(empty(prop("slug (URL)")), "", "https://paradigmjp.com/ja/report/" + prop("slug (URL)"))`,
        },
      },
      "🎬 動画レポート": {
        formula: {
          expression: `if(empty(prop("slug (URL)")), "", "https://paradigmjp.com/ja/report/" + prop("slug (URL)") + "/video")`,
        },
      },
      // gBizInfo enrichment
      "法人番号 (gBiz)": { rich_text: {} },
      "従業員数 (gBiz)": { number: { format: "number_with_commas" } },
      "資本金 (gBiz・円)": { number: { format: "yen" } },
      "設立年 (gBiz)": { rich_text: {} },
      // Last touched
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
            "Paradigm の有料顧客 dashboard。MRR (月次経常収益) + 健全度 + WL (white-label) 代理店契約を一元管理。Stripe Webhook から自動同期、月次請求は契約開始日ベースで計算。",
        },
      },
    ],
    properties: {
      "紐づくリード": {
        relation: {
          database_id: DB.leads,
          single_property: {},
        },
      },
      "紹介経由": { rich_text: {} },
      "LTV (試算)": {
        formula: {
          expression: `if(empty(prop("月額")) or empty(prop("契約開始日")), 0, prop("月額") * (dateBetween(now(), prop("契約開始日"), "months") + 1))`,
        },
      },
      "契約継続月数": {
        formula: {
          expression: `if(empty(prop("契約開始日")), 0, dateBetween(now(), prop("契約開始日"), "months"))`,
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
            "顧客への納品物 (60s 診断動画 / Web 制作 / MEO レポート / 提案資料 / 動画サブスク) tracking。Cloudflare R2 にアップロード後 URL を記録、状態遷移 (制作中 → レビュー待ち → 納品済) を可視化。",
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
      "公開": { checkbox: {} },
      "レビュー Slack URL": { url: {} },
      "進捗 %": { number: { format: "percent" } },
    },
  })
  return ok
}

/* ───── 📝 テンプレ DB ───── */
async function upgradeTemplates() {
  console.log("📝 テンプレ DB upgrading...")
  const ok = await patchDb(DB.templates, {
    icon: { type: "emoji", emoji: "📝" },
    cover: { type: "external", external: { url: COVERS.templates } },
    description: [
      {
        type: "text",
        text: {
          content:
            "業種 × 課題コード = 56 パターンの営業文面テンプレ。「絶望→希望」5 段階フレーム (headline / pain / fear / loss / cta) を encode。Supabase sales_templates と双方向 sync。新規追加・編集は Notion 側で行い、Coolify が n8n 経由で自動反映。",
        },
      },
    ],
    properties: {
      "使用回数": { number: { format: "number" } },
      "平均 CVR (%)": { number: { format: "percent" } },
      "最終使用日": { date: {} },
      "備考": { rich_text: {} },
    },
  })
  return ok
}

/* ───── Run ───── */
async function main() {
  console.log("🚀 Notion 4 DB を Notion 公式テンプレ並みにアップグレード開始\n")
  const results = await Promise.all([
    upgradeLeads(),
    upgradeCustomers(),
    upgradeDeliveries(),
    upgradeTemplates(),
  ])
  const passed = results.filter(Boolean).length
  console.log(`\n✅ ${passed}/4 DB upgraded`)
  console.log(`
  Next steps (Notion UI で手動):
  - 各 DB に view 追加 (Board/Calendar/Gallery)
  - リード DB: 🔥 HOT leads / 📊 ステージ別 / 🗾 都道府県別 / 📅 フォローアップ予定
  - 顧客 DB: 💰 MRR 一覧 / 🏥 health モニター / 📅 請求カレンダー / 🤝 WL のみ
  - 納品 DB: 🚧 進行中 / 📅 締切カレンダー / 🎬 動画納品のみ / ✅ 完了済
  - テンプレ DB: 🎯 業種別 / 🚨 critical のみ / ⭕ 有効テンプレ
  `)
  process.exit(passed === 4 ? 0 : 1)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
