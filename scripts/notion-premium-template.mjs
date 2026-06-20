#!/usr/bin/env node
/**
 * scripts/notion-premium-template.mjs  ESprint 14 有料 Notion チE��プレ級アチE�EグレーチE
 *
 * 役割: 親ペ�Eジ "Paradigm 営業 OS" めENotion Marketplace の有料チE��プレ ($50-$200) と
 *       同等�EクオリチE��に引き上げめE アイコン/カバ�E以外�E本質皁E��改喁E��全部実施.
 *
 * 実裁E
 *   1. 親ペ�Eジ既孁Eblocks めEarchive (clean slate)
 *   2. 親ペ�Eジに Hub content 構篁E
 *      - Hero callout (Quick start 5 steps)
 *      - Table of contents
 *      - 4 DB linked references with descriptions
 *      - 5 段階フレーム解説 (toggle)
 *      - 業種別戦略 8 cards (callout)
 *      - セチE��アチE�EガイチE(toggle)
 *      - FAQ (toggle)
 *   3. 3 sub pages 作�E:
 *      - 📊 営業ダチE��ュボ�EチE(linked DB views)
 *      - 📖 使ぁE��ガイチE(Quickstart + 詳細フロー)
 *      - 🎓 業種別戦略 (8 業種詳細)
 *   4. 4 DB に Rollup プロパティ追加 (relation 越し雁E��E
 *
 * 入劁E NOTION_API_KEY
 * 出劁E stdout に進捁E
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY
if (!NOTION_API_KEY) {
  console.error('NOTION_API_KEY env var must be set')
  process.exit(1)
}
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

/* ───── Step 1: 親ペ�Eジ既孁Eblocks 削除 ───── */
async function archiveExistingBlocks() {
  console.log("🧹 親ペ�Eジ既孁Eblocks 削除中...")
  let cursor = undefined
  const allIds = []
  do {
    const r = await n("GET", `/blocks/${PARENT_PAGE_ID}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`)
    if (!r.ok) {
      console.error("  ❁E取得失敁E", r.error)
      break
    }
    allIds.push(...r.data.results.map((b) => b.id))
    cursor = r.data.has_more ? r.data.next_cursor : undefined
  } while (cursor)
  console.log(`  Found ${allIds.length} blocks. Deleting...`)
  for (const id of allIds) {
    await n("DELETE", `/blocks/${id}`)
  }
  console.log(`  ✁E${allIds.length} blocks archived`)
}

