import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getServiceSalesSupabase: vi.fn(),
  batchFindExistingByDomains: vi.fn(),
  upsertCompanyByDomain: vi.fn(),
  updateRun: vi.fn(),
}))

vi.mock("@/lib/supabase", () => ({
  getServiceSalesSupabase: mocks.getServiceSalesSupabase,
}))

vi.mock("@/lib/sales/companies", () => ({
  batchFindExistingByDomains: mocks.batchFindExistingByDomains,
  upsertCompanyByDomain: mocks.upsertCompanyByDomain,
}))

vi.mock("./sales-pipeline-helpers", () => ({
  buildSalesPipelinePlan: () => [
    { key: "twenty_csv_intake", label: "Twenty/CSV intake", ownerTool: "twenty_or_csv", required: true },
    { key: "supabase_normalize", label: "Supabase normalization", ownerTool: "supabase", required: true },
  ],
  getPipelineOrchestratorConfig: () => ({
    provider: "openclaw",
    taskId: "openclaw-pipeline",
    ready: true,
    endpoint: null,
    secretKey: null,
    apiUrl: "",
    dashboardUrl: null,
  }),
  updateRun: mocks.updateRun,
}))

import { pullTwentyCompaniesToSupabase } from "./twenty-pull"

interface SupabaseMockOptions {
  existingCompany?: Record<string, unknown> | null
  existingDomain?: string
  activeRunId?: string | null
}

function createSupabaseMock(options: SupabaseMockOptions = {}) {
  mocks.batchFindExistingByDomains.mockResolvedValue(
    options.existingCompany ? new Map([[options.existingDomain ?? "example.jp", options.existingCompany]]) : new Map(),
  )

  const calls = {
    companyUpdates: [] as Record<string, unknown>[],
    runInserts: [] as Record<string, unknown>[],
    stepInserts: [] as Record<string, unknown>[][],
    syncLogInserts: [] as Record<string, unknown>[],
  }

  const from = vi.fn((table: string) => {
    let insertPayload: unknown = null

    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      update: vi.fn((payload: Record<string, unknown>) => {
        if (table === "sales_companies") calls.companyUpdates.push(payload)
        return chain
      }),
      insert: vi.fn((payload: unknown) => {
        insertPayload = payload
        if (table === "sales_pipeline_runs" && !Array.isArray(payload)) {
          calls.runInserts.push(payload as Record<string, unknown>)
        }
        if (table === "sales_pipeline_steps" && Array.isArray(payload)) {
          calls.stepInserts.push(payload as Record<string, unknown>[])
        }
        if (table === "sales_sync_logs" && !Array.isArray(payload)) {
          calls.syncLogInserts.push(payload as Record<string, unknown>)
        }
        return chain
      }),
      maybeSingle: vi.fn(async () => {
        if (table === "sales_companies") return { data: options.existingCompany ?? null, error: null }
        if (table === "sales_pipeline_runs") {
          return { data: options.activeRunId ? { id: options.activeRunId } : null, error: null }
        }
        return { data: null, error: null }
      }),
      single: vi.fn(async () => {
        if (table === "sales_pipeline_runs") return { data: { id: "run-1" }, error: null }
        return { data: insertPayload, error: null }
      }),
    }

    return chain
  })

  return { client: { from }, calls }
}

function stubTwentyList(companyPatch: Record<string, unknown> = {}, domain = "https://www.example.jp") {
  vi.stubEnv("TWENTY_BASE_URL", "https://twenty.example.com")
  vi.stubEnv("TWENTY_API_KEY", "test-key")
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            companies: [
              {
                id: "twenty-company-1",
                name: "Example Co",
                domainName: { primaryLinkUrl: domain },
                paradigmCountryName: "JP",
                ...companyPatch,
              },
            ],
          },
        }),
        { status: 200 },
      ),
    ),
  )
}

