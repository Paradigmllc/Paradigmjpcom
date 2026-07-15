import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("./japan-entry-score-service", () => ({
  passesPublicDnsCheck: vi.fn().mockResolvedValue(true),
}))

import { fetchFilteredLargeCsvRows, largeCsvInputFromFieldMapping } from "./lead-source-large-csv"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("large CSV lead source adapter", () => {
  it("streams, filters and de-duplicates official rows by normalized website domain", async () => {
    const csv = [
      'Company,Company Website,Number Employees,UEI,Award Title',
      'Alpha Latest,https://www.alpha.example,24,UEI-1,Commerce platform',
      'Alpha Older,https://alpha.example/about,20,UEI-OLD,Old award',
      'Solo,https://solo.example,1,UEI-2,Software',
      'Enterprise,https://enterprise.example,250,UEI-3,Software',
      'Beta,https://beta.example,80,UEI-4,SaaS',
    ].join("\n")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(csv, {
      status: 200,
      headers: { "content-type": "text/csv", "content-length": String(Buffer.byteLength(csv)) },
    })))

    const result = await fetchFilteredLargeCsvRows({
      sourceUrl: "https://data.example.gov/awards.csv",
      websiteField: "Company Website",
      employeeField: "Number Employees",
      employeeMin: 2,
      employeeMax: 249,
      maxBytes: 1_000_000,
      maxRows: 100,
      maxRecords: 10,
      allowedHosts: ["data.example.gov"],
    })

    expect(result.rawCount).toBe(5)
    expect(result.rows).toHaveLength(2)
    expect(result.rows.map((row) => row.Company)).toEqual(["Alpha Latest", "Beta"])
  })

  it("builds bounded streaming options from a reviewed source mapping", () => {
    expect(largeCsvInputFromFieldMapping("https://data.example.gov/awards.csv", {
      large_csv_stream: "true",
      large_csv_allowed_hosts: "data.example.gov",
      large_csv_website_field: "Company Website",
      large_csv_employee_field: "Number Employees",
      large_csv_employee_min: "2",
      large_csv_employee_max: "249",
      large_csv_max_records: "50000",
    })).toMatchObject({
      websiteField: "Company Website",
      employeeField: "Number Employees",
      employeeMin: 2,
      employeeMax: 249,
      maxRecords: 50_000,
      allowedHosts: ["data.example.gov"],
    })
  })

  it("cancels the response cleanly after the accepted-record cap", async () => {
    const csv = [
      "Company,Company Website,Number Employees",
      "Alpha,https://alpha.example,20",
      "Beta,https://beta.example,30",
    ].join("\n")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(csv, { status: 200 })))

    const result = await fetchFilteredLargeCsvRows({
      sourceUrl: "https://data.example.gov/awards.csv",
      websiteField: "Company Website",
      employeeField: "Number Employees",
      employeeMin: 2,
      employeeMax: 249,
      maxBytes: 1_000_000,
      maxRows: 100,
      maxRecords: 1,
      allowedHosts: ["data.example.gov"],
    })

    expect(result.rows).toHaveLength(1)
  })

  it("rejects mappings that omit an explicit allowed host", () => {
    expect(() => largeCsvInputFromFieldMapping("https://data.example.gov/awards.csv", {
      large_csv_stream: "true",
      large_csv_website_field: "Company Website",
    })).toThrow("allowed hosts")
  })
})
