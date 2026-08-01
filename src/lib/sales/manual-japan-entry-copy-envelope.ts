export const MANUAL_FORM_SENDER = {
  name: "Tomohiro H",
  company: "Paradigm LLC",
  email: "contact@paradigmjp.com",
} as const

export const MANUAL_FORM_SIGNATURE = [
  "Best regards,",
  MANUAL_FORM_SENDER.name,
  MANUAL_FORM_SENDER.company,
  MANUAL_FORM_SENDER.email,
].join("\n")

function normalizedCompanyName(companyName: string): string {
  return companyName.replace(/\s+/g, " ").trim()
}

const COMMON_PUBLIC_SUFFIXES = new Set([
  "ai", "app", "biz", "co", "com", "dev", "fr", "io", "net", "org", "tech",
])

function titleCaseDomainToken(value: string): string {
  if (/\d/.test(value) || value === value.toUpperCase() || /[A-Z].*[a-z]|[a-z].*[A-Z]/.test(value)) return value
  return value ? `${value[0]?.toUpperCase() ?? ""}${value.slice(1).toLowerCase()}` : value
}

export function manualFormCompanyName(companyName: string): string {
  const normalized = normalizedCompanyName(companyName)
  const hostnameLike = /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(normalized)
  if (hostnameLike) {
    const labels = normalized.split(".")
    const suffix = labels.at(-1)?.toLowerCase() ?? ""
    const isLowercaseDomainFallback = normalized === normalized.toLowerCase()
    const identityLabels = COMMON_PUBLIC_SUFFIXES.has(suffix) && isLowercaseDomainFallback
      ? labels.slice(0, -1)
      : labels
    const humanized = identityLabels
      .flatMap((label) => label.split("-"))
      .map(titleCaseDomainToken)
      .filter(Boolean)
      .join(" ")
    if (humanized) return humanized
  }
  return normalized
    .replace(/\b([A-Za-z])\.\s*([A-Za-z])\.?\b/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim()
}

export function manualFormGreeting(companyName: string): string {
  return `Hello ${manualFormCompanyName(companyName)} team,`
}

function messageBlocks(message: string): string[] {
  return message
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function isGreetingOnly(block: string): boolean {
  return /^hello(?:\s+[^\n,]{1,160}(?:\s+team)?)?[,!]$/i.test(block)
}

function isSenderSignature(block: string): boolean {
  return /(?:best|kind|warm) regards,?/i.test(block)
    && /(?:Tomohiro H|Sato)/i.test(block)
    && /Paradigm LLC/i.test(block)
}

export function withManualFormCopyReadyEnvelope<T extends { message: string }>(
  candidate: T,
  companyName: string,
): T {
  const blocks = messageBlocks(candidate.message)
  if (blocks[0] && isGreetingOnly(blocks[0])) blocks.shift()
  if (blocks.at(-1) && isSenderSignature(blocks.at(-1) ?? "")) blocks.pop()
  return {
    ...candidate,
    message: [manualFormGreeting(companyName), ...blocks, MANUAL_FORM_SIGNATURE].join("\n\n"),
  }
}

export function inspectManualFormCopyEnvelope(message: string, companyName: string): {
  greetingValid: boolean
  signatureValid: boolean
  body: string
  bodyParagraphs: string[]
} {
  const blocks = messageBlocks(message)
  const greeting = blocks.shift() ?? ""
  const signature = blocks.pop() ?? ""
  return {
    greetingValid: greeting === manualFormGreeting(companyName),
    signatureValid: signature === MANUAL_FORM_SIGNATURE,
    body: blocks.join("\n\n"),
    bodyParagraphs: blocks,
  }
}
