#!/usr/bin/env node
/**
 * scripts/seed-sales-templates.mjs — 56 templates (8 industries × 7 issues) 一括生成
 *
 * 役割: sales_templates テーブルに 8 業種 × 7 課題コード = 56 件の高品質 JP コピーを生成・UPSERT.
 *       絶望→希望 5 段階フレーム (s9-5 perm rule) を構造的にエンコード:
 *         headline (絶望) / pain (警告) / fear (注意) / loss (通知) / cta_text (希望)
 *
 * 入力: process.env.SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 * 出力: stdout に upsert 件数 + 失敗時 stderr にエラー
 *
 * AE-PHP-4 準拠 (役割/入力/出力 明示).
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env required")
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

/* ───── industry context (業界別の前提知識) ───── */
const INDUSTRY = {
  beauty_salon: {
    label: "美容室",
    customer: "美容室を探す女性",
    booking: "Instagram で予約",
    rival: "近隣の美容室",
    avg_revenue_per_visit: 8000,
  },
  dental: {
    label: "歯科医院",
    customer: "新規患者",
    booking: "Google で予約",
    rival: "近隣の歯科医院",
    avg_revenue_per_visit: 12000,
  },
  restaurant: {
    label: "飲食店",
    customer: "店舗を探す顧客",
    booking: "食べログ・Google Map で検索",
    rival: "競合店",
    avg_revenue_per_visit: 4500,
  },
  construction: {
    label: "工務店",
    customer: "リフォーム検討者",
    booking: "Web で見積依頼",
    rival: "近隣の工務店",
    avg_revenue_per_visit: 800000,
  },
  accounting: {
    label: "会計事務所",
    customer: "顧問契約検討中の経営者",
    booking: "Web で初回相談予約",
    rival: "近隣の会計事務所",
    avg_revenue_per_visit: 360000,
  },
  retail: {
    label: "小売店",
    customer: "店舗を探す顧客",
    booking: "Google Map で検索",
    rival: "競合店・EC モール",
    avg_revenue_per_visit: 6000,
  },
  cleaning: {
    label: "清掃業者",
    customer: "清掃依頼検討者",
    booking: "くらしのマーケット・Web で見積",
    rival: "競合清掃業者",
    avg_revenue_per_visit: 28000,
  },
  consulting: {
    label: "コンサル会社",
    customer: "経営課題を抱えた決裁者",
    booking: "LinkedIn・Web で問い合わせ",
    rival: "競合コンサル",
    avg_revenue_per_visit: 1200000,
  },
}

/* ───── issue context (課題コード別の前提知識) ───── */
const ISSUE = {
  speed_critical: {
    severity: "critical",
    short: "サイト表示速度がモバイルで 5 秒超",
    bounce_pct: 60,
    legal: null,
    fix_cost: 80_000,
    cta: "速度改善診断 (無料)",
  },
  ua_残存: {
    severity: "critical",
    short: "Google Analytics が 2023 年 7 月から停止しています",
    bounce_pct: 0,
    legal: "個人情報保護法 (Cookie 同意) 違反リスク",
    fix_cost: 50_000,
    cta: "GA4 + Cookie 同意 セットアップ",
  },
  ssl_expired: {
    severity: "critical",
    short: "SSL 証明書が失効しています (or 未設置)",
    bounce_pct: 85,
    legal: "Chrome / Safari で「危険なサイト」警告表示",
    fix_cost: 30_000,
    cta: "SSL + サーバー基盤改善",
  },
  wp_outdated: {
    severity: "critical",
    short: "WordPress 本体・プラグインが旧版のままです",
    bounce_pct: 0,
    legal: "改ざん・情報漏洩リスク (PII 漏洩で個人情報保護法違反)",
    fix_cost: 60_000,
    cta: "WP 緊急アップデート + バックアップ整備",
  },
  no_ogp: {
    severity: "warning",
    short: "OGP 設定がないため SNS でシェアしても画像が表示されません",
    bounce_pct: 70,
    legal: null,
    fix_cost: 25_000,
    cta: "OGP + SNS シェア最適化",
  },
  no_sns: {
    severity: "info",
    short: "SNS アイコンも口コミ導線もありません",
    bounce_pct: 0,
    legal: null,
    fix_cost: 40_000,
    cta: "SNS 連動 + 口コミ導線設置",
  },
  copyright_old: {
    severity: "warning",
    short: "フッターの著作年表示が 3 年以上前のままです",
    bounce_pct: 35,
    legal: null,
    fix_cost: 15_000,
    cta: "サイト鮮度更新パッケージ",
  },
}

