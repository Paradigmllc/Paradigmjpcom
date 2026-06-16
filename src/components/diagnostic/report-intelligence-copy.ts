import type { CompanyIntelligence, IntelligenceSignal, PainPoint } from "@/lib/sales/company-intelligence"
import type { SourceCoverageItem } from "@/lib/sales/source-coverage"
import type { ReportLang } from "./report-copy"

const TEXT_JA: Record<string, string> = {
  "Mobile speed may be leaking high-intent visitors before inquiry": "問い合わせ前のスマホ表示速度で、検討度の高い訪問者を取りこぼしている可能性があります",
  "Social and message previews are weaker than they should be": "SNSやメッセージ共有時の見え方が弱く、クリック前の信頼を取りこぼしています",
  "Inquiry path is not machine-discoverable yet": "問い合わせ導線がまだ自動取得できず、ユーザーにも営業自動化にも不利です",
  "Security and trust headers can be improved": "信頼表示とセキュリティヘッダーに改善余地があります",
  "Japan-entry trust and payment gaps need human review": "日本市場向けの信頼表示・決済対応は人間の確認が必要です",
  "The biggest opportunity is clearer proof and a better conversion path": "最大の改善余地は、証拠の見せ方と問い合わせ導線の整理です",
  "OGP metadata appears incomplete.": "OGPメタデータが未整備、または不完全に見えます。",
  "No contact form URL has been confirmed by the crawler.": "クローラーで問い合わせフォームURLを確認できていません。",
  "Some HTTP security headers are missing.": "一部のHTTPセキュリティヘッダーが不足しています。",
  "Header evidence has not been collected.": "ヘッダー情報はまだ取得されていません。",
  "Shared links can look generic before a prospect decides whether to click.": "見込み客がクリックを判断する前に、共有リンクが汎用的に見えてしまう可能性があります。",
  "Outbound form automation and user navigation both become harder to operate reliably.": "フォーム営業の自動化も、ユーザーの問い合わせ導線も安定運用しにくくなります。",
  "This can become a weak point in B2B review, procurement, or technical due diligence.": "B2Bの比較検討、購買審査、技術確認で弱点として見られる可能性があります。",
  "Visitors from ads, search, or social may leave before the value proposition and CTA are visible.": "広告・検索・SNSから来た訪問者が、価値提案やCTAを見る前に離脱する可能性があります。",
  "Japanese buyers may hesitate if commercial disclosure, privacy handling, or local payment options are unclear.": "特商法表記、個人情報の扱い、日本向け決済が不明瞭だと、日本の買い手は不安を感じやすくなります。",
  "For sales, a concise comparison and improvement roadmap is more useful than a long audit.": "営業では、長い調査表よりも、比較しやすい改善ロードマップの方が意思決定に効きます。",
  "Add offer-specific OGP, structured data, and proof-led preview copy.": "商材ごとのOGP、構造化データ、実績が伝わるプレビュー文を整備してください。",
  "Confirm the form URL manually, then expose a stable contact, booking, or quote path.": "フォームURLを手動確認し、問い合わせ・予約・見積もり導線を安定して表示してください。",
  "Set CSP, HSTS, X-Frame-Options, and nosniff as standard launch hardening.": "CSP、HSTS、X-Frame-Options、nosniffを公開前の標準設定として整備してください。",
  "Prioritize image optimization, unused JS reduction, and an Astro/Next.js rebuild path.": "画像最適化、未使用JS削減、Astro/Next.jsでの軽量化方針を優先してください。",
  "Confirm the gaps manually, then generate a Japan-entry proposal with Dify. Do not assert legal violations, penalties, or compliance claims without primary-source review.": "不足箇所を人間が確認したうえで、日本市場参入提案に変換してください。一次情報確認なしに法令違反・罰則・適法性を断定しないでください。",
  "Use the report and demo site to align the first production changes quickly.": "このレポートと改善デモを使い、最初に本番反映する変更を早く合意してください。",
  "Review the company karte, sales material, and opportunity record on the Twenty company page.": "企業カルテ、営業資料、Twentyの商談レコードを確認してください。",
  "Confirm the form URL in Appsmith/NocoDB before any automated outreach.": "自動フォーム営業の前に、Appsmith/NocoDB上でフォームURLを確認してください。",
  "Run the Japan readiness audit before sending Japan-entry offers.": "日本市場参入オファーを送る前に、日本向け準備状況の監査を実行してください。",
  "Use the Japan readiness audit as a human-reviewed sales hypothesis, not as legal advice.": "日本向け準備状況の監査は、法的助言ではなく、人間が確認する営業仮説として扱ってください。",
  "Attach the diagnostic report URL and Astro replacement demo URL to the proposal message.": "提案メッセージには、診断レポートURLと差し替えデモURLを添付してください。",
  "Connect the highest-priority missing API sources before scaling this segment.": "このセグメントを拡大する前に、優先度の高い未接続APIソースを接続してください。",
  "Monitor reply rate and opportunity conversion in Metabase.": "返信率と商談化率をMetabaseで継続確認してください。",
  "A primary proxy for first-view friction on mobile search and ad traffic.": "検索・広告からのスマホ初回訪問で、最初に離脱が起きていないかを見る指標です。",
  "Useful for B2B comparison, office browsing, and post-click inquiry flow.": "B2Bの社内比較、デスクトップ閲覧、クリック後の問い合わせ導線を確認する指標です。",
  "Metadata shapes the first impression in search, social previews, and browser sharing.": "検索結果、SNSプレビュー、ブラウザ共有で最初に伝わる約束文を確認します。",
  "Technology stack helps estimate rebuild risk, security posture, and performance constraints.": "技術スタックから、改修難度、セキュリティ姿勢、表示速度の制約を読みます。",
  "Checks HSTS, CSP, X-Frame-Options, and nosniff as trust and risk signals.": "HSTS、CSP、X-Frame-Options、nosniffを信頼性とリスクの指標として確認します。",
  "Certificate and TLS quality influence trust, browser warnings, and B2B review.": "証明書とTLS品質は、信頼、ブラウザ警告、B2B審査に影響します。",
  "Shows whether crawlers can understand the public URL inventory.": "クローラーが公開URLの構造を理解できるかを確認します。",
  "Useful for local proof, MEO facts, opening hours, reviews, and map context.": "地域の信頼材料、MEO情報、営業時間、レビュー、地図上の見え方を確認します。",
  "Speed influences whether visitors stay long enough to see the offer.": "表示速度は、訪問者が提案内容を見る前に離脱するかどうかを左右します。",
  "Desktop speed still matters for B2B review, comparison, and internal sharing after the first visit.": "初回訪問後のB2B比較、社内共有、検討ではPC表示速度もまだ重要です。",
  "Metadata shapes the first impression before a prospect clicks.": "メタデータは、見込み客がクリックする前の第一印象を決めます。",
  "Technology stack explains rebuild effort and likely bottlenecks.": "技術スタックは、改修工数とボトルネックの見立てに使います。",
  "Security headers reduce avoidable trust and review risk.": "セキュリティヘッダーは、避けられる信頼低下や審査リスクを減らします。",
  "SSL/TLS quality is a basic trust signal before booking, contact, and procurement review.": "SSL/TLS品質は、予約・問い合わせ・購買審査前の基本的な信頼指標です。",
  "Crawler visibility affects search and AI discovery.": "クローラーから見える状態は、検索やAI検索での発見性に影響します。",
  "Local proof affects trust before inquiry.": "地域情報の根拠は、問い合わせ前の信頼形成に効きます。",
  "A discoverable inquiry path matters for both users and outreach automation.": "問い合わせ導線が機械的に見つかることは、ユーザー体験にも営業自動化にも重要です。",
  "Checks public-page hints for Japanese commercial disclosure, privacy/APPI explanation, and local payment readiness.": "特商法表記、個人情報・APPI説明、日本向け決済準備の公開ページ上の手掛かりを確認します。",
  "Japan-entry prospects need a buyer-ready trust path: commercial disclosure, privacy handling, and local payment familiarity. This signal turns public-page gaps into a human-reviewed sales hypothesis.": "日本市場参入では、特商法表記、個人情報の扱い、日本向け決済など、買い手が安心できる導線が必要です。この項目は公開ページ上の不足を、人間が確認する営業仮説に変換します。",
  "Without this audit, Japan-entry reports can miss the concrete friction that makes overseas SMBs hesitate or fail to convert Japanese buyers.": "この監査がないと、海外SMBが日本の買い手を獲得する際の具体的な摩擦を見落とす可能性があります。",
  "Run the Japan market audit, then let Dify Cloud convert only verified gaps into proposal copy. Legal or penalty claims must stay behind human review.": "日本市場監査を実行し、確認済みの不足だけをDify Cloudで提案文に変換してください。法令違反や罰則の断定は必ず人間確認の後にしてください。",
  "Turns collected evidence into an industry, country, and offer-specific diagnosis.": "取得済みの根拠を、業界・国・商材に合わせた診断文へ変換します。",
  "Without diagnosis, the report can read like raw metrics instead of a business case.": "診断がないと、レポートが事業提案ではなく数値の羅列に見えてしまいます。",
  "Run Dify Cloud + DeepSeek to select pain, loss hypothesis, and proposal templates.": "Dify Cloud + DeepSeekで、痛み、損失仮説、提案テンプレートを選定してください。",
  "Mobile speed": "スマホ表示速度",
  "Desktop speed": "PC表示速度",
  "Title / description": "タイトル・説明文",
  "CMS / stack": "CMS・技術基盤",
  "Security headers": "セキュリティヘッダー",
  "SSL / TLS": "SSL / TLS",
  "robots / sitemap": "robots / sitemap",
  "Google Places": "Google Places",
  "Form URL": "フォームURL",
  "Japan readiness": "日本市場対応",
  "Dify diagnosis": "Dify診断",
  "not collected": "未取得",
  "collected": "取得済み",
  "configured": "設定済み",
  "missing": "未整備",
  "candidate found": "候補あり",
  "not discovered": "未検出",
  "fallback / pending": "代替診断 / 待機中",
  "generated": "生成済み",
  "unknown": "不明",
  "yes": "あり",
  "no": "なし",
}

