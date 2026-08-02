export type QuoteStatus = "open" | "won" | "lost"

export type QuoteInput = {
  quoteId: string
  companyName: string
  quoteDate: string
  amount: number
  owner: string | null
  lastContactDate: string | null
  nextActionDate: string | null
  status: QuoteStatus
}

export type RecoveryPriority = "urgent" | "high" | "watch" | "closed"

export type DiagnosedQuote = QuoteInput & {
  ageDays: number
  score: number
  priority: RecoveryPriority
  reasons: string[]
}

export type QuoteRecoveryDiagnosis = {
  generatedAt: string
  sourceRows: number
  openQuotes: number
  openAmount: number
  staleQuotes: number
  staleAmount: number
  missingNextAction: number
  unassignedQuotes: number
  buckets: Array<{ label: string; count: number; amount: number }>
  candidates: DiagnosedQuote[]
}

export type CsvParseFailure = {
  row: number
  message: string
}

export type CsvParseResult = {
  rows: QuoteInput[]
  failures: CsvParseFailure[]
  detectedHeaders: string[]
}
