import { describe, expect, it } from "vitest"
import { diagnoseQuote, diagnoseQuotes, parseQuoteCsv } from "./diagnosis"

describe("quote recovery diagnosis", () => {
  it("parses Japanese headers, quoted amounts and optional values", () => {
    const result = parseQuoteCsv("見積番号,顧客名,見積日,見積金額,担当者,ステータス\nQ-001,東都工業,2026/06/01,\"1,200,000円\",田中,商談中")
    expect(result.failures).toEqual([])
    expect(result.rows[0]).toMatchObject({ quoteId: "Q-001", companyName: "東都工業", amount: 1_200_000, owner: "田中", status: "open" })
  })

  it("rejects rows without the four minimum fields", () => {
    const result = parseQuoteCsv("見積番号,顧客名,見積日,見積金額\nQ-001,,2026/06/01,500000")
    expect(result.rows).toHaveLength(0)
    expect(result.failures[0].row).toBe(2)
  })

  it("excludes duplicate quote identifiers from monetary totals", () => {
    const result = parseQuoteCsv("見積番号,顧客名,見積日,見積金額\nQ-001,東都工業,2026/06/01,500000\nQ-001,東都工業,2026/06/02,800000")
    expect(result.rows).toHaveLength(1)
    expect(result.failures[0].message).toContain("重複")
  })

  it("prioritizes old high-value quotes with no next action", () => {
    const result = diagnoseQuote({
      quoteId: "Q-009",
      companyName: "関東機械",
      quoteDate: "2026-01-01",
      amount: 8_000_000,
      owner: null,
      lastContactDate: null,
      nextActionDate: null,
      status: "open",
    }, new Date("2026-04-15T00:00:00.000Z"))
    expect(result.priority).toBe("urgent")
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.reasons).toContain("次回アクション未設定")
  })

  it("does not treat won quotes as recovery candidates", () => {
    const diagnosis = diagnoseQuotes([{
      quoteId: "Q-002",
      companyName: "受注済工業",
      quoteDate: "2025-01-01",
      amount: 10_000_000,
      owner: "佐藤",
      lastContactDate: null,
      nextActionDate: null,
      status: "won",
    }], new Date("2026-04-15T00:00:00.000Z"))
    expect(diagnosis.openQuotes).toBe(0)
    expect(diagnosis.candidates).toEqual([])
  })

  it("raises priority when the next action date is overdue", () => {
    const result = diagnoseQuote({
      quoteId: "Q-010",
      companyName: "期限超過工業",
      quoteDate: "2026-03-01",
      amount: 2_000_000,
      owner: "田中",
      lastContactDate: "2026-04-01",
      nextActionDate: "2026-04-10",
      status: "open",
    }, new Date("2026-05-01T00:00:00.000Z"))
    expect(result.reasons).toContain("次回アクション期限超過")
  })
})
