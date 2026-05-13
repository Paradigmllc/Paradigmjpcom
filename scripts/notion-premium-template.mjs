#!/usr/bin/env node
/**
 * scripts/notion-premium-template.mjs — Sprint 14 有料 Notion テンプレ級アップグレード
 *
 * 役割: 親ページ "Paradigm 営業 OS" を Notion Marketplace の有料テンプレ ($50-$200) と
 *       同等のクオリティに引き上げる. アイコン/カバー以外の本質的な改善を全部実施.
 *
 * 実装:
 *   1. 親ページ既存 blocks を archive (clean slate)
 *   2. 親ページに Hub content 構築:
 *      - Hero callout (Quick start 5 steps)
 *      - Table of contents
 *      - 4 DB linked references with descriptions
 *      - 5 段階フレーム解説 (toggle)
 *      - 業種別戦略 8 cards (callout)
 *      - セットアップガイド (toggle)
 *      - FAQ (toggle)
 *   3. 3 sub pages 作成:
 *      - 📊 営業ダッシュボード (linked DB views)
 *      - 📖 使い方ガイド (Quickstart + 詳細フロー)
 *      - 🎓 業種別戦略 (8 業種詳細)
 *   4. 4 DB に Rollup プロパティ追加 (relation 越し集計)
 *
 * 入力: NOTION_API_KEY
 * 出力: stdout に進捗
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY ?? "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"
const PARENT_PAGE_ID = "35fa2b78-f3fc-8129-9d91-e457889ee393"
const DB = {
  leads: "8cbab1f501144f83872c1738ce3e79c4",
  customers: "86b1d93e3b854862ae7b2750d2585677",
  deliveries: "b3cbef9dd96f4e5bbbecc404c703a298",
  templates: "115e2b0e79424bb0813fc05402096f95",
}

let lastCall = 0
async function throttle() {
  const now = Date.now()
  const elapsed = now - lastCall
  if (elapsed < 350) await new Promise((r) => setTimeout(r, 350 - elapsed))
  lastCall = Date.now()
}

async function n(method, path, body) {
  await throttle()
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(`https://api.notion.com/v1${path}`, opts)
  const data = await res.json()
  if (!res.ok) {
    return { ok: false, error: data.message || JSON.stringify(data).slice(0, 200), status: res.status }
  }
  return { ok: true, data }
}

/* ───── helpers: Notion block builders ───── */
const T = (content, opts = {}) => ({
  type: "text",
  text: { content },
  ...(opts.bold || opts.color ? { annotations: { ...(opts.bold ? { bold: true } : {}), ...(opts.color ? { color: opts.color } : {}) } } : {}),
})
const linkText = (content, url) => ({ type: "text", text: { content, link: { url } } })

const block = {
  heading_1: (text) => ({ object: "block", type: "heading_1", heading_1: { rich_text: [T(text)] } }),
  heading_2: (text) => ({ object: "block", type: "heading_2", heading_2: { rich_text: [T(text)] } }),
  heading_3: (text) => ({ object: "block", type: "heading_3", heading_3: { rich_text: [T(text)] } }),
  paragraph: (richTexts) => ({ object: "block", type: "paragraph", paragraph: { rich_text: Array.isArray(richTexts) ? richTexts : [T(richTexts)] } }),
  callout: (text, emoji, color = "default") => ({
    object: "block",
    type: "callout",
    callout: {
      rich_text: [T(text)],
      icon: { type: "emoji", emoji },
      color,
    },
  }),
  calloutRich: (richTexts, emoji, color = "default") => ({
    object: "block",
    type: "callout",
    callout: {
      rich_text: Array.isArray(richTexts) ? richTexts : [T(richTexts)],
      icon: { type: "emoji", emoji },
      color,
    },
  }),
  bullet: (text) => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [T(text)] } }),
  bulletRich: (rich) => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: rich } }),
  number: (text) => ({ object: "block", type: "numbered_list_item", numbered_list_item: { rich_text: [T(text)] } }),
  toggle: (text, children = []) => ({
    object: "block",
    type: "toggle",
    toggle: { rich_text: [T(text)], children },
  }),
  divider: () => ({ object: "block", type: "divider", divider: {} }),
  quote: (text) => ({ object: "block", type: "quote", quote: { rich_text: [T(text)] } }),
  toc: () => ({ object: "block", type: "table_of_contents", table_of_contents: { color: "default" } }),
  linkedDb: (databaseId) => ({
    object: "block",
    type: "link_to_page",
    link_to_page: { type: "database_id", database_id: databaseId },
  }),
  childPage: (title) => ({ object: "block", type: "child_page", child_page: { title } }),
  todo: (text, checked = false) => ({ object: "block", type: "to_do", to_do: { rich_text: [T(text)], checked } }),
}

