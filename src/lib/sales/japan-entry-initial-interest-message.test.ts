import { describe, expect, it } from "vitest";
import {
  buildJapanEntryPersonalizationFacts,
  reviewPersonalizedJapanEntryMessage,
} from "./japan-entry-personalized-message";
import { MANUAL_FORM_SIGNATURE, manualFormGreeting } from "./manual-japan-entry-copy-envelope";

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
const productContext = "Example documents a subscription analytics platform for independent retailers. Its public description connects inventory forecasting, replenishment decisions, and inventory insights in a single workflow.";
const productEvidence = "subscription analytics platform for independent retailers";
const diagnosis = "The checked public pages did not show a Japanese-language customer path or customer-facing JPY pricing.";
const opening = "Example documents a subscription analytics platform for independent retailers, connecting inventory forecasting, replenishment decisions, and inventory insights in one product.";
const product = "For a first Japan test, should the subscription analytics platform lead with inventory forecasting or replenishment decisions for independent retailers? The checked pages cannot determine which of those two concrete product emphases should appear first, and no demand or performance conclusion follows from that open choice.";
const tailoredClose = "I can prepare a Japan opportunity analysis comparing how the subscription analytics platform should present inventory forecasting and replenishment decisions, including the Japanese-language customer path and JPY presentation question. Is Example’s founder the right recipient, or should I send it to the person leading international growth?";

function copyReady(...bodyParagraphs: string[]): string {
  return [manualFormGreeting("Example"), ...bodyParagraphs, MANUAL_FORM_SIGNATURE].join("\n\n");
}

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
    const message = copyReady(opening, diagnosis, product, tailoredClose);
    const result = review(message);
    expect(result.issues).toEqual([]);
    expect(result).toMatchObject({ passed: true, score: 100 });
  });

  it("accepts a company-specific opening when options are omitted", () => {
    const message = copyReady(
      opening,
      diagnosis,
      "Should the subscription analytics platform first present inventory forecasting or the replenishment-decision workflow in a Japanese-language test? The public pages do not answer which product emphasis should lead, and the question can be tested without inferring demand, retailer behaviour, or commercial results.",
      tailoredClose,
    );
    const result = review(message);
    expect(result.issues).toEqual([]);
    expect(result).toMatchObject({ passed: true, score: 100 });
  });

  it("rejects an article that does not agree with the company or product anchor", () => {
    const message = copyReady(
      opening,
      product,
      diagnosis,
      "I can share a detailed Japan opportunity analysis to inform a Example Japanese-language decision. Could you forward the Example analysis to the appropriate person?",
    );
    const result = review(message);

    expect(result.passed).toBe(false);
    expect(result.issues).toContain(
      "Indefinite article must agree with the following company or product anchor: use an before Example",
    );
  });

  it("fails closed when the copy-ready greeting or approved sender signature is altered", () => {
    const valid = copyReady(opening, product, diagnosis, "If useful, I can share a more detailed Japan opportunity analysis based on public evidence. Would you be open to receiving it?");
    const wrongGreeting = review(valid.replace("Hello Example team,", "Hello,"));
    const wrongSender = review(valid.replace("contact@paradigmjp.com", "sales@example.com"));

    expect(wrongGreeting.passed).toBe(false);
    expect(wrongGreeting.issues).toContain("Copy-ready company greeting is missing or altered");
    expect(wrongSender.passed).toBe(false);
    expect(wrongSender.issues).toContain("Approved Tomohiro H sender signature is missing or altered");
    expect(wrongSender.issues).toContain("URL, link, domain, or unapproved email is prohibited");
  });

  it("rejects any additional email address outside the approved signature", () => {
    const message = copyReady(opening, product, `${diagnosis} Please also copy sales@example.com.`, "If useful, I can share a more detailed Japan opportunity analysis based on public evidence. Would you be open to receiving it?");
    const result = review(message);

    expect(result.passed).toBe(false);
    expect(result.issues).toContain("URL, link, domain, or unapproved email is prohibited");
  });

  it("rejects commercial terms in the light first contact", () => {
    const message = copyReady(opening, product, diagnosis, "Our Japan Entry Package is $15,000 paid upfront. Would you be open to receiving a report?");
    const result = review(message);
    expect(result.passed).toBe(false);
    expect(result.issues).toContain("This initial-interest variant must not include commercial terms, package scope, or a call offer");
  });

  it("rejects unverified buyer-behavior claims even when the public gaps are real", () => {
    const unsafeDiagnosis = `${diagnosis} For Japanese retailers, these details often decide whether they complete a purchase.`;
    const message = copyReady(opening, product, unsafeDiagnosis, "If useful, I can share a more detailed Japan opportunity analysis based on public evidence. Would you be open to receiving it?");
    const result = review(message);
    expect(result.passed).toBe(false);
    expect(result.issues).toContain("Unsupported causal inference or invented package deliverable is prohibited");
  });

  it("rejects generic praise and unsupported Japanese investment claims", () => {
    const praisedProduct = "I reviewed Example and its impressive subscription analytics platform for independent retailers, which positions Example uniquely for emerging applications.";
    const unsafeDiagnosis = `${diagnosis} Japanese retailers are heavily investing in this category.`;
    const message = copyReady(opening, praisedProduct, unsafeDiagnosis, "If useful, I can share a more detailed Japan opportunity analysis based on public evidence. Would you be open to receiving it?");
    const result = review(message);
    expect(result.passed).toBe(false);
    expect(result.issues).toContain("Generic, promotional, invented, or unsupported market phrasing is prohibited");
    expect(result.issues).toContain("Unsupported causal inference or invented package deliverable is prohibited");
  });
});
