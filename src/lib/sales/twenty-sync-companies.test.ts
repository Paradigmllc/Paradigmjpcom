import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServiceSalesSupabase: vi.fn(),
  fetchCompanyKarte: vi.fn(),
  insertWithOptionalColumns: vi.fn(),
  ensureCompanyProductRecommendations: vi.fn(),
  markRecommendationOpportunityCreated: vi.fn(),
  twentyFetch: vi.fn(),
  requireTwentyAuth: vi.fn(),
  twentyCompanyHomePayload: vi.fn(),
  restoreManualWorkTwentyHome: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getServiceSalesSupabase: mocks.getServiceSalesSupabase,
}));
vi.mock("@/lib/sales/company-karte", () => ({
  fetchCompanyKarte: mocks.fetchCompanyKarte,
}));
vi.mock("@/lib/sales/safe-supabase-insert", () => ({
  insertWithOptionalColumns: mocks.insertWithOptionalColumns,
}));
vi.mock("@/lib/sales/products", () => ({
  ensureCompanyProductRecommendations:
    mocks.ensureCompanyProductRecommendations,
  markRecommendationOpportunityCreated:
    mocks.markRecommendationOpportunityCreated,
}));
vi.mock("./twenty-sync-utils", () => ({
  domainMatches: () => true,
  twentyFetch: mocks.twentyFetch,
  linkField: (label: string, url: string | null) => ({
    primaryLinkLabel: url ? label : "",
    primaryLinkUrl: url ?? "",
  }),
}));
vi.mock("./twenty-sync-summaries", () => ({
  customerHandoffSummary: () => "handoff",
  twentyCompanyHomePayload: mocks.twentyCompanyHomePayload,
}));
vi.mock("./twenty-health", () => ({
  requireTwentyAuth: mocks.requireTwentyAuth,
}));
vi.mock("./manual-work-artifact-authority", () => ({
  restoreManualWorkTwentyHome: mocks.restoreManualWorkTwentyHome,
}));

import { syncCompanyKarteToTwenty } from "./twenty-sync-companies";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getServiceSalesSupabase.mockReturnValue({});
  mocks.fetchCompanyKarte.mockResolvedValue({
    ok: true,
    karte: {
      companyId: "company-1",
      companyName: "Acme",
      domain: "acme.example",
      region: "global",
      reportLocale: "en",
      targetCountry: "US",
      templateVariant: "japan_entry",
      reportUrl: null,
      formUrl: "https://acme.example/contact",
      diagnosisSummary: null,
      recommendedOffer: "Japan Entry Package",
      recommendedProducts: [],
    },
  });
  mocks.twentyCompanyHomePayload.mockReturnValue({
    paradigmKarteSummary: { markdown: "未送信・要レビュー" },
  });
  mocks.insertWithOptionalColumns.mockResolvedValue({ error: null });
  mocks.restoreManualWorkTwentyHome.mockResolvedValue({ protected: false });
  mocks.twentyFetch.mockImplementation(async (path: string) => {
    if (path.startsWith("/rest/companies?")) {
      return {
        ok: true,
        data: { data: { companies: [{ id: "twenty-company-1" }] } },
      };
    }
    if (path === "/rest/companies/twenty-company-1") {
      return { ok: true, data: { data: {} } };
    }
    throw new Error(`Unexpected Twenty API path: ${path}`);
  });
});

describe("syncCompanyKarteToTwenty", () => {
  it("updates only the Twenty company home when opportunity sync is disabled", async () => {
    const result = await syncCompanyKarteToTwenty("company-1", {
      syncOpportunities: false,
    });

    expect(result).toEqual({
      ok: true,
      configured: true,
      companyId: "twenty-company-1",
      homeSynced: true,
      opportunityIds: [],
      recommendationCount: 0,
    });
    expect(mocks.ensureCompanyProductRecommendations).not.toHaveBeenCalled();
    expect(mocks.markRecommendationOpportunityCreated).not.toHaveBeenCalled();
    expect(mocks.twentyFetch).toHaveBeenCalledTimes(2);
    expect(
      mocks.twentyFetch.mock.calls.some(([path]) =>
        String(path).includes("/rest/opportunities"),
      ),
    ).toBe(false);
    expect(mocks.insertWithOptionalColumns).toHaveBeenCalledWith(
      {},
      "sales_sync_logs",
      [
        expect.objectContaining({
          action: "karte_home_sync",
          status: "success",
          payload: expect.objectContaining({ sync_opportunities: false }),
        }),
      ],
      ["pipeline_run_id"],
    );
  });

  it("deletes a newly-created Twenty company when home-field sync fails", async () => {
    mocks.twentyFetch.mockImplementation(
      async (path: string, init?: RequestInit) => {
        if (path.startsWith("/rest/companies?")) {
          return { ok: true, data: { data: { companies: [] } } };
        }
        if (path === "/rest/companies" && init?.method === "POST") {
          return {
            ok: true,
            data: { data: { createCompany: { id: "twenty-new" } } },
          };
        }
        if (path === "/rest/companies/twenty-new" && init?.method === "PATCH") {
          return { ok: false, error: "Twenty API HTTP 503" };
        }
        if (
          path === "/rest/companies/twenty-new" &&
          init?.method === "DELETE"
        ) {
          return { ok: true, data: { data: {} } };
        }
        throw new Error(`Unexpected Twenty API path: ${path}`);
      },
    );

    const result = await syncCompanyKarteToTwenty("company-1", {
      syncOpportunities: false,
    });

    expect(result).toMatchObject({
      ok: false,
      configured: true,
      error: "Twenty API HTTP 503",
    });
    expect(mocks.twentyFetch).toHaveBeenCalledWith(
      "/rest/companies/twenty-new",
      { method: "DELETE" },
    );
  });

  it("preserves and restores /work-owned Twenty home artifacts", async () => {
    mocks.restoreManualWorkTwentyHome.mockResolvedValue({
      protected: true,
      reportUrl: "https://paradigmjp.com/en/work-report/11111111-1111-4111-8111-111111111111",
      workId: "work-1",
    });

    const result = await syncCompanyKarteToTwenty("company-1", {
      syncOpportunities: false,
    });

    expect(result).toMatchObject({ ok: true, homeSynced: true });
    expect(mocks.twentyFetch).toHaveBeenCalledTimes(1);
    expect(mocks.insertWithOptionalColumns).toHaveBeenCalledWith(
      {},
      "sales_sync_logs",
      [expect.objectContaining({
        action: "karte_home_sync",
        payload: expect.objectContaining({
          manual_work_protected: true,
          manual_work_id: "work-1",
          report_url: "https://paradigmjp.com/en/work-report/11111111-1111-4111-8111-111111111111",
        }),
      })],
      ["pipeline_run_id"],
    );
  });
});