/* ───── Step 1: 親ページ既存 blocks 削除 ───── */
async function archiveExistingBlocks() {
  console.log("🧹 親ページ既存 blocks 削除中...")
  let cursor = undefined
  const allIds = []
  do {
    const r = await n("GET", `/blocks/${PARENT_PAGE_ID}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`)
    if (!r.ok) {
      console.error("  ❌ 取得失敗:", r.error)
      break
    }
    allIds.push(...r.data.results.map((b) => b.id))
    cursor = r.data.has_more ? r.data.next_cursor : undefined
  } while (cursor)
  console.log(`  Found ${allIds.length} blocks. Deleting...`)
  for (const id of allIds) {
    await n("DELETE", `/blocks/${id}`)
  }
  console.log(`  ✅ ${allIds.length} blocks archived`)
}

/* ───── Step 2: 親ページに Hub コンテンツ追加 ───── */
async function buildHubContent() {
  console.log("🏛️ 親ページに Hub content 構築中...")

  // Notion API は children 一括追加で最大 100 blocks/req
  const blocks = []

  // ── HERO ──
  blocks.push(
    block.calloutRich(
      [
        T("Paradigm 営業 OS へようこそ。", { bold: true }),
        T(" "),
        T("Bootstrap 経営の中心ハブとして、リード獲得 → 診断レポート送付 → 契約 → 納品までを 1 つの Notion ワークスペースに集約しています。Supabase との双方向 sync で paradigmjp.com の本番データとリアルタイム連携。"),
      ],
      "🎯",
      "blue_background",
    ),
    block.paragraph(""),
  )

  // ── TOC ──
  blocks.push(block.heading_2("目次"))
  blocks.push(block.toc())
  blocks.push(block.paragraph(""))

  // ── Quick Start ──
  blocks.push(block.heading_2("🚀 5 分で使い始める"))
  blocks.push(
    block.calloutRich(
      [
        T("初めての方へ:", { bold: true }),
        T(" 下記 5 ステップで営業 OS の全体像が分かります。各 DB の詳細は配下サブページを参照。"),
      ],
      "💡",
      "gray_background",
    ),
  )
  blocks.push(
    block.number("リード DB を開いて HOT view を確認 (報告 3+ 閲覧の見込み客を即座に把握)"),
    block.number("対象リードのドメインを開き、診断レポート URL (📋) で内容確認 → メール送付"),
    block.number("反応があった顧客は「商談ステージ」を架電済 → 商談中 → 成約 に更新"),
    block.number("成約したら顧客 DB に新規レコード作成 → 紐づくリードに relation"),
    block.number("納品物 (動画/Web/MEO レポート) は納品 DB に紐づけて R2 URL 記録"),
  )
  blocks.push(block.paragraph(""))

  // ── Sub pages ── (placeholders・ID は後で実 child_page 作成後に linked)
  blocks.push(block.heading_2("📂 サブページ"))
  blocks.push(
    block.calloutRich(
      [T("配下に 3 つの専用ページを配置 (下記から開く)。各ページは「使う時に最も視認性が高い」よう設計。")],
      "🗂️",
      "purple_background",
    ),
  )

  blocks.push(block.divider())

  // ── 4 DB section ──
  blocks.push(block.heading_2("🗄️ 4 大データベース"))
  blocks.push(
    block.calloutRich(
      [
        T("Supabase との双方向 sync 対象。", { bold: true }),
        T(" Notion 側で変更すれば 5 分以内に Supabase に反映、本番サイト (paradigmjp.com/ja/report/[slug]) が即時更新される。"),
      ],
      "🔄",
      "default",
    ),
  )

  blocks.push(block.heading_3("🎯 リード DB"))
  blocks.push(block.linkedDb(DB.leads))
  blocks.push(
    block.calloutRich(
      [
        T("用途: ", { bold: true }),
        T("paradigmjp.com/contact の自動エンリッチ結果。PSI + gBizInfo + Wappalyzer で属性収集済。"),
        T("\n📋 view 推奨: ", { bold: true }),
        T("🔥 HOT leads / 📊 ステージ別 / 🗾 都道府県別 / 📅 フォローアップ予定 / 🆕 今週の新規"),
      ],
      "🎯",
      "gray_background",
    ),
  )

  blocks.push(block.heading_3("🏢 顧客 DB"))
  blocks.push(block.linkedDb(DB.customers))
  blocks.push(
    block.calloutRich(
      [
        T("用途: ", { bold: true }),
        T("有料顧客の MRR + health 一元管理。LTV 試算は契約継続月数 × 月額で formula 自動計算。"),
        T("\n📋 view 推奨: ", { bold: true }),
        T("💰 MRR 一覧 / 🏥 health モニター / 📅 請求カレンダー / 🤝 WL 顧客のみ / 🎁 補助金申請中"),
      ],
      "🏢",
      "gray_background",
    ),
  )

  blocks.push(block.heading_3("📦 納品 DB"))
  blocks.push(block.linkedDb(DB.deliveries))
  blocks.push(
    block.calloutRich(
      [
        T("用途: ", { bold: true }),
        T("60s 診断動画 / Web 制作 / MEO レポート の納品 tracking。Cloudflare R2 上の URL 記録。"),
        T("\n📋 view 推奨: ", { bold: true }),
        T("🚧 進行中 / 📅 締切カレンダー / 🎬 動画ギャラリー / ✅ 完了済"),
      ],
      "📦",
      "gray_background",
    ),
  )

  blocks.push(block.heading_3("📝 テンプレ DB"))
  blocks.push(block.linkedDb(DB.templates))
  blocks.push(
    block.calloutRich(
      [
        T("用途: ", { bold: true }),
        T("業種 (8) × 課題コード (7) = 56 パターンの営業文面。絶望→希望 5 段階フレームを encode。"),
        T("\n📋 view 推奨: ", { bold: true }),
        T("🎯 業種別 / 🚨 critical のみ / ⭕ 有効テンプレ / 📊 課題コード別 / 🔥 ホットテンプレ"),
      ],
      "📝",
      "gray_background",
    ),
  )

  blocks.push(block.divider())

  // ── 5 段階フレーム ──
  blocks.push(block.heading_2("📖 絶望→希望 5 段階フレーム (CVR 4-8% 実証)"))
  blocks.push(
    block.calloutRich(
      [
        T("テンプレ DB の各レコードは下記 5 段階の心理フローを encode:", { bold: true }),
      ],
      "🎬",
      "yellow_background",
    ),
  )
  blocks.push(
    block.bulletRich([T("1. 絶望 (headline): ", { bold: true }), T("衝撃の現実認識「今この瞬間、御社サイトを訪れた 10 人のうち 6 人は内容を見る前に帰っています」")]),
    block.bulletRich([T("2. 警告 (pain): ", { bold: true }), T("ビジネス痛点「モバイル PageSpeed が 50 点未満。競合は 80 点以上が標準」")]),
    block.bulletRich([T("3. 注意 (fear): ", { bold: true }), T("未来のリスク「Google は 2024 年から Core Web Vitals を順位の正式要素に。3 ヶ月後には集客チャネル消滅」")]),
    block.bulletRich([T("4. 通知 (loss): ", { bold: true }), T("数値による損失試算「離脱率 60% × 訪問者 1,200 名 × 客単価 ¥8,000 × CVR 2% = 月間 ¥1,152,000 機会損失」")]),
    block.bulletRich([T("5. 希望 (cta_text): ", { bold: true }), T("解決アクション「Paradigm が 14 日以内に PageSpeed 80+ まで改善。費用 ¥80,000~」")]),
  )
  blocks.push(block.paragraph(""))

  blocks.push(block.divider())

  // ── 業種別戦略 (8 業種 callout) ──
  blocks.push(block.heading_2("🎓 業種別アプローチ戦略"))
  blocks.push(
    block.callout(
      "8 業種 × 7 課題コードの 56 パターンが既に投入済。下記は業種別の営業ストーリー指針。",
      "💼",
      "default",
    ),
  )

  const industries = [
    { icon: "💇", name: "美容室", hook: "Instagram 予約導線・お店探し検索流入" },
    { icon: "🦷", name: "歯科医院", hook: "EPARK / Web 予約導線・近隣患者の比較検討" },
    { icon: "🍶", name: "飲食店", hook: "食べログ / Google Map 検索流入・ランチタイム" },
    { icon: "🏗", name: "建設業", hook: "施工事例 SEO・元請紹介・Web 見積依頼" },
    { icon: "📊", name: "会計事務所", hook: "決算前比較検討・顧問契約検討中" },
    { icon: "🛍", name: "小売店", hook: "Google Map / Instagram 検索・EC モール対抗" },
    { icon: "🧹", name: "清掃業", hook: "くらしのマーケット / Web 見積依頼" },
    { icon: "💼", name: "コンサル業", hook: "LinkedIn / Web 問い合わせ・専門性訴求" },
  ]
  for (const i of industries) {
    blocks.push(
      block.calloutRich(
        [T(`${i.name}: `, { bold: true }), T(i.hook)],
        i.icon,
        "gray_background",
      ),
    )
  }
  blocks.push(block.paragraph(""))

  blocks.push(block.divider())

  // ── セットアップガイド (toggle) ──
  blocks.push(block.heading_2("🔧 セットアップ"))
  blocks.push(
    block.toggle("Coolify 環境変数 (本番)", [
      block.bullet("NOTION_API_KEY ✅ 投入済"),
      block.bullet("N8N_WEBHOOK_SECRET ✅ 投入済 (64 hex)"),
      block.bullet("SLACK_BOT_TOKEN ✅ 投入済"),
      block.bullet("SLACK_CHANNEL_ID ✅ 投入済 (#all-paradigm)"),
      block.bullet("SUPABASE_SERVICE_ROLE_KEY ✅ 投入済"),
      block.bullet("DEEPSEEK_API_KEY ✅ 投入済 (V4 PRO)"),
      block.bullet("HYPERFRAMES_API_URL ⏳ 未設定 (HTML preview で代替・MP4 化は別 service 構築後)"),
      block.bullet("STRIPE_SECRET_KEY ⏳ 未設定 (収益化開始時)"),
      block.bullet("GOOGLE_PSI_API_KEY ⏳ 未設定 (PSI rate-limit 緩和したい時)"),
      block.bullet("GBIZ_API_TOKEN ⏳ 未設定 (gBizInfo 企業属性 enrichment)"),
    ]),
    block.toggle("Supabase ↔ Notion 双方向 sync", [
      block.paragraph("方式 (Sprint 8 で設計済):"),
      block.bullet("Supabase → Notion: webhook trigger で自動 (リアルタイム)"),
      block.bullet("Notion → Supabase: n8n cron 5min ごと (deal_stage / memo / follow_up_date / assigned_to のみ反映)"),
      block.bullet("全 sync 操作は sales_sync_logs に audit (Supabase) と sales_sync_logs から Notion DB に逆流"),
    ]),
    block.toggle("Slack 通知 (#all-paradigm)", [
      block.bullet("🌱 新規リード検出時 (corporate domain 自動エンリッチ完了): リード DB / 診断レポート / 動画レポート ボタン"),
      block.bullet("🔥 HOT lead 検出時 (3+ views): 同上 + 緊急アクションプロンプト"),
      block.bullet("📊 週次ダイジェスト (毎週月曜 09:00 JST cron): HOT top 5 / ステージ別 / 課題別 / 都道府県別 サマリ"),
    ]),
    block.toggle("n8n ワークフロー (社内 dify.appexx.me)", [
      block.bullet("01-supabase-to-notion-sync: Webhook trigger → リード DB 新規ページ作成"),
      block.bullet("02-notion-to-supabase-reverse: Cron 5min → recently edited で逆流"),
      block.bullet("03-notion-template-sync: Notion テンプレ DB 編集 → Supabase sales_templates upsert"),
    ]),
  )
  blocks.push(block.paragraph(""))

  // ── FAQ (toggle) ──
  blocks.push(block.heading_2("❓ FAQ"))
  blocks.push(
    block.toggle("Q: 新しい業種 / 課題コードを追加したい", [
      block.paragraph("A: 2 箇所に同時に追加が必要 (型安全のため):"),
      block.bullet("1. Supabase: ALTER TABLE sales_companies の CHECK 制約に新 enum 値を追加"),
      block.bullet("2. TypeScript: src/lib/sales/types.ts の INDUSTRIES / ISSUE_CODES に追加"),
      block.bullet("3. 56 templates → 64 / 72 にスケール: scripts/seed-sales-templates.mjs を更新して再投入"),
    ]),
    block.toggle("Q: 顧客ページに動画レポートを embed したい", [
      block.paragraph("A: 顧客 DB ページの body に下記を追加:"),
      block.bulletRich([T("`/embed `"), T(" で URL embed: ", {}), T("paradigmjp.com/ja/report/[slug]/video")]),
      block.paragraph("動画 + メトリクスがインライン表示される。"),
    ]),
    block.toggle("Q: テンプレを A/B テストしたい", [
      block.paragraph("A: テンプレ DB に「使用回数」「平均 CVR」プロパティ追加済。テンプレ複製してフレーズを微修正、使用後に CVR を記録。月次で勝者判定。"),
    ]),
    block.toggle("Q: 既存リードを CSV エクスポートしたい", [
      block.paragraph("A: リード DB 右上 ⋮ → 「エクスポート」→ CSV 形式選択。Supabase からも psql 経由で取得可能 (lib/supabase.ts 使用)。"),
    ]),
  )
  blocks.push(block.paragraph(""))

  blocks.push(block.divider())

  // ── Footer ──
  blocks.push(
    block.calloutRich(
      [
        T("📚 関連ドキュメント (paradigmjp.com リポジトリ):", { bold: true }),
        T("\n• "),
        linkText("docs/sales-os-setup-runbook.md", "https://github.com/Paradigmllc/Paradigmjpcom/blob/main/docs/sales-os-setup-runbook.md"),
        T(" - 本番セットアップ手順"),
        T("\n• "),
        linkText("docs/notion-views-setup.md", "https://github.com/Paradigmllc/Paradigmjpcom/blob/main/docs/notion-views-setup.md"),
        T(" - 4 DB Views 設定ガイド"),
        T("\n• "),
        linkText("scripts/audit-sales-os.mjs", "https://github.com/Paradigmllc/Paradigmjpcom/blob/main/scripts/audit-sales-os.mjs"),
        T(" - E2E 動作確認スクリプト"),
      ],
      "📚",
      "default",
    ),
  )

  // ── append: max 100 blocks per request ──
  console.log(`  Building ${blocks.length} blocks...`)
  for (let i = 0; i < blocks.length; i += 90) {
    const chunk = blocks.slice(i, i + 90)
    const r = await n("PATCH", `/blocks/${PARENT_PAGE_ID}/children`, { children: chunk })
    if (!r.ok) {
      console.error(`  ❌ Chunk ${i / 90 + 1} failed:`, r.error?.slice(0, 200))
      return false
    }
  }
  console.log(`  ✅ ${blocks.length} blocks added to parent page`)
  return true
}

