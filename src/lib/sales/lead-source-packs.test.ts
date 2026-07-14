import { describe, expect, it } from "vitest"
import { getLeadSourcePack, listLeadSourcePacks } from "./lead-source-packs"

describe("lead source packs", () => {
  it("covers the priority regions with bounded, versioned, reproducible queries", () => {
    const packs = listLeadSourcePacks()

    expect(packs.map((pack) => pack.countryCode)).toEqual(expect.arrayContaining(["US", "GB", "AU", "SG", "AE"]))
    expect(new Set(packs.map((pack) => pack.id)).size).toBe(packs.length)
    expect(packs).toHaveLength(40)
    expect(packs.every((pack) => pack.version === 1 && pack.maxRecords <= 5_000)).toBe(true)
    expect(packs.every((pack) => /^[a-f0-9]{64}$/.test(pack.querySha256))).toBe(true)
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
