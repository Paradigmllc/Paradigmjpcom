export interface CsvTwentySyncItem {
  row: number
  companyId: string
}

export function resolveCsvTwentySyncLimit(raw = process.env.SALES_CSV_TWENTY_SYNC_LIMIT): number {
  const parsed = Number.parseInt(raw ?? "", 10)
  return Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 100) : 50
}

export function selectCsvTwentySyncBatch(items: CsvTwentySyncItem[], limit: number) {
  const unique = Array.from(new Map(items.map((item) => [item.companyId, item])).values())
  const immediate = unique.slice(0, limit)
  return {
    immediate,
    deferred: Math.max(0, unique.length - immediate.length),
  }
}
