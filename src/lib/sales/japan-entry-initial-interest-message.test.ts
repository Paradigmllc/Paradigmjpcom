import { describe, expect, it } from "vitest";
import {
  buildJapanEntryPersonalizationFacts,
  reviewPersonalizedJapanEntryMessage,
} from "./japan-entry-personalized-message";

const audit = {
  status: {
    tokushoho_missing: true,
    appi_missing: true,
    local_payments_missing: true,
    japanese_language_missing: true,
    jpy_currency_missing: true,
    japan_shipping_missing: true,
  },
  signals: {
    tokushoho: [], appi: [], local_payments: [], japanese_language: [], jpy_currency: [], japan_shipping: [],
  },
  pages_checked: ["https://example.com/", "https://example.com/terms"],
};
const productContext = "Example provides a subscription analytics platform for independent retailers with inventory insights.";
const productEvidence = "subscription analytics platform for independent retailers";
const diagnosis = "In a review of the public pages, I did not find a Japanese-language customer path or customer-facing JPY pricing. This is not a finding about demand or performance; it means the customer path available for a Japan entry decision remains unverified from the pages checked.";
const opening = "Hello, I’m Sato from Paradigm LLC in Japan. We help overseas companies enter the Japanese market.";
const product = "I reviewed Example and its subscription analytics platform for independent retailers, including the inventory forecasting and replenishment insights described on the homepage.";

function review(message: string) {
  return reviewPersonalizedJapanEntryMessage({
    message,
    companyName: "Example",
    productContext,
    productEvidence,
    factIds: ["japan-audit-language", "japan-audit-jpy"],
    facts: buildJapanEntryPersonalizationFacts(audit, "ecommerce"),
    purpose: "initial_interest",
  });
}

describe("initial-interest form message safety", () => {
  it("accepts a light first contact without price, URL, or existing-report claims", () => {
    const message = `${opening}\n\n${product}\n\n${diagnosis}\n\nIf useful, I can share a more detailed Japan opportunity analysis based on public evidence. Would you be open to receiving it?`;
    expect(review(message)).toMatchObject({ passed: true, score: 100 });
  });

  it("rejects commercial terms in the light first contact", () => {
    const message = `${opening}\n\n${product}\n\n${diagnosis}\n\nOur Japan Entry Package is $12,000 paid upfront. Would you be open to receiving a report?`;
    const result = review(message);
    expect(result.passed).toBe(false);
    expect(result.issues).toContain("Initial-interest message must not include commercial terms, package scope, or a call offer");
  });
});
