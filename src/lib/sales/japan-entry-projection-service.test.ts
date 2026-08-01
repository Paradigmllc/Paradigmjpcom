import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServiceSalesSupabase: vi.fn(),
  findCompanyById: vi.fn(),
  buildJapanEntryProjection: vi.fn(),
  generateMessage: vi.fn(),
  companyJapanMarketAudit: vi.fn(),
  syncCompanyKarteToTwenty: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getServiceSalesSupabase: mocks.getServiceSalesSupabase,
}));
vi.mock("./companies", () => ({ findCompanyById: mocks.findCompanyById }));
vi.mock("./japan-entry-projection", () => ({
  buildJapanEntryProjection: mocks.buildJapanEntryProjection,
}));
vi.mock("./japan-entry-personalized-message", () => ({
  generatePersonalizedJapanEntryMessage: mocks.generateMessage,
}));
vi.mock("./company-data-view", () => ({
  companyJapanMarketAudit: mocks.companyJapanMarketAudit,
}));
vi.mock("./twenty-sync-companies", () => ({
  syncCompanyKarteToTwenty: mocks.syncCompanyKarteToTwenty,
}));

import { generateJapanEntryProjection } from "./japan-entry-projection-service";

const companyId = "11111111-1111-4111-8111-111111111111";
const projectionId = "22222222-2222-4222-8222-222222222222";
const initialMessage =
  "Hello Acme team,\n\nWe found a Japan-specific checkout gap.\n\nWould a 15-minute review be useful?";

const baseProjection = {
  modelVersion: "public-opportunity-v1",
  generatedAt: "2026-07-13T00:00:00.000Z",
  classification: "modeled-estimate",
  estimatedMonthlyVisits: 130_000,
  monthlyVisitRange: { low: 45_000, high: 350_000 },
  markets: [
    {
      code: "JP",
      label: "Japan",
      estimatedMonthlyVisits: 1_950,
      share: 0.015,
      confidence: 0.35,
      classification: "estimated",
    },
  ],
  assumptions: {
    businessModel: "ecommerce",
    averageOrderValueUsd: 110,
    conversionRate: 0.018,
    grossMargin: 0.55,
    currentJapanShare: 0.015,
    targetJapanShareMonth24: 0.055,
    monthlyManagedFeeUsdAfterMonth6: null,
    setupFeeUsd: 12_000,
  },
  scenarios: [],
  monthlyOpportunityGapUsd: 10_296,
  paybackMonth: 14,
  evidence: [],
  limitations: [],
};

function createSupabaseMock(options: { statusPersistenceError?: string } = {}) {
  const rpc = vi
    .fn()
    .mockResolvedValueOnce({ error: null })
    .mockResolvedValueOnce({
      error: options.statusPersistenceError
        ? { message: options.statusPersistenceError }
        : null,
    });
  const stored = {
    id: projectionId,
    company_id: companyId,
    status: "needs_review",
    projection: baseProjection,
    initial_message: initialMessage,
    created_at: "2026-07-13T00:00:01.000Z",
  };
  const from = vi.fn((table: string) => {
    const chain = {
      insert: vi.fn(() => chain),
      select: vi.fn(() => chain),
      single: vi.fn(async () => ({ data: stored, error: null })),
      delete: vi.fn(() => chain),
      eq: vi.fn(() => chain),
    };
    if (table !== "sales_japan_entry_projections") {
      throw new Error(`Unexpected table: ${table}`);
    }
    return chain;
  });
  return { client: { from, rpc }, rpc };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.findCompanyById.mockResolvedValue({
    id: companyId,
    company_name: "Acme",
    domain: "acme.example",
    slug: "acme",
    report_locale: "en",
    industry: "ecommerce",
    target_country: "US",
    meta: {
      html_description: "Acme sells premium travel products online.",
      smb_signals: {
        marketVisibility: {
          version: "public-signals-v1",
          band: "top-100k",
          evidence: [],
        },
      },
    },
  });
  mocks.buildJapanEntryProjection.mockReturnValue(baseProjection);
  mocks.companyJapanMarketAudit.mockReturnValue({});
  mocks.generateMessage.mockResolvedValue({
    ok: true,
    message: initialMessage,
    review: {
      model: "deepseek-v4-pro",
      score: 95,
      safetyScore: 100,
      wordCount: 80,
      observedFactIds: ["fact-1"],
      attempts: 2,
      editorialScores: {
        specificity: 24,
        naturalness: 24,
        credibility: 24,
        executiveRelevance: 23,
      },
      rationale: "Specific and grounded",
      riskFlags: [],
    },
    usage: {
      prompt_tokens: 2_400,
      completion_tokens: 640,
      cache_hit_tokens: 1_920,
      cache_miss_tokens: 480,
    },
  });
});

