import { manualFormCompanyName } from "./manual-japan-entry-copy-envelope"
import { manualProductDecisionSubject } from "./manual-japan-entry-product-subject"

const PRODUCT_FOCUS_STOP_WORDS = new Set(["analysis", "conversion", "documented", "offering", "platform", "product", "service", "software", "workflow"])

function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function stableIndex(value: string, length: number): number {
  let hash = 2_166_136_261
  for (const character of value.toLowerCase()) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16_777_619)
  }
  return (hash >>> 0) % length
}

function routingQuestion(companyName: string, founderForward: boolean, variationKey: string): string {
  const founderQuestions = [
    `Would ${companyName}'s founder or international-growth lead be the right person for me to send it to?`,
    `Should I send this to ${companyName}'s founder, or does someone else own international growth?`,
    `Who at ${companyName} would be best placed to review it—the founder or the international-growth lead?`,
    `May I address it to ${companyName}'s founder or international-growth owner?`,
    `Is ${companyName}'s founder the right recipient, or should I send it to the person leading international growth?`,
  ]
  const permissionQuestions = [
    `Would you like me to send the Japan opportunity analysis for ${companyName}?`,
    `May I send you the ${companyName} Japan opportunity analysis?`,
    `Would it be useful if I sent the Japan opportunity analysis for ${companyName}?`,
  ]
  const options = founderForward ? founderQuestions : permissionQuestions
  return options[stableIndex(variationKey, options.length)] ?? options[0]!
}

export function normalizeManualFinalQuestion(input: {
  message: string
  companyName: string
  productEvidenceRendering: string
  founderForward: boolean
  variationKey: string
}): string {
  const companyName = manualFormCompanyName(input.companyName)
  if (!companyName) return input.message
  const blocks = input.message.replace(/\r\n?/g, "\n").trim().split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean)
  if (blocks.length < 4) return input.message
  const signatureIndex = blocks.findIndex((block) => /(?:best|kind|warm) regards/i.test(block))
  const finalIndex = signatureIndex > 1 ? signatureIndex - 1 : blocks.length - 1
  const companyPattern = new RegExp(escapePattern(companyName), "gi")
  const neutralizeCompany = (value: string): string => value
    .replace(new RegExp(`Integrating ${escapePattern(companyName)} with`, "gi"), "Integrating the platform with")
    .replace(new RegExp(`integrate ${escapePattern(companyName)} with`, "gi"), "integrate the platform with")
    .replace(new RegExp(`integration of ${escapePattern(companyName)} with`, "gi"), "integration with")
    .replace(new RegExp(`which ${escapePattern(companyName)} (capability|product|workflow)`, "gi"), "which $1")
    .replace(new RegExp(`${escapePattern(companyName)}['’]s`, "gi"), "your")
    .replace(new RegExp(`${escapePattern(companyName)} (capability|product|workflow)`, "gi"), "your $1")
    .replace(companyPattern, "your company")
    .replace(/\b(examining|analysing|analyzing|evaluating)\s+that your company\s+/gi, "$1 the ")
    .replace(/\byour company\s+(?=(?:Japanese-language|Japan)\b)/gi, "the ")
    .replace(/\byour existing eCommerce platform\b/gi, "existing eCommerce platforms")
    .replace(/\bwith the integration with (?:an?\s+)?existing eCommerce platforms?\b/gi, "with eCommerce platform integration")
    .replace(/\bintegration with (?:an?\s+)?existing eCommerce platforms?\b/gi, "eCommerce platform integration")
    .replace(/\b(?:these|those) documented capabilities\b/gi, "these")
    .replace(/^your company\b/, "Your company")
  const rendering = input.productEvidenceRendering.trim().replace(/^[“”"']+|[“”"']+$/g, "")
  if (rendering && !(blocks[1] ?? "").toLowerCase().includes(rendering.toLowerCase())) {
    blocks[1] = `${companyName} provides ${rendering.replace(/^./, (character) => character.toLowerCase())}`
  }
  for (let index = 2; index < finalIndex; index += 1) {
    blocks[index] = neutralizeCompany(blocks[index] ?? "")
  }
  const finalParagraph = blocks[finalIndex] ?? ""
  const rawOffer = neutralizeCompany(finalParagraph.replace(/[^.!?]*\?\s*$/, "").trim())
  const productSubject = manualProductDecisionSubject({ rendering, companyName, productNames: [] })
  const focusTerms = productSubject.toLowerCase().match(/[a-z0-9-]{5,}/g)?.filter((term) => !PRODUCT_FOCUS_STOP_WORDS.has(term)) ?? []
  const offer = focusTerms.some((term) => rawOffer.toLowerCase().includes(term))
    ? rawOffer
    : `${rawOffer.replace(/[.!]+$/, "")}, centred on ${productSubject}.`
  const question = routingQuestion(companyName, input.founderForward, input.variationKey)
  blocks[finalIndex] = `${offer}${offer && !/[.!]$/.test(offer) ? "." : ""} ${question}`.trim()
  let japaneseLanguageMentions = 0
  for (let index = 1; index <= finalIndex; index += 1) {
    blocks[index] = (blocks[index] ?? "").replace(/Japanese-language/gi, (value) => {
      japaneseLanguageMentions += 1
      return japaneseLanguageMentions <= 3 ? value : "Japan"
    })
  }
  return blocks.join("\n\n")
}
