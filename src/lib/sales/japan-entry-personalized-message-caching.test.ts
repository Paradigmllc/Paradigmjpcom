import { describe, expect, it } from "vitest";
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts";
import {
  criticMessages,
  generationMessages,
  JAPAN_ENTRY_GENERATION_SYSTEM_PROMPT,
} from "./japan-entry-personalized-message-prompts";

const baseFact: JapanEntryPersonalizationFact = {
  id: "japan-audit-language",
  statement: "The checked public pages did not show a Japanese-language customer path.",
  source: "Japan market public-page audit",
  confidence: 0.9,
  anchors: ["Japanese-language"],
};

const candidate = {
  message: "Grounded four-paragraph draft",
  fact_ids: [baseFact.id],
  product_evidence: "inventory analytics",
  angle: "customer path",
};

describe("Japan Entry DeepSeek prompt caching", () => {
  it("keeps the full generation system prefix byte-identical across companies and modes", () => {
    const first = generationMessages({
      companyName: "Acme",
      industry: "SaaS",
      productContext: "Acme provides inventory analytics.",
      targetCountry: "US",
      businessModel: "saas",
    }, [baseFact], "audit");
    const second = generationMessages({
      companyName: "Bravo",
      industry: "Retail",
      productContext: "Bravo sells travel products online.",
      targetCountry: "AU",
      businessModel: "ecommerce",
    }, [{ ...baseFact, id: "verified-competitor-1" }], "quantified");

    expect(first[0]).toEqual({ role: "system", content: JAPAN_ENTRY_GENERATION_SYSTEM_PROMPT });
    expect(second[0]).toEqual(first[0]);
    expect(second[1]?.content).not.toBe(first[1]?.content);
  });

  it("keeps repair feedback out of the cached system prefix", () => {
    const initial = generationMessages({
      companyName: "Acme",
      industry: "SaaS",
      productContext: "Acme provides inventory analytics.",
      targetCountry: "US",
      businessModel: "saas",
    }, [baseFact], "audit");
    const repair = generationMessages({
      companyName: "Acme",
      industry: "SaaS",
      productContext: "Acme provides inventory analytics.",
      targetCountry: "US",
      businessModel: "saas",
    }, [baseFact], "audit", {
      candidate,
      issues: ["Message needs four paragraphs"],
      editorialFeedback: "Improve specificity without adding facts.",
    });
    const repairPayload = JSON.parse(repair[1]?.content ?? "{}") as Record<string, unknown>;

    expect(repair[0]).toEqual(initial[0]);
    expect(repairPayload.task).toBe("repair_candidate");
    expect(JSON.stringify(repairPayload.repair)).toContain("Improve specificity");
    expect(repair[0]?.content).not.toContain("Improve specificity");
  });

  it("keeps the critic system prefix stable while company evidence stays in the user payload", () => {
    const first = criticMessages("Acme", [baseFact], [candidate], "audit");
    const second = criticMessages("Bravo", [{ ...baseFact, id: "modeled-japan-monthly-visits" }], [candidate], "quantified");

    expect(second[0]).toEqual(first[0]);
    expect(second[1]?.content).not.toBe(first[1]?.content);
  });
});
