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
  getSalesPipelineTriggerConfig: () => ({
    taskId: "sales-os-pipeline",
    secretKey: null,
    apiUrl: "http://localhost:3010",
    dashboardUrl: null,
    endpoint: "http://localhost:3010/api/v1/tasks/sales-os-pipeline/trigger",
  }),
  updateRun: mocks.updateRun,
}))

import { pullTwentyCompaniesToSupabase } from "./twenty-pull"

interface SupabaseMockOptions {
  existingCompany?: Record<string, unknown> | null
  activeRunId?: string | null
}

function createSupabaseMock(options: SupabaseMockOptions = {}) {
  mocks.batchFindExistingByDomains.mockResolvedValue(
    options.existingCompany ? new Map([["example.jp", options.existingCompany]]) : new Map(),
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

function stubTwentyList() {
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
                domainName: { primaryLinkUrl: "https://www.example.jp" },
                paradigmCountryName: "JP",
              },
            ],
          },
        }),
        { status: 200 },
      ),
    ),
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
})