const SEVERITY_JA: Record<PainPoint["severity"], string> = {
  critical: "最優先",
  warning: "要改善",
  opportunity: "改善余地",
}

const SOURCE_STATUS_JA: Record<SourceCoverageItem["status"], string> = {
  collected: "取得済み",
  configured: "設定済み",
  queued: "取得待ち",
  missing: "未取得",
  disabled: "停止中",
  not_applicable: "対象外",
  error: "取得エラー",
}

const SOURCE_NAME_JA: Record<string, string> = {
  "Japan legal/payment readiness": "日本向け法務・決済確認",
  "HTML metadata scan": "HTMLメタデータ",
  "Wappalyzer / HTML scan": "技術スタックスキャン",
  "HTTP security headers": "セキュリティヘッダースキャン",
  "Crawlee / Crawl4AI / form discovery": "問い合わせフォーム探索",
  "Google Places API": "Google Places",
  "Dify pain diagnosis": "Dify診断",
  "Japan market audit": "日本市場監査",
  "Steel-Browser": "Steel-Browser",
  "Stagehand AI Agent": "Stagehand AI Agent",
  "PageSpeed Insights": "PageSpeed Insights",
  "robots.txt / sitemap.xml": "robots.txt / sitemap.xml",
  "robots.txt": "robots.txt",
  "sitemap.xml": "sitemap.xml",
}

