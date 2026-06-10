/**
 * report-i18n-shared.ts — Shared types for 12-language diagnostic report i18n
 */

import type { Locale } from "@/i18n/routing"

/* ───── Types ───── */

export interface FaqItem {
  q: string
  a: string
}

export interface CulturalNotes {
  /** Human-readable description of the expected tone register */
  toneDescription: string
  /** Formality level name (e.g. "ですます調", "Sie-Form", "합쇼체") */
  formalityLevel: string
  /** Pronoun / address preference (e.g. "vous", "Sie", "Anda", "您") */
  pronounPreference: string
}

export interface ReportLocaleData {
  ui: {
    brand: string
    privateReport: string
    validity: string
    heroKicker: string
    heroLead: string
    evidenceReady: string
    sourceCoverage: string
    monthlyLoss: string
    confidence: string
    currentState: string
    improvedState: string
    diagnosticSurface: string
    priorityFindings: string
    businessImpact: string
    firstMove: string
    whyItMatters: string
    evidence: string
    recommendation: string
    roadmap: string
    dataAppendix: string
    sourceMeaning: string
    sourceNext: string
    sourceMissing: string
    templateDirection: string
    qualityBar: string
    finalHeading: string
    finalBody: string
    emailSubject: string
    competitorBenchmark: string
    yourSite: string
    industryAvg: string
    topCompetitors: string
    roiTitle: string
    paybackPeriod: string
    recoveredTwelveMonths: string
    roiLabel: string
    faqTitle: string
    readMore: string
  }
  /** Call-to-action text variants (minimum 3 per locale) */
  cta: string[]
  /** 5 FAQ questions + answers per locale, culturally adapted */
  faq: FaqItem[]
  /** Trust-building reassurance copy */
  reassurance: string[]
  /** Feature / offer badges shown on the report */
  offerBadges: string[]
  /** Language-specific tone and formality instructions */
  culturalNotes: CulturalNotes
}
