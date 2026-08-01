import type { DiagnosticReportData } from "./diagnostic"
import type { DemoBeforeAfterItem, DemoFeatureItem, DemoPageData, DemoStatsItem } from "./demo-site-types"
import type { Industry, ReportLocale } from "./types"
import { JAPAN_ENTRY_CTA_EN, JAPAN_ENTRY_CTA_JA } from "@/lib/japan-entry-public-copy"

const CORRUPT_FS = /[�邵郢鬮隴陞陷驍縺繝譁蜑荳譛谿險螟豕邨髻蠕蝠逕莠陦蛻諡蜷繧]/

function cleanFs(s: string | null | undefined, fallback: string, max = 200): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim()
  if (!t || CORRUPT_FS.test(t)) return fallback
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

function buildSlug(company: { domain: string; slug?: string | null; id: string }): string {
  const raw = (company.domain || company.slug || company.id)
    .replace(/^https?:\/\//, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 50)
  return `${raw}-demo`
}

/**
 * Build structured DemoPageData from diagnostic report and company data.
 * This is the core data generation function that feeds the Next.js demo page.
 */
export function buildDemoPageData(
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
  },
  report: DiagnosticReportData,
): DemoPageData {
  const locale = (company.report_locale ?? report.report_locale ?? "ja") as ReportLocale
  const isJa = locale === "ja"
  const industry = (company.industry ?? report.industry ?? "consulting") as Industry
  const cfg = industryConfig(industry)
  const slug = buildSlug(company)
  const name = cleanFs(company.company_name, "Your Company", 80)
  const locationStr = cleanFs(company.prefecture, isJa ? "全国対応" : "Nationwide", 30)
  const industryLabel = isJa ? (cfg.labelJa ?? "コンサルティング") : (cfg.labelEn ?? "Consulting")
  const ctaUrl = "https://cal.com/paradigm-jp/15min"
  const accentColor = cfg.accentColor ?? "#7c3aed"

  const primaryIssue = report.acts?.[0]
  const secondaryIssue = report.acts?.[1]
  const thirdIssue = report.acts?.[2]

  const heroTitle = cleanFs(
    report.hook,
    isJa
      ? `${name}の強みが最初の5秒で伝わるWeb改善デモ`
      : `A web demo that makes ${name}'s value clear in the first five seconds`,
    110,
  )

  const hero: DemoPageData["hero"] = {
    title: heroTitle,
    subtitle: isJa
      ? "御社の公開データを分析し、集客力を最大化する構成で再設計しました。下記は改善後のイメージです。"
      : "Redesigned based on your public data to maximize customer acquisition. This is the improved version.",
    tagline: isJa ? `${industryLabel}向け改善デモ` : `${industryLabel} improvement demo`,
    companyName: name,
    industryLabel,
    locationLabel: locationStr,
    primaryCta: {
      text: isJa ? JAPAN_ENTRY_CTA_JA : JAPAN_ENTRY_CTA_EN,
      href: ctaUrl,
    },
    secondaryCta: {
      text: isJa ? "改善ポイントを見る" : "View Improvements",
      href: "#features",
    },
    accentColor: cfg.accentColor ?? "#7c3aed",
    accentColorDark: cfg.accentColorDark ?? "#5b21b6",
  }

  const features: DemoFeatureItem[] = [
    {
      title: cleanFs(primaryIssue?.headline, isJa ? "第一印象を整理" : "Clarify the first impression", 64),
      description: cleanFs(primaryIssue?.body, isJa ? "訪問直後に何を提供し、なぜ選ぶべきかが伝わる構成にします。" : "Make the offer and reason to choose you obvious immediately.", 140),
      icon: "tabler:sparkles",
      metricLabel: cleanFs(primaryIssue?.metric_label, "", 30),
      metricValue: cleanFs(primaryIssue?.metric_value, "-", 20),
      metricBench: cleanFs(primaryIssue?.metric_bench, "", 50),
      severity: (primaryIssue?.severity ?? "info") as DemoFeatureItem["severity"],
    },
    {
      title: cleanFs(secondaryIssue?.headline, isJa ? "信頼材料を前面に配置" : "Bring trust proof forward", 64),
      description: cleanFs(secondaryIssue?.body, isJa ? "実績、比較材料、対応範囲を検討中の相手が迷わない位置に配置します。" : "Place proof, scope, and comparison details where buyers expect them.", 140),
      icon: "tabler:shield-check",
      metricLabel: cleanFs(secondaryIssue?.metric_label, "", 30),
      metricValue: cleanFs(secondaryIssue?.metric_value, "-", 20),
      metricBench: cleanFs(secondaryIssue?.metric_bench, "", 50),
      severity: (secondaryIssue?.severity ?? "warning") as DemoFeatureItem["severity"],
    },
    {
      title: cleanFs(thirdIssue?.headline, isJa ? "問い合わせ導線を短縮" : "Shorten the inquiry path", 64),
      description: cleanFs(thirdIssue?.body, isJa ? "フォーム、予約、相談CTAまでの心理的な距離を短くします。" : "Reduce hesitation between interest and a booked conversation.", 140),
      icon: "tabler:route",
      metricLabel: cleanFs(thirdIssue?.metric_label, "", 30),
      metricValue: cleanFs(thirdIssue?.metric_value, "-", 20),
      metricBench: cleanFs(thirdIssue?.metric_bench, "", 50),
      severity: (thirdIssue?.severity ?? "info") as DemoFeatureItem["severity"],
    },
  ].filter((f) => f.title && f.description)

  const stats: DemoStatsItem[] = [
    { amount: "85+", title: "PageSpeed", icon: "tabler:bolt" },
    { amount: "A+", title: "SSL / Trust", icon: "tabler:lock" },
    { amount: "3", title: isJa ? "主要CTA" : "Primary CTAs", icon: "tabler:target-arrow" },
    { amount: "24h", title: isJa ? "初期改善案" : "First action plan", icon: "tabler:clock" },
  ]

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

  const cta: DemoPageData["cta"] = {
    title: isJa ? JAPAN_ENTRY_CTA_JA : JAPAN_ENTRY_CTA_EN,
    subtitle: isJa
      ? "デモサイトの続きや、実際の改善プランについて詳しくご説明します。お気軽にご連絡ください。"
      : "Let's discuss the full demo and your actual improvement plan. Reach out anytime.",
    buttonText: isJa ? JAPAN_ENTRY_CTA_JA : JAPAN_ENTRY_CTA_EN,
    buttonHref: ctaUrl,
    accentColor: cfg.accentColor ?? "#7c3aed",
    accentColorDark: cfg.accentColorDark ?? "#5b21b6",
  }

  const navigation = isJa
    ? [
        { label: "特徴", href: "#features" },
        { label: "改善比較", href: "#before-after" },
        { label: "お問い合わせ", href: "#contact" },
      ]
    : [
        { label: "Features", href: "#features" },
        { label: "Comparison", href: "#before-after" },
        { label: "Contact", href: "#contact" },
      ]

  const ogImage = `https://pub-ac30eb86a32747f1a27e304aa9c6f95a.r2.dev/ogp/${company.id}.png`

  const meta: DemoPageData["meta"] = {
    title: `${name} | ${isJa ? "Web改善デモサイト" : "Web Improvement Demo"}`,
    description: cleanFs(report.hook, isJa ? `${name}のWeb改善デモ` : `${name} web improvement demo`, 150),
    ogImage,
    industry: industry as Industry,
    locale,
    companyName: name,
    accentColor: cfg.accentColor ?? "#7c3aed",
    accentColorDark: cfg.accentColorDark ?? "#5b21b6",
    calBookingUrl: ctaUrl,
    generatedAt: new Date().toISOString(),
    engine: "full-stack-nextjs",
  }

  return {
    slug,
    companyId: company.id,
    companyName: name,
    locale,
    industry: industry as Industry,
    industryLabel,
    locationLabel: locationStr,
    hero,
    navigation,
    features,
    stats,
    beforeAfter,
    cta,
    totalLoss: report.total_loss ?? "",
    meta,
    blocks: [],
  }
}

function industryConfig(industry: string | null | undefined): {
  theme?: string
  labelJa?: string
  labelEn?: string
  accentColor?: string
  accentColorDark?: string
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
