#!/usr/bin/env node

import { generatePersonalizedJapanEntryMessage } from "../src/lib/sales/japan-entry-personalized-message";
import { buildJapanEntryProjection } from "../src/lib/sales/japan-entry-projection";
import type { MarketVisibilityIndex } from "../src/lib/sales/market-visibility";

if (!process.env.DEEPSEEK_API_KEY?.trim()) {
  throw new Error("DEEPSEEK_API_KEY is required for the Japan Entry form-copy smoke test");
}

const visibility: MarketVisibilityIndex = {
  version: "public-signals-v1",
  index: 63,
  band: "top-100k",
  bestRank: 52_000,
  countrySignals: [{ countryCode: "US", signal: "ccTLD", value: ".us", confidence: 0.72 }],
  evidence: [
    {
      id: "tranco-rank",
      label: "Tranco domain rank",
      value: "#52,000",
      source: "Tranco",
      sourceUrl: "https://tranco-list.eu/query?domain=atlasmetric.example",
      observedAt: "2026-07-13T00:00:00.000Z",
      confidence: 0.7,
      limitation: "Synthetic smoke-test input; public proxy only, not first-party visits or revenue.",
    },
  ],
  unknowns: [],
  actualMonthlyVisits: null,
  actualRevenue: null,
};

const projection = buildJapanEntryProjection({
  companyName: "AtlasMetric",
  domain: "atlasmetric.example",
  targetCountry: "US",
  visibility,
  observedAt: "2026-07-13T00:00:00.000Z",
});

const result = await generatePersonalizedJapanEntryMessage({
  companyName: "AtlasMetric",
  industry: "B2B SaaS",
  productContext: "AtlasMetric provides subscription analytics for independent retailers with inventory forecasting and replenishment insights.",
  targetCountry: "US",
  businessModel: "saas",
  projection,
  audit: {
    status: {
      japanese_language_missing: true,
      jpy_currency_missing: true,
    },
    signals: {
      japanese_language: [],
      jpy_currency: [],
    },
    pages_checked: [
      "https://atlasmetric.example/",
      "https://atlasmetric.example/pricing",
      "https://atlasmetric.example/terms",
    ],
  },
});

if (!result.ok || !result.message || !result.review?.passed) {
  throw new Error(result.error ?? "DeepSeek returned no production-ready Japan Entry message");
}

const japanMarket = projection.markets.find((market) => market.code === "JP");
if (!japanMarket) throw new Error("Japan projection is missing from smoke-test input");

const expectedVisits = japanMarket.estimatedMonthlyVisits.toLocaleString("en-US");
const expectedGap = `$${projection.monthlyOpportunityGapUsd.toLocaleString("en-US")}`;
const checks = {
  companyName: result.message.includes("AtlasMetric"),
  japanVisits: result.message.includes(expectedVisits),
  opportunityGap: result.message.includes(expectedGap),
  noPlaceholder: !/(?:\[[^\]\n]+\]|［[^］\n]+］|【[^】\n]+】|\{[^{}\n]+\}|<[^<>\n]+>|__[A-Z0-9_ -]+__|\bTBD\b|\bPLACEHOLDER\b)/i.test(result.message),
  fourParagraphs: result.message.split(/\n\s*\n/).filter(Boolean).length === 4,
};

if (Object.values(checks).some((passed) => !passed)) {
  throw new Error(`Japan Entry form-copy smoke test failed: ${JSON.stringify(checks)}`);
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  score: result.review.score,
  safetyScore: result.review.safetyScore,
  wordCount: result.review.wordCount,
  expectedVisits,
  expectedGap,
  checks,
  message: result.message,
}, null, 2)}\n`);
