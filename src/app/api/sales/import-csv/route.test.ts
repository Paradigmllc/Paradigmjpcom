import { describe, expect, it } from "vitest"
import { resolveCsvTwentySyncLimit, selectCsvTwentySyncBatch } from "@/lib/sales/import-csv-twenty-sync"

describe("CSV import Twenty writeback guard", () => {
  it("deduplicates company ids and defers rows over the bounded sync limit", () => {
    const selected = selectCsvTwentySyncBatch(
      [
        { row: 0, companyId: "company-a" },
        { row: 1, companyId: "company-a" },
        { row: 2, companyId: "company-b" },
        { row: 3, companyId: "company-c" },
      ],
      2,
    )

    expect(selected.immediate).toEqual([
      { row: 1, companyId: "company-a" },
      { row: 2, companyId: "company-b" },
    ])
    expect(selected.deferred).toBe(1)
  })

  it("keeps the sync limit bounded for route maxDuration", () => {
    expect(resolveCsvTwentySyncLimit(undefined)).toBe(50)
    expect(resolveCsvTwentySyncLimit("0")).toBe(50)
    expect(resolveCsvTwentySyncLimit("10")).toBe(10)
    expect(resolveCsvTwentySyncLimit("500")).toBe(100)
  })
})
