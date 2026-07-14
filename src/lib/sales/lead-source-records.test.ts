import { describe, expect, it } from "vitest"
import { parseLeadSourcePayload, type LeadSourceConfig } from "./lead-source-records"

function config(patch: Partial<LeadSourceConfig> = {}): LeadSourceConfig {
  return {
    id: "source-1",
    name: "Official Exporters",
    country_code: "AU",
    source_type: "export_directory",
    source_url: "https://directory.example/exporters",
    source_format: "csv",
    trust_tier: 3,
    field_mapping: {},
    active: true,
    terms_checked: true,
    last_status: "ready",
    last_error: null,
    last_record_count: 0,
    last_ingested_at: null,
    created_at: "2026-07-14T00:00:00.000Z",
    updated_at: "2026-07-14T00:00:00.000Z",
    ...patch,
  }
}

describe("parseLeadSourcePayload", () => {
  it("parses quoted CSV and rejects rows without company identity or a public domain", () => {
    const parsed = parseLeadSourcePayload([
      "company_name,website_url,employee_count,annual_revenue_usd,is_for_profit,source_page_url",
      '"Acme, Pty Ltd",https://acme.example,11-50,"$1.5M",true,https://directory.example/exporters/acme',
      "Missing Website,,10,1000000,true,https://directory.example/exporters/missing",
      "Local Host,http://localhost:3000,5,200000,true,https://directory.example/exporters/local",
    ].join("\n"), config())

    expect(parsed.rawCount).toBe(3)
    expect(parsed.records).toHaveLength(1)
    expect(parsed.records[0]).toMatchObject({ company_name: "Acme, Pty Ltd", domain: "acme.example", country_code: "AU", employee_count: 50, annual_revenue_usd: 1_500_000, is_for_profit: true })
  })

  it("extracts HTML directory records only through configured DOM selectors", () => {
    const parsed = parseLeadSourcePayload(`
      <article class="member"><h2>Bright Goods</h2><a class="website" href="https://brightgoods.example">Website</a><a class="detail" href="/exporters/bright-goods">Profile</a><span class="employees">18</span></article>
    `, config({
      source_format: "html",
      field_mapping: {
        record_selector: ".member",
        company_name_selector: "h2",
        website_selector: ".website",
        source_page_selector: ".detail",
        employee_count_selector: ".employees",
      },
    }))

    expect(parsed.records[0]).toMatchObject({ company_name: "Bright Goods", domain: "brightgoods.example", employee_count: 18, source_page_url: "https://directory.example/exporters/bright-goods" })
  })
})
