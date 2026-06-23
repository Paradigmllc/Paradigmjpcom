import type { DiagnosticReportData } from "./diagnostic"
import type {
  DemoHomePage,
  DemoAboutPage,
  DemoServicesPage,
  DemoContactPage,
  DemoMultiPageData,
  DemoBeforeAfterItem,
  DemoFeatureItem,
  DemoStatsItem,
  DemoMetricsSummary,
  DemoFAQItem,
} from "./demo-site-types"
import type { Industry, ReportLocale } from "./types"
import {
  buildAboutStory,
  buildDataDrivenServices,
  buildFAQ,
  buildMetricsSummary,
  buildSlug,
  cleanFs,
  detectIssueTypes,
  industryConfig,
} from "./demo-multi-page-content"

/**
 * Build multi-page demo data for a full business website:
 * Home, About, Services, and Contact pages.
 */
export function buildDemoMultiPageData(
  company: {
    id: string
    company_name: string
    domain: string
    slug?: string | null
    industry: string | null
    prefecture?: string | null
    report_locale?: string | null
    tech_stack?: Record<string, unknown> | null
    pain_diagnosis?: Record<string, unknown> | null
    dify_result?: Record<string, unknown> | null
    visual_evidence?: Record<string, unknown> | null
    demo_site?: Record<string, unknown> | null
    detected_issues?: string[] | null
    pagespeed_mobile?: number | null
    pagespeed_desktop?: number | null
    meta?: Record<string, unknown> | null
  },
  report: DiagnosticReportData,
): DemoMultiPageData {
  const locale = (company.report_locale ?? report.report_locale ?? "ja") as ReportLocale
  const isJa = locale === "ja"
  const industry = (company.industry ?? report.industry ?? "consulting") as Industry
  const cfg = industryConfig(industry)
  const slug = buildSlug(company)
  const name = cleanFs(company.company_name, "Your Company", 80)
  const locationStr = cleanFs(company.prefecture, isJa ? "全国対応" : "Nationwide", 30)
  const industryLabel = isJa ? (cfg.labelJa ?? "コンサルティング") : (cfg.labelEn ?? "Consulting")
  // Cal.com booking URL — use embed parameter for iframe
  const calBookingUrl = "https://cal.com/paradigm-jp/15min"
  const calEmbedUrl = ""  // Disabled until valid Cal.com URL is configured
  const ctaUrl = calBookingUrl
  const accentColor = cfg.accentColor ?? "#7c3aed"
  const accentColorDark = cfg.accentColorDark ?? "#5b21b6"

  // Detect issue types for data-driven content
  const issueTypes = detectIssueTypes(report, company)

  const primaryIssue = report.acts?.[0]
  const secondaryIssue = report.acts?.[1]
  const thirdIssue = report.acts?.[2]

  /* ───── Home page ───── */

  const heroTitle = cleanFs(
    report.hook,
    isJa
      ? `${name}の強みが最初の5秒で伝わるWeb改善デモ`
      : `A web demo that makes ${name}'s value clear in the first five seconds`,
    110,
  )

  const homeHero = {
    title: heroTitle,
    subtitle: isJa
      ? "御社の公開データを分析し、集客力を最大化する構成で再設計しました。下記は改善後のイメージです。"
      : "Redesigned based on your public data to maximize customer acquisition. This is the improved version.",
    tagline: isJa ? `${industryLabel}向け改善デモ` : `${industryLabel} improvement demo`,
    companyName: name,
    industryLabel,
    locationLabel: locationStr,
    primaryCta: {
      text: cleanFs(report.cta_text, isJa ? "無料相談を予約する" : "Book a free consultation", 40),
      href: ctaUrl,
    },
    secondaryCta: {
      text: isJa ? "サービスを見る" : "View Services",
      href: "/services",
    },
    accentColor,
    accentColorDark,
  }

  const features: DemoFeatureItem[] = [
    {
      title: cleanFs(primaryIssue?.headline, isJa ? "第一印象を整理" : "Clarify the first impression", 64),
      description: cleanFs(primaryIssue?.body, isJa ? "訪問直後に何を提供し、なぜ選ぶべきかが伝わる構成にします。" : "Make the offer and reason to choose you obvious immediately.", 140),
      icon: "sparkles",
      metricLabel: cleanFs(primaryIssue?.metric_label, "", 30),
      metricValue: cleanFs(primaryIssue?.metric_value, "-", 20),
      metricBench: cleanFs(primaryIssue?.metric_bench, "", 50),
      severity: (primaryIssue?.severity ?? "info") as DemoFeatureItem["severity"],
    },
    {
      title: cleanFs(secondaryIssue?.headline, isJa ? "信頼材料を前面に配置" : "Bring trust proof forward", 64),
      description: cleanFs(secondaryIssue?.body, isJa ? "実績、比較材料、対応範囲を検討中の相手が迷わない位置に配置します。" : "Place proof, scope, and comparison details where buyers expect them.", 140),
      icon: "shield",
      metricLabel: cleanFs(secondaryIssue?.metric_label, "", 30),
      metricValue: cleanFs(secondaryIssue?.metric_value, "-", 20),
      metricBench: cleanFs(secondaryIssue?.metric_bench, "", 50),
      severity: (secondaryIssue?.severity ?? "warning") as DemoFeatureItem["severity"],
    },
    {
      title: cleanFs(thirdIssue?.headline, isJa ? "問い合わせ導線を短縮" : "Shorten the inquiry path", 64),
      description: cleanFs(thirdIssue?.body, isJa ? "フォーム、予約、相談CTAまでの心理的な距離を短くします。" : "Reduce hesitation between interest and a booked conversation.", 140),
      icon: "route",
      metricLabel: cleanFs(thirdIssue?.metric_label, "", 30),
      metricValue: cleanFs(thirdIssue?.metric_value, "-", 20),
      metricBench: cleanFs(thirdIssue?.metric_bench, "", 50),
      severity: (thirdIssue?.severity ?? "info") as DemoFeatureItem["severity"],
    },
  ].filter((f) => f.title && f.description)

  // Stats use real data when available
  const psValue = company.pagespeed_mobile
  const psDisplay = psValue != null ? `${psValue}` : "85+"
  const metaObj = (company.meta ?? {}) as Record<string, unknown>
  const sslObj = metaObj?.ssl as Record<string, unknown> | undefined
  const sslDisplay = sslObj?.grade as string ?? "A+"

  const stats: DemoStatsItem[] = [
    { amount: psDisplay, title: isJa ? "PageSpeed目標" : "PageSpeed Target", icon: "bolt" },
    { amount: sslDisplay, title: "SSL / Trust", icon: "lock" },
    { amount: "3", title: isJa ? "主要CTA" : "Primary CTAs", icon: "target" },
    { amount: "24h", title: isJa ? "初期改善案" : "First action plan", icon: "clock" },
  ]

  // Build real metrics summary for Before/After
  const metricsSummary = buildMetricsSummary(report, company)

  const beforeAfter: DemoBeforeAfterItem[] = report.acts?.slice(0, 3).map((act, i) => {
    const titles = isJa
      ? ["第一印象の改善", "信頼材料の整理", "問い合わせ導線の短縮"]
      : ["Sharper first impression", "Clearer trust proof", "Shorter inquiry path"]
    const beforeDescriptions = isJa
      ? [
          "訪問者が最初の画面で選ぶ理由を理解できず離脱",
          "実績・レビュー・対応範囲がわかりにくい位置にあり不安",
          "問い合わせフォームまでの心理的な障壁が大きい",
        ]
      : [
          "Visitors leave without understanding why to choose you",
          "Proof, reviews, and scope hard to find — creating doubt",
          "Psychological barrier between interest and contact form",
        ]
    return {
      id: `ba-${i}`,
      label: cleanFs(act?.headline, titles[i] ?? "", 90),
      beforeDescription: beforeDescriptions[i] ?? "",
      afterDescription: cleanFs(act?.body, isJa ? "改善後の理想状態" : "Improved state after redesign", 180),
      beforeImageUrl: report.screenshot_url ?? null,
      afterImageUrl: report.screenshot_url ?? null,
      severity: (act?.severity ?? "info") as DemoBeforeAfterItem["severity"],
    }
  }) ?? []

  // Build data-driven FAQ
  const faq = buildFAQ(issueTypes, isJa, name, industryLabel, report)

  const homeCta = {
    title: cleanFs(report.cta_text, isJa ? "無料相談を予約する" : "Book a free consultation", 40),
    subtitle: isJa
      ? "デモサイトの続きや、実際の改善プランについて詳しくご説明します。お気軽にご連絡ください。"
      : "Let's discuss the full demo and your actual improvement plan. Reach out anytime.",
    buttonText: isJa ? "15分無料相談を予約" : "Book 15min Free Consult",
    buttonHref: ctaUrl,
    accentColor,
    accentColorDark,
  }

  const homePage: DemoHomePage = {
    hero: homeHero,
    features,
    stats,
    beforeAfter,
    totalLoss: report.total_loss ?? "",
    cta: homeCta,
    metricsSummary,
    faq,
  }

  /* ───── About page ───── */

  const painDiagnosis = (company.pain_diagnosis ?? {}) as Record<string, unknown>
  const intelligence = report.intelligence ?? { signals: [], painPoints: [], nextActions: [] }

  const aboutStory = buildAboutStory(
    painDiagnosis,
    intelligence,
    name,
    industryLabel,
    isJa,
  )

  const aboutMission = isJa
    ? `${name}は、${industryLabel}のプロフェッショナルとして、お客様に最高のサービスと信頼を提供します。デジタル技術を活用し、より多くの方に私たちの価値を知っていただくことが使命です。`
    : `${name}, as a ${industryLabel} professional, is committed to providing the best service and trust to our clients. Our mission is to leverage digital technology so that more people can discover our value.`

  const aboutValues = isJa
    ? [
        { title: "品質第一", description: "常に最高水準のサービスを提供し、お客様の信頼に応えます。", icon: "star" },
        { title: "革新と挑戦", description: "新しい技術や手法を積極的に取り入れ、業界の先駆者として進化し続けます。", icon: "lightbulb" },
        { title: "お客様との共創", description: "お客様の声に耳を傾け、共に成長するパートナーシップを大切にします。", icon: "users" },
        { title: "地域貢献", description: "地域社会の一員として、持続可能な発展に寄与します。", icon: "globe" },
      ]
    : [
        { title: "Quality First", description: "Always deliver the highest standard of service and earn client trust.", icon: "star" },
        { title: "Innovation", description: "Proactively adopt new technologies and methods, evolving as an industry pioneer.", icon: "lightbulb" },
        { title: "Co-Creation", description: "Listen to client voices and value partnerships that grow together.", icon: "users" },
        { title: "Community", description: "As a member of the local community, contribute to sustainable development.", icon: "globe" },
      ]

  const aboutPage: DemoAboutPage = {
    title: isJa ? `${name}について` : `About ${name}`,
    subtitle: isJa
      ? `${industryLabel}のプロフェッショナルとして、お客様と共に歩んできた軌跡`
      : `Our journey as a ${industryLabel} professional, walking alongside our clients`,
    companyName: name,
    industryLabel,
    locationLabel: locationStr,
    story: aboutStory,
    mission: aboutMission,
    values: aboutValues,
    teamNote: isJa
      ? `${name}のチームは、一人ひとりのお客様に真摯に向き合い、最適なソリューションを提供します。`
      : `The ${name} team is dedicated to each and every client, delivering optimal solutions with sincerity.`,
    accentColor,
  }

  /* ───── Services page ───── */

  const dataDrivenServices = buildDataDrivenServices(issueTypes, isJa, name, report)

  const servicesPage: DemoServicesPage = {
    title: isJa ? "サービス" : "Services",
    subtitle: isJa
      ? `${name}が提供するデジタルソリューション`
      : `Digital solutions provided by ${name}`,
    services: dataDrivenServices,
    process: isJa
      ? [
          { step: 1, title: "ヒアリング", description: "現状の課題と目標をお伺いし、最適なプランをご提案します。" },
          { step: 2, title: "設計・提案", description: "分析結果をもとに、具体的な改善計画とスケジュールを作成します。" },
          { step: 3, title: "実装", description: "最新の技術とデザインで、計画を形にします。進捗は随時共有します。" },
          { step: 4, title: "運用・改善", description: "公開後も効果測定と改善を継続し、長期的な成長をサポートします。" },
        ]
      : [
          { step: 1, title: "Discovery", description: "We listen to your current challenges and goals, then propose the optimal plan." },
          { step: 2, title: "Design & Proposal", description: "Based on analysis, we create a concrete improvement plan and schedule." },
          { step: 3, title: "Implementation", description: "We bring the plan to life with cutting-edge technology and design, sharing progress regularly." },
          { step: 4, title: "Operation & Improvement", description: "After launch, we continue measuring and improving for long-term growth." },
        ],
    accentColor,
  }

  /* ───── Contact page ───── */

  const contactPage: DemoContactPage = {
    title: isJa ? "お問い合わせ" : "Contact Us",
    subtitle: isJa
      ? "まずはお気軽にご相談ください。15分の無料オンライン相談を承っております。"
      : "Feel free to reach out. We offer a free 15-minute online consultation.",
    companyName: name,
    email: "contact@paradigmjp.com",
    phone: undefined,
    address: isJa ? "東京都（オンライン対応 / 全国対応）" : "Tokyo, Japan (Online / Nationwide)",
    calBookingUrl: calEmbedUrl,
    calDirectUrl: calBookingUrl,
    formNote: isJa
      ? "下記フォームからお気軽にお問い合わせください。または、カレンダーから直接オンライン相談を予約いただけます。"
      : "Feel free to reach out using the form below, or book a consultation directly via the calendar.",
    accentColor,
  }

  /* ───── Meta ───── */

  const ogImage = `https://pub-ac30eb86a32747f1a27e304aa9c6f95a.r2.dev/ogp/${company.id}.png`

  const meta = {
    title: `${name} | ${isJa ? "Web改善デモサイト" : "Web Improvement Demo"}`,
    description: cleanFs(report.hook, isJa ? `${name}のWeb改善デモ` : `${name} web improvement demo`, 150),
    ogImage,
    industry: industry as Industry,
    locale,
    companyName: name,
    accentColor,
    accentColorDark,
    calBookingUrl: ctaUrl,
    generatedAt: new Date().toISOString(),
    engine: "full-stack-nextjs-multi-page",
  }

  return {
    slug,
    companyId: company.id,
    companyName: name,
    locale,
    industry: industry as Industry,
    meta,
    pages: {
      home: homePage,
      about: aboutPage,
      services: servicesPage,
      contact: contactPage,
    },
  }
}