function stubTwentyPages() {
  vi.stubEnv("TWENTY_BASE_URL", "https://twenty.example.com")
  vi.stubEnv("TWENTY_API_KEY", "test-key")
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const companies = url.includes("cursor=cursor-2")
        ? [
            {
              id: "twenty-company-2",
              name: "Second Co",
              domainName: { primaryLinkUrl: "https://second.example.jp" },
              paradigmCountryName: "JP",
            },
          ]
        : [
            {
              id: "twenty-company-1",
              name: "First Co",
              domainName: { primaryLinkUrl: "https://first.example.jp" },
              paradigmCountryName: "JP",
            },
          ]
      const pageInfo = url.includes("cursor=cursor-2")
        ? { hasNextPage: false }
        : { hasNextPage: true, nextCursor: "cursor-2" }

      return new Response(
        JSON.stringify({
          data: {
            companies,
            pageInfo,
          },
        }),
        { status: 200 },
      )
    }),
  )
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe("pullTwentyCompaniesToSupabase", () => {
  it("creates a Supabase company and Sales OS pipeline run for a new Twenty company", async () => {
    stubTwentyList()
    const supabase = createSupabaseMock()
    mocks.getServiceSalesSupabase.mockReturnValue(supabase.client)
    mocks.upsertCompanyByDomain.mockResolvedValue({
      ok: true,
      company: {
        id: "company-1",
        report_url: "https://paradigmjp.com/ja/report/example",
        pipeline_status: "scanning",
      },
    })

    const result = await pullTwentyCompaniesToSupabase(10, { autoRunPipeline: true, dispatchPipeline: false })

    expect(result.created).toBe(1)
    expect(result.pipelineRunsCreated).toBe(1)
    expect(result.pipelineRunsDispatched).toBe(0)
    expect(mocks.upsertCompanyByDomain).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: "example.jp",
        company_name: "Example Co",
        source: "twenty",
        pipeline_status: "scanning",
      }),
    )
    expect(supabase.calls.runInserts[0]).toMatchObject({
      company_id: "company-1",
      source: "twenty",
      requested_by: "twenty_sync",
    })
    expect(supabase.calls.stepInserts[0]).toHaveLength(2)
  })

  it("routes foreign ccTLD companies to global Japan-entry reports", async () => {
    stubTwentyList({ paradigmCountryName: null }, "https://www.smesouthafrica.co.za")
    const supabase = createSupabaseMock()
    mocks.getServiceSalesSupabase.mockReturnValue(supabase.client)
    mocks.upsertCompanyByDomain.mockResolvedValue({
      ok: true,
      company: {
        id: "company-za",
        report_url: "https://paradigmjp.com/en/report/smesouthafrica",
        pipeline_status: "pending",
      },
    })

    const result = await pullTwentyCompaniesToSupabase(10)

    expect(result.created).toBe(1)
    expect(mocks.upsertCompanyByDomain).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: "smesouthafrica.co.za",
        region: "global",
        report_locale: "en",
        target_country: "ZA",
        template_variant: "japan_entry",
      }),
    )
  })

  it("repairs existing foreign companies that were previously saved as ja website reports", async () => {
    stubTwentyList({ paradigmCountryName: null }, "https://www.smesouthafrica.co.za")
    const supabase = createSupabaseMock({
      existingDomain: "smesouthafrica.co.za",
      existingCompany: {
        id: "company-za",
        slug: "smesouthafrica-abc123",
        meta: {},
        region: "jp",
        report_locale: "ja",
        target_country: "JP",
        template_variant: "website_diagnostic",
        pipeline_status: "report_ready",
        report_url: "https://paradigmjp.com/ja/report/smesouthafrica-abc123",
        detected_issues: [],
      },
    })
    mocks.getServiceSalesSupabase.mockReturnValue(supabase.client)

    const result = await pullTwentyCompaniesToSupabase(10)

    expect(result.updated).toBe(1)
    expect(supabase.calls.companyUpdates[0]).toMatchObject({
      region: "global",
      report_locale: "en",
      target_country: "ZA",
      template_variant: "japan_entry",
      report_url: "https://paradigmjp.com/en/report/smesouthafrica-abc123",
    })
  })

  it("does not auto-create pipeline runs unless explicitly requested", async () => {
    stubTwentyList()
    const supabase = createSupabaseMock()
    mocks.getServiceSalesSupabase.mockReturnValue(supabase.client)
    mocks.upsertCompanyByDomain.mockResolvedValue({
      ok: true,
      company: {
        id: "company-1",
        report_url: "https://paradigmjp.com/ja/report/example",
        pipeline_status: "pending",
      },
    })

    const result = await pullTwentyCompaniesToSupabase(10)

    expect(result.created).toBe(1)
    expect(result.pipelineRunsCreated).toBe(0)
    expect(supabase.calls.runInserts).toHaveLength(0)
  })

  it("never creates a pipeline for a list-only company pulled back from Twenty", async () => {
    stubTwentyList()
    const supabase = createSupabaseMock({
      existingCompany: {
        id: "company-list-only",
        meta: { list_only: true, skip_enrichment: true },
        pipeline_status: "pending",
        report_url: null,
      },
    })
    mocks.getServiceSalesSupabase.mockReturnValue(supabase.client)

    const result = await pullTwentyCompaniesToSupabase(10, { autoRunPipeline: true })

    expect(result.updated).toBe(1)
    expect(result.pipelineRunsCreated).toBe(0)
    expect(result.pipelineRunsReused).toBe(0)
    expect(supabase.calls.runInserts).toHaveLength(0)
  })

  it("dry-runs Twenty intake without writing companies, sync logs, or pipeline runs", async () => {
    stubTwentyList()
    const supabase = createSupabaseMock()
    mocks.getServiceSalesSupabase.mockReturnValue(supabase.client)

    const result = await pullTwentyCompaniesToSupabase(10, { autoRunPipeline: true, dryRun: true })

    expect(result.dryRun).toBe(true)
    expect(result.created).toBe(1)
    expect(result.pipelineRunsCreated).toBe(1)
    expect(mocks.upsertCompanyByDomain).not.toHaveBeenCalled()
    expect(supabase.calls.syncLogInserts).toHaveLength(0)
    expect(supabase.calls.runInserts).toHaveLength(0)
  })

  it("reuses an active pipeline run instead of creating duplicates", async () => {
    stubTwentyList()
    const supabase = createSupabaseMock({
      existingCompany: {
        id: "company-1",
        meta: {},
        pipeline_status: "scanning",
        report_url: "https://paradigmjp.com/ja/report/example",
      },
      activeRunId: "run-existing",
    })
    mocks.getServiceSalesSupabase.mockReturnValue(supabase.client)

    const result = await pullTwentyCompaniesToSupabase(10, { autoRunPipeline: true })

    expect(result.updated).toBe(1)
    expect(result.pipelineRunsReused).toBe(1)
    expect(result.pipelineRunsCreated).toBe(0)
    expect(supabase.calls.runInserts).toHaveLength(0)
  })

  it("ignores invalid Twenty URLs and requeues existing companies for regeneration", async () => {
    stubTwentyList({
      paradigmReportUrl: { primaryLinkUrl: "https://wrong.example/report/demo" },
      paradigmFormUrl: { primaryLinkUrl: "https://other.example/contact" },
      paradigmSourceCoverage: 10,
    })
    const supabase = createSupabaseMock({
      existingCompany: {
        id: "company-1",
        meta: {},
        pipeline_status: "report_ready",
        report_url: "https://paradigmjp.com/ja/report/example",
      },
    })
    mocks.getServiceSalesSupabase.mockReturnValue(supabase.client)

    const result = await pullTwentyCompaniesToSupabase(10, { autoRunPipeline: true, dispatchPipeline: false })

    expect(result.updated).toBe(1)
    expect(result.pipelineRunsCreated).toBe(1)
    expect(result.failures?.map((failure) => failure.reason).join("\n")).toContain("invalid Twenty report URL ignored")
    expect(result.failures?.map((failure) => failure.reason).join("\n")).toContain("invalid Twenty form URL ignored")
    expect(supabase.calls.companyUpdates[0]).not.toHaveProperty("report_url", "https://wrong.example/report/demo")
  })

  it("pulls multiple Twenty pages without dropping records beyond the first page", async () => {
    stubTwentyPages()
    const supabase = createSupabaseMock()
    mocks.getServiceSalesSupabase.mockReturnValue(supabase.client)
    mocks.upsertCompanyByDomain
      .mockResolvedValueOnce({
        ok: true,
        company: {
          id: "company-first",
          report_url: "https://paradigmjp.com/ja/report/first",
          pipeline_status: "pending",
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        company: {
          id: "company-second",
          report_url: "https://paradigmjp.com/ja/report/second",
          pipeline_status: "pending",
        },
      })

    const result = await pullTwentyCompaniesToSupabase(2, { pageSize: 1 })

    expect(result.scanned).toBe(2)
    expect(result.created).toBe(2)
    expect(mocks.upsertCompanyByDomain).toHaveBeenCalledWith(expect.objectContaining({ domain: "first.example.jp" }))
    expect(mocks.upsertCompanyByDomain).toHaveBeenCalledWith(expect.objectContaining({ domain: "second.example.jp" }))
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
