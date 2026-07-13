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
  DemoPremiumExperience,
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
  const basePath = `/${slug}`
  const name = cleanFs(company.company_name, "Your Company", 80)
  const locationStr = cleanFs(company.prefecture, isJa ? "全国対応" : "Nationwide", 30)
  const industryLabel = isJa ? (cfg.labelJa ?? "コンサルティング") : (cfg.labelEn ?? "Consulting")
  const metaObj = (company.meta ?? {}) as Record<string, unknown>
  const publicFacts = (metaObj.public_facts ?? {}) as Record<string, unknown>
  const verifiedFacts = Object.values(publicFacts).filter((value): value is string | number | boolean => ["string", "number", "boolean"].includes(typeof value)).map(String)
  const displayFacts = verifiedFacts.filter((value) => !/^https?:\/\//u.test(value))
  const address = cleanFs(typeof publicFacts.address === "string" ? publicFacts.address : company.prefecture, locationStr, 160)
  const ctaUrl = `${basePath}/contact`
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
    tagline: industryLabel,
    companyName: name,
    industryLabel,
    locationLabel: locationStr,
    primaryCta: {
      text: isJa ? "サービスを見る" : "View services",
      href: `${basePath}/services`,
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

  // Stats only use observed data. Targets and modeled outcomes are not facts.
  const psValue = company.pagespeed_mobile
  const sslObj = metaObj?.ssl as Record<string, unknown> | undefined
  const sslDisplay = typeof sslObj?.grade === "string" ? sslObj.grade : null

  const stats: DemoStatsItem[] = [
    ...(psValue != null ? [{ amount: `${psValue}`, title: isJa ? "観測PageSpeed" : "Observed PageSpeed", icon: "bolt" }] : []),
    ...(sslDisplay ? [{ amount: sslDisplay, title: isJa ? "観測SSL評価" : "Observed SSL grade", icon: "lock" }] : []),
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
      beforeImageUrl: null,
      afterImageUrl: null,
      severity: (act?.severity ?? "info") as DemoBeforeAfterItem["severity"],
    }
  }) ?? []

  // Build data-driven FAQ
  const faq = buildFAQ(issueTypes, isJa, name, industryLabel, report)

  const homeCta = {
    title: isJa ? "お問い合わせ" : "Contact us",
    subtitle: isJa
      ? "商品やサービス、営業案内について、フォームからお気軽にお問い合わせください。"
      : "Contact us about our products, services, or operating information.",
    buttonText: isJa ? "お問い合わせフォームへ" : "Open contact form",
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
      ? `${name}の事業と、大切にしている考え方をご紹介します。`
      : `An introduction to ${name}, its services, and what it values.`,
    companyName: name,
    industryLabel,
    locationLabel: locationStr,
    story: aboutStory,
    mission: aboutMission,
    values: aboutValues,
    teamNote: isJa
      ? `${name}の商品・サービスと、ご利用に必要な情報を分かりやすくお届けします。`
      : `${name} presents its products, services, and visitor information clearly.`,
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
    ctaTitle: isJa ? "お問い合わせ" : "Contact us",
    ctaSubtitle: isJa ? "商品やサービスについてお気軽にお問い合わせください。" : "Contact us about our products and services.",
    ctaText: isJa ? "お問い合わせフォームへ" : "Open contact form",
    ctaHref: ctaUrl,
    accentColor,
  }

  /* ───── Contact page ───── */

  const contactPage: DemoContactPage = {
    title: isJa ? "お問い合わせ" : "Contact Us",
    subtitle: isJa
      ? "商品やサービス、営業案内についてお気軽にお問い合わせください。"
      : "Contact us about products, services, or operating information.",
    companyName: name,
    email: "",
    phone: undefined,
    address,
    calBookingUrl: "",
    calDirectUrl: "",
    formNote: isJa
      ? "営業時間などの最新情報は公式SNSをご確認ください。お問い合わせは下記フォームから承ります。"
      : "Check the official social profile for current hours, or contact us using the form below.",
    formEnabled: false,
    mapUrl: typeof publicFacts.address === "string" ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : undefined,
    accentColor,
  }

  /* ───── Meta ───── */

  const sourceEvidence = detectPublicSourceEvidence({ meta: company.meta, visualEvidence: company.visual_evidence })

  const meta = {
    title: `${name} | ${industryLabel}`,
    description: cleanFs(displayFacts.join("、"), `${name} | ${industryLabel}`, 150),
    ogImage: "",
    industry: industry as Industry,
    locale,
    companyName: name,
    accentColor,
    accentColorDark,
    calBookingUrl: "",
    generatedAt: new Date().toISOString(),
    engine: "full-stack-nextjs-multi-page",
    sourceEvidence,
    verifiedFacts,
    primaryCtaLabel: isJa ? "お問い合わせ" : "Contact",
    primaryCtaHref: ctaUrl,
    footerDescription: cleanFs(displayFacts.join("。"), industryLabel, 180),
    footerOwner: name,
  }
  const premium = buildPremiumExperience(company.meta, homePage, aboutPage.story, industry)

  return {
    slug,
    companyId: company.id,
    companyName: name,
    locale,
    industry: industry as Industry,
    meta,
    ...(premium ? { premium } : {}),
    pages: {
      home: homePage,
      about: aboutPage,
      services: servicesPage,
      contact: contactPage,
      works: {
        title: isJa ? "実績・事例" : "Work & Cases",
        subtitle: isJa ? "実際の写真と実績情報を確認後に公開するページです。" : "This page will be completed after verified project details and image rights are confirmed.",
        eyebrow: isJa ? "掲載構成案" : "Proposed structure",
        sections: [
          { id: "case-1", heading: isJa ? "代表事例 01" : "Featured work 01", body: isJa ? "事例名、対応内容、期間、成果はヒアリング後に確定します。" : "Name, scope, dates, and outcomes will be confirmed in discovery.", note: isJa ? "未確認情報は公開しません" : "Unverified claims will not be published" },
          { id: "case-2", heading: isJa ? "代表事例 02" : "Featured work 02", body: isJa ? "使用許諾を確認した写真と、お客様が承認した説明のみ掲載します。" : "Only rights-cleared images and customer-approved descriptions will be used." },
        ],
        accentColor,
      },
      news: {
        title: isJa ? "お知らせ" : "News",
        subtitle: isJa ? "営業日、サービス、イベントなどの最新情報を届けます。" : "A home for operating hours, service updates, and events.",
        eyebrow: isJa ? "更新しやすい設計" : "Easy to update",
        sections: [
          { id: "news-policy", heading: isJa ? "公開情報を一元管理" : "One source for current information", body: isJa ? "初回納品時は、承認済みのお知らせのみ掲載します。" : "The first release includes only approved announcements." },
          { id: "news-empty", heading: isJa ? "現在、公開済みのお知らせはありません" : "No approved news yet", body: isJa ? "管理画面から追加できる構成です。" : "New posts can be added through the administration workflow." },
        ],
        accentColor,
      },
      faq: {
        title: isJa ? "よくあるご質問" : "Frequently Asked Questions",
        subtitle: isJa ? "問い合わせ前の疑問を短く、分かりやすく解消します。" : "Clear answers before a visitor needs to contact you.",
        eyebrow: "FAQ",
        sections: (faq ?? []).map((item) => ({ id: item.id, heading: item.question, body: item.answer })),
        accentColor,
      },
      recruit: {
        title: isJa ? "採用情報" : "Careers",
        subtitle: isJa ? "会社の考え方と募集情報を伝えるページです。" : "A page for culture and verified openings.",
        eyebrow: isJa ? "採用" : "Careers",
        sections: [
          { id: "culture", heading: isJa ? "働く環境・価値観" : "Culture and values", body: isJa ? "取材内容と社内確認を経て掲載文を確定します。" : "Copy will be finalized after interviews and internal approval." },
          { id: "openings", heading: isJa ? "募集状況" : "Open roles", body: isJa ? "現在の募集状況は要確認です。未確認の求人は掲載しません。" : "Current openings are to be confirmed; unverified roles will not be listed." },
        ],
        accentColor,
      },
      privacy: {
        title: isJa ? "プライバシーポリシー" : "Privacy Policy",
        subtitle: isJa ? "個人情報の取扱方針を示す納品前レビュー用の文面です。" : "A pre-delivery draft for reviewing personal-data handling.",
        eyebrow: isJa ? "法務確認が必要です" : "Legal review required",
        sections: [
          { id: "purpose", heading: isJa ? "利用目的" : "Purpose", body: isJa ? "お問い合わせへの回答と必要なご連絡のために入力情報を利用する想定です。" : "Submitted information is intended to be used to respond to inquiries and necessary follow-up." },
          { id: "retention", heading: isJa ? "保管・第三者提供" : "Retention and sharing", body: isJa ? "実際の運用、委託先、保管期間を確認後に確定します。" : "Final wording depends on actual operations, processors, and retention periods." },
        ],
        accentColor,
      },
      terms: {
        title: isJa ? "サイト利用条件" : "Website Terms",
        subtitle: isJa ? "サイト利用上の基本条件を示す確認用ページです。" : "A review page for the website's basic terms of use.",
        eyebrow: isJa ? "法務確認が必要です" : "Legal review required",
        sections: [
          { id: "content", heading: isJa ? "掲載内容" : "Website content", body: isJa ? "掲載情報は公開前に事業者確認を行い、予告なく変更される場合があります。" : "Content is reviewed by the business before publication and may change without notice." },
          { id: "liability", heading: isJa ? "免責事項" : "Disclaimer", body: isJa ? "事業内容に合わせた責任範囲を専門家確認後に確定します。" : "The final scope of liability requires professional review for the specific business." },
        ],
        accentColor,
      },
      commerce: {
        title: isJa ? "特定商取引法に基づく表記" : "Commerce Disclosure",
        subtitle: isJa ? "オンライン販売や有料申込みを行う場合に必要となる確認用ページです。" : "A review page for disclosures required when accepting online payments or paid orders.",
        eyebrow: isJa ? "事業者・法務確認が必要です" : "Business and legal review required",
        sections: [
          { id: "operator", heading: isJa ? "販売事業者・責任者" : "Seller and responsible party", body: isJa ? "正式な事業者名、代表者名、所在地、連絡先を確認後に掲載します。" : "The legal entity, representative, address, and contact details will be published after verification." },
          { id: "price", heading: isJa ? "価格・追加費用" : "Price and additional fees", body: isJa ? "販売価格、送料、決済手数料など実際の取引条件に合わせて確定します。" : "Prices, shipping, payment fees, and other transaction terms will be finalized for the actual offer." },
          { id: "delivery", heading: isJa ? "提供時期・返品" : "Delivery and returns", body: isJa ? "商品の性質、提供時期、キャンセル・返品条件を専門家確認後に掲載します。" : "Delivery timing and cancellation or return terms require review for the actual product or service." },
        ],
        accentColor,
      },
    },
  }
}

