import type { DiagnosticReportData } from "./diagnostic"
import type { DemoFAQItem, DemoMetricsSummary, DemoServicesPage } from "./demo-site-types"
import { slugifyCompanyName } from "./routing"

const CORRUPT_FS = /[�邵郢鬮隴陞陷驍縺繝譁蜑荳譛谿險螟豕邨髻蠕蝠逕莠陦蛻諡蜷繧]/

export function cleanFs(s: string | null | undefined, fallback: string, max = 200): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim()
  if (!t || CORRUPT_FS.test(t)) return fallback
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

export function buildSlug(company: { company_name: string }): string {
  return slugifyCompanyName(company.company_name)
}

export function industryConfig(industry: string | null | undefined): {
  theme: string
  labelJa: string
  labelEn: string
  accentColor: string
  accentColorDark: string
} {
  const configs: Record<string, {
    theme: string; labelJa: string; labelEn: string; accentColor: string; accentColorDark: string
  }> = {
    dental: { theme: "astrowind", labelJa: "歯科医院", labelEn: "Dental Clinic", accentColor: "#2563eb", accentColorDark: "#1e3a8a" },
    construction: { theme: "screwfast", labelJa: "建設業", labelEn: "Construction", accentColor: "#f59e0b", accentColorDark: "#92400e" },
    consulting: { theme: "astrowind", labelJa: "コンサルティング", labelEn: "Consulting", accentColor: "#7c3aed", accentColorDark: "#5b21b6" },
    restaurant: { theme: "astroship", labelJa: "飲食店", labelEn: "Restaurant", accentColor: "#f97316", accentColorDark: "#9a3412" },
    retail: { theme: "astroship", labelJa: "小売業", labelEn: "Retail", accentColor: "#0891b2", accentColorDark: "#155e75" },
    beauty_salon: { theme: "astroship", labelJa: "美容サロン", labelEn: "Beauty Salon", accentColor: "#db2777", accentColorDark: "#831843" },
    accounting: { theme: "astrowind", labelJa: "会計事務所", labelEn: "Accounting Office", accentColor: "#0f766e", accentColorDark: "#134e4a" },
    cleaning: { theme: "screwfast", labelJa: "清掃業", labelEn: "Cleaning Service", accentColor: "#16a34a", accentColorDark: "#166534" },
  }
  return configs[industry ?? ""] ?? configs.consulting
}

/**
 * Detect which issue types are present in the report data.
 */
export function detectIssueTypes(
  report: DiagnosticReportData,
  company: { pain_diagnosis?: Record<string, unknown> | null; meta?: Record<string, unknown> | null },
): Set<string> {
  const issues = new Set<string>()

  // Check signals for various issue types
  const signals = report.intelligence?.signals ?? []

  for (const signal of signals) {
    if (signal.id === "pagespeed-mobile" && signal.tone === "critical") {
      issues.add("speed_critical")
    } else if (signal.id === "pagespeed-mobile" && signal.tone === "warning") {
      issues.add("speed_warning")
    }
    if (signal.id === "security-headers" && signal.tone !== "good") {
      issues.add("trust_signals")
    }
    if (signal.id === "ssl" && signal.tone !== "good") {
      issues.add("ssl_weak")
    }
    if (signal.id === "metadata" && signal.tone !== "good") {
      issues.add("ogp_missing")
    }
  }

  // Check detected_issues
  const detectedIssues = (company as Record<string, unknown>).detected_issues as string[] | undefined
  if (Array.isArray(detectedIssues)) {
    for (const issue of detectedIssues) {
      issues.add(issue)
    }
  }

  // Check painPoints
  const painPoints = report.intelligence?.painPoints ?? []
  for (const p of painPoints) {
    if (p.id === "slow-mobile") issues.add("speed_critical")
    if (p.id === "no-ogp") issues.add("ogp_missing")
    if (p.id === "security-headers") issues.add("trust_signals")
    if (p.id === "form-missing") issues.add("form_missing")
  }

  return issues
}

/**
 * Extract real metrics from diagnostic data for the Before/After section.
 */
