#!/usr/bin/env node

import { generatePersonalizedJapanEntryMessage } from "../src/lib/sales/japan-entry-personalized-message"
import { inspectManualFormCopyEnvelope } from "../src/lib/sales/manual-japan-entry-copy-envelope"

if (!process.env.DEEPSEEK_API_KEY?.trim()) {
  throw new Error("DEEPSEEK_API_KEY is required for the Salesfire form-copy smoke test")
}

const result = await generatePersonalizedJapanEntryMessage({
  companyName: "Salesfire",
  industry: "E-Commerce / Retail Technology",
  productContext: [
    "Explore customer preferences, behavioural trends, and purchase history on an individual or collective level.",
    "Integrate Salesfire with your existing eCommerce platform.",
    "Identify customer behaviour across the website.",
    "Leverage behavioural data to tailor onsite experiences.",
  ].join(" | "),
  targetCountry: "GB",
  businessModel: "saas",
  purpose: "initial_interest",
  initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: true },
  messageAngle: "problem",
  outreachPlaybook: "saas_ai_devtools",
  observedFacts: [
    "Salesfire documents analysis of customer preferences, behavioural trends, and purchase history.",
    "Salesfire documents integration with existing eCommerce platforms.",
  ],
  sourceUrl: "https://salesfire.co.uk/",
  priorMessages: [
    {
      id: "prior-screenshot-to-code",
      companyName: "Screenshot to Code",
      domain: "screenshottocode.com",
      message: "Screenshot to Code provides AI-powered conversion from screenshots and videos to clean, production-ready code. The checked public pages did not show a Japanese-language customer path.",
    },
  ],
  audit: {
    status: {
      japanese_language_missing: true,
      jpy_currency_missing: true,
      appi_missing: true,
    },
    signals: {
      japanese_language: [],
      jpy_currency: [],
      appi: [],
    },
    pages_checked: [
      "https://salesfire.co.uk/",
      "https://salesfire.co.uk/platform/",
      "https://salesfire.co.uk/contact/",
    ],
  },
})

if (!result.ok || !result.message || !result.review?.passed) {
  throw new Error(JSON.stringify({
    error: result.error ?? "DeepSeek returned no production-ready Salesfire message",
    review: result.review,
    usage: result.usage,
  }))
}

const envelope = inspectManualFormCopyEnvelope(result.message, "Salesfire")
const checks = {
  productSpecific: /customer preferences|behavioural trends|purchase history/i.test(result.message),
  noCopiedMarketingCommand: !/\b(?:can|may|to)\s+(?:Explore|Integrate|Identify|Leverage)\b/.test(result.message),
  noPublicCtaResidue: !/book a consultation|get started|request a demo/i.test(result.message),
  japanDecisionSpecific: /Japanese-language/i.test(result.message) && /evaluation|test|localization/i.test(result.message),
  publicAuditFact: /public pages?[^.!?]*(?:did not|does not|not shown|found no|showed no)[^.!?]*Japanese-language|Japanese-language[^.!?]*(?:did not|does not|not shown|found no|showed no)[^.!?]*public pages?/i.test(result.message),
  noGenericProductScope: !/(?:current|documented|verified) product scope|product['’]s documented capability/i.test(result.message),
  noGenericEntryLabel: !/current market-readiness question|testable entry decision|market-entry question/i.test(result.message),
  noVagueWorkflowCta: !/\b(?:for|around|about|of) (?:this|that|the) workflow\b/i.test(result.message.split(/\n\s*\n/).at(-2) ?? ""),
  noCausalAuditExtension: !/\b(?:did not show|did not find|showed no|found no)\b[^.!?]{0,160},?\s+(?:so|therefore|which)\b/i.test(result.message),
  noInventedUrgency: !/\b(?:immediate|urgent|essential|necessary)\b/i.test(result.message),
  noGenericAnalysisFocus: !/\bproduct evaluation and Japanese positioning\b/i.test(result.message),
  noAwkwardIntegrationPhrase: !/\b(?:the\s+)?integration with (?:an?\s+)?existing eCommerce platform/i.test(result.message),
  noUrlOrCitation: !/(?:https?:\/\/|www\.|according to|source:|citation)/i.test(result.message),
  copyReadyEnvelope: envelope.greetingValid && envelope.signatureValid,
  productionScores: result.review.score >= 92
    && (result.review.safetyScore ?? 0) >= 92
    && (result.review.uniquenessScore ?? 0) >= 90,
}

if (Object.values(checks).some((passed) => !passed)) {
  throw new Error(`Salesfire form-copy smoke failed: ${JSON.stringify({ checks, review: result.review, similarity: result.similarity, message: result.message })}`)
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  score: result.review.score,
  safetyScore: result.review.safetyScore,
  uniquenessScore: result.review.uniquenessScore,
  wordCount: result.review.wordCount,
  usage: result.usage,
  checks,
  message: result.message,
}, null, 2)}\n`)
