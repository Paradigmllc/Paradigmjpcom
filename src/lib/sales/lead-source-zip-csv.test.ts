import { describe, expect, it } from "vitest"
import { parseZipCsvBuffer, zipCsvInputFromFieldMapping } from "./lead-source-zip-csv"

const FIXTURE_ZIP = "UEsDBBQAAAAIAPc071wDnXkGvAAAAGwBAAAQAAAAb3JnYW5pemF0aW9uLmNzdo2PQQ6CQAxF95yCE0hEV3aliGKCiQE5QCUVJoGZydAx4ukdIMG4MHHV9rd9/VWmQik6ZKHkaQ8SWwI1aq9RK7IUSmUlm95FyVjyQZkW8nMMLhcPwf211+QtYdvoGv1je0ugZtbdJghwkBb0xFY3BPt4blC5IGuUdk0buHvBEthYgksWeSHsiNHfHufpm6tnSpT8poQfygpSNBV9+2kG6S8/K7hj002oNRRSPMh07td5w0rxF2g9WUri3HsDUEsBAhQDFAAAAAgA9zTvXAOdeQa8AAAAbAEAABAAAAAAAAAAAAAAAIABAAAAAG9yZ2FuaXphdGlvbi5jc3ZQSwUGAAAAAAEAAQA+AAAA6gAAAAAA"

describe("lead source ZIP CSV adapter", () => {
  it("parses only rows that satisfy official dataset filters", async () => {
    const rows = await parseZipCsvBuffer(Buffer.from(FIXTURE_ZIP, "base64"), {
      archiveEntry: "organization.csv",
      delimiter: ";",
      requiredFields: ["organisationID", "name", "organizationURL", "contactForm"],
      datasetFilters: [{ field: "SME", value: "true" }, { field: "activityType", value: "PRC" }],
    })

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.name)).toEqual(["Alpha GmbH", "Beta AG"])
  })

  it("builds bounded dataset and country filters from a source pack mapping", () => {
    const input = zipCsvInputFromFieldMapping("https://cordis.europa.eu/data/test.zip", {
      zip_archive_entry: "organization.csv",
      zip_csv_delimiter: ";",
      zip_required_fields: "organisationID,name,organizationURL",
      zip_dataset_filter_1_field: "SME",
      zip_dataset_filter_1_value: "true",
      zip_view_filter_1_field: "country",
      zip_view_filter_1_value: "DE",
    })

    expect(input).toMatchObject({
      archiveEntry: "organization.csv",
      requiredFields: ["organisationID", "name", "organizationURL"],
      datasetFilters: [{ field: "SME", value: "true" }],
      viewFilters: [{ field: "country", value: "DE" }],
    })
  })

  it("fails closed when the configured archive entry is absent", async () => {
    await expect(parseZipCsvBuffer(Buffer.from(FIXTURE_ZIP, "base64"), {
      archiveEntry: "missing.csv",
      delimiter: ";",
      requiredFields: ["name"],
      datasetFilters: [],
    })).rejects.toThrow("does not contain missing.csv")
  })
})
