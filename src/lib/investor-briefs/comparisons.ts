import type { InvestorBrief, InvestorBriefSummary } from "./repository"

export interface CuratedComparisonDefinition {
  left: string
  right: string
  intent: string
}

export interface InvestorBriefComparisonSummary extends CuratedComparisonDefinition {
  path: string
  title: string
  summary: string
  leftBrief: InvestorBriefSummary
  rightBrief: InvestorBriefSummary
}

export const CURATED_INVESTOR_COMPARISONS = [
  {
    left: "tokyo-multifamily-investment-due-diligence",
    right: "hokkaido-resort-property-investment",
    intent: "Compare stable urban rental income with tourism-led resort exposure.",
  },
  {
    left: "osaka-hotel-investment-due-diligence",
    right: "kyoto-ryokan-investment-due-diligence",
    intent: "Compare hotel operating scale with heritage-hospitality constraints.",
  },
  {
    left: "osaka-hotel-investment-due-diligence",
    right: "hokkaido-resort-property-investment",
    intent: "Compare an urban visitor market with a seasonal destination thesis.",
  },
  {
    left: "buying-property-in-japan-as-a-foreigner",
    right: "tokyo-multifamily-investment-due-diligence",
    intent: "Compare a general cross-border acquisition workflow with Tokyo income-property diligence.",
  },
  {
    left: "buying-property-in-japan-as-a-foreigner",
    right: "japan-real-estate-taxes-for-non-residents",
    intent: "Compare the acquisition decision with the non-resident tax operating model.",
  },
  {
    left: "japan-data-center-investment",
    right: "japan-renewable-energy-investment",
    intent: "Compare digital infrastructure constraints with power-project revenue and grid risk.",
  },
  {
    left: "japan-sme-acquisition-due-diligence",
    right: "japan-startup-investment-due-diligence",
    intent: "Compare established-company cash-flow diligence with venture evidence and governance.",
  },
  {
    left: "japan-sme-acquisition-due-diligence",
    right: "japan-company-setup-for-foreign-investors",
    intent: "Compare acquiring an operating platform with building a new Japan entity.",
  },
  {
    left: "japan-startup-investment-due-diligence",
    right: "japan-company-setup-for-foreign-investors",
    intent: "Compare minority venture exposure with direct operating-company formation.",
  },
  {
    left: "japan-foreign-direct-investment-screening",
    right: "japan-sme-acquisition-due-diligence",
    intent: "Compare regulatory clearance risk with target-company commercial diligence.",
  },
  {
    left: "japan-foreign-direct-investment-screening",
    right: "japan-data-center-investment",
    intent: "Compare FDI screening questions with a strategic digital-infrastructure investment.",
  },
  {
    left: "tokyo-central-three-wards-real-estate-investment",
    right: "yokohama-real-estate-investment",
    intent: "Compare a prime central-Tokyo basis with Yokohama ward and corridor income evidence.",
  },
  {
    left: "shinjuku-shibuya-real-estate-investment",
    right: "bunkyo-toshima-real-estate-investment",
    intent: "Compare west-core mixed demand with north-central residential and education-led demand.",
  },
  {
    left: "setagaya-nakano-suginami-real-estate-investment",
    right: "kita-arakawa-itabashi-nerima-real-estate-investment",
    intent: "Compare west-Tokyo family rental resilience with north-Tokyo income and condition risk.",
  },
  {
    left: "koto-sumida-taito-real-estate-investment",
    right: "adachi-katsushika-edogawa-real-estate-investment",
    intent: "Compare east-core visitor and waterfront exposure with outer-east affordability and resilience.",
  },
  {
    left: "yokohama-real-estate-investment",
    right: "kawasaki-real-estate-investment",
    intent: "Compare Yokohama's ward hierarchy with Kawasaki's Tokyo-Yokohama railway corridors.",
  },
  {
    left: "saitama-urawa-omiya-real-estate-investment",
    right: "south-saitama-real-estate-investment",
    intent: "Compare Saitama City's major nodes with Tokyo-border rental and river-system exposure.",
  },
  {
    left: "chiba-bay-real-estate-investment",
    right: "kashiwa-nagareyama-narita-real-estate-investment",
    intent: "Compare Chiba Bay access and resilience with outer-Chiba growth and employment nodes.",
  },
] as const satisfies readonly CuratedComparisonDefinition[]

export function comparisonPairSlug(left: string, right: string): string {
  return `${left}-vs-${right}`
}

export function comparisonPath(left: string, right: string): string {
  return `/en/japan-opportunities/invest/compare/${comparisonPairSlug(left, right)}`
}

export function parseComparisonPair(value: string): { left: string; right: string } | null {
  const separator = "-vs-"
  const position = value.indexOf(separator)
  if (position <= 0 || position >= value.length - separator.length) return null
  return {
    left: value.slice(0, position),
    right: value.slice(position + separator.length),
  }
}

export function findCuratedComparison(left: string, right: string): CuratedComparisonDefinition | null {
  return CURATED_INVESTOR_COMPARISONS.find((item) => item.left === left && item.right === right) ?? null
}

export function findReverseCuratedComparison(left: string, right: string): CuratedComparisonDefinition | null {
  return CURATED_INVESTOR_COMPARISONS.find((item) => item.left === right && item.right === left) ?? null
}

export function buildComparisonSummary(
  definition: CuratedComparisonDefinition,
  briefs: readonly InvestorBriefSummary[],
): InvestorBriefComparisonSummary | null {
  const leftBrief = briefs.find((brief) => brief.slug === definition.left)
  const rightBrief = briefs.find((brief) => brief.slug === definition.right)
  if (!leftBrief || !rightBrief) return null

  return {
    ...definition,
    path: comparisonPath(definition.left, definition.right),
    title: `${leftBrief.preview.assetClass} vs ${rightBrief.preview.assetClass} in Japan`,
    summary: `${definition.intent} Use official-source coverage, downside risks and decision gates from both investment briefs.`,
    leftBrief,
    rightBrief,
  }
}

export function listCuratedComparisonSummaries(
  briefs: readonly InvestorBriefSummary[],
): InvestorBriefComparisonSummary[] {
  return CURATED_INVESTOR_COMPARISONS.flatMap((definition) => {
    const summary = buildComparisonSummary(definition, briefs)
    return summary ? [summary] : []
  })
}

export interface InvestorBriefComparison {
  left: InvestorBrief
  right: InvestorBrief
  intent: string | null
  isIndexable: boolean
  sourceCount: number
  highPriorityRiskCount: number
}

export function buildInvestorBriefComparison(
  left: InvestorBrief,
  right: InvestorBrief,
): InvestorBriefComparison {
  const curated = findCuratedComparison(left.slug, right.slug)
  return {
    left,
    right,
    intent: curated?.intent ?? null,
    isIndexable: Boolean(curated),
    sourceCount: new Set([...left.payload.sources, ...right.payload.sources].map((source) => source.url)).size,
    highPriorityRiskCount: [...left.payload.risks, ...right.payload.risks].filter((risk) => risk.level === "high").length,
  }
}