/* ───── テンプレート生成エンジン ───── */
function generateTemplate(industryCode, issueCode) {
  const ind = INDUSTRY[industryCode]
  const iss = ISSUE[issueCode]
  if (!ind || !iss) throw new Error(`Unknown industry/issue: ${industryCode}/${issueCode}`)

  /* headline (絶望: 衝撃の現実認識) */
  const headlineMap = {
    speed_critical: `今この瞬間、御社サイトを訪れた ${ind.customer} の ${iss.bounce_pct}% が内容を見る前に帰っています`,
    ua_残存: `訪問者データが一切取れていません (${ind.label}で 2023年7月から継続)`,
    ssl_expired: `Chrome / Safari で「危険なサイト」警告が表示されています`,
    wp_outdated: `${ind.label}サイトのセキュリティが「ザル」状態です`,
    no_ogp: `SNS でシェアされても、御社サイトのリンクは「真っ白な四角」で表示されています`,
    no_sns: `${ind.customer}の 60%以上 が ${ind.booking} しています。御社サイトは導線ゼロです`,
    copyright_old: `「このサイト、廃業した会社?」と${ind.customer}に疑われています`,
  }

  /* pain (警告: ビジネス痛点) */
  const painMap = {
    speed_critical: `モバイル PageSpeed Insights が 50 点未満。${ind.customer}は「重い」と感じた瞬間に競合へ流れます。 ${ind.rival}は 80 点以上が標準です。`,
    ua_残存: `アクセス解析が壊れたまま 2 年以上経過。${ind.customer}が「どこから来て」「何を見て」「どこで離脱したか」が完全にブラックボックス。${iss.legal}も発生中。`,
    ssl_expired: `https:// が機能しておらず、${ind.customer}が予約フォームに到達する前にブラウザが離脱させています。${iss.legal}`,
    wp_outdated: `${iss.legal}。${ind.label}は氏名・電話番号・予約情報を扱うため、情報漏洩発生時の法的責任は重大です。`,
    no_ogp: `${ind.customer}が SNS で口コミシェアしてくれても、画像が出ないリンクは「クリック率が 1/4 以下」になります。せっかくの無料宣伝が機会損失。`,
    no_sns: `${ind.customer}が「店舗を比較したい」と思った瞬間、SNS導線がないと${ind.rival}に流れます。口コミ施策の起点もありません。`,
    copyright_old: `フッターの著作年が古いと「廃業した会社かも」と${ind.customer}が判断します。信用度はサイトの「鮮度」で決まります。`,
  }

  /* fear (注意: 未来のリスク) */
  const fearMap = {
    speed_critical: `Google は 2024 年から「Core Web Vitals」を検索順位の正式要素にしました。速度が遅いサイトは検索順位が継続的に下がり、3 ヶ月後には集客チャネルそのものが消滅します。`,
    ua_残存: `${iss.legal} に加え、データなしで広告投資・SNS 投資の効果測定が不可能。月数十万の広告費が「効いているか効いていないか分からない」まま消えていきます。`,
    ssl_expired: `2026 年からは検索エンジンが SSL なしサイトを「検索結果から除外」する方針。今対処しないと半年後には Google から消えます。`,
    wp_outdated: `WordPress 旧版の脆弱性は公開済み。攻撃者は自動スクリプトで毎晩スキャンしており、改ざん・情報漏洩は時間の問題です。発生後の法的責任・賠償金は数百万円規模。`,
    no_ogp: `競合の ${ind.rival} は OGP 完備で SNS シェアから新規${ind.customer}を毎月獲得。御社は同じ機会を捨て続けています。1 年で差は決定的になります。`,
    no_sns: `${ind.booking}の口コミ・写真投稿で集客するのが${ind.label}業界の主流。SNS 連動なしでは、新規客獲得のコスト構造が競合の 2-3 倍に膨らみ続けます。`,
    copyright_old: `「営業しているか分からない」サイトは、見込み客が問い合わせを諦めます。失われた問い合わせは戻ってきません。`,
  }

  /* loss (通知: 数値による損失試算) */
  const monthlyVisitors = 1200 // 中小サイトの平均
  const lossPerVisitor = ind.avg_revenue_per_visit
  const lostVisitors = Math.round(monthlyVisitors * (iss.bounce_pct || 30) / 100)
  const monthlyLoss = lostVisitors * lossPerVisitor * 0.02 // CVR 2% 想定
  const annualLoss = Math.round(monthlyLoss * 12 / 10000) // 万円単位

  const lossMap = {
    speed_critical: `モバイル離脱率 ${iss.bounce_pct}% × 月間訪問者 1,200 名 × 客単価 ¥${ind.avg_revenue_per_visit.toLocaleString()} × CVR 2% = 月間機会損失 約 ¥${monthlyLoss.toLocaleString()} (年間 ¥${annualLoss}万円)`,
    ua_残存: `データ取得停止により、広告 ROI が測定不能。仮に月 ¥20 万広告投下と仮定すると年間 ¥240 万のブラックボックス支出。さらに改善余地推定 ¥${annualLoss || 50}万円/年が手付かず。`,
    ssl_expired: `警告表示で離脱率 ${iss.bounce_pct}% × 月間訪問者 1,200 名 = 月 1,020 名の機会喪失。客単価 ¥${ind.avg_revenue_per_visit.toLocaleString()} × CVR 2% で年間 ¥${annualLoss || 100}万円超の損失。`,
    wp_outdated: `情報漏洩 1 件あたりの平均賠償額 ¥3 万円 × 顧客データ件数。${ind.label}の顧客データ 1,000 件規模で漏洩発生時 ¥3,000 万円の法的責任。発生確率は旧版継続で年 8%。`,
    no_ogp: `SNS シェア発生率 5% × 月間訪問者 1,200 名 × クリック率 1/4 ロス = 月 45 件の新規流入損失。年間 540 件 × CVR 2% × ¥${ind.avg_revenue_per_visit.toLocaleString()} = ¥${Math.round(540 * 0.02 * ind.avg_revenue_per_visit / 10000)}万円/年。`,
    no_sns: `${ind.label}業界平均で SNS 経由が新規客の 30-40%。導線なしによる月間機会損失は推定 ¥${Math.round(annualLoss / 12 || 8)}万円。年間 ¥${annualLoss || 100}万円規模。`,
    copyright_old: `「廃業疑惑」による問い合わせ離脱率 ${iss.bounce_pct}% で、新規問い合わせ機会の約 1/3 を失っています。${ind.label}は「信用」が商売の土台です。`,
  }

  /* cta_text (希望: 解決アクション) */
  const ctaMap = {
    speed_critical: `${iss.cta} - Paradigm が 14 日以内に PageSpeed 80+ まで改善。費用 ¥${iss.fix_cost.toLocaleString()}~`,
    ua_残存: `${iss.cta} - GA4 + Cookie 同意バナー + 既存データのリストア提案。費用 ¥${iss.fix_cost.toLocaleString()}~`,
    ssl_expired: `${iss.cta} - SSL 再発行 + サーバー基盤の見直し (Cloudflare 統合)。費用 ¥${iss.fix_cost.toLocaleString()}~`,
    wp_outdated: `${iss.cta} - WP 緊急アップデート + 自動バックアップ + WAF 導入。費用 ¥${iss.fix_cost.toLocaleString()}~`,
    no_ogp: `${iss.cta} - OGP 画像生成 + Twitter Card + LINE シェア対応。費用 ¥${iss.fix_cost.toLocaleString()}~`,
    no_sns: `${iss.cta} - Instagram / Google ビジネスプロフィール統合 + 口コミ自動投稿導線。費用 ¥${iss.fix_cost.toLocaleString()}~`,
    copyright_old: `${iss.cta} - 著作年自動更新 + サイト全体の鮮度監査。費用 ¥${iss.fix_cost.toLocaleString()}~`,
  }

  return {
    template_name: `${ind.label}_${issueCode}`,
    industry: industryCode,
    issue_code: issueCode,
    severity: iss.severity,
    headline: headlineMap[issueCode],
    pain: painMap[issueCode],
    fear: fearMap[issueCode],
    loss: lossMap[issueCode],
    cta_text: ctaMap[issueCode],
    is_active: true,
  }
}

/* ───── 生成 + UPSERT ───── */
async function main() {
  const industries = Object.keys(INDUSTRY)
  const issues = Object.keys(ISSUE)
  const all = []
  for (const ind of industries) {
    for (const iss of issues) {
      all.push(generateTemplate(ind, iss))
    }
  }
  console.log(`Generated ${all.length} templates (${industries.length} industries × ${issues.length} issues)`)

  /* UPSERT (industry + issue_code が論理 unique key だが DB 制約はないので delete + insert) */
  // まず既存削除
  const { error: delErr } = await sb.from("sales_templates").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  if (delErr) {
    console.error("DELETE existing failed:", delErr.message)
  } else {
    console.log("Cleared existing templates")
  }

  // バッチ insert
  const { data, error } = await sb.from("sales_templates").insert(all).select("id, template_name")
  if (error) {
    console.error("INSERT failed:", error.message)
    process.exit(1)
  }
  console.log(`✅ Inserted ${data.length} templates`)
  console.log("First 3:", data.slice(0, 3).map(d => d.template_name).join(", "))
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
