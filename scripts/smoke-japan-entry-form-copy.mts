#!/usr/bin/env node

import { generatePersonalizedJapanEntryMessage } from "../src/lib/sales/japan-entry-personalized-message";

if (!process.env.DEEPSEEK_API_KEY?.trim()) {
  throw new Error("DEEPSEEK_API_KEY is required for the Japan Entry form-copy smoke test");
}

const result = await generatePersonalizedJapanEntryMessage({
  companyName: "AtlasMetric",
  industry: "B2B SaaS",
  productContext: "AtlasMetric provides subscription analytics for independent retailers with inventory forecasting and replenishment insights.",
  targetCountry: "US",
  businessModel: "saas",
  purpose: "initial_interest",
  initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: true },
  messageAngle: "problem",
  outreachPlaybook: "saas_ai_devtools",
  observedFacts: [
    "AtlasMetric provides subscription analytics for independent retailers.",
    "The product includes inventory forecasting and replenishment insights.",
  ],
  sourceUrl: "https://atlasmetric.example/",
  priorMessages: [
    { id: "prior-1", companyName: "PriorCo", domain: "prior.example", message: "We reviewed your public website and prepared an initial Japan market note. Could you forward this to the appropriate person?" },
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
      "https://atlasmetric.example/",
      "https://atlasmetric.example/pricing",
      "https://atlasmetric.example/terms",
    ],
  },
});

if (!result.ok || !result.message || !result.review?.passed) {
  throw new Error(JSON.stringify({
    error: result.error ?? "DeepSeek returned no production-ready manual-work message",
    review: result.review,
    usage: result.usage,
  }));
}

const checks = {
  companyName: result.message.includes("AtlasMetric"),
  productSpecific: /subscription analytics|independent retailers|inventory forecasting|replenishment/i.test(result.message),
  strategy: Boolean(result.strategy),
  candidateSet: (result.candidates?.length ?? 0) >= 1,
  editorialQuality: result.review.score >= 92,
  uniqueness: (result.review.uniquenessScore ?? 0) >= 90,
  noUrlOrDomain: !/(?:https?:\/\/|www\.|atlasmetric\.example)/i.test(result.message),
  noCitation: !/(?:according to|source:|citation|出典|参照元)/i.test(result.message),
  noEmailAddress: !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(result.message),
  noAttachment: !/(?:attached|attachment|添付|資料をお送り)/i.test(result.message),
  noCommercialTerms: !/(?:[$€£¥￥]\s?\d|\bUSD\b|\bJPY\b|12,?000|setup fee|pricing|price|料金|価格)/i.test(result.message),
  noPlaceholder: !/(?:\[[^\]\n]+\]|［[^］\n]+］|【[^】\n]+】|\{[^{}\n]+\}|<[^<>\n]+>|__[A-Z0-9_ -]+__|\bTBD\b|\bPLACEHOLDER\b)/i.test(result.message),
  fourParagraphs: result.message.split(/\n\s*\n/).filter(Boolean).length === 4,
};

if (Object.values(checks).some((passed) => !passed)) {
  throw new Error(`Manual-work form-copy smoke test failed: ${JSON.stringify(checks)}`);
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  purpose: "initial_interest",
  score: result.review.score,
  safetyScore: result.review.safetyScore,
  uniquenessScore: result.review.uniquenessScore,
  candidateCount: result.review.candidateCount,
  wordCount: result.review.wordCount,
  usage: result.usage,
  cacheHitRatio: result.usage
    ? (result.usage.cache_hit_tokens ?? 0) / Math.max(1, (result.usage.cache_hit_tokens ?? 0) + (result.usage.cache_miss_tokens ?? 0))
    : 0,
  checks,
  message: result.message,
}, null, 2)}\n`);
