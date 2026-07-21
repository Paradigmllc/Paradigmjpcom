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

const INTERNAL_REPEAT_STOP_WORDS = new Set([
  "a", "an", "and", "as", "at", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with", "you", "your",
])

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

function contentParagraphs(message: string): string[] {
  const blocks = message
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
  if (/^hello\b/i.test(blocks[0] ?? "")) blocks.shift()
  if (/(?:best|kind|warm) regards/i.test(blocks.at(-1) ?? "")) blocks.pop()
  return blocks.filter((block) => block.length >= 45)
}

function repeatedPhrase(message: string): string | null {
  const sentences = message.split(/(?<=[.!?])\s+/)
  for (const sentence of sentences) {
    const words = sentence
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
    for (let width = 5; width >= 3; width -= 1) {
      const seen = new Map<string, number>()
      for (let index = 0; index <= words.length - width; index += 1) {
        const window = words.slice(index, index + width)
        if (window.filter((word) => word.length >= 3 && !INTERNAL_REPEAT_STOP_WORDS.has(word)).length < 3) continue
        const phrase = window.join(" ")
        if (phrase.replaceAll(" ", "").length < 14) continue
        const priorIndex = seen.get(phrase)
        if (priorIndex !== undefined && index - priorIndex >= width) return phrase
        seen.set(phrase, index)
      }
    }
  }
  return null
}

function ctaParagraphSimilarity(
  message: string,
  priorMessage: string,
  companyNames: Array<string | null>,
): number {
  const current = contentParagraphs(message).at(-1)
  const prior = contentParagraphs(priorMessage).at(-1)
  if (!current || !prior) return 0
  return manualMessageSimilarity(current, prior, companyNames)
}

export function manualMessageSimilarity(left: string, right: string, companyNames: Array<string | null> = []): number {
  return jaccard(shingles(normalizedWords(left, companyNames)), shingles(normalizedWords(right, companyNames)))
}

export function reviewManualMessageDistinctness(input: {
  message: string
  companyName: string
  priorMessages: PriorManualMessage[]
  threshold?: number
  ctaThreshold?: number
}): ManualMessageSimilarityReview {
  const threshold = input.threshold ?? 0.35
  const ctaThreshold = input.ctaThreshold ?? 0.72
  let strongest: PriorManualMessage | null = null
  let maxSimilarity = 0
  let maxCtaSimilarity = 0
  for (const prior of input.priorMessages) {
    const similarity = manualMessageSimilarity(input.message, prior.message, [input.companyName, prior.companyName])
    const cta = ctaParagraphSimilarity(input.message, prior.message, [input.companyName, prior.companyName])
    if (Math.max(similarity, cta) > Math.max(maxSimilarity, maxCtaSimilarity)) {
      maxSimilarity = similarity
      maxCtaSimilarity = cta
      strongest = prior
    }
  }
  const repeated = repeatedPhrase(input.message)
  const wholeMessagePassed = maxSimilarity < threshold
  const ctaPassed = maxCtaSimilarity < ctaThreshold
  const passed = wholeMessagePassed && ctaPassed && repeated === null
  const reasons: string[] = []
  if (!wholeMessagePassed) {
    reasons.push(`Company-name-neutral copy similarity ${Math.round(maxSimilarity * 100)}% exceeds the ${Math.round(threshold * 100)}% limit`)
  }
  if (!ctaPassed) {
    reasons.push(`The final routing or permission paragraph is ${Math.round(maxCtaSimilarity * 100)}% similar to recent company copy; use a company-specific CTA construction`)
  }
  if (repeated) reasons.push(`Repeated phrase inside one sentence is prohibited: "${repeated}"`)
  if (!passed) reasons.push("Rewrite the observation, diagnostic logic, paragraph order, and CTA for this company")
  return {
    passed,
    maxSimilarity: Number(Math.max(maxSimilarity, maxCtaSimilarity).toFixed(3)),
    matchedMessageId: strongest?.id ?? null,
    matchedCompany: strongest?.companyName ?? strongest?.domain ?? null,
    reasons,
  }
}
