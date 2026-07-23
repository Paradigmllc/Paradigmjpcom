const IDENTITY_STOP_WORDS = new Set([
  "a", "an", "the",
])
const EXACT_PHRASE_GENERIC_WORDS = new Set([
  "ai-powered", "air", "offering", "platform", "product", "service", "software", "tool", "workflow",
])

function normalizedWords(value: string): string[] {
  return value
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

export function manualProductDecisionSubject(input: {
  rendering: string
  companyName: string
  productNames: string[]
}): string {
  let withoutIdentity = input.rendering.normalize("NFKC")
  for (const identity of [input.companyName, ...input.productNames]) {
    const value = identity.trim()
    if (!value) continue
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    withoutIdentity = withoutIdentity.replace(new RegExp(escaped, "giu"), " ")
  }
  const segments = withoutIdentity
    .split(/\s+[–—-]\s+/)
    .map((segment) => normalizedWords(segment).join(" "))
    .filter((segment) => segment.split(/\s+/).length >= 2)
  const selected = segments.at(-1) ?? withoutIdentity
  const words = normalizedWords(selected).filter((word) => !IDENTITY_STOP_WORDS.has(word.toLowerCase()))
  if (words[0]?.toLowerCase() === "ai-powered") words.shift()
  if (words.length < 2) return "documented offering"

  const completePhrase = normalizedWords(withoutIdentity).join(" ").toLowerCase()
  const selectedPhrase = normalizedWords(selected).join(" ").toLowerCase()
  if (completePhrase === selectedPhrase && words.length <= 4) {
    const distinctive = words.filter((word) => !EXACT_PHRASE_GENERIC_WORDS.has(word.toLowerCase()))
    if (distinctive.length >= 2) return distinctive.slice(0, 3).join(" ")
  }
  const end = words[3]?.toLowerCase() === "and" ? 5 : 4
  return words.slice(0, end).join(" ")
}
