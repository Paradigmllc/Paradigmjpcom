import type {
  CsvParseResult,
  DiagnosedQuote,
  QuoteInput,
  QuoteRecoveryDiagnosis,
  QuoteStatus,
} from "./types"

const HEADER_ALIASES = {
  quoteId: ["見積番号", "見積id", "見積ID", "quote_id", "quoteid", "id"],
  companyName: ["顧客名", "会社名", "取引先", "得意先", "company", "company_name", "customer"],
  quoteDate: ["見積日", "提出日", "作成日", "quote_date", "date"],
  amount: ["見積金額", "金額", "合計", "amount", "total"],
  owner: ["担当者", "営業担当", "owner", "assignee"],
  lastContactDate: ["最終接触日", "最終連絡日", "last_contact_date", "last_contact"],
  nextActionDate: ["次回予定日", "次回アクション日", "next_action_date", "next_action"],
  status: ["ステータス", "状態", "status"],
} as const

function normalizeHeader(value: string): string {
  return value.trim().replace(/[\s_-]/g, "").toLowerCase()
}

function splitCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const next = text[index + 1]
    if (character === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === "," && !quoted) {
      row.push(cell.trim())
      cell = ""
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1
      row.push(cell.trim())
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
      cell = ""
    } else {
      cell += character
    }
  }

  row.push(cell.trim())
  if (row.some((value) => value.length > 0)) rows.push(row)
  return rows
}

function findHeaderIndex(headers: string[], aliases: readonly string[]): number {
  const normalized = headers.map(normalizeHeader)
  return aliases.map(normalizeHeader).map((alias) => normalized.indexOf(alias)).find((index) => index >= 0) ?? -1
}

function parseDate(value: string): string | null {
  const normalized = value.trim().replace(/[.年]/g, "/").replace(/月/g, "/").replace(/日/g, "")
  if (!normalized) return null
  const match = normalized.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date.toISOString().slice(0, 10)
}

function parseAmount(value: string): number | null {
  const numeric = value.replace(/[￥¥円,\s]/g, "")
  if (!numeric || !/^-?\d+(?:\.\d+)?$/.test(numeric)) return null
  const amount = Number(numeric)
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : null
}

function parseStatus(value: string): QuoteStatus {
  const normalized = value.trim().toLowerCase()
  if (["受注", "成約", "won", "closedwon"].includes(normalized)) return "won"
  if (["失注", "辞退", "lost", "closedlost"].includes(normalized)) return "lost"
  return "open"
}

export function parseQuoteCsv(text: string): CsvParseResult {
  const parsed = splitCsv(text.replace(/^\uFEFF/, ""))
  const headers = parsed[0] ?? []
  const body = parsed.slice(1, 1001)
  const indexes = {
    quoteId: findHeaderIndex(headers, HEADER_ALIASES.quoteId),
    companyName: findHeaderIndex(headers, HEADER_ALIASES.companyName),
    quoteDate: findHeaderIndex(headers, HEADER_ALIASES.quoteDate),
    amount: findHeaderIndex(headers, HEADER_ALIASES.amount),
    owner: findHeaderIndex(headers, HEADER_ALIASES.owner),
    lastContactDate: findHeaderIndex(headers, HEADER_ALIASES.lastContactDate),
    nextActionDate: findHeaderIndex(headers, HEADER_ALIASES.nextActionDate),
    status: findHeaderIndex(headers, HEADER_ALIASES.status),
  }

  const missingHeaders = (["quoteId", "companyName", "quoteDate", "amount"] as const)
    .filter((key) => indexes[key] < 0)
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      failures: [{ row: 1, message: `必須列を認識できません: ${missingHeaders.join(", ")}` }],
      detectedHeaders: headers,
    }
  }

  const rows: QuoteInput[] = []
  const seenQuoteIds = new Set<string>()
  const failures: CsvParseResult["failures"] = []
  body.forEach((cells, index) => {
    const rowNumber = index + 2
    const quoteDate = parseDate(cells[indexes.quoteDate] ?? "")
    const amount = parseAmount(cells[indexes.amount] ?? "")
    const quoteId = (cells[indexes.quoteId] ?? "").trim()
    const companyName = (cells[indexes.companyName] ?? "").trim()
    if (!quoteId || !companyName || !quoteDate || amount === null) {
      failures.push({ row: rowNumber, message: "見積番号・顧客名・見積日・見積金額を確認してください" })
      return
    }
    if (seenQuoteIds.has(quoteId)) {
      failures.push({ row: rowNumber, message: `見積番号 ${quoteId} が重複しているため除外しました` })
      return
    }
    seenQuoteIds.add(quoteId)
    const optionalDate = (column: number) => column >= 0 ? parseDate(cells[column] ?? "") : null
    rows.push({
      quoteId,
      companyName,
      quoteDate,
      amount,
      owner: indexes.owner >= 0 ? (cells[indexes.owner] ?? "").trim() || null : null,
      lastContactDate: optionalDate(indexes.lastContactDate),
      nextActionDate: optionalDate(indexes.nextActionDate),
      status: indexes.status >= 0 ? parseStatus(cells[indexes.status] ?? "") : "open",
    })
  })

  if (parsed.length > 1001) failures.push({ row: 1002, message: "1回の診断は1,000件までです" })
  return { rows, failures, detectedHeaders: headers }
}