export function buildMetricsSummary(
  report: DiagnosticReportData,
  company: { pagespeed_mobile?: number | null; meta?: Record<string, unknown> | null },
): DemoMetricsSummary | undefined {
  const meta = (company.meta ?? {}) as Record<string, unknown>
  const ssl = meta?.ssl as Record<string, unknown> | undefined

  const currentPs = company.pagespeed_mobile
  const currentSsl = (ssl?.grade as string) ?? null
  const monthlyLoss = report.total_loss

  // Count SEO issues
  let seoIssues = 0
  for (const signal of report.intelligence?.signals ?? []) {
    if (signal.category === "seo" && signal.tone !== "good") seoIssues++
  }

  // Recovery amount: if we have total_loss, estimate 80% recovery
  const lossNumeric = monthlyLoss ? parseLossYen(monthlyLoss) : null
  const recoveryAmount = lossNumeric ? `¥${Math.round(lossNumeric * 0.8).toLocaleString("en-US")}` : null

  return {
    currentPageSpeed: currentPs != null ? `${currentPs}/100` : null,
    targetPageSpeed: "85+/100",
    currentSslGrade: currentSsl,
    targetSslGrade: "A+",
    currentSeoIssues: seoIssues,
    targetSeoIssues: 0,
    monthlyLoss: monthlyLoss ?? null,
    recoveryAmount,
  }
}

function parseLossYen(value: string): number | null {
  const match = value.match(/[¥￥]?\s*([\d,]+)/)
  if (!match) return null
  return Number(match[1].replace(/,/g, ""))
}

/**
 * Build data-driven FAQ items from detected issues.
 */
export function buildFAQ(
  issueTypes: Set<string>,
  isJa: boolean,
  name: string,
  industryLabel: string,
  report: DiagnosticReportData,
): DemoFAQItem[] {
  const faq: DemoFAQItem[] = []

  // Speed FAQ
  if (issueTypes.has("speed_critical") || issueTypes.has("speed_warning")) {
    const speed = report.intelligence?.signals?.find((s) => s.id === "pagespeed-mobile")
    faq.push({
      id: "speed",
      question: isJa
        ? "サイトの表示速度はどのくらい改善されますか？"
        : "How much faster will my site be?",
      answer: isJa
        ? `診断データに基づき、PageSpeedスコアを${speed?.value ?? "現状"}から85点以上に改善します。画像最適化、キャッシュ戦略、CDN導入、不要なJavaScriptの削減により、読み込み時間を2〜3倍高速化します。これにより直帰率が約30%低下し、コンバージョン率が20%以上向上することが期待できます。`
        : `Based on diagnostic data, we improve PageSpeed from ${speed?.value ?? "current"} to 85+. Through image optimization, caching strategy, CDN deployment, and unused JavaScript removal, loading times become 2-3x faster. This typically reduces bounce rates by ~30% and increases conversions by 20%+.`,
    })
  }

  // OGP FAQ
  if (issueTypes.has("ogp_missing")) {
    faq.push({
      id: "ogp",
      question: isJa
        ? "SNSでシェアしたときにリンクのプレビューが正しく表示されないのはなぜですか？"
        : "Why don't my links show proper previews on social media?",
      answer: isJa
        ? "OGP（Open Graph Protocol）タグが不足または不完全なためです。適切なOGPタグ（タイトル、説明、画像）を設定することで、LINE、Twitter/X、Facebookなどでシェアされた際にリッチなプレビューが表示されるようになります。クリック率が平均30%向上します。"
        : "Your OGP (Open Graph Protocol) tags are missing or incomplete. By setting proper OGP tags (title, description, image), shared links will display rich previews on LINE, Twitter/X, Facebook, and other platforms. Click-through rates improve by ~30% on average.",
    })
  }

  // Trust signals FAQ
  if (issueTypes.has("trust_signals")) {
    faq.push({
      id: "trust",
      question: isJa
        ? "訪問者に安心感を与えるにはどうすればいいですか？"
        : "How do you build trust with visitors?",
      answer: isJa
        ? `セキュリティヘッダー（HSTS、CSP、X-Frame-Options）の追加、SSL/TLS証明書の最適化、実績・事例・お客様の声の戦略的配置、第三者認証バッジの導入により、訪問者が${name}の信頼性を即座に認識できるようにします。これにより問い合わせ率が大幅に向上します。`
        : `By adding security headers (HSTS, CSP, X-Frame-Options), optimizing SSL/TLS certificates, strategically placing case studies and testimonials, and adding trust badges, visitors instantly recognize ${name}'s credibility. This significantly increases inquiry rates.`,
    })
  }

  // Process FAQ (always present)
  faq.push({
    id: "process",
    question: isJa
      ? "改善にかかる期間はどのくらいですか？"
      : "How long does the improvement process take?",
    answer: isJa
      ? "初回診断から24時間以内に改善案をお届けします。実装はプロジェクトの規模により2〜4週間です。デモサイトは診断データから自動生成され、実際の改善後のイメージを即座にご確認いただけます。"
      : "We deliver an improvement proposal within 24 hours of initial diagnosis. Implementation takes 2-4 weeks depending on project scope. The demo site is auto-generated from diagnostic data so you can see the improved version immediately.",
  })

  // Cost FAQ (always present)
  faq.push({
    id: "cost",
    question: isJa
      ? "費用はどのくらいかかりますか？"
      : "How much does it cost?",
    answer: isJa
      ? "プロジェクトの規模や要件により異なります。まずは15分の無料オンライン相談で、現状の診断結果をもとに概算見積りをご提示します。少額の改善からフルリニューアルまで、柔軟に対応可能です。"
      : "Cost varies by project scope and requirements. We start with a free 15-minute consultation where we provide a rough estimate based on your diagnostic results. We support everything from small improvements to full redesigns.",
  })

  // Maintenance FAQ (always present)
  faq.push({
    id: "maintenance",
    question: isJa
      ? "改善後の運用や保守はどうなりますか？"
      : "What about ongoing maintenance after improvements?",
    answer: isJa
      ? "公開後も効果測定と継続的な改善をサポートします。月次レポート、アクセス解析、SEOモニタリング、セキュリティアップデートを含む保守プランをご用意しています。お客様ご自身で更新できるCMSも導入可能です。"
      : "We support ongoing measurement and continuous improvement after launch. Maintenance plans include monthly reports, analytics, SEO monitoring, and security updates. We can also set up a CMS for self-updating.",
  })

  return faq
}

