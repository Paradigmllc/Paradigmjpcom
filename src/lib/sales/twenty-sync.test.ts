import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getServiceSalesSupabase: vi.fn(),
  batchFindExistingByDomains: vi.fn(),
  upsertCompanyByDomain: vi.fn(),
}))

vi.mock("@/lib/supabase", () => ({
  getServiceSalesSupabase: mocks.getServiceSalesSupabase,
}))

vi.mock("@/lib/sales/companies", () => ({
  batchFindExistingByDomains: mocks.batchFindExistingByDomains,
  upsertCompanyByDomain: mocks.upsertCompanyByDomain,
}))

import { pullTwentyCompaniesToSupabase } from "./twenty-pull"

interface SupabaseMockOptions {
  existingCompany?: Record<string, unknown> | null
  existingDomain?: string
}

function createSupabaseMock(options: SupabaseMockOptions = {}) {
  mocks.batchFindExistingByDomains.mockResolvedValue(
    options.existingCompany ? new Map([[options.existingDomain ?? "example.jp", options.existingCompany]]) : new Map(),
  )

  const calls = {
    companyUpdates: [] as Record<string, unknown>[],
    insertedTables: [] as string[],
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
        calls.insertedTables.push(table)
        if (table === "sales_sync_logs" && !Array.isArray(payload)) {
          calls.syncLogInserts.push(payload as Record<string, unknown>)
        }
        return chain
      }),
      maybeSingle: vi.fn(async () => {
        if (table === "sales_companies") return { data: options.existingCompany ?? null, error: null }
        return { data: null, error: null }
      }),
      single: vi.fn(async () => {
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
  it("creates a pending Supabase company without a report or pipeline", async () => {
    stubTwentyList()
    const supabase = createSupabaseMock()
    mocks.getServiceSalesSupabase.mockReturnValue(supabase.client)
    mocks.upsertCompanyByDomain.mockResolvedValue({
      ok: true,
      company: {
        id: "company-1",
        report_url: null,
        pipeline_status: "pending",
      },
    })

    const result = await pullTwentyCompaniesToSupabase(10)

    expect(result.created).toBe(1)
    expect(mocks.upsertCompanyByDomain).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: "example.jp",
        company_name: "Example Co",
        source: "twenty",
        pipeline_status: "pending",
        generate_report_url: false,
      }),
    )
    expect(supabase.calls.insertedTables).not.toContain("sales_pipeline_runs")
    expect(supabase.calls.insertedTables).not.toContain("sales_pipeline_steps")
  })

  it("routes foreign ccTLD companies without pre-generating a report URL", async () => {
    stubTwentyList({ paradigmCountryName: null }, "https://www.smesouthafrica.co.za")
    const supabase = createSupabaseMock()
    mocks.getServiceSalesSupabase.mockReturnValue(supabase.client)
    mocks.upsertCompanyByDomain.mockResolvedValue({
      ok: true,
      company: {
        id: "company-za",
        report_url: null,
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
        generate_report_url: false,
      }),
    )
  })

  it("repairs foreign routing metadata without rewriting its report URL", async () => {
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
    })
    expect(supabase.calls.companyUpdates[0]).not.toHaveProperty("report_url")
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

    const result = await pullTwentyCompaniesToSupabase(10)

    expect(result.updated).toBe(1)
    expect(supabase.calls.insertedTables).not.toContain("sales_pipeline_runs")
    expect(supabase.calls.insertedTables).not.toContain("sales_pipeline_steps")
  })

  it("dry-runs Twenty intake without writing companies, sync logs, or pipeline runs", async () => {
    stubTwentyList()
    const supabase = createSupabaseMock()
    mocks.getServiceSalesSupabase.mockReturnValue(supabase.client)

    const result = await pullTwentyCompaniesToSupabase(10, { dryRun: true })

    expect(result.dryRun).toBe(true)
    expect(result.created).toBe(1)
    expect(mocks.upsertCompanyByDomain).not.toHaveBeenCalled()
    expect(supabase.calls.syncLogInserts).toHaveLength(0)
    expect(supabase.calls.insertedTables).not.toContain("sales_pipeline_runs")
    expect(supabase.calls.insertedTables).not.toContain("sales_pipeline_steps")
  })

  it("ignores invalid Twenty URLs without enqueuing report regeneration", async () => {
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

    const result = await pullTwentyCompaniesToSupabase(10)

    expect(result.updated).toBe(1)
    expect(result.failures?.map((failure) => failure.reason).join("\n")).toContain("invalid Twenty report URL ignored")
    expect(result.failures?.map((failure) => failure.reason).join("\n")).toContain("invalid Twenty form URL ignored")
    expect(supabase.calls.companyUpdates[0]).not.toHaveProperty("report_url", "https://wrong.example/report/demo")
    expect(supabase.calls.insertedTables).not.toContain("sales_pipeline_runs")
    expect(supabase.calls.insertedTables).not.toContain("sales_pipeline_steps")
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