const SOURCE_CATEGORY_JA: Record<string, string> = {
  analysis: "分析",
  asset: "制作資産",
  company: "企業情報",
  compliance: "確認項目",
  demo: "デモ",
  list: "リスト",
  orchestration: "実行基盤",
  outreach: "営業導線",
  post_outreach: "商談後対応",
  video: "動画",
  automation: "自動化",
}

function translateSourceNames(value: string): string {
  return Object.entries(SOURCE_NAME_JA).reduce((text, [source, label]) => text.replaceAll(source, label), value)
}

function translateText(value: string, lang: ReportLang): string {
  if (lang !== "ja") return value
  const exact = TEXT_JA[value]
  if (exact) return exact
  if (value.startsWith("Turn configured sources into collected evidence:")) {
    return translateSourceNames(value.replace("Turn configured sources into collected evidence:", "設定済みソースを取得済み根拠に変換:"))
  }
  if (value.startsWith("Review missing sources:")) {
    return translateSourceNames(value.replace("Review missing sources:", "未取得ソースを確認:"))
  }
  if (value.startsWith("Discovery method:")) {
    return value.replace("Discovery method:", "取得方法:").replace("not collected", "未取得")
  }
  if (value.includes("signals confirmed")) {
    return value.replace("signals confirmed", "項目確認済み")
  }
  return translateSourceNames(value)
}

function translateSignalValue(value: string, lang: ReportLang): string {
  if (lang !== "ja") return value
  return value
    .split(" / ")
    .map((part) => {
      const [key, raw] = part.split(": ")
      if (raw) return `${key}: ${translateText(raw, lang)}`
      return translateText(part, lang)
    })
    .join(" / ")
}

export function localizeReportIntelligence(intelligence: CompanyIntelligence, lang: ReportLang): CompanyIntelligence {
  if (lang !== "ja") return intelligence
  return {
    signals: intelligence.signals.map((signal): IntelligenceSignal => ({
      ...signal,
      label: translateText(signal.label, lang),
      value: translateSignalValue(signal.value, lang),
      source: translateText(signal.source, lang),
      detail: translateText(signal.detail, lang),
      whyItMatters: translateText(signal.whyItMatters, lang),
      missingConsequence: signal.missingConsequence ? translateText(signal.missingConsequence, lang) : undefined,
    })),
    painPoints: intelligence.painPoints.map((pain): PainPoint => ({
      ...pain,
      title: translateText(pain.title, lang),
      evidence: translateText(pain.evidence, lang),
      implication: translateText(pain.implication, lang),
      recommendedAction: translateText(pain.recommendedAction, lang),
    })),
    nextActions: intelligence.nextActions.map((action) => translateText(action, lang)),
  }
}

export function severityLabel(severity: PainPoint["severity"], lang: ReportLang): string {
  return lang === "ja" ? SEVERITY_JA[severity] : severity
}

export function sourceCoverageDetail(configured: number, missing: number, lang: ReportLang): string {
  return lang === "ja" ? `設定済み ${configured} / 未取得 ${missing}` : `${configured} configured / ${missing} missing`
}

export function sourceStatusLabel(status: SourceCoverageItem["status"], lang: ReportLang): string {
  return lang === "ja" ? SOURCE_STATUS_JA[status] : status
}

export function sourceCategoryLabel(category: string, lang: ReportLang): string {
  return lang === "ja" ? (SOURCE_CATEGORY_JA[category] ?? category) : category
}

export function reportEvidenceText(value: string, lang: ReportLang): string {
  return translateText(value, lang)
}