describe("generateJapanEntryProjection Twenty sync", () => {
  it("syncs the saved review draft to Twenty without creating opportunities or sending it", async () => {
    const supabase = createSupabaseMock();
    mocks.getServiceSalesSupabase.mockReturnValue(supabase.client);
    mocks.syncCompanyKarteToTwenty.mockResolvedValue({
      ok: true,
      configured: true,
      companyId: "twenty-company-1",
      homeSynced: true,
      opportunityIds: [],
      recommendationCount: 0,
    });

    const result = await generateJapanEntryProjection(companyId);

    expect(mocks.syncCompanyKarteToTwenty).toHaveBeenCalledWith(companyId, {
      syncOpportunities: false,
    });
    expect(result).toMatchObject({
      ok: true,
      opportunityBriefUrl: "https://paradigmjp.com/en/opportunity/acme",
      projection: {
        id: projectionId,
        status: "needs_review",
        initial_message: initialMessage,
      },
      twentySync: {
        ok: true,
        status: "synced",
        projectionId,
        companyId: "twenty-company-1",
        homeSynced: true,
        sent: false,
      },
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, "sales_atomic_meta_merge", {
      p_company_id: companyId,
      p_patch: expect.objectContaining({
        japan_entry_opportunity_url:
          "https://paradigmjp.com/en/opportunity/acme",
      }),
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, "sales_atomic_meta_merge", {
      p_company_id: companyId,
      p_patch: {
        japan_entry_twenty_sync: expect.objectContaining({
          status: "synced",
          twenty_company_id: "twenty-company-1",
          projection_id: projectionId,
          sent: false,
        }),
      },
    });
  });

  it("keeps the generated draft and records a visible failed sync for safe retry", async () => {
    const supabase = createSupabaseMock();
    mocks.getServiceSalesSupabase.mockReturnValue(supabase.client);
    mocks.syncCompanyKarteToTwenty.mockResolvedValue({
      ok: false,
      configured: true,
      error: "Twenty API HTTP 503",
    });

    const result = await generateJapanEntryProjection(companyId);

    expect(result).toMatchObject({
      ok: true,
      projection: { id: projectionId },
      twentySync: {
        ok: false,
        configured: true,
        status: "failed",
        error: "Twenty API HTTP 503",
        sent: false,
      },
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, "sales_atomic_meta_merge", {
      p_company_id: companyId,
      p_patch: {
        japan_entry_twenty_sync: expect.objectContaining({
          status: "failed",
          error: "Twenty API HTTP 503",
          sent: false,
        }),
      },
    });
  });

  it("surfaces sync-status persistence errors instead of silently reporting full success", async () => {
    const supabase = createSupabaseMock({
      statusPersistenceError: "database unavailable",
    });
    mocks.getServiceSalesSupabase.mockReturnValue(supabase.client);
    mocks.syncCompanyKarteToTwenty.mockResolvedValue({
      ok: true,
      configured: true,
      homeSynced: true,
    });

    const result = await generateJapanEntryProjection(companyId);

    expect(result.twentySync).toMatchObject({
      ok: true,
      status: "synced",
      statusPersistenceError: "database unavailable",
      sent: false,
    });
  });

  it("reuses the same saved report on a job retry and only retries Twenty sync", async () => {
    const existing = {
      id: projectionId,
      company_id: companyId,
      status: "needs_review",
      projection: baseProjection,
      initial_message: initialMessage,
      idempotency_key: "report-job:job-1",
      created_at: "2026-07-13T00:00:01.000Z",
    };
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => ({ data: existing, error: null })),
      };
      return chain;
    });
    mocks.getServiceSalesSupabase.mockReturnValue({ from, rpc });
    mocks.syncCompanyKarteToTwenty.mockResolvedValue({
      ok: true,
      configured: true,
      companyId: "twenty-company-1",
      homeSynced: true,
    });

    const result = await generateJapanEntryProjection(companyId, {
      idempotencyKey: "report-job:job-1",
    });

    expect(result.projection?.id).toBe(projectionId);
    expect(mocks.generateMessage).not.toHaveBeenCalled();
    expect(mocks.buildJapanEntryProjection).not.toHaveBeenCalled();
    expect(mocks.syncCompanyKarteToTwenty).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledTimes(1);
  });
});