/**
 * Build data-driven service descriptions based on detected issues.
 */
export function buildDataDrivenServices(
  issueTypes: Set<string>,
  isJa: boolean,
  name: string,
  report: DiagnosticReportData,
): DemoServicesPage["services"] {
  const speedCritical = issueTypes.has("speed_critical")
  const speedWarning = issueTypes.has("speed_warning")
  const trustMissing = issueTypes.has("trust_signals")
  const ogpMissing = issueTypes.has("ogp_missing")
  const formMissing = issueTypes.has("form_missing")
  const sslWeak = issueTypes.has("ssl_weak")

  const services: DemoServicesPage["services"] = []

  // Service 1: Web Development — customized based on issues
  let webDesc: string
  let webFeatures: string[]
  let webDeliverable: string
  let webTimeline: string

  if (speedCritical || speedWarning) {
    webDesc = isJa
      ? `PageSpeed診断で検出された表示速度の問題を根本から解決します。最新のNext.jsと最適化技術で、${speedCritical ? "現状の低スコア" : "現在のスコア"}から85点以上の高速サイトへ刷新。表示速度改善により直帰率低減と検索順位向上を実現します。`
      : `Root-cause fix for speed issues detected in your PageSpeed diagnostics. Using cutting-edge Next.js and optimization, we upgrade from your ${speedCritical ? "low current score" : "current score"} to 85+. Faster loading reduces bounce rates and improves search rankings.`
    webFeatures = isJa
      ? ["PageSpeedの基準値・目標値を合意", "Next.js + ISR による高速表示", "画像最適化（WebP/AVIF）", "クリティカルCSSのインライン化", "Core Web Vitalsを基準値と比較"]
      : ["PageSpeed baseline and target agreed in writing", "Fast loading with Next.js + ISR", "Image optimization (WebP/AVIF)", "Critical CSS inlining", "Core Web Vitals measured against baseline"]
  } else if (trustMissing) {
    webDesc = isJa
      ? `セキュリティ診断で特定された信頼材料の不足を解消し、訪問者が安心して問い合わせできるサイトを構築します。SSL/TLS最適化、セキュリティヘッダー実装、実績・事例の効果的な配置により、成約率を向上させます。`
      : `Address trust gaps identified in security diagnostics, building a site where visitors feel confident inquiring. SSL/TLS optimization, security header implementation, and strategic placement of proof and case studies improve conversion rates.`
    webFeatures = isJa
      ? ["SSL/TLS A+ グレード（Mozilla Observatory 80+）", "セキュリティヘッダー完全実装", "実績・事例セクション設計", "信頼バッジ・第三者認証の統合", "プライバシーポリシー最適化"]
      : ["SSL/TLS A+ grade (Observatory 80+)", "Full security header implementation", "Case study section design", "Trust badge integration", "Privacy policy optimization"]
  } else {
    webDesc = isJa
      ? `最新のデザインと技術で、集客力の高いWebサイトを構築します。${name}の強みを最大限に引き出す構成設計から実装まで一貫対応。訪問者が最初の5秒で価値を理解できるサイトを目指します。`
      : `Build high-conversion websites with cutting-edge design and technology. End-to-end implementation from structural design that maximizes ${name}'s strengths. We aim for a site where visitors understand your value in the first 5 seconds.`
    webFeatures = isJa
      ? ["SEOを考慮した情報設計", "モバイルファーストのレスポンシブデザイン", "高速表示（PageSpeed 85+）", "CMSによる自社更新対応", "アクセス解析の導入"]
      : ["SEO-conscious information architecture", "Mobile-first responsive design", "Fast loading (PageSpeed 85+)", "CMS for self-updating", "Analytics integration"]
  }
  webDeliverable = isJa
    ? "成果物: 新Webサイト一式（最大10ページ）、CMS管理画面、アクセス解析ダッシュボード、改善前後レポート"
    : "Deliverables: New website (up to 10 pages), CMS admin panel, analytics dashboard, before/after report"
  webTimeline = isJa ? "想定期間: 3〜4週間" : "Timeline: 3-4 weeks"

  services.push({
    title: isJa ? "Web制作・リニューアル" : "Web Development & Renewal",
    description: webDesc,
    icon: "globe",
    features: webFeatures,
    priceNote: `${isJa ? "お見積り無料" : "Free estimate"} · ${webTimeline} · ${webDeliverable}`,
  })

  // Service 2: SEO/MEO — customized
  let seoDesc: string
  let seoFeatures: string[]
  let seoDeliverable: string
  let seoTimeline: string

  if (ogpMissing) {
    seoDesc = isJa
      ? `OGPタグの欠如が検出されました。検索エンジンとSNSからの集客を最大化するため、OGP最適化、構造化データ、Googleビジネスプロフィール最適化、キーワード戦略を包括的に実施します。SNSシェア時のプレビュー表示を改善し、クリック率を向上させます。`
      : `OGP tag absence detected. To maximize search and social traffic, we comprehensively implement OGP optimization, structured data, Google Business Profile optimization, and keyword strategy. Improve social share previews and click-through rates.`
    seoFeatures = isJa
      ? ["OGPタグ完全実装（SNSプレビュー最適化）", "構造化データ（JSON-LD）実装", "Googleビジネスプロフィール最適化", "キーワード戦略設計", "競合分析レポート"]
      : ["Complete OGP implementation (social preview optimization)", "Structured data (JSON-LD)", "Google Business Profile optimization", "Keyword strategy design", "Competitor analysis reports"]
  } else {
    seoDesc = isJa
      ? `検索エンジンとマップからの集客を最大化。Googleビジネスプロフィールの最適化から、コンテンツSEOまで包括的にサポートします。`
      : `Maximize traffic from search engines and maps. Comprehensive support from Google Business Profile optimization to content SEO.`
    seoFeatures = isJa
      ? ["Googleビジネスプロフィール最適化", "MEOローカル検索対策", "キーワード戦略設計", "コンテンツマーケティング", "競合分析レポート"]
      : ["Google Business Profile optimization", "Local search (MEO) strategy", "Keyword strategy design", "Content marketing", "Competitor analysis reports"]
  }
  seoDeliverable = isJa
    ? "成果物: SEO監査レポート、OGP/構造化データ実装、GBP最適化、月次ランキングレポート（3ヶ月）"
    : "Deliverables: SEO audit report, OGP/structured data implementation, GBP optimization, monthly ranking reports (3 months)"
  seoTimeline = isJa ? "想定期間: 2〜4週間" : "Timeline: 2-4 weeks"

  services.push({
    title: isJa ? "SEO/MEO対策" : "SEO / MEO Optimization",
    description: seoDesc,
    icon: "search",
    features: seoFeatures,
    priceNote: `${isJa ? "月額プランあり" : "Monthly plans available"} · ${seoTimeline} · ${seoDeliverable}`,
  })

  // Service 3: AI Integration — customized
  let aiDesc: string
  let aiDeliverable: string
  let aiTimeline: string

  if (formMissing || trustMissing) {
    aiDesc = isJa
      ? `問い合わせ導線の自動化と信頼構築をAIで加速します。AIチャットボットによる24時間対応、自動フォローアップ、データ分析により、人的コストを抑えながらコンバージョンを最大化します。`
      : `Accelerate inquiry automation and trust-building with AI. 24/7 AI chatbot response, automated follow-up, and data analytics maximize conversions while reducing human cost.`
  } else {
    aiDesc = isJa
      ? `業務効率化から顧客体験の向上まで、AI技術を活用したソリューションを提供。チャットボット、自動化ワークフロー、データ分析を導入します。`
      : `From operational efficiency to customer experience enhancement, provide AI-powered solutions. Implement chatbots, automation workflows, and data analytics.`
  }
  aiDeliverable = isJa
    ? "成果物: AIチャットボット導入済みサイト、自動応答フロー、分析ダッシュボード"
    : "Deliverables: AI chatbot-integrated site, auto-response flow, analytics dashboard"
  aiTimeline = isJa ? "想定期間: 2〜3週間" : "Timeline: 2-3 weeks"

  services.push({
    title: isJa ? "AI導入支援" : "AI Integration",
    description: aiDesc,
    icon: "cpu",
    features: isJa
      ? ["AIチャットボット導入", "業務自動化ワークフロー設計", "データ分析・可視化", "AI活用コンサルティング", "社内トレーニング"]
      : ["AI chatbot implementation", "Workflow automation design", "Data analysis & visualization", "AI adoption consulting", "In-house training"],
    priceNote: `${isJa ? "Japan Entryの申込で適合性を確認" : "Apply for Japan Entry for a fit review"} · ${aiTimeline} · ${aiDeliverable}`,
  })

  return services
}