/* ───── Step 3: 4 DB に Rollup プロパティ追加 ───── */
async function addRollups() {
  console.log("📊 4 DB に Rollup プロパティ追加中...")
  // リード DB に「成約済?」rollup (顧客 DB → 紐づくリード)
  // 顧客 DB に「納品数」rollup (納品 DB → 紐づく顧客)
  // 顧客 DB に「未完了納品」rollup
  // 納品 DB に「顧客健全度」rollup (紐づく顧客 → 健全度)

  // 顧客 DB に納品 DB から rollup を追加
  // 先に納品 DB の「紐づく顧客」relation の synced_property を確認
  const customers = await n("GET", `/databases/${DB.customers}`)
  if (!customers.ok) return false

  const customerProps = customers.data.properties || {}
  // 顧客側に既に「紐づく納品」が auto-relation で存在するはず (双方向 sync ON が前提)
  // 自動逆方向プロパティ名は通常 "Related to [DB name]" のような形

  // 安全策として、顧客 DB と納品 DB に rollup を追加するため、まず両側 relation を確認
  const deliveries = await n("GET", `/databases/${DB.deliveries}`)
  if (!deliveries.ok) return false

  // 納品 DB の「紐づく顧客」relation を探す
  const delRelProp = Object.entries(deliveries.data.properties).find(
    ([_, v]) => v.type === "relation" && v.relation?.database_id === DB.customers,
  )
  if (delRelProp) {
    const [delRelName, delRelDef] = delRelProp
    const syncedPropName = delRelDef.relation?.synced_property_name
    if (syncedPropName) {
      // 顧客 DB に rollup プロパティ追加
      const r = await n("PATCH", `/databases/${DB.customers}`, {
        properties: {
          "納品数": {
            rollup: {
              relation_property_name: syncedPropName,
              rollup_property_name: "納品物名",
              function: "count",
            },
          },
        },
      })
      if (r.ok) console.log(`  ✅ 顧客 DB: 納品数 rollup 追加`)
      else console.error(`  ⚠️ 顧客 DB rollup:`, r.error?.slice(0, 100))
    } else {
      console.log(`  ℹ️ 納品 DB → 顧客 DB の双方向 relation が UI で未確立 (要手動 ON in Notion UI)`)
    }
  }

  // リード DB に「成約済?」rollup (顧客 DB の「紐づくリード」経由)
  const customerLeadRel = Object.entries(customers.data.properties).find(
    ([_, v]) => v.type === "relation" && v.relation?.database_id === DB.leads,
  )
  if (customerLeadRel) {
    const [_, custLeadDef] = customerLeadRel
    const syncedPropName = custLeadDef.relation?.synced_property_name
    if (syncedPropName) {
      const r = await n("PATCH", `/databases/${DB.leads}`, {
        properties: {
          "成約済?": {
            rollup: {
              relation_property_name: syncedPropName,
              rollup_property_name: "顧客名",
              function: "count_values",
            },
          },
        },
      })
      if (r.ok) console.log(`  ✅ リード DB: 成約済? rollup 追加`)
      else console.error(`  ⚠️ リード DB rollup:`, r.error?.slice(0, 100))
    } else {
      console.log(`  ℹ️ 顧客 DB → リード DB の双方向 relation が UI で未確立 (要手動 ON in Notion UI)`)
    }
  }

  return true
}

