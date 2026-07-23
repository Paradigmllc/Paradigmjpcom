#!/usr/bin/env node

import { generatePersonalizedJapanEntryMessage } from "../src/lib/sales/japan-entry-personalized-message";
import {
  inspectManualFormCopyEnvelope,
  MANUAL_FORM_SENDER,
} from "../src/lib/sales/manual-japan-entry-copy-envelope";

if (!process.env.DEEPSEEK_API_KEY?.trim()) {
  throw new Error("DEEPSEEK_API_KEY is required for the Japan Entry form-copy smoke test");
}

const result = await generatePersonalizedJapanEntryMessage({
  companyName: "Screenshot to Code",
  industry: "SaaS / AI / Developer Tools",
  productContext: "Convert any screenshot or design to clean code | Build User Interfaces 10x Faster | Video to Code | Screenshot to Code | Framework agnostic | Iterate & refine | Text to code | Developers love it | Ready to ship faster? | AI-powered conversion from screenshots and videos to clean, production-ready code. | Screenshot to Code supports HTML/CSS, React, Vue, Tailwind, Bootstrap, and Ionic.",
  targetCountry: "US",
  businessModel: "saas",
  purpose: "initial_interest",
  initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: true },
  messageAngle: "problem",
  outreachPlaybook: "saas_ai_devtools",
  observedFacts: [
    "Screenshot to Code converts screenshots and videos to clean code.",
    "The product supports HTML/CSS, React, Vue, Tailwind, Bootstrap, and Ionic.",
  ],
  sourceUrl: "https://screenshottocode.com/",
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
      "https://screenshottocode.com/",
      "https://screenshottocode.com/pricing",
      "https://screenshottocode.com/terms",
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

const envelope = inspectManualFormCopyEnvelope(result.message, "Screenshot to Code");
const withoutApprovedEmail = result.message.replaceAll(MANUAL_FORM_SENDER.email, "");
const checks = {
  companyName: result.message.includes("Screenshot to Code"),
  productSpecific: /screenshots and videos|production-ready code|HTML\/CSS|React|Vue|Tailwind|Bootstrap|Ionic/i.test(result.message),
  strategy: Boolean(result.strategy),
  candidateSet: (result.candidates?.length ?? 0) >= 1,
  editorialQuality: result.review.score >= 92,
  uniqueness: (result.review.uniquenessScore ?? 0) >= 90,
  noUrlOrDomain: !/(?:https?:\/\/|www\.|screenshottocode\.com)/i.test(result.message),
  noCitation: !/(?:according to|source:|citation|出典|参照元)/i.test(result.message),
  copyReadyGreeting: envelope.greetingValid,
  copyReadySignature: envelope.signatureValid,
  approvedSenderEmailOnce: result.message.split(MANUAL_FORM_SENDER.email).length === 2,
  noUnapprovedEmailAddress: !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(withoutApprovedEmail),
  noAttachment: !/(?:attached|attachment|添付|資料をお送り)/i.test(result.message),
  noCommercialTerms: !/(?:[$€£¥￥]\s?\d|\bUSD\b|\bJPY\b|12,?000|setup fee|pricing|price|料金|価格)/i.test(result.message),
  noPromotionalNumericClaim: !/10x|10\s+times/i.test(result.message),
  noCausalAuditExtension: !/\b(?:did not show|did not find|showed no|found no)\b[^.!?]{0,160},?\s+(?:so|therefore|which)\b/i.test(result.message),
  noBareWorkflowReference: !/\b(?:this|that|the)\s+workflow\b/i.test(result.message),
  noGenericAnalysisFocus: !/\bproduct evaluation and Japanese positioning\b/i.test(result.message),
  noInventedJapanAudience: !/\b(?:audiences?|developers?|evaluators?|users?|buyers?|customers?|teams?)\s+in Japan\b/i.test(result.message),
  noPlaceholder: !/(?:\[[^\]\n]+\]|［[^］\n]+］|【[^】\n]+】|\{[^{}\n]+\}|<[^<>\n]+>|__[A-Z0-9_ -]+__|\bTBD\b|\bPLACEHOLDER\b)/i.test(result.message),
  personalizedBodyParagraphs: envelope.bodyParagraphs.length >= 3 && envelope.bodyParagraphs.length <= 4,
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