/**
 * Build data-driven about story using pain_diagnosis.
 */
export function buildAboutStory(
  painDiagnosis: Record<string, unknown> | null | undefined,
  intelligence: { painPoints?: { title: string; evidence: string; implication: string }[] },
  name: string,
  industryLabel: string,
  isJa: boolean,
): string {
  // Try to extract from pain_diagnosis first
  const pd = painDiagnosis ?? {}
  const primaryPain = (pd.primaryPain as string) ?? (pd.primary_pain as string)
  const summary = (pd.summary as string)

  if (primaryPain && primaryPain.trim().length > 0) {
    return isJa
      ? `${name}は${industryLabel}業界で実績を重ねてきましたが、「${primaryPain}」という課題に直面していました。デジタル化の波に対応し、より多くのお客様に価値を届けるため、Webサイトの抜本的な改善に着手。データに基づく診断と最新技術の導入により、オンラインでの存在感を大きく強化します。`
      : `${name} has built a strong track record in the ${industryLabel} industry, but faced a key challenge: "${primaryPain}". To adapt to digital transformation and deliver value to more clients, we've embarked on a comprehensive website overhaul, using data-driven diagnostics and cutting-edge technology to strengthen our online presence.`
  }

  if (summary && summary.trim().length > 0) {
    return cleanFs(summary, "", 400)
  }

  // Fall back to painPoints from intelligence
  const painPoints = intelligence.painPoints ?? []
  if (painPoints.length > 0) {
    const painSummary = painPoints.map((p) => p.title).join(". ")
    return isJa
      ? `${name}は${industryLabel}として長年の信頼を築いてきました。しかし現状のWebサイトでは、${painSummary}。これらの課題を解決し、デジタル時代にふさわしい情報発信基盤を構築するため、包括的なWeb改善プロジェクトを開始しました。`
      : `${name} has earned long-standing trust as a ${industryLabel}. However, the current website faces several challenges: ${painSummary}. To address these and build a digital presence worthy of the modern era, we've launched a comprehensive web improvement project.`
  }

  // Generic fallback
  return isJa
    ? `${name}は${industryLabel}業界で長年の実績を持ち、お客様の課題解決に取り組んでいます。デジタル化の波に対応し、より多くのお客様に価値を届けるため、Webサイトの改善に着手しました。`
    : `${name} has a long track record in the ${industryLabel} industry, dedicated to solving client challenges. To adapt to the digital wave and deliver value to more clients, we have embarked on a website improvement journey.`
}
