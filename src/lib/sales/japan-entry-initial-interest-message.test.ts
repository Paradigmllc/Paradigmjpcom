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
const productContext = "Example provides a subscription analytics platform for independent retailers with inventory insights.";
const productEvidence = "subscription analytics platform for independent retailers";
const diagnosis = "In a review of the public pages, I did not find a Japanese-language customer path or customer-facing JPY pricing. This is not a finding about demand or performance; it means the customer path available for a Japan entry decision remains unverified from the pages checked. For Example, the management question is whether a focused Japanese evaluation route should be tested before a broader localization or channel investment is approved.";
const opening = "Example’s public pages describe an analytics workflow built around inventory decisions for independent retailers, which makes the product scope concrete enough for a Japan-path review.";
const product = "I reviewed Example and its subscription analytics platform for independent retailers, including the inventory forecasting and replenishment insights described on the homepage.";
const tailoredClose = "If useful, I can share a more detailed Japan opportunity analysis focused on Example’s Japanese-language customer path. Would you be open to receiving the Example analysis?";

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
    const message = copyReady(opening, product, diagnosis, tailoredClose);
    const result = review(message);
    expect(result.issues).toEqual([]);
    expect(result).toMatchObject({ passed: true, score: 100 });
  });

  it("accepts a company-specific opening when options are omitted", () => {
    const message = copyReady(
      "I reviewed Example’s subscription analytics platform for independent retailers, including the inventory insights described publicly, to understand what a Japan evaluation could verify.",
      "The product description connects forecasting and replenishment decisions in one workflow, so the public product scope is specific rather than inferred from a broad category label.",
      "In a review of the public pages, I did not find a Japanese-language customer path or customer-facing JPY pricing. This is not a finding about demand or performance; it means the customer path available for a Japan entry decision remains unverified from the pages checked.",
      tailoredClose,
    );
    const result = review(message);
    expect(result.issues).toEqual([]);
    expect(result).toMatchObject({ passed: true, score: 100 });
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
    const message = copyReady(opening, product, diagnosis, "Our Japan Entry Package is $12,000 paid upfront. Would you be open to receiving a report?");
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
