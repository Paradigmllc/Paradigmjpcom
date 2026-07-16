import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchStartupSgDirectoryRows, startupSgEmployeeUpperBound, startupSgInputFromFieldMapping } from "./lead-source-startupsg"

afterEach(() => {
  vi.unstubAllGlobals()
})

function startup(input: {
  id: string
  name: string
  website?: string
  employees?: string
  inactive?: boolean
  email?: string
  phone?: string
}) {
  return {
    id: input.id,
    uen: `UEN-${input.id}`,
    displayName: input.name,
    website: input.website ? { url: input.website } : null,
    rangeEmployee: { name: input.employees ?? null },
    isInactive: input.inactive ?? false,
    companyDescriptor: "Commerce automation platform",
    sectors: [{ name: "SaaS" }],
    businessModels: [{ name: "B2B" }],
    investmentStage: { name: "Seed" },
    emailAddresses: input.email ? [input.email] : [],
    contactNumber: input.phone ? { number: input.phone } : null,
  }
}

describe("Startup SG lead source adapter", () => {
  it("parses only explicit employee ranges", () => {
    expect(startupSgEmployeeUpperBound("1 - 10")).toBe(10)
    expect(startupSgEmployeeUpperBound({ name: "101 - 200" })).toBe(200)
    expect(startupSgEmployeeUpperBound("Above 200")).toBeNull()
    expect(startupSgEmployeeUpperBound(null)).toBeNull()
  })

  it("paginates, filters to current 1-200 employee companies, deduplicates domains, and discards contact PII", async () => {
    const pages = [
      {
        total: 4,
        data: [
          startup({ id: "1", name: "Alpha Pte Ltd", website: "https://alpha.example", employees: "1 - 10", email: "private@alpha.example", phone: "1234" }),
          startup({ id: "2", name: "Enterprise", website: "https://enterprise.example", employees: "Above 200" }),
        ],
      },
      {
        total: 4,
        data: [
          startup({ id: "3", name: "Alpha Duplicate", website: "https://www.alpha.example/about", employees: "11 - 50" }),
          startup({ id: "4", name: "Beta", website: "https://beta.example", employees: "101 - 200" }),
        ],
      },
    ]
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(pages[0]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(pages[1]), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchStartupSgDirectoryRows({
      sourceUrl: "https://www.startupsg.gov.sg/api/v0/search/profiles/startup",
      maxRecords: 100,
      employeeMax: 200,
      pageSize: 2,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.rawCount).toBe(4)
    expect(result.rows).toEqual([
      expect.objectContaining({ company_name: "Alpha Pte Ltd", employee_count: 10, source_page_url: "https://www.startupsg.gov.sg/profiles/1" }),
      expect.objectContaining({ company_name: "Beta", employee_count: 200, source_page_url: "https://www.startupsg.gov.sg/profiles/4" }),
    ])
    expect(JSON.stringify(result.rows)).not.toContain("private@alpha.example")
    expect(JSON.stringify(result.rows)).not.toContain("1234")
  })

  it("builds bounded options only for the reviewed official adapter", () => {
    expect(startupSgInputFromFieldMapping("https://www.startupsg.gov.sg/api/v0/search/profiles/startup", {
      startup_sg_directory: "true",
      startup_sg_max_records: "4000",
      startup_sg_employee_max: "200",
    })).toMatchObject({ maxRecords: 4_000, employeeMax: 200, pageSize: 100 })
    expect(startupSgInputFromFieldMapping("https://example.com/data", {})).toBeNull()
  })

  it("rejects a lookalike source host", async () => {
    await expect(fetchStartupSgDirectoryRows({
      sourceUrl: "https://startupsg.example/api/v0/search/profiles/startup",
      maxRecords: 100,
      employeeMax: 200,
      pageSize: 100,
    })).rejects.toThrow("official HTTPS startup directory API")
  })
})
