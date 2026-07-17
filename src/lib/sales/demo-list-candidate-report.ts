import { fallbackDiagnosticReport } from "./diagnostic/safe-report"
import type { DiagnosticReportData } from "./diagnostic/types"
import type { Industry, ReportLocale, Severity } from "./types"

export function buildListCandidateDiagnostic(input: {
  companyName: string
  slug: string
  industry: Industry | null
  prefecture: string | null
  locale: ReportLocale
  category: string
  description: string
}): DiagnosticReportData {
  const isJa = input.locale === "ja"
  const location = input.prefecture?.trim() || (isJa ? "地域情報は掲載内容をご確認ください" : "Review the listed location")
  const category = input.category.trim() || (isJa ? "事業・サービス" : "Business and services")
  const name = input.companyName.trim()
  const sentence = input.description.trim()
    ? input.description.trim().replace(/[。．.!！?？]+$/u, "") + (isJa ? "。" : ".")
    : (isJa ? `${name}の掲載内容をもとに構成しています。` : `The structure is based on the information listed for ${name}.`)
  const severity: Severity = "info"
  const base = fallbackDiagnosticReport(input.slug, input.locale)
  return {
    ...base,
    company_name: name,
    report_locale: input.locale,
    target_country: "JP",
    industry: input.industry,
    prefecture: input.prefecture,
    expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    hook: isJa ? `${name}の魅力が伝わるWebサイト構成案` : `A website structure that gives ${name} a clear point of view`,
    total_loss: "",
    acts: [
      {
        type: "pain",
        icon: "STORY",
        headline: isJa ? "最初の画面で事業内容を伝える" : "Make the business clear at first glance",
        body: isJa ? `${sentence}${name}の特徴、提供内容、場所を一つの流れで整理し、初めて知る方にも理解しやすい導線にします。` : `${sentence} The offer, place, and context are arranged as one clear journey for a first-time visitor.`,
        metric_label: isJa ? "掲載情報" : "Listed information",
        metric_value: category,
        metric_unit: "",
        metric_bench: isJa ? "確認済みの掲載内容を使用" : "Uses reviewed listing information",
        severity,
      },
      {
        type: "fear",
        icon: "TRUST",
        headline: isJa ? "選ぶ前に知りたい情報を整理する" : "Organize what visitors need before choosing",
        body: isJa ? `${location}の案内と${category}の説明を、読み手が迷わない順番で見せます。未確認の実績、数値、営業時間は掲載しません。` : `Location context (${location}) and the ${category} offer are sequenced for clarity. Unverified results, metrics, and hours are not added.`,
        metric_label: isJa ? "情報方針" : "Content policy",
        metric_value: isJa ? "事実ベース" : "Fact-based",
        metric_unit: "",
        metric_bench: isJa ? "未確認情報は追加しない" : "No unverified additions",
        severity,
      },
      {
        type: "hope",
        icon: "PATH",
        headline: isJa ? "次の一歩まで自然につなげる" : "Create a calm path to the next step",
        body: isJa ? "サービス紹介、アクセス、よくある質問、お問い合わせまでを一つの体験として設計し、正式公開時に確認済みの連絡方法へ差し替えられる構成です。" : "Services, location, FAQs, and contact are designed as one experience, with the final contact method added only after business confirmation.",
        metric_label: isJa ? "導線" : "Journey",
        metric_value: isJa ? "6ページ構成" : "Six-page structure",
        metric_unit: "",
        metric_bench: isJa ? "ホームから問い合わせまで" : "Home to contact",
        severity,
      },
    ],
    cta_text: isJa ? "掲載内容を確認し、正式公開に向けて仕上げます。" : "Review the listed content and finalize the site for launch.",
    demo_url: null,
    screenshot_url: null,
    screenshot_mobile_url: null,
    evidence_screenshot_url: null,
    evidence_screenshot_kind: null,
    visual_annotations: [],
    improvement_preview: undefined,
    visitor_journey: [],
    source_coverage: {
      score: 0,
      collected: 1,
      configured: 0,
      missing: 0,
      items: [],
    },
    intelligence: {
      signals: [],
      painPoints: [],
      nextActions: [
        isJa ? "掲載情報と正式な連絡方法を事業者確認する" : "Confirm listed information and the official contact method",
        isJa ? "正式公開用の写真・ロゴを確認する" : "Confirm approved photos and logo assets for launch",
      ],
    },
    meta: {
      list_candidate: true,
      content_basis: "operator-reviewed portal snapshot",
      metrics_policy: "no_unverified_metrics",
    },
    content_template: {
      title: isJa ? "ローカル事業者サイト構成案" : "Local business website structure",
      purpose: isJa ? "掲載情報をもとに、事業内容と利用者導線を整理する" : "Organize the listed offer and visitor journey",
      quality_bar: isJa ? "掲載スナップショットの事実のみを使用し、数値・実績・営業時間を捏造しない" : "Use only reviewed listing facts; do not invent metrics, results, or hours",
      dify_selection_rule: `list_candidate_generated_visual:${input.industry ?? "other"}`,
      prompt_template: "",
      offer_code: "jp_web_production",
      appeal_angle: "speed_conversion",
    },
    report_url: "",
    video_url: null,
    localized_report_urls: [],
  }
}

