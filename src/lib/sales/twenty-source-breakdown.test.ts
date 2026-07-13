import { describe, it, expect } from "vitest";
import type { CompanyKarteSnapshot } from "./company-karte";
import type { SourceCoverageItem } from "./source-coverage";
import {
  sourceCategoryBreakdown,
  sourceCoveragePanelLink,
} from "./twenty-sync-karte-fields";
import {
  countrySelectValue,
  industrySelectValue,
  karteHomeSummary,
  sourceSelectValue,
  twentyCompanyHomePayload,
} from "./twenty-sync-summaries";

function item(partial: Partial<SourceCoverageItem>): SourceCoverageItem {
  return {
    slug: partial.slug ?? "x",
    label: partial.label ?? "X",
    category: partial.category ?? "analysis",
    status: partial.status ?? "collected",
    score: partial.score ?? 100,
    detail: partial.detail ?? "",
    meaning: "",
    missingConsequence: "",
    nextStep: "",
  };
}

function karteWith(
  items: SourceCoverageItem[],
  companyName = "Acme",
): CompanyKarteSnapshot {
  return { sourceItems: items, companyName } as unknown as CompanyKarteSnapshot;
}

describe("sourceCategoryBreakdown (Phase 7-1)", () => {
  it("summarizes collected/total per category with error counts", () => {
    const karte = karteWith([
      item({ category: "analysis", status: "collected" }),
      item({ category: "analysis", status: "missing" }),
      item({ category: "analysis", status: "error" }),
      item({ category: "list", status: "collected" }),
      item({ category: "demo", status: "missing" }),
    ]);
    const out = sourceCategoryBreakdown(karte);
    expect(out).toContain("analysis 1/3 (err 1)");
    expect(out).toContain("list 1/1");
    expect(out).toContain("demo 0/1");
  });

  it("omits categories with no sources", () => {
    const out = sourceCategoryBreakdown(
      karteWith([item({ category: "list", status: "collected" })]),
    );
    expect(out).toBe("list 1/1");
    expect(out).not.toContain("video");
  });

  it("returns a no-data marker when there are no source items", () => {
    expect(sourceCategoryBreakdown(karteWith([]))).toBe("no source data");
  });
});

describe("sourceCoveragePanelLink (Phase 7-2)", () => {
  it("builds a Twenty CRM company link", () => {
    const link = sourceCoveragePanelLink(karteWith([], "Sakura Dining"));
    expect(link).toBe("https://twenty.paradigmjp.com/companies");
  });
});

