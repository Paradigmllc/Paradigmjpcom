import { describe, expect, it } from "vitest";
import {
  assessJapanEntryReportReadiness,
  type JapanEntryReportCandidate,
} from "./japan-entry-report-readiness";

function candidate(
  overrides: Partial<JapanEntryReportCandidate> = {},
): JapanEntryReportCandidate {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    company_name: "Acme",
    domain: "acme.example",
    slug: "acme-japan-entry",
    industry: "SaaS",
    meta: {
      scan: {
        html_description: "A subscription platform for independent retailers.",
      },
      smb_signals: {
        marketVisibility: {
          version: "public-signals-v1",
          evidence: [{ id: "tranco", source_url: "https://tranco-list.eu" }],
        },
      },
      japan_market_audit: {
        status: { japanese_language_missing: true },
        pages_checked: ["https://acme.example"],
      },
      japan_entry_competitor_analysis: {
        competitors: [
          {
            name: "Example",
            evidence: [{ source_url: "https://competitor.example/jp" }],
          },
        ],
      },
    },
    ...overrides,
  };
}

describe("assessJapanEntryReportReadiness", () => {
  it("accepts only an evidence-complete company by default", () => {
    const result = assessJapanEntryReportReadiness(candidate());
    expect(result).toMatchObject({
      ready: true,
      score: 100,
      businessModel: "saas",
    });
    expect(result.evidence.verifiedCompetitors).toBe(1);
  });

  it("fails closed and reports every missing prerequisite", () => {
    const result = assessJapanEntryReportReadiness(
      candidate({ slug: null, meta: {} }),
    );
    expect(result.ready).toBe(false);
    expect(result.reasons).toEqual([
      "公開レポートslugがありません",
      "public-signals-v1市場可視性がありません",
      "根拠付き商品説明がありません",
      "公開ページのJapan readiness監査がありません",
      "根拠URL付き競合分析がありません",
    ]);
  });

  it("permits an operator-reviewed run without competitor names when explicitly disabled", () => {
    const withoutCompetitors = candidate();
    if (withoutCompetitors.meta)
      delete withoutCompetitors.meta.japan_entry_competitor_analysis;
    const result = assessJapanEntryReportReadiness(withoutCompetitors, {
      requireCompetitors: false,
    });
    expect(result.ready).toBe(true);
    expect(result.score).toBe(85);
  });
});
