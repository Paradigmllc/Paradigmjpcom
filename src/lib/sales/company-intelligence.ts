import type { SourceCoverageItem } from "./source-coverage"
import type { SalesCompany } from "./types"

type JsonRecord = Record<string, unknown>

export type IntelligenceTone = "good" | "warning" | "critical" | "neutral"

export interface IntelligenceSignal {
  id: string
  label: string
  value: string
  source: string
  category: "website" | "seo" | "security" | "company" | "outreach" | "automation"
  tone: IntelligenceTone
  detail: string
}

export interface PainPoint {
  id: string
  title: string
  severity: "critical" | "warning" | "opportunity"
  evidence: string
  implication: string
  recommendedAction: string
}

export interface CompanyIntelligence {
  signals: IntelligenceSignal[]
  painPoints: PainPoint[]
  nextActions: string[]
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function pushSignal(signals: IntelligenceSignal[], signal: IntelligenceSignal | null): void {
  if (signal) signals.push(signal)
}

function scoreTone(score: number | null): IntelligenceTone {
  if (score === null) return "neutral"
  if (score < 50) return "critical"
  if (score < 75) return "warning"
  return "good"
}

function yesNo(value: boolean | null): string {
  if (value === null) return "不明"
  return value ? "あり" : "なし"
}

function sourceNames(items: SourceCoverageItem[], status: SourceCoverageItem["status"]): string[] {
  return items.filter((item) => item.status === status).map((item) => item.label)
}

export function buildCompanyIntelligence(
  company: SalesCompany,
  sourceItems: SourceCoverageItem[],
): CompanyIntelligence {
  const meta = (company.meta ?? {}) as JsonRecord
  const scan = asRecord(meta.scan)
  const tech = asRecord(meta.tech)
  const ssl = asRecord(meta.ssl)
  const headers = asRecord(meta.security_headers)
  const robots = asRecord(meta.robots_sitemap)
  const place = asRecord(meta.place)
  const diagnosis = asRecord(meta.pain_diagnosis)
  const formDiscovery = asRecord(meta.form_discovery)
  const signals: IntelligenceSignal[] = []

  pushSignal(signals, {
    id: "pagespeed-mobile",
    label: "モバイル速度",
    value: company.pagespeed_mobile === null ? "未取得" : `${company.pagespeed_mobile}/100`,
    source: "PageSpeed Insights",
    category: "website",
    tone: scoreTone(company.pagespeed_mobile),
    detail: "スマホ閲覧時の離脱リスクを判断する主要指標です。",
  })
  pushSignal(signals, {
    id: "pagespeed-desktop",
    label: "PC速度",
    value: company.pagespeed_desktop === null ? "未取得" : `${company.pagespeed_desktop}/100`,
    source: "PageSpeed Insights",
    category: "website",
    tone: scoreTone(company.pagespeed_desktop),
    detail: "検索流入後の初期体験と問い合わせ率に影響します。",
  })
  pushSignal(signals, {
    id: "metadata",
    label: "title/description",
    value: [asString(scan?.html_title), asString(scan?.html_description)].filter(Boolean).length > 0 ? "取得済み" : "不足",
    source: "HTML metadata scan",
    category: "seo",
    tone: asString(scan?.html_title) && asString(scan?.html_description) ? "good" : "warning",
    detail: "検索結果とSNS共有時の第一印象を作る基本要素です。",
  })
  pushSignal(signals, {
    id: "wordpress",
    label: "CMS",
    value: asRecord(tech)?.stack && Array.isArray(tech?.stack) ? (tech.stack as unknown[]).slice(0, 5).join(", ") : yesNo(scan?.is_wordpress === true),
    source: "Wappalyzer / HTML scan",
    category: "website",
    tone: scan?.is_wordpress === true ? "warning" : "neutral",
    detail: "技術スタックから保守性、速度、セキュリティの改善余地を読みます。",
  })
  pushSignal(signals, {
    id: "security-headers",
    label: "セキュリティヘッダー",
    value: headers ? `${[headers.hasHsts, headers.hasCsp, headers.hasXFrameOptions, headers.hasNoSniff].filter(Boolean).length}/4` : "未取得",
    source: "HTTP security headers",
    category: "security",
    tone: headers && [headers.hasHsts, headers.hasCsp, headers.hasXFrameOptions, headers.hasNoSniff].filter(Boolean).length >= 3 ? "good" : "warning",
    detail: "HSTS/CSP/X-Frame-Options/nosniffの有無を見ています。",
  })
  pushSignal(signals, {
    id: "ssl",
    label: "SSL/TLS",
    value: asString(ssl?.grade) ?? (ssl ? "取得済み" : "未取得"),
    source: "SSL Labs",
    category: "security",
    tone: asString(ssl?.grade)?.startsWith("A") ? "good" : ssl ? "warning" : "neutral",
    detail: "証明書とTLS構成の信頼性を見ています。",
  })
  pushSignal(signals, {
    id: "robots-sitemap",
    label: "robots/sitemap",
    value: robots ? `robots: ${yesNo(robots.robotsTxt === true)} / sitemap: ${yesNo(robots.sitemapXml === true)}` : "未取得",
    source: "robots.txt / sitemap.xml",
    category: "seo",
    tone: robots?.sitemapXml === true ? "good" : "warning",
    detail: "検索エンジンにページ構造を渡せているかを見ています。",
  })
  pushSignal(signals, {
    id: "places",
    label: "Google Places",
    value: asString(place?.name) ?? (place ? "候補あり" : "未取得"),
    source: "Google Places API",
    category: "company",
    tone: place ? "good" : "neutral",
    detail: "MEO、所在地、口コミ、営業時間などの営業文脈に使います。",
  })
  pushSignal(signals, {
    id: "form",
    label: "フォームURL",
    value: asString(meta.contact_form_url) ?? "未検出",
    source: "Crawlee / Crawl4AI / form discovery",
    category: "outreach",
    tone: asString(meta.contact_form_url) ? "good" : "warning",
    detail: `検出方式: ${asString(formDiscovery?.method) ?? "未取得"}`,
  })
  pushSignal(signals, {
    id: "dify",
    label: "Dify診断",
    value: asString(diagnosis?.primaryPain) ? "生成済み" : "fallback/未生成",
    source: "Dify Cloud / DeepSeek V4",
    category: "automation",
    tone: asString(diagnosis?.primaryPain) ? "good" : "warning",
    detail: asString(diagnosis?.primaryPain) ?? "Dify未接続時はローカル診断で補完します。",
  })

  const collected = sourceNames(sourceItems, "collected")
  const configured = sourceNames(sourceItems, "configured")
  const missing = sourceNames(sourceItems, "missing")

  const painPoints: PainPoint[] = []
  if (company.pagespeed_mobile !== null && company.pagespeed_mobile < 55) {
    painPoints.push({
      id: "slow-mobile",
      title: "スマホ表示速度が問い合わせ前の離脱を作っている可能性",
      severity: "critical",
      evidence: `PageSpeed Mobile ${company.pagespeed_mobile}/100`,
      implication: "広告、検索、SNSから来た見込み客が初回表示で戻るリスクがあります。",
      recommendedAction: "画像最適化、不要JS削減、Astro/Next.js再構築を優先します。",
    })
  }
  if (company.detected_issues?.includes("no_ogp")) {
    painPoints.push({
      id: "no-ogp",
      title: "SNS/メッセージ共有時の第一印象が弱い",
      severity: "warning",
      evidence: "OGPメタ情報が不足しています。",
      implication: "紹介や比較検討の場でクリック前の信頼形成が弱くなります。",
      recommendedAction: "商材別のOGP、構造化データ、実績導線を整備します。",
    })
  }
  if (!asString(meta.contact_form_url)) {
    painPoints.push({
      id: "form-missing",
      title: "問い合わせ導線が自動検出できない",
      severity: "warning",
      evidence: "フォームURLが未検出です。",
      implication: "フォーム営業もユーザー導線も詰まりやすい状態です。",
      recommendedAction: "問い合わせ/資料請求/予約導線を統一し、フォーム検出可能な構造にします。",
    })
  }
  if (!headers || [headers.hasHsts, headers.hasCsp, headers.hasXFrameOptions, headers.hasNoSniff].filter(Boolean).length < 3) {
    painPoints.push({
      id: "security-headers",
      title: "基本的なセキュリティヘッダーに改善余地",
      severity: "opportunity",
      evidence: headers ? "HTTPヘッダーの一部が不足しています。" : "ヘッダー情報が未取得です。",
      implication: "B2B商談での信頼性や監査観点で弱点になり得ます。",
      recommendedAction: "CSP/HSTS/X-Frame-Options/nosniffを標準設定にします。",
    })
  }
  if (painPoints.length === 0) {
    painPoints.push({
      id: "growth-opportunity",
      title: "取得データ上は大きな事故よりも改善余地の可視化が中心",
      severity: "opportunity",
      evidence: collected.slice(0, 4).join(" / ") || "主要データを順次取得中です。",
      implication: "商談では課題の断定よりも、比較表と改善ロードマップが有効です。",
      recommendedAction: "診断レポートとデモサイトを使い、優先順位を短時間で合意します。",
    })
  }

  const nextActions = [
    "Twenty企業ページでカルテ、商材、商談を確認する",
    asString(meta.contact_form_url) ? "フォーム営業dry-runで文面と送信可否を確認する" : "Appsmith/NocoDBでフォームURLを手動確認する",
    "診断レポートURLとAstro差し替えデモを提案文面へ差し込む",
    configured.length > 0 ? `${configured.slice(0, 3).join(" / ")} を本取得に切り替える` : "未設定APIを優先度順に接続する",
    missing.length > 0 ? `未取得ソースを確認: ${missing.slice(0, 3).join(" / ")}` : "Metabaseで返信率と商談化率を確認する",
  ]

  return { signals, painPoints, nextActions }
}

export function signalScore(signals: IntelligenceSignal[]): number {
  if (signals.length === 0) return 0
  const score = signals.reduce((sum, signal) => {
    if (signal.tone === "good") return sum + 100
    if (signal.tone === "neutral") return sum + 65
    if (signal.tone === "warning") return sum + 35
    return sum + 10
  }, 0)
  return Math.round(score / signals.length)
}