describe("twentyCompanyHomePayload", () => {
  it("normalizes supported international categories and omits unknown select values", () => {
    expect(industrySelectValue("SaaS")).toBe("コンサルティング");
    expect(industrySelectValue("ecommerce")).toBe("小売・店舗");
    expect(industrySelectValue("service")).toBe("コンサルティング");
    expect(industrySelectValue("orbital research")).toBeNull();
    expect(sourceSelectValue("Apollo")).toBe("apollo");
    expect(sourceSelectValue("qa_japan_entry_batch")).toBeNull();
    expect(countrySelectValue("US")).toBe("米国");
    expect(countrySelectValue("NL")).toBeNull();
    expect(countrySelectValue("BR")).toBeNull();
  });

  it("promotes the 50+ API/OSS breakdown and detail URL to first-class Twenty fields", () => {
    const karte = {
      companyId: "company-1",
      region: "global",
      companyName: "Digitalhumanity",
      domain: "digitalhumanity.co.za",
      reportLocale: "en",
      targetCountry: "ZA",
      templateVariant: "japan_entry",
      reportUrl: "https://paradigmjp.com/en/report/digitalhumanity",
      opportunityBriefUrl: null,
      formUrl: null,
      demoUrl: null,
      salesMaterialUrl: null,
      customerPortalUrl: null,
      industry: "IT",
      regionName: null,
      sourceName: "twenty",
      pipelineStatus: "report_ready",
      dealStage: "未対応",
      localizedReportUrls: [],
      sourceScore: 42,
      collectedCount: 2,
      configuredCount: 1,
      missingCount: 1,
      errorCount: 1,
      sourceItems: [
        item({ category: "analysis", status: "collected", label: "Crawl4AI" }),
        item({
          category: "analysis",
          status: "error",
          label: "Stagehand",
          detail: "timeout",
        }),
        item({ category: "list", status: "collected", label: "Twenty" }),
        item({ category: "demo", status: "missing", label: "Astro demo" }),
      ],
      evidence: [],
      intelligence: { signals: [], painPoints: [], nextActions: [] },
      diagnosisSummary: null,
      recommendedOffer: null,
      personalizedHook: null,
      personalizedCTA: null,
      recommendedProducts: [],
      generatedAt: "2026-06-23T00:00:00.000Z",
    } satisfies CompanyKarteSnapshot;

    const payload = twentyCompanyHomePayload(karte);
    expect(payload.paradigmIndustryName).toBeNull();
    expect(payload.paradigmSourceName).toBeNull();
    expect(payload.paradigmSourceCoverage).toBe("42");
    expect(payload.paradigmDataBreakdown).toContain("analysis 1/2 (err 1)");
    expect(payload.paradigmSourceDetailsUrl).toEqual({
      primaryLinkLabel: "50+ API/OSS詳細",
      primaryLinkUrl: expect.stringContaining("/companies"),
    });
    expect(karteHomeSummary(karte)).toContain("無料API/OSS取得データ(50+)");
  });

  it("places the complete unsent Japan Entry draft and modeled numbers in the Twenty company record", () => {
    const message =
      "Hello Acme team,\n\nYour Japanese checkout currently lacks a local payment cue.\n\nWould a 15-minute review be useful?";
    const karte = {
      ...karteWith([], "Acme"),
      companyId: "company-1",
      region: "global",
      domain: "acme.example",
      reportLocale: "en",
      targetCountry: "US",
      templateVariant: "japan_entry",
      reportUrl: null,
      opportunityBriefUrl: "https://paradigmjp.com/en/opportunity/acme-1",
      formUrl: "https://acme.example/contact",
      demoUrl: null,
      salesMaterialUrl: null,
      customerPortalUrl: null,
      industry: "SaaS",
      regionName: null,
      sourceName: "public_signals",
      pipelineStatus: "report_ready",
      dealStage: "未対応",
      localizedReportUrls: [],
      sourceScore: 80,
      collectedCount: 1,
      configuredCount: 0,
      missingCount: 0,
      errorCount: 0,
      evidence: [],
      intelligence: { signals: [], painPoints: [], nextActions: [] },
      diagnosisSummary: null,
      recommendedOffer: "Japan Entry Package",
      personalizedHook: null,
      personalizedCTA: null,
      recommendedProducts: [],
      japanEntry: {
        state: "needs_review",
        message,
        classification: "modeled-estimate",
        estimatedJapanMonthlyVisits: 1_950,
        monthlyOpportunityGapUsd: 10_296,
        qualityScore: 95,
        safetyScore: 100,
        model: "deepseek-v4-pro",
        promptTokens: 2_400,
        completionTokens: 640,
        cacheHitTokens: 1_920,
        cacheMissTokens: 480,
        cacheHitRatio: 0.8,
        generatedAt: "2026-07-13T00:00:00.000Z",
        horizons: [
          { month: 6, roiPercent: -12.5, cumulativeNetBenefitUsd: -1_500 },
          { month: 12, roiPercent: 42.1, cumulativeNetBenefitUsd: 5_052 },
          { month: 24, roiPercent: 164.8, cumulativeNetBenefitUsd: 19_776 },
        ],
      },
      generatedAt: "2026-07-13T00:00:00.000Z",
    } satisfies CompanyKarteSnapshot;

    const payload = twentyCompanyHomePayload(karte);
    const summary = (payload.paradigmKarteSummary as { markdown: string })
      .markdown;
    expect(payload.paradigmIndustryName).toBe("コンサルティング");
    expect(payload.paradigmSourceName).toBeNull();
    expect(payload.paradigmNextAction).toBe(
      "Japan Entry初回フォーム文面を確認（未送信）",
    );
    expect(payload.paradigmReportUrl).toEqual({
      primaryLinkLabel: "Japan Entry Opportunity Brief",
      primaryLinkUrl: "https://paradigmjp.com/en/opportunity/acme-1",
    });
    expect(summary).toContain("運用状態: 未送信・要レビュー");
    expect(summary).toContain("推定日本月間アクセス: 1,950");
    expect(summary).toContain("推定月間機会損失: $10,296");
    expect(summary).toContain(
      "LLMトークン効率: input=2,400 / output=640 / cache=80% (1,920 hit / 480 miss)",
    );
    expect(summary).toContain("6ヶ月 ROI -12.5%");
    expect(summary).toContain("24ヶ月 ROI 164.8%");
    expect(summary).toContain(
      "quality=95 / safety=100 / model=deepseek-v4-pro",
    );
    expect(summary).toContain(message);
  });
});
