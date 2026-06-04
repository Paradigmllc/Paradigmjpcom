import type { CompanyIntelligence, IntelligenceSignal, PainPoint } from "@/lib/sales/company-intelligence"
import type { SourceCoverageItem } from "@/lib/sales/source-coverage"
import type { ReportLang } from "./report-copy"

const TEXT_JA: Record<string, string> = {
  "Mobile speed may be leaking high-intent visitors before inquiry": "問い合わせ前に、スマホ表示速度で検討度の高い訪問者を逃している可能性があります",
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
  "Japanese buyers may hesitate if commercial disclosure, privacy handling, or local payment options are unclear.": "特商法表示、個人情報の扱い、日本向け決済が曖昧だと、日本の買い手は不安を感じやすくなります。",
  "For sales, a concise comparison and improvement roadmap is more useful than a long audit.": "営業では、長い監査表よりも、比較しやすい改善ロードマップの方が意思決定に効きます。",
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

function translateText(value: string, lang: ReportLang): string {
  if (lang !== "ja") return value
  const exact = TEXT_JA[value]
  if (exact) return exact
  if (value.startsWith("Turn configured sources into collected evidence:")) {
    return value.replace("Turn configured sources into collected evidence:", "設定済みソースを取得済み根拠に変換:")
  }
  if (value.startsWith("Review missing sources:")) {
    return value.replace("Review missing sources:", "未取得ソースを確認:")
  }
  if (value.includes("signals confirmed")) {
    return value.replace("signals confirmed", "項目確認済み")
  }
  return value
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