function buildPremiumExperience(
  meta: Record<string, unknown> | null | undefined,
  home: DemoHomePage,
  aboutStory: string,
  industry: string,
): DemoPremiumExperience | null {
  const rawMedia = Array.isArray(meta?.demo_media) ? meta.demo_media : []
  const media = rawMedia.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return []
    const item = value as Record<string, unknown>
    const usage = typeof item.usage === "string" ? item.usage : "unknown"
    const src = typeof item.src === "string" ? item.src.trim() : ""
    const alt = typeof item.alt === "string" ? item.alt.trim() : ""
    if (!src || !alt || !["owned", "licensed", "proposal_only"].includes(usage)) return []
    return [{
      src,
      alt,
      kind: item.kind === "video" ? "video" as const : "image" as const,
      caption: typeof item.caption === "string" && !/paradigm/i.test(item.caption) ? item.caption : "提案用イメージ",
      objectPosition: typeof item.objectPosition === "string" ? item.objectPosition : undefined,
    }]
  })
  if (media.length < 3) return null

  const style: DemoPremiumExperience["style"] = industry === "restaurant"
    ? "editorial-cafe"
    : industry === "construction"
      ? "craft"
      : ["dental", "beauty_salon"].includes(industry)
        ? "wellness"
        : industry === "retail"
          ? "retail"
          : "professional"
  const instagram = typeof meta?.official_instagram_url === "string" ? meta.official_instagram_url : null
  const facebook = typeof meta?.official_facebook_url === "string" ? meta.official_facebook_url : null

  return {
    style,
    heroMedia: media.slice(0, 5),
    gallery: media.slice(0, 8),
    intro: {
      eyebrow: home.featureEyebrow ?? "OUR STORY",
      title: home.featureHeading ?? home.hero.title,
      body: aboutStory,
      note: instagram ? "営業案内などの最新情報は公式Instagramをご確認ください。" : "商品・サービスの詳細はお問い合わせください。",
    },
    social: [
      ...(instagram ? [{ label: "Instagram", href: instagram, network: "instagram" as const }] : []),
      ...(facebook ? [{ label: "Facebook", href: facebook, network: "facebook" as const }] : []),
    ],
  }
}

function detectPublicSourceEvidence(input: unknown): string[] {
  const values: string[] = []
  const visit = (value: unknown, depth: number) => {
    if (depth > 6 || value == null) return
    if (typeof value === "string") {
      values.push(value.toLowerCase())
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1))
      return
    }
    if (typeof value === "object") {
      Object.values(value as Record<string, unknown>).forEach((item) => visit(item, depth + 1))
    }
  }
  visit(input, 0)
  const joined = values.join("\n")
  return [
    /https?:\/\/(?:www\.)?(?:google\.[^/]+\/maps|maps\.google\.[^/]+|maps\.app\.goo\.gl)/u.test(joined) ? "google_maps" : null,
    /https?:\/\/(?:www\.)?instagram\.com\//u.test(joined) ? "instagram" : null,
    /https?:\/\/(?:www\.)?facebook\.com\//u.test(joined) ? "facebook" : null,
    /https?:\/\/(?:www\.)?tiktok\.com\//u.test(joined) ? "tiktok" : null,
    /https?:\/\/(?:www\.)?youtube\.com\//u.test(joined) ? "youtube" : null,
  ].filter((value): value is string => Boolean(value))
}