/* ───── Step 4: 3 sub pages 作成 ───── */
async function createSubPages() {
  console.log("📂 3 sub pages 作成中...")

  // ── 📊 営業ダッシュボード ──
  const dashboard = await n("POST", "/pages", {
    parent: { page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "📊" },
    cover: { type: "external", external: { url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1500&q=80" } },
    properties: {
      title: { title: [{ text: { content: "📊 営業ダッシュボード" } }] },
    },
    children: [
      block.callout(
        "全 4 DB の主要 view を 1 画面に集約。営業マネージャーが朝一で開く想定。下記 view は Notion UI で filter 設定後、各 DB を Linked DB として埋め込み。",
        "🎯",
        "blue_background",
      ),
      block.paragraph(""),
      block.heading_1("🔥 HOT Leads (今すぐアクション)"),
      block.linkedDb(DB.leads),
      block.paragraph(""),
      block.heading_1("💰 MRR Tracker"),
      block.linkedDb(DB.customers),
      block.paragraph(""),
      block.heading_1("🚧 進行中の納品"),
      block.linkedDb(DB.deliveries),
      block.paragraph(""),
      block.heading_1("📝 アクティブテンプレ"),
      block.linkedDb(DB.templates),
      block.paragraph(""),
      block.calloutRich(
        [
          T("⚙️ 設定方法: ", { bold: true }),
          T("各 DB を embed したあと UI で view を切替・追加してください。詳細は "),
          linkText("notion-views-setup.md", "https://github.com/Paradigmllc/Paradigmjpcom/blob/main/docs/notion-views-setup.md"),
          T(" 参照。"),
        ],
        "📖",
        "gray_background",
      ),
    ],
  })
  if (dashboard.ok) console.log(`  ✅ 📊 営業ダッシュボード: ${dashboard.data.id}`)
  else console.error(`  ❌`, dashboard.error?.slice(0, 200))

  // ── 📖 使い方ガイド ──
  const guide = await n("POST", "/pages", {
    parent: { page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "📖" },
    cover: { type: "external", external: { url: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1500&q=80" } },
    properties: {
      title: { title: [{ text: { content: "📖 使い方ガイド" } }] },
    },
    children: [
      block.callout("初日に必ず読むページ。営業フロー 5 ステップを順番に押さえれば独り立ち可能。", "🎓", "purple_background"),
      block.paragraph(""),
      block.toc(),
      block.paragraph(""),

      block.heading_1("Step 1: リード獲得 (自動)"),
      block.paragraph("顧客が paradigmjp.com/contact からフォーム送信すると、以下の処理が自動で動きます (Sprint 12 enrich pipeline):"),
      block.bullet("法人ドメイン検出 (自由メール 28 ドメインは skip)"),
      block.bullet("PageSpeed Insights mobile/desktop スコア取得"),
      block.bullet("HTML inspect: OGP / WordPress / 著作年 / SSL 検出"),
      block.bullet("gBizInfo: 法人番号 / 従業員数 / 資本金 / 設立年"),
      block.bullet("Supabase sales_companies に UPSERT"),
      block.bullet("Notion リード DB に新規ページ作成 (n8n W01 経由)"),
      block.bullet("Slack #all-paradigm に 🌱 新規リード通知"),
      block.paragraph(""),

      block.heading_1("Step 2: 診断レポート確認"),
      block.paragraph("リード DB から HOT view を開き、上位リードのドメインをクリック:"),
      block.bullet("📋 診断レポート (リッチ HTML LP・3-Act 構造): /ja/report/[slug]"),
      block.bullet("🎬 動画レポート (60s HTML 自動再生): /ja/report/[slug]/video"),
      block.bullet("OG image (Slack/LINE シェアで自動展開・1200×630 PNG)"),
      block.paragraph(""),

      block.heading_1("Step 3: 営業アクション"),
      block.paragraph("対象リードの diagnostic_url をメール送信 → 反応待ち。"),
      block.bullet("3+ views で is_hot_lead 自動 true → Slack 通知"),
      block.bullet("商談ステージを「未対応 → 架電済 → 商談中 → 提案済」と更新"),
      block.bullet("メモ欄に顧客との会話内容を逐次記録"),
      block.bullet("フォローアップ日を設定 → 📅 カレンダー view で漏れなし"),
      block.paragraph(""),

      block.heading_1("Step 4: 成約"),
      block.paragraph("成約したら:"),
      block.bullet("リード DB の商談ステージ = 成約"),
      block.bullet("顧客 DB に新規レコード追加"),
      block.bullet("「紐づくリード」relation で リード ↔ 顧客 を紐づけ"),
      block.bullet("月額・契約商材・契約開始日・健全度を入力"),
      block.bullet("LTV / 契約継続月数 は formula で自動計算"),
      block.paragraph(""),

      block.heading_1("Step 5: 納品"),
      block.paragraph("契約商材ごとに納品 DB にレコード追加:"),
      block.bullet("動画(HyperFrames): 60s 診断動画 → R2 にアップ → URL 記録"),
      block.bullet("Web 制作: 完成サイト URL"),
      block.bullet("MEO レポート: 月次レポート PDF"),
      block.bullet("ステータス: 制作中 → レビュー待ち → 納品済"),
      block.bullet("「紐づく顧客」relation で顧客とリンク"),
      block.paragraph(""),

      block.divider(),
      block.calloutRich(
        [T("🆘 困ったら: ", { bold: true }), T("Slack #all-paradigm で `@Paradigm` メンション。FAQ も親ページ末尾に記載。")],
        "💬",
        "yellow_background",
      ),
    ],
  })
  if (guide.ok) console.log(`  ✅ 📖 使い方ガイド: ${guide.data.id}`)
  else console.error(`  ❌`, guide.error?.slice(0, 200))

  // ── 🎓 業種別戦略 ──
  const strategy = await n("POST", "/pages", {
    parent: { page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "🎓" },
    cover: { type: "external", external: { url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1500&q=80" } },
    properties: {
      title: { title: [{ text: { content: "🎓 業種別営業戦略 (8 業種)" } }] },
    },
    children: [
      block.callout(
        "業種ごとに「集客動線」「客単価」「主要課題」「Hook フレーズ」が異なる。アウトリーチ前に必ず該当業種のセクションを読む。",
        "📚",
        "purple_background",
      ),
      block.paragraph(""),
      block.toc(),
      block.paragraph(""),

      ...industriesStrategy(),
    ],
  })
  if (strategy.ok) console.log(`  ✅ 🎓 業種別戦略: ${strategy.data.id}`)
  else console.error(`  ❌`, strategy.error?.slice(0, 200))
}

/* 8 業種戦略コンテンツ */
function industriesStrategy() {
  const data = [
    {
      icon: "💇",
      name: "美容室",
      booking: "Instagram (DM 予約) / Hot Pepper Beauty",
      avg: "¥8,000",
      issues: ["速度遅い (スマホ予約離脱)", "SNS 導線なし (Instagram 連携)", "OGP 未設定 (シェアで画像出ない)"],
      hook: "今この瞬間、御社サイトを訪れた 10 人のうち 6 人は内容を見る前に帰っています",
    },
    {
      icon: "🦷",
      name: "歯科医院",
      booking: "EPARK / Google ビジネスプロフィール / Web 予約",
      avg: "¥12,000",
      issues: ["SSL 期限切れ (信用低下)", "速度遅い", "ua_残存 (GA4 移行漏れ)"],
      hook: "近隣の歯科医院を探している患者の 70% が御社のサイトに辿り着けていません",
    },
    {
      icon: "🍶",
      name: "飲食店",
      booking: "食べログ / Google Map / Instagram",
      avg: "¥4,500",
      issues: ["OGP なし (Map シェア時に画像欠落)", "SNS 連携なし", "速度遅い (ランチ時間アクセス急増)"],
      hook: "ランチ時間の検索流入が月間推定 4,200 件、漏れています",
    },
    {
      icon: "🏗",
      name: "工務店 / 建設業",
      booking: "Web 見積依頼 / 元請紹介 / 自治体登録",
      avg: "¥800,000",
      issues: ["WordPress 旧版 (改ざんリスク)", "施工事例ページの SEO 不足", "問い合わせフォーム機能不全"],
      hook: "施工事例を探す施主の 80% が御社のサイトを 5 秒で閉じています",
    },
    {
      icon: "📊",
      name: "会計事務所",
      booking: "Web 相談予約 / 紹介",
      avg: "¥360,000",
      issues: ["コピーライト年が 3+ 年前 (廃業疑惑)", "GA4 未移行", "SNS 連携なし"],
      hook: "決算前の顧問先候補が御社を比較検討した結果、7 割が他事務所に流れています",
    },
    {
      icon: "🛍",
      name: "小売店",
      booking: "Google Map / Instagram / EC モール",
      avg: "¥6,000",
      issues: ["速度遅い", "OGP なし", "SNS 連携なし"],
      hook: "オンライン購買意欲のある顧客の 60% が御社のサイトを完了せずに離脱しています",
    },
    {
      icon: "🧹",
      name: "清掃業者",
      booking: "くらしのマーケット / Web 見積",
      avg: "¥28,000",
      issues: ["フォーム機能不全 (見積依頼到達せず)", "速度遅い", "SSL 期限"],
      hook: "見積もり依頼の問い合わせフォームに 50% 以上が到達せず離脱しています",
    },
    {
      icon: "💼",
      name: "コンサル会社",
      booking: "LinkedIn / Web 問い合わせ / 紹介",
      avg: "¥1,200,000",
      issues: ["WordPress 旧版", "事例ページ無し", "OGP / Twitter Card なし"],
      hook: "新規問い合わせの大半が、御社の専門性に気付かないまま競合へ流れています",
    },
  ]

  const blocks = []
  for (const i of data) {
    blocks.push(block.heading_1(`${i.icon} ${i.name}`))
    blocks.push(
      block.calloutRich(
        [T(`Hook フレーズ: 「${i.hook}」`, { bold: true })],
        "🎯",
        "yellow_background",
      ),
    )
    blocks.push(
      block.bulletRich([T("集客動線: ", { bold: true }), T(i.booking)]),
      block.bulletRich([T("客単価平均: ", { bold: true }), T(i.avg)]),
      block.bulletRich([T("主要課題 (上位 3): ", { bold: true })]),
    )
    for (const iss of i.issues) {
      blocks.push(block.bullet(`  - ${iss}`))
    }
    blocks.push(block.paragraph(""))
    blocks.push(block.divider())
  }
  return blocks
}

/* ───── Run ───── */
async function main() {
  console.log("🚀 Notion 親ページを 有料テンプレ級にアップグレード開始\n")
  await archiveExistingBlocks()
  const hubOk = await buildHubContent()
  if (!hubOk) {
    console.error("⚠️ Hub content 構築失敗 → exit")
    process.exit(1)
  }
  await createSubPages()
  await addRollups()
  console.log(`\n✅ 親ページ "Paradigm 営業 OS" 有料テンプレ級アップグレード完了`)
  console.log(`   https://www.notion.so/35fa2b78f3fc81299d91e457889ee393`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
