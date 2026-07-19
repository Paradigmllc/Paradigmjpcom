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

export function manualFormGreeting(companyName: string): string {
  return `Hello ${normalizedCompanyName(companyName)} team,`
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