function differenceInDays(from: string, now: Date): number {
  const start = new Date(`${from}T00:00:00.000Z`).getTime()
  return Math.max(0, Math.floor((now.getTime() - start) / 86_400_000))
}

export function diagnoseQuote(quote: QuoteInput, now = new Date()): DiagnosedQuote {
  if (quote.status !== "open") {
    return { ...quote, ageDays: 0, score: 0, priority: "closed", reasons: [quote.status === "won" ? "受注済み" : "失注済み"] }
  }
  const ageDays = differenceInDays(quote.lastContactDate ?? quote.quoteDate, now)
  const reasons: string[] = []
  let score = Math.min(50, Math.floor(ageDays / 3))
  if (ageDays >= 30) reasons.push(`${ageDays}日間フォローなし`)
  else if (ageDays >= 14) reasons.push(`${ageDays}日経過`)
  if (!quote.nextActionDate) {
    score += 20
    reasons.push("次回アクション未設定")
  } else if (differenceInDays(quote.nextActionDate, now) > 0) {
    score += 15
    reasons.push("次回アクション期限超過")
  }
  if (!quote.owner) {
    score += 10
    reasons.push("担当者未設定")
  }
  if (quote.amount >= 5_000_000) {
    score += 20
    reasons.push("500万円以上")
  } else if (quote.amount >= 1_000_000) {
    score += 12
    reasons.push("100万円以上")
  } else if (quote.amount >= 300_000) {
    score += 6
  }
  const normalizedScore = Math.min(100, score)
  const priority = normalizedScore >= 70 ? "urgent" : normalizedScore >= 45 ? "high" : "watch"
  return { ...quote, ageDays, score: normalizedScore, priority, reasons }
}

export function diagnoseQuotes(quotes: QuoteInput[], now = new Date()): QuoteRecoveryDiagnosis {
  const diagnosed = quotes.map((quote) => diagnoseQuote(quote, now))
  const open = diagnosed.filter((quote) => quote.status === "open")
  const stale = open.filter((quote) => quote.ageDays >= 14)
  const bucketRules = [
    { label: "0〜13日", min: 0, max: 13 },
    { label: "14〜29日", min: 14, max: 29 },
    { label: "30〜59日", min: 30, max: 59 },
    { label: "60〜89日", min: 60, max: 89 },
    { label: "90日以上", min: 90, max: Number.POSITIVE_INFINITY },
  ]
  return {
    generatedAt: now.toISOString(),
    sourceRows: quotes.length,
    openQuotes: open.length,
    openAmount: open.reduce((sum, quote) => sum + quote.amount, 0),
    staleQuotes: stale.length,
    staleAmount: stale.reduce((sum, quote) => sum + quote.amount, 0),
    missingNextAction: open.filter((quote) => !quote.nextActionDate).length,
    unassignedQuotes: open.filter((quote) => !quote.owner).length,
    buckets: bucketRules.map((bucket) => {
      const matching = open.filter((quote) => quote.ageDays >= bucket.min && quote.ageDays <= bucket.max)
      return { label: bucket.label, count: matching.length, amount: matching.reduce((sum, quote) => sum + quote.amount, 0) }
    }),
    candidates: open.sort((left, right) => right.score - left.score || right.amount - left.amount).slice(0, 20),
  }
}
