import { MARKETING_LOCALES } from "@/i18n/locales"

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
  }
  candidates: {
    themeMarketProfileLocale: number
    marketComparisonsByThemeAndLocale: number
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

  return {
    inputs: {
      themes: themeCount,
      prefectures: prefectureCount,
      investorProfiles: profileCount,
      locales: localeCount,
    },
    candidates: {
      themeMarketProfileLocale,
      marketComparisonsByThemeAndLocale,
      total: themeMarketProfileLocale + marketComparisonsByThemeAndLocale,
    },
    policy: {
      candidateDoesNotMeanPublished: true,
      indexableOnlyAfterQualityGate: true,
    },
  }
}
