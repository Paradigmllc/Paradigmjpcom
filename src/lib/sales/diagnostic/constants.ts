import type { Industry } from "../types"

export const INDUSTRY_HOOK_JA: Record<Industry, string> = {
  beauty_salon: "検索から予約までの間に小さな迷いが残ると、来店意欲の高い顧客ほど競合へ流れます。まずは予約導線と信頼材料の回収余地を見ます。",
  dental: "地域検索では比較時間が短く、信頼材料と予約導線の弱さが新患獲得に直結します。最初に不安を減らす設計が必要です。",
  restaurant: "来店前の判断はスマホ上で完結します。表示速度、口コミ、写真、予約導線の見え方が売上機会を左右します。",
  construction: "施工事例と問い合わせ導線が弱いと、比較検討中の施主は競合サイトへ移ります。信頼と相談の入口を短くする必要があります。",
  accounting: "専門性が高くても、初回相談前の不安を減らす材料が不足すると問い合わせに変わりません。信頼材料の配置が重要です。",
  retail: "商品の魅力が検索、SNS、スマホ画面で十分に伝わらないと、購入前の離脱が増えます。購買導線の摩擦を見ます。",
  cleaning: "急ぎの見込み客ほど、見積もりまでが簡単な事業者を選びます。問い合わせ導線の短さが受注率に影響します。",
  consulting: "専門性の証拠と初回相談への導線が整理されていないと、比較検討中の企業に選ばれにくくなります。",
}

export const INDUSTRY_HOOK_EN: Record<Industry, string> = {
  beauty_salon: "Small gaps between search, trust proof, and booking can quietly leak high-intent salon customers.",
  dental: "Local dental prospects compare quickly, so weak trust proof or booking paths directly affect new patient acquisition.",
  restaurant: "Restaurant decisions happen on mobile before the visit. Speed, reviews, photos, and booking clarity shape conversion.",
  construction: "If project proof and inquiry paths are unclear, homeowners can move to a competitor during comparison.",
  accounting: "Even strong expertise may not convert if the site does not reduce uncertainty before the first consultation.",
  retail: "When product appeal is not clear across search, social, and mobile, buyers leave before purchase intent matures.",
  cleaning: "Urgent prospects often choose the easiest quote path, so even a slightly long inquiry flow can lose demand.",
  consulting: "Clear proof of expertise and a low-friction first consultation path are essential to be shortlisted.",
}

export const ISSUE_ICON: Partial<Record<string, string>> = {
  speed_critical: "SPEED",
  ssl_expired: "TRUST",
  wp_outdated: "OPS",
  no_ogp: "SNS",
  no_sns: "REACH",
  copyright_old: "FRESH",
  ua_残存: "DATA",
}

export const ISSUE_LABEL_JA: Partial<Record<string, string>> = {
  speed_critical: "スマホ表示速度",
  ssl_expired: "信頼表示",
  wp_outdated: "運用基盤",
  no_ogp: "SNS共有表示",
  no_sns: "外部接点",
  copyright_old: "更新鮮度",
  ua_残存: "アナリティクス移行",
}

export const ISSUE_LABEL_EN: Partial<Record<string, string>> = {
  speed_critical: "mobile speed",
  ssl_expired: "trust display",
  wp_outdated: "operating foundation",
  no_ogp: "social preview",
  no_sns: "external reach",
  copyright_old: "content freshness",
  ua_残存: "analytics migration",
}

export const ISSUE_METRIC: Partial<
  Record<string, { labelJa: string; labelEn: string; unitJa: string; unitEn: string; benchJa: string; benchEn: string; fallbackValue: string | number }>
> = {
  speed_critical: {
    labelJa: "スマホ表示スコア",
    labelEn: "Mobile speed score",
    unitJa: "点",
    unitEn: "pts",
    benchJa: "目安: 75点以上",
    benchEn: "Target: 75+",
    fallbackValue: 38,
  },
  ssl_expired: {
    labelJa: "信頼表示リスク",
    labelEn: "Trust signal risk",
    unitJa: "",
    unitEn: "",
    benchJa: "証明書とHTTPSが正常",
    benchEn: "HTTPS and certificate healthy",
    fallbackValue: "要確認",
  },
  wp_outdated: {
    labelJa: "運用基盤リスク",
    labelEn: "Operating foundation risk",
    unitJa: "",
    unitEn: "",
    benchJa: "古い仕組みや脆弱性を放置しない",
    benchEn: "No stale or vulnerable stack",
    fallbackValue: "要確認",
  },
  no_ogp: {
    labelJa: "SNS共有の見え方",
    labelEn: "Social share preview",
    unitJa: "",
    unitEn: "",
    benchJa: "タイトル、説明文、画像が整っている",
    benchEn: "Title, description, and image are ready",
    fallbackValue: "未整備",
  },
  no_sns: {
    labelJa: "外部接点",
    labelEn: "External touchpoints",
    unitJa: "",
    unitEn: "",
    benchJa: "主要な外部導線が明確",
    benchEn: "Primary external channels are clear",
    fallbackValue: "弱い",
  },
  copyright_old: {
    labelJa: "更新鮮度",
    labelEn: "Content freshness",
    unitJa: "",
    unitEn: "",
    benchJa: "直近の運用感が伝わる",
    benchEn: "Recent activity is visible",
    fallbackValue: "要確認",
  },
  ua_残存: {
    labelJa: "アナリティクス移行状況",
    labelEn: "Analytics migration",
    unitJa: "",
    unitEn: "",
    benchJa: "GA4移行済み・旧UAタグ撤去済み",
    benchEn: "GA4 migrated, old UA tag removed",
    fallbackValue: "未移行",
  },
}

export const UNKNOWN_ISSUE_METRIC = {
  labelJa: "取得データ品質",
  labelEn: "Evidence quality",
  unitJa: "",
  unitEn: "",
  benchJa: "主要な判断材料が確認済み",
  benchEn: "Core decision evidence confirmed",
  fallbackValue: "要確認",
} as const

export const DEFAULT_CTA_JA = "診断結果をもとに、売上機会、信頼低下、問い合わせ導線、運用負荷のどこから直すべきかを30分で整理します。"
export const DEFAULT_CTA_EN = "Use the assessment evidence to decide the first business fix, required scope, and fastest implementation path."
