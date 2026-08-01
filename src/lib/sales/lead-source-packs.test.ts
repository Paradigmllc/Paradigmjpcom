import { describe, expect, it } from "vitest"
import { getLeadSourcePack, listLeadSourcePacks } from "./lead-source-packs"

describe("lead source packs", () => {
  it("covers the priority regions with bounded, versioned, reproducible queries", () => {
    const packs = listLeadSourcePacks()

    expect(packs.map((pack) => pack.countryCode)).toEqual(expect.arrayContaining(["US", "GB", "AU", "SG", "AE"]))
    expect(new Set(packs.map((pack) => pack.id)).size).toBe(packs.length)
    expect(packs).toHaveLength(120)
    expect(packs.every((pack) => pack.version === 1 && pack.maxRecords <= 50_000)).toBe(true)
    expect(packs.every((pack) => /^[a-f0-9]{64}$/.test(pack.querySha256))).toBe(true)
  })

  it("includes the public SBIR bulk dataset without ingesting contact PII", () => {
    const pack = getLeadSourcePack("sbir-public-awards-official-sme-us")
    if (!pack) throw new Error("SBIR source pack is missing")

    expect(pack).toMatchObject({ sourceFormat: "csv", trustTier: 3, maxRecords: 50_000 })
    expect(pack.sourceUrl).toBe("https://data.www.sbir.gov/mod_awarddatapublic_no_abstract/award_data_no_abstract.csv")
    expect(pack.fieldMapping).toMatchObject({
      large_csv_stream: "true",
      large_csv_website_field: "Company Website",
      large_csv_employee_field: "Number Employees",
      large_csv_employee_min: "2",
      large_csv_employee_max: "249",
      company_name: "Company",
      website_url: "Company Website",
    })
    expect(pack.fieldMapping).not.toHaveProperty("contact_name")
    expect(pack.fieldMapping).not.toHaveProperty("contact_email")
    expect(pack.criteria.join(" ")).toContain("ライブサイト")
  })

  it("includes the official Startup SG directory with bounded SMB and no-contact-PII mapping", () => {
    const pack = getLeadSourcePack("startup-sg-official-startup-directory-sg")
    if (!pack) throw new Error("Startup SG source pack is missing")

    expect(pack).toMatchObject({ sourceType: "official_directory", sourceFormat: "json", trustTier: 3, maxRecords: 4_000 })
    expect(pack.sourceUrl).toContain("www.startupsg.gov.sg/api/v0/search/profiles/startup")
    expect(pack.fieldMapping).toMatchObject({
      startup_sg_directory: "true",
      startup_sg_page_size: "100",
      startup_sg_employee_max: "200",
      company_name: "company_name",
      website_url: "website_url",
      employee_count: "employee_count",
    })
    expect(pack.fieldMapping).not.toHaveProperty("email")
    expect(pack.fieldMapping).not.toHaveProperty("phone")
    expect(pack.criteria.join(" ")).toContain("日本未進出")
  })

  it("uses bounded Common Crawl shards without treating URL text as final qualification", () => {
    const pack = getLeadSourcePack("common-crawl-cc-main-2026-25-saas-gb")
    if (!pack) throw new Error("Common Crawl source pack is missing")

    expect(pack).toMatchObject({ sourceFormat: "jsonl", trustTier: 2, maxRecords: 5_000 })
    expect(pack.sourceUrl).toContain("index.commoncrawl.org/CC-MAIN-2026-25-index")
    expect(pack.fieldMapping).toMatchObject({
      common_crawl_domain_signal: "true",
      common_crawl_signal: "saas",
      common_crawl_pages: "0,1,2,3,4,5,6,7,8,9,10,11,12,13,14",
      common_crawl_max_records: "5000",
      contact_page_url: "contact_page_url",
      offer_page_url: "offer_page_url",
    })
    expect(pack.criteria.join(" ")).toContain("ライブサイト品質ゲート")
    expect(pack.licenseUrl).toBe("https://commoncrawl.org/terms-of-use")
  })

  it("includes official CORDIS SME packs with bounded ZIP extraction", () => {
    const pack = getLeadSourcePack("cordis-horizon-2020-official-sme-de")
    if (!pack) throw new Error("CORDIS source pack is missing")

    expect(pack).toMatchObject({ sourceFormat: "zip_csv", trustTier: 3, maxRecords: 5_000 })
    expect(pack.sourceUrl).toBe("https://cordis.europa.eu/data/cordis-h2020projects-csv.zip")
    expect(pack.fieldMapping).toMatchObject({
      zip_archive_entry: "organization.csv",
      zip_dataset_filter_1_field: "SME",
      zip_dataset_filter_1_value: "true",
      zip_dataset_filter_2_field: "activityType",
      zip_dataset_filter_2_value: "PRC",
      zip_view_filter_1_value: "DE",
      is_sme_constant: "true",
      is_for_profit_constant: "true",
    })
  })

  it("requires objective SMB, industry, identity and dissolution evidence", () => {
    const pack = getLeadSourcePack("wikidata-cc0-commerce-software-us")
    if (!pack) throw new Error("US source pack is missing")
    const query = new URL(pack.sourceUrl).searchParams.get("query") ?? ""

    expect(query).toContain("?employees >= 2 && ?employees <= 249")
    expect(query).toContain("wdt:P452 ?industry")
    expect(query).toContain("wdt:P856 ?website")
    expect(query).toContain('!CONTAINS(LCASE(STR(?website)), "web.archive.org")')
    expect(query).toContain("FILTER NOT EXISTS { ?company wdt:P576 ?dissolved }")
    expect(query).toContain("LIMIT 250")
    expect(pack.fieldMapping.source_page_allowed_hosts).toBe("www.wikidata.org")
    expect(pack.licenseName).toContain("CC0")
  })

  it("returns copies so an API consumer cannot mutate the catalog", () => {
    const first = getLeadSourcePack("wikidata-cc0-commerce-software-gb")
    if (!first) throw new Error("GB source pack is missing")
    first.fieldMapping.company_name = "tampered"

    expect(getLeadSourcePack(first.id)?.fieldMapping.company_name).toBe("companyName")
  })
})
