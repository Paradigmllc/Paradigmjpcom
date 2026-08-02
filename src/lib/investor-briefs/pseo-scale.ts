import { MARKETING_LOCALES } from "@/i18n/locales"

export const NATIONAL_INVESTMENT_THEME_COUNT = 12

export const JAPAN_PREFECTURES = [
  "hokkaido",
  "aomori",
  "iwate",
  "miyagi",
  "akita",
  "yamagata",
  "fukushima",
  "ibaraki",
  "tochigi",
  "gunma",
  "saitama",
  "chiba",
  "tokyo",
  "kanagawa",
  "niigata",
  "toyama",
  "ishikawa",
  "fukui",
  "yamanashi",
  "nagano",
  "gifu",
  "shizuoka",
  "aichi",
  "mie",
  "shiga",
  "kyoto",
  "osaka",
  "hyogo",
  "nara",
  "wakayama",
  "tottori",
  "shimane",
  "okayama",
  "hiroshima",
  "yamaguchi",
  "tokushima",
  "kagawa",
  "ehime",
  "kochi",
  "fukuoka",
  "saga",
  "nagasaki",
  "kumamoto",
  "oita",
  "miyazaki",
  "kagoshima",
  "okinawa",
] as const

export const INVESTOR_PROFILES = [
  "cross-border-individual",
  "family-office",
  "institutional-investor",
  "private-equity",
  "corporate-strategic",
] as const

export const GREATER_TOKYO_SUBMARKETS = [
  "greater-tokyo-allocation",
  "tokyo-central-three",
  "tokyo-west-core",
  "tokyo-north-core",
  "tokyo-south",
  "tokyo-west-residential",
  "tokyo-east-core",
  "tokyo-north",
  "tokyo-east-outer",
  "tokyo-tama",
  "yokohama",
  "kawasaki",
  "saitama-city",
  "south-saitama",
  "chiba-bay",
  "outer-chiba",
] as const

export const METRO_PROPERTY_STRATEGIES = [
  "multifamily-income",
  "family-rental",
  "prime-residential",
  "mixed-use",
  "hospitality-linked",
  "logistics-employment-linked",
] as const

export const INVESTOR_PSEO_QUALITY_GATES = {
  minimumPrimarySources: 2,
  minimumKeyFacts: 3,
  minimumRisks: 3,
  minimumDecisionGates: 3,
  minimumChecklistItems: 5,
  requiresDistinctIntent: true,
  requiresInteractiveTool: true,
  requiresCanonical: true,
  requiresHumanTranslationReview: true,
} as const

export interface InvestorPseoScale {
  inputs: {
    themes: number
    prefectures: number
    investorProfiles: number
    locales: number
    greaterTokyoSubmarkets: number
    metroPropertyStrategies: number
  }
  candidates: {
    themeMarketProfileLocale: number
    marketComparisonsByThemeAndLocale: number
    greaterTokyoStrategyProfileLocale: number
    total: number
  }
  policy: {
    candidateDoesNotMeanPublished: true
    indexableOnlyAfterQualityGate: true
  }
}

export function calculateInvestorPseoScale(themeCount: number): InvestorPseoScale {
  const prefectureCount = JAPAN_PREFECTURES.length
  const localeCount = MARKETING_LOCALES.length
  const profileCount = INVESTOR_PROFILES.length
  const marketPairCount = (prefectureCount * (prefectureCount - 1)) / 2
  const themeMarketProfileLocale = themeCount * prefectureCount * profileCount * localeCount
  const marketComparisonsByThemeAndLocale = themeCount * marketPairCount * localeCount
  const greaterTokyoStrategyProfileLocale = GREATER_TOKYO_SUBMARKETS.length
    * METRO_PROPERTY_STRATEGIES.length
    * profileCount
    * localeCount

  return {
    inputs: {
      themes: themeCount,
      prefectures: prefectureCount,
      investorProfiles: profileCount,
      locales: localeCount,
      greaterTokyoSubmarkets: GREATER_TOKYO_SUBMARKETS.length,
      metroPropertyStrategies: METRO_PROPERTY_STRATEGIES.length,
    },
    candidates: {
      themeMarketProfileLocale,
      marketComparisonsByThemeAndLocale,
      greaterTokyoStrategyProfileLocale,
      total: themeMarketProfileLocale + marketComparisonsByThemeAndLocale + greaterTokyoStrategyProfileLocale,
    },
    policy: {
      candidateDoesNotMeanPublished: true,
      indexableOnlyAfterQualityGate: true,
    },
  }
}
