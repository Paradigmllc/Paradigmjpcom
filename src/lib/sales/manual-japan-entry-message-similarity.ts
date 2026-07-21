export interface PriorManualMessage {
  id: string
  companyName: string | null
  domain: string
  message: string
}
export interface ManualMessageSimilarityReview {
  passed: boolean
  maxSimilarity: number
  matchedMessageId: string | null
  matchedCompany: string | null
  reasons: string[]
}

const COMMON_COPY = [
  /hello,?\s+i(?:'|’)m\s+sato[^.?!]*[.?!]?/gi,
  /^hello\s+[^\n,]{1,160}\s+team,\s*$/gim,
  /best regards,\s*tomohiro h\s*paradigm llc\s*contact@paradigmjp\.com/gi,
  /paradigm\s+llc(?:\s+in\s+japan)?/gi,
  /japan\s+opportunity\s+(?:analysis|snapshot|brief)/gi,
]

function normalizedWords(message: string, companyNames: Array<string | null>): string[] {
  let normalized = message.toLowerCase()
  for (const companyName of companyNames) {
    const value = companyName?.trim()
    if (value) normalized = normalized.replaceAll(value.toLowerCase(), " ")
  }
  for (const pattern of COMMON_COPY) normalized = normalized.replace(pattern, " ")
  return normalized
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
}

function shingles(words: string[], width = 3): Set<string> {
  if (words.length < width) return new Set(words)
  return new Set(words.slice(0, words.length - width + 1).map((_, index) => words.slice(index, index + width).join(" ")))
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0
  let intersection = 0
  for (const value of left) if (right.has(value)) intersection += 1
  return intersection / (left.size + right.size - intersection)
}

export function manualMessageSimilarity(left: string, right: string, companyNames: Array<string | null> = []): number {
  return jaccard(shingles(normalizedWords(left, companyNames)), shingles(normalizedWords(right, companyNames)))
}

export function reviewManualMessageDistinctness(input: {
  message: string
  companyName: string
  priorMessages: PriorManualMessage[]
  threshold?: number
}): ManualMessageSimilarityReview {
  const threshold = input.threshold ?? 0.35
  let strongest: PriorManualMessage | null = null
  let maxSimilarity = 0
  for (const prior of input.priorMessages) {
    const similarity = manualMessageSimilarity(input.message, prior.message, [input.companyName, prior.companyName])
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity
      strongest = prior
    }
  }
  const passed = maxSimilarity < threshold
  return {
    passed,
    maxSimilarity: Number(maxSimilarity.toFixed(3)),
    matchedMessageId: strongest?.id ?? null,
    matchedCompany: strongest?.companyName ?? strongest?.domain ?? null,
    reasons: passed ? [] : [
      `Company-name-neutral copy similarity ${Math.round(maxSimilarity * 100)}% exceeds the ${Math.round(threshold * 100)}% limit`,
      "Rewrite the observation, diagnostic logic, paragraph order, and CTA for this company",
    ],
  }
}