/* ───── Step 2: 親ペ�Eジに Hub コンチE��チE��加 ───── */
async function buildHubContent() {
  console.log("🏛�E�E親ペ�Eジに Hub content 構築中...")

  // Notion API は children 一括追加で最大 100 blocks/req
  const blocks = []

  // ── HERO ──
  blocks.push(
    block.calloutRich(
      [
        T("Paradigm 営業 OS へようこそ、E, { bold: true }),
        T(" "),
        T("Bootstrap 経営の中忁E��ブとして、リード獲征EↁE診断レポ�Eト送仁EↁE契紁EↁE納品までめE1 つの Notion ワークスペ�Eスに雁E��E��てぁE��す。Supabase との双方吁Esync で paradigmjp.com の本番チE�Eタとリアルタイム連携、E),
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
  blocks.push(block.heading_2("🚀 5 刁E��使ぁE��めめE))
  blocks.push(
    block.calloutRich(
      [
        T("初めての方へ:", { bold: true }),
        T(" 下訁E5 スチE��プで営業 OS の全体像が�Eかります。各 DB の詳細は配下サブ�Eージを参照、E),
      ],
      "💡",
      "gray_background",
    ),
  )
  blocks.push(
    block.number("リーチEDB を開ぁE�� HOT view を確誁E(報呁E3+ 閲覧の見込み客を即座に把握)"),
    block.number("対象リード�Eドメインを開き、診断レポ�EチEURL (📋) で冁E��確誁EↁEメール送仁E),
    block.number("反応があった顧客は「商諁E��チE�Eジ」を架電渁EↁE啁E��E�� ↁE成紁Eに更新"),
    block.number("成紁E��たら顧客 DB に新規レコード作�E ↁE紐づくリードに relation"),
    block.number("納品物 (動画/Web/MEO レポ�EチE は納品 DB に紐づけて R2 URL 記録"),
  )
  blocks.push(block.paragraph(""))

  // ── Sub pages ── (placeholders・ID は後で宁Echild_page 作�E後に linked)
  blocks.push(block.heading_2("📂 サブ�Eージ"))
  blocks.push(
    block.calloutRich(
      [T("配下に 3 つの専用ペ�Eジを�E置 (下記から開ぁE。各ペ�Eジは「使ぁE��に最も視認性が高い」よぁE��計、E)],
      "🗂�E�E,
      "purple_background",
    ),
  )

  blocks.push(block.divider())

  // ── 4 DB section ──
  blocks.push(block.heading_2("🗄�E�E4 大チE�Eタベ�Eス"))
  blocks.push(
    block.calloutRich(
      [
        T("Supabase との双方吁Esync 対象、E, { bold: true }),
        T(" Notion 側で変更すれば 5 刁E��冁E�� Supabase に反映、本番サイチE(paradigmjp.com/ja/report/[slug]) が即時更新される、E),
      ],
      "🔄",
      "default",
    ),
  )

  blocks.push(block.heading_3("🎯 リーチEDB"))
  blocks.push(block.linkedDb(DB.leads))
  blocks.push(
    block.calloutRich(
      [
        T("用送E ", { bold: true }),
        T("paradigmjp.com/contact の自動エンリチE��結果。PSI + gBizInfo + Wappalyzer で属性収集済、E),
        T("\n📋 view 推奨: ", { bold: true }),
        T("🔥 HOT leads / 📊 スチE�Eジ別 / 🗾 都道府県別 / 📅 フォローアチE�E予宁E/ �E 今週の新要E),
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
        T("用送E ", { bold: true }),
        T("有料顧客の MRR + health 一允E��琁E��ETV 試算�E契紁E��続月数 ÁE月額で formula 自動計算、E),
        T("\n📋 view 推奨: ", { bold: true }),
        T("💰 MRR 一覧 / 🏥 health モニター / 📅 請求カレンダー / 🤁EWL 顧客のみ / 🎁 補助金申請中"),
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
        T("用送E ", { bold: true }),
        T("60s 診断動画 / Web 制佁E/ MEO レポ�EチEの納品 tracking、Eloudflare R2 上�E URL 記録、E),
        T("\n📋 view 推奨: ", { bold: true }),
        T("🚧 進行中 / 📅 締刁E��レンダー / 🎬 動画ギャラリー / ✁E完亁E��E),
      ],
      "📦",
      "gray_background",
    ),
  )

  blocks.push(block.heading_3("📝 チE��プレ DB"))
  blocks.push(block.linkedDb(DB.templates))
  blocks.push(
    block.calloutRich(
      [
        T("用送E ", { bold: true }),
        T("業種 (8) ÁE課題コーチE(7) = 56 パターンの営業斁E��。絶望�E希望 5 段階フレームめEencode、E),
        T("\n📋 view 推奨: ", { bold: true }),
        T("🎯 業種別 / 🚨 critical のみ / ⭁E有効チE��プレ / 📊 課題コード別 / 🔥 ホットテンプレ"),
      ],
      "📝",
      "gray_background",
    ),
  )

  blocks.push(block.divider())

  // ── 5 段階フレーム ──
  blocks.push(block.heading_2("📖 絶望�E希望 5 段階フレーム (CVR 4-8% 実証)"))
  blocks.push(
    block.calloutRich(
      [
        T("チE��プレ DB の吁E��コード�E下訁E5 段階�E忁E��フローめEencode:", { bold: true }),
      ],
      "🎬",
      "yellow_background",
    ),
  )
  blocks.push(
    block.bulletRich([T("1. 絶朁E(headline): ", { bold: true }), T("衝撃の現実認識「今この瞬間、御社サイトを訪れた 10 人のぁE�� 6 人は冁E��を見る前に帰ってぁE��す、E)]),
    block.bulletRich([T("2. 警呁E(pain): ", { bold: true }), T("ビジネス痛点「モバイル PageSpeed ぁE50 点未満。競合�E 80 点以上が標準、E)]),
    block.bulletRich([T("3. 注愁E(fear): ", { bold: true }), T("未来のリスク「Google は 2024 年から Core Web Vitals を頁E���E正式要素に、E ヶ月後には雁E��チャネル消滁E��E)]),
    block.bulletRich([T("4. 通知 (loss): ", { bold: true }), T("数値による損失試算「離脱玁E60% ÁE訪問老E1,200 吁EÁE客単価 ¥8,000 ÁECVR 2% = 月間 ¥1,152,000 機会損失、E)]),
    block.bulletRich([T("5. 希望 (cta_text): ", { bold: true }), T("解決アクション「Paradigm ぁE14 日以冁E�� PageSpeed 80+ まで改喁E��費用 ¥80,000~、E)]),
  )
  blocks.push(block.paragraph(""))

  blocks.push(block.divider())

  // ── 業種別戦略 (8 業種 callout) ──
  blocks.push(block.heading_2("🎓 業種別アプローチ戦略"))
  blocks.push(
    block.callout(
      "8 業種 ÁE7 課題コード�E 56 パターンが既に投�E済。下記�E業種別の営業スト�Eリー持E�E、E,
      "💼",
      "default",
    ),
  )

  const industries = [
    { icon: "💇", name: "美容室", hook: "Instagram 予紁E��線�Eお店探し検索流�E" },
    { icon: "🦷", name: "歯科医院", hook: "EPARK / Web 予紁E��線�E近隣患老E�E比輁E��訁E },
    { icon: "🍶", name: "飲食庁E, hook: "食べログ / Google Map 検索流�E・ランチタイム" },
    { icon: "🏗", name: "建設業", hook: "施工事侁ESEO・允E��紹介�EWeb 見積依頼" },
    { icon: "📊", name: "会計事務所", hook: "決算前比輁E��討�E顧問契紁E��討中" },
    { icon: "🛍", name: "小売庁E, hook: "Google Map / Instagram 検索・EC モール対抁E },
    { icon: "🧹", name: "渁E��業", hook: "くらし�Eマ�EケチE�� / Web 見積依頼" },
    { icon: "💼", name: "コンサル業", hook: "LinkedIn / Web 問い合わせ�E専門性訴汁E },
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

  // ── セチE��アチE�EガイチE(toggle) ──
  blocks.push(block.heading_2("🔧 セチE��アチE�E"))
  blocks.push(
    block.toggle("Coolify 環墁E��数 (本番)", [
      block.bullet("NOTION_API_KEY ✁E投�E渁E),
      block.bullet("N8N_WEBHOOK_SECRET ✁E投�E渁E(64 hex)"),
      block.bullet("SLACK_BOT_TOKEN ✁E投�E渁E),
      block.bullet("SLACK_CHANNEL_ID ✁E投�E渁E(#all-paradigm)"),
      block.bullet("SUPABASE_SERVICE_ROLE_KEY ✁E投�E渁E),
      block.bullet("DEEPSEEK_API_KEY ✁E投�E渁E(V4 PRO)"),
      block.bullet("HYPERFRAMES_API_URL ⏳ 未設宁E(HTML preview で代替・MP4 化�E別 service 構築征E"),
      block.bullet("STRIPE_SECRET_KEY ⏳ 未設宁E(収益化開始時)"),
      block.bullet("GOOGLE_PSI_API_KEY ⏳ 未設宁E(PSI rate-limit 緩和したい晁E"),
      block.bullet("GBIZ_API_TOKEN ⏳ 未設宁E(gBizInfo 企業属性 enrichment)"),
    ]),
    block.toggle("Supabase ↁENotion 双方吁Esync", [
      block.paragraph("方弁E(Sprint 8 で設計渁E:"),
      block.bullet("Supabase ↁENotion: webhook trigger で自勁E(リアルタイム)"),
      block.bullet("Notion ↁESupabase: webhook one-shot ごと (deal_stage / memo / follow_up_date / assigned_to のみ反映)"),
      block.bullet("全 sync 操作�E sales_sync_logs に audit (Supabase) と sales_sync_logs から Notion DB に送E��E),
    ]),
    block.toggle("Slack 通知 (#all-paradigm)", [
      block.bullet("🌱 新規リード検�E晁E(corporate domain 自動エンリチE��完亁E: リーチEDB / 診断レポ�EチE/ 動画レポ�EチEボタン"),
      block.bullet("🔥 HOT lead 検�E晁E(3+ views): 同丁E+ 緊急アクションプロンプト"),
      block.bullet("📊 週次ダイジェスチE(毎週月曜 09:00 JST event webhook): HOT top 5 / スチE�Eジ別 / 課題別 / 都道府県別 サマリ"),
    ]),
    block.toggle("n8n ワークフロー (社冁Edify.appexx.me)", [
      block.bullet("01-supabase-to-notion-sync: Webhook trigger ↁEリーチEDB 新規�Eージ作�E"),
      block.bullet("02-notion-to-supabase-reverse: Webhook one-shot ↁErecently edited で送E��E),
      block.bullet("03-notion-template-sync: Notion チE��プレ DB 編雁EↁESupabase sales_templates upsert"),
    ]),
  )
  blocks.push(block.paragraph(""))

  // ── FAQ (toggle) ──
  blocks.push(block.heading_2("❁EFAQ"))
  blocks.push(
    block.toggle("Q: 新しい業種 / 課題コードを追加したぁE, [
      block.paragraph("A: 2 箁E��に同時に追加が忁E��E(型安�Eのため):"),
      block.bullet("1. Supabase: ALTER TABLE sales_companies の CHECK 制紁E��新 enum 値を追加"),
      block.bullet("2. TypeScript: src/lib/sales/types.ts の INDUSTRIES / ISSUE_CODES に追加"),
      block.bullet("3. 56 templates ↁE64 / 72 にスケール: scripts/seed-sales-templates.mjs を更新して再投入"),
    ]),
    block.toggle("Q: 顧客ペ�Eジに動画レポ�Eトを embed したぁE, [
      block.paragraph("A: 顧客 DB ペ�Eジの body に下記を追加:"),
      block.bulletRich([T("`/embed `"), T(" で URL embed: ", {}), T("paradigmjp.com/ja/report/[slug]/video")]),
      block.paragraph("動画 + メトリクスがインライン表示される、E),
    ]),
    block.toggle("Q: チE��プレめEA/B チE��トしたい", [
      block.paragraph("A: チE��プレ DB に「使用回数」「平坁ECVR」�Eロパティ追加済。テンプレ褁E��してフレーズを微修正、使用後に CVR を記録。月次で勝老E��定、E),
    ]),
    block.toggle("Q: 既存リードを CSV エクスポ�Eトしたい", [
      block.paragraph("A: リーチEDB 右丁E⋮ ↁE「エクスポ�Eト」�E CSV 形式選択。Supabase からめEpsql 経由で取得可能 (lib/supabase.ts 使用)、E),
    ]),
  )
  blocks.push(block.paragraph(""))

  blocks.push(block.divider())

  // ── Footer ──
  blocks.push(
    block.calloutRich(
      [
        T("📚 関連ドキュメンチE(paradigmjp.com リポジトリ):", { bold: true }),
        T("\n• "),
        linkText("docs/sales-os-setup-runbook.md", "https://github.com/Paradigmllc/Paradigmjpcom/blob/main/docs/sales-os-setup-runbook.md"),
        T(" - 本番セチE��アチE�E手頁E),
        T("\n• "),
        linkText("docs/notion-views-setup.md", "https://github.com/Paradigmllc/Paradigmjpcom/blob/main/docs/notion-views-setup.md"),
        T(" - 4 DB Views 設定ガイチE),
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
      console.error(`  ❁EChunk ${i / 90 + 1} failed:`, r.error?.slice(0, 200))
      return false
    }
  }
  console.log(`  ✁E${blocks.length} blocks added to parent page`)
  return true
}

/* ───── Step 3: 4 DB に Rollup プロパティ追加 ───── */
async function addRollups() {
  console.log("📊 4 DB に Rollup プロパティ追加中...")
  // リーチEDB に「�E紁E��E」rollup (顧客 DB ↁE紐づくリーチE
  // 顧客 DB に「納品数」rollup (納品 DB ↁE紐づく顧客)
  // 顧客 DB に「未完亁E��品」rollup
  // 納品 DB に「顧客健全度」rollup (紐づく顧客 ↁE健全度)

  // 顧客 DB に納品 DB から rollup を追加
  // 先に納品 DB の「紐づく顧客」relation の synced_property を確誁E
  const customers = await n("GET", `/databases/${DB.customers}`)
  if (!customers.ok) return false

  const customerProps = customers.data.properties || {}
  // 顧客側に既に「紐づく納品」が auto-relation で存在するはぁE(双方吁Esync ON が前揁E
  // 自動送E��向�Eロパティ名�E通常 "Related to [DB name]" のような形

  // 安�E策として、E��客 DB と納品 DB に rollup を追加するため、まず両側 relation を確誁E
  const deliveries = await n("GET", `/databases/${DB.deliveries}`)
  if (!deliveries.ok) return false

  // 納品 DB の「紐づく顧客」relation を探ぁE
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
              rollup_property_name: "納品物吁E,
              function: "count",
            },
          },
        },
      })
      if (r.ok) console.log(`  ✁E顧客 DB: 納品数 rollup 追加`)
      else console.error(`  ⚠�E�E顧客 DB rollup:`, r.error?.slice(0, 100))
    } else {
      console.log(`  ℹ�E�E納品 DB ↁE顧客 DB の双方吁Erelation ぁEUI で未確竁E(要手勁EON in Notion UI)`)
    }
  }

  // リーチEDB に「�E紁E��E」rollup (顧客 DB の「紐づくリード」経由)
  const customerLeadRel = Object.entries(customers.data.properties).find(
    ([_, v]) => v.type === "relation" && v.relation?.database_id === DB.leads,
  )
  if (customerLeadRel) {
    const [_, custLeadDef] = customerLeadRel
    const syncedPropName = custLeadDef.relation?.synced_property_name
    if (syncedPropName) {
      const r = await n("PATCH", `/databases/${DB.leads}`, {
        properties: {
          "成紁E��E": {
            rollup: {
              relation_property_name: syncedPropName,
              rollup_property_name: "顧客吁E,
              function: "count_values",
            },
          },
        },
      })
      if (r.ok) console.log(`  ✁EリーチEDB: 成紁E��E rollup 追加`)
      else console.error(`  ⚠�E�EリーチEDB rollup:`, r.error?.slice(0, 100))
    } else {
      console.log(`  ℹ�E�E顧客 DB ↁEリーチEDB の双方吁Erelation ぁEUI で未確竁E(要手勁EON in Notion UI)`)
    }
  }

  return true
}

/* ───── Step 4: 3 sub pages 作�E ───── */
async function createSubPages() {
  console.log("📂 3 sub pages 作�E中...")

  // ── 📊 営業ダチE��ュボ�EチE──
  const dashboard = await n("POST", "/pages", {
    parent: { page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "📊" },
    cover: { type: "external", external: { url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1500&q=80" } },
    properties: {
      title: { title: [{ text: { content: "📊 営業ダチE��ュボ�EチE } }] },
    },
    children: [
      block.callout(
        "全 4 DB の主要Eview めE1 画面に雁E��E��営業マネージャーが朝一で開く想定。下訁Eview は Notion UI で filter 設定後、各 DB めELinked DB として埋め込み、E,
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
      block.heading_1("📝 アクチE��ブテンプレ"),
      block.linkedDb(DB.templates),
      block.paragraph(""),
      block.calloutRich(
        [
          T("⚙︁E設定方況E ", { bold: true }),
          T("吁EDB めEembed したあと UI で view を�E替・追加してください。詳細は "),
          linkText("notion-views-setup.md", "https://github.com/Paradigmllc/Paradigmjpcom/blob/main/docs/notion-views-setup.md"),
          T(" 参�E、E),
        ],
        "📖",
        "gray_background",
      ),
    ],
  })
  if (dashboard.ok) console.log(`  ✁E📊 営業ダチE��ュボ�EチE ${dashboard.data.id}`)
  else console.error(`  ❌`, dashboard.error?.slice(0, 200))

  // ── 📖 使ぁE��ガイチE──
  const guide = await n("POST", "/pages", {
    parent: { page_id: PARENT_PAGE_ID },
    icon: { type: "emoji", emoji: "📖" },
    cover: { type: "external", external: { url: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1500&q=80" } },
    properties: {
      title: { title: [{ text: { content: "📖 使ぁE��ガイチE } }] },
    },
    children: [
      block.callout("初日に忁E��読むペ�Eジ。営業フロー 5 スチE��プを頁E��に押さえれ�E独り立ち可能、E, "🎓", "purple_background"),
      block.paragraph(""),
      block.toc(),
      block.paragraph(""),

      block.heading_1("Step 1: リード獲征E(自勁E"),
      block.paragraph("顧客ぁEparadigmjp.com/contact からフォーム送信すると、以下�E処琁E��自動で動きまぁE(Sprint 12 enrich pipeline):"),
      block.bullet("法人ドメイン検�E (自由メール 28 ドメインは skip)"),
      block.bullet("PageSpeed Insights mobile/desktop スコア取征E),
      block.bullet("HTML inspect: OGP / WordPress / 著作年 / SSL 検�E"),
      block.bullet("gBizInfo: 法人番号 / 従業員数 / 賁E��釁E/ 設立年"),
      block.bullet("Supabase sales_companies に UPSERT"),
      block.bullet("Notion リーチEDB に新規�Eージ作�E (n8n W01 経由)"),
      block.bullet("Slack #all-paradigm に 🌱 新規リード通知"),
      block.paragraph(""),

      block.heading_1("Step 2: 診断レポ�Eト確誁E),
      block.paragraph("リーチEDB から HOT view を開き、上位リード�EドメインをクリチE��:"),
      block.bullet("📋 診断レポ�EチE(リチE�� HTML LP・3-Act 構造): /ja/report/[slug]"),
      block.bullet("🎬 動画レポ�EチE(60s HTML 自動�E甁E: /ja/report/[slug]/video"),
      block.bullet("OG image (Slack/LINE シェアで自動展開・1200ÁE30 PNG)"),
      block.paragraph(""),

      block.heading_1("Step 3: 営業アクション"),
      block.paragraph("対象リード�E diagnostic_url をメール送信 ↁE反応征E��、E),
      block.bullet("3+ views で is_hot_lead 自勁Etrue ↁESlack 通知"),
      block.bullet("啁E��E��チE�Eジを「未対忁EↁE架電渁EↁE啁E��E�� ↁE提案済」と更新"),
      block.bullet("メモ欁E��顧客との会話冁E��を逐次記録"),
      block.bullet("フォローアチE�E日を設宁EↁE📅 カレンダー view で漏れなぁE),
      block.paragraph(""),

      block.heading_1("Step 4: 成紁E),
      block.paragraph("成紁E��たら:"),
      block.bullet("リーチEDB の啁E��E��チE�Eジ = 成紁E),
      block.bullet("顧客 DB に新規レコード追加"),
      block.bullet("「紐づくリード」relation で リーチEↁE顧客 を紐づぁE),
      block.bullet("月額�E契紁E��材�E契紁E��始日・健全度を�E劁E),
      block.bullet("LTV / 契紁E��続月数 は formula で自動計箁E),
      block.paragraph(""),

      block.heading_1("Step 5: 納品"),
      block.paragraph("契紁E��材ごとに納品 DB にレコード追加:"),
      block.bullet("動画(HyperFrames): 60s 診断動画 ↁER2 にアチE�E ↁEURL 記録"),
      block.bullet("Web 制佁E 完�EサイチEURL"),
      block.bullet("MEO レポ�EチE 月次レポ�EチEPDF"),
      block.bullet("スチE�Eタス: 制作中 ↁEレビュー征E�� ↁE納品渁E),
      block.bullet("「紐づく顧客」relation で顧客とリンク"),
      block.paragraph(""),

      block.divider(),
      block.calloutRich(
        [T("�E 困ったら: ", { bold: true }), T("Slack #all-paradigm で `@Paradigm` メンション、EAQ も親ペ�Eジ末尾に記載、E)],
        "💬",
        "yellow_background",
      ),
    ],
  })
  if (guide.ok) console.log(`  ✁E📖 使ぁE��ガイチE ${guide.data.id}`)
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
        "業種ごとに「集客動線」「客単価」「主要課題」「Hook フレーズ」が異なる。アウトリーチ前に忁E��該当業種のセクションを読む、E,
        "📚",
        "purple_background",
      ),
      block.paragraph(""),
      block.toc(),
      block.paragraph(""),

      ...industriesStrategy(),
    ],
  })
  if (strategy.ok) console.log(`  ✁E🎓 業種別戦略: ${strategy.data.id}`)
  else console.error(`  ❌`, strategy.error?.slice(0, 200))
}

/* 8 業種戦略コンチE��チE*/
function industriesStrategy() {
  const data = [
    {
      icon: "💇",
      name: "美容室",
      booking: "Instagram (DM 予紁E / Hot Pepper Beauty",
      avg: "¥8,000",
      issues: ["速度遁E�� (スマ�E予紁E��脱)", "SNS 導線なぁE(Instagram 連携)", "OGP 未設宁E(シェアで画像�EなぁE"],
      hook: "今この瞬間、御社サイトを訪れた 10 人のぁE�� 6 人は冁E��を見る前に帰ってぁE��ぁE,
    },
    {
      icon: "🦷",
      name: "歯科医院",
      booking: "EPARK / Google ビジネスプロフィール / Web 予紁E,
      avg: "¥12,000",
      issues: ["SSL 期限刁E�� (信用低丁E", "速度遁E��", "ua_残孁E(GA4 移行漏れ)"],
      hook: "近隣の歯科医院を探してぁE��患老E�E 70% が御社のサイトに辿り着けてぁE��せん",
    },
    {
      icon: "🍶",
      name: "飲食庁E,
      booking: "食べログ / Google Map / Instagram",
      avg: "¥4,500",
      issues: ["OGP なぁE(Map シェア時に画像欠落)", "SNS 連携なぁE, "速度遁E�� (ランチ時間アクセス急墁E"],
      hook: "ランチ時間�E検索流�Eが月間推宁E4,200 件、漏れてぁE��ぁE,
    },
    {
      icon: "🏗",
      name: "工務庁E/ 建設業",
      booking: "Web 見積依頼 / 允E��紹仁E/ 自治体登録",
      avg: "¥800,000",
      issues: ["WordPress 旧牁E(改ざんリスク)", "施工事例�Eージの SEO 不足", "問い合わせフォーム機�E不�E"],
      hook: "施工事例を探す施主の 80% が御社のサイトを 5 秒で閉じてぁE��ぁE,
    },
    {
      icon: "📊",
      name: "会計事務所",
      booking: "Web 相諁E��紁E/ 紹仁E,
      avg: "¥360,000",
      issues: ["コピ�Eライト年ぁE3+ 年剁E(廁E��疑惑)", "GA4 未移衁E, "SNS 連携なぁE],
      hook: "決算前の顧問�E候補が御社を比輁E��討した結果、E 割が他事務所に流れてぁE��ぁE,
    },
    {
      icon: "🛍",
      name: "小売庁E,
      booking: "Google Map / Instagram / EC モール",
      avg: "¥6,000",
      issues: ["速度遁E��", "OGP なぁE, "SNS 連携なぁE],
      hook: "オンライン購買意欲のある顧客の 60% が御社のサイトを完亁E��ずに離脱してぁE��ぁE,
    },
    {
      icon: "🧹",
      name: "渁E��業老E,
      booking: "くらし�Eマ�EケチE�� / Web 見穁E,
      avg: "¥28,000",
      issues: ["フォーム機�E不�E (見積依頼到達せぁE", "速度遁E��", "SSL 期限"],
      hook: "見積もり依頼の問い合わせフォームに 50% 以上が到達せず離脱してぁE��ぁE,
    },
    {
      icon: "💼",
      name: "コンサル会社",
      booking: "LinkedIn / Web 問い合わぁE/ 紹仁E,
      avg: "¥1,200,000",
      issues: ["WordPress 旧牁E, "事例�Eージ無ぁE, "OGP / Twitter Card なぁE],
      hook: "新規問ぁE��わせの大半が、御社の専門性に気付かなぁE��ま競合へ流れてぁE��ぁE,
    },
  ]

  const blocks = []
  for (const i of data) {
    blocks.push(block.heading_1(`${i.icon} ${i.name}`))
    blocks.push(
      block.calloutRich(
        [T(`Hook フレーズ: 、E{i.hook}」`, { bold: true })],
        "🎯",
        "yellow_background",
      ),
    )
    blocks.push(
      block.bulletRich([T("雁E��動緁E ", { bold: true }), T(i.booking)]),
      block.bulletRich([T("客単価平坁E ", { bold: true }), T(i.avg)]),
      block.bulletRich([T("主要課顁E(上佁E3): ", { bold: true })]),
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
  console.log("🚀 Notion 親ペ�EジめE有料チE��プレ級にアチE�Eグレード開始\n")
  await archiveExistingBlocks()
  const hubOk = await buildHubContent()
  if (!hubOk) {
    console.error("⚠�E�EHub content 構築失敁EↁEexit")
    process.exit(1)
  }
  await createSubPages()
  await addRollups()
  console.log(`\n✁E親ペ�Eジ "Paradigm 営業 OS" 有料チE��プレ級アチE�Eグレード完亁E)
  console.log(`   https://www.notion.so/35fa2b78f3fc81299d91e457889ee393`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
