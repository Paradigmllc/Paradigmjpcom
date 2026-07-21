import { MANUAL_FORM_SIGNATURE, manualFormGreeting } from "./manual-japan-entry-copy-envelope"
import { manualMessageSimilarity, type PriorManualMessage } from "./manual-japan-entry-message-similarity"
import type { JapanEntryPersonalizationFact } from "./japan-entry-personalized-message-facts"

export interface ManualCtaContract {
  id: string
  ctaType: "permission_to_send" | "right_person" | "founder_forward"
  paragraph: string
  question: string
}

export function resolveManualCtaAnchors(input: {
  companyName: string
  productNames?: string[]
  facts: JapanEntryPersonalizationFact[]
}): { requiredAnchor: string; customerPathAnchor: string } {
  return {
    requiredAnchor: input.productNames?.map((name) => name.trim()).find(Boolean) ?? input.companyName,
    customerPathAnchor: input.facts
      .find((fact) => fact.id.startsWith("japan-audit-"))
      ?.anchors.map((anchor) => anchor.trim()).find((anchor) => anchor.length >= 4) ?? "Japan customer path",
  }
}

interface CtaRoute {
  ctaType: ManualCtaContract["ctaType"]
  build: (anchor: string, path: string) => { offer: string; question: string }
}

const CTA_ROUTES: CtaRoute[] = [
  {
    ctaType: "permission_to_send",
    build: (anchor, path) => ({
      offer: `I can prepare a Japan opportunity analysis that separates the public evidence around ${path} from the decision still open for ${anchor}.`,
      question: `Would you like to receive the ${anchor} analysis before deciding whether that customer path warrants a test?`,
    }),
  },
  {
    ctaType: "right_person",
    build: (anchor, path) => ({
      offer: `The Japan opportunity analysis would focus on ${anchor}'s ${path} evidence and the validation decision that remains unresolved.`,
      question: `Who owns the ${anchor} decision on whether to validate that path?`,
    }),
  },
  {
    ctaType: "founder_forward",
    build: (anchor, path) => ({
      offer: `I can map the observed ${path} gap and its evidence boundary in a Japan opportunity analysis for ${anchor}.`,
      question: `Is the ${anchor} founder or international-growth lead the right person to receive it?`,
    }),
  },
  {
    ctaType: "permission_to_send",
    build: (anchor, path) => ({
      offer: `A focused Japan opportunity analysis can set out what the public ${path} evidence establishes, what it does not, and the next decision for ${anchor}.`,
      question: `May I send the ${anchor} analysis for that review?`,
    }),
  },
  {
    ctaType: "right_person",
    build: (anchor, path) => ({
      offer: `I can prepare a Japan opportunity analysis around the open ${path} question without treating the page review as proof of demand.`,
      question: `Who is the right person to receive the ${anchor} analysis for that decision?`,
    }),
  },
  {
    ctaType: "founder_forward",
    build: (anchor, path) => ({
      offer: `The useful next artifact would be a Japan opportunity analysis linking ${anchor}'s product evidence to the unresolved ${path} decision.`,
      question: `Would the ${anchor} founder be the right person to receive that analysis?`,
    }),
  },
  {
    ctaType: "permission_to_send",
    build: (anchor, path) => ({
      offer: `I can turn the ${path} observation into a Japan opportunity analysis that keeps evidence, assumptions, and the ${anchor} validation choice separate.`,
      question: `Would you like to receive the ${anchor} analysis before that choice is made?`,
    }),
  },
  {
    ctaType: "right_person",
    build: (anchor, path) => ({
      offer: `A Japan opportunity analysis for ${anchor} would examine the ${path} question as a testable entry decision rather than a conclusion.`,
      question: `Are you the person who owns that ${anchor} decision?`,
    }),
  },
  {
    ctaType: "founder_forward",
    build: (anchor, path) => ({
      offer: `I can prepare the Japan opportunity analysis for ${anchor} around the exact ${path} evidence and the decision it leaves open.`,
      question: `Should I route the ${anchor} analysis to its founder or international-growth owner?`,
    }),
  },
  {
    ctaType: "permission_to_send",
    build: (anchor, path) => ({
      offer: `The Japan opportunity analysis I can provide would stay narrowly focused on ${anchor}, the observed ${path} signal, and whether a customer-path test is justified.`,
      question: `Would you like to receive the ${anchor} Japan opportunity analysis?`,
    }),
  },
  {
    ctaType: "right_person",
    build: (anchor, path) => ({
      offer: `I can document the ${path} finding and the unresolved validation choice in a Japan opportunity analysis specific to ${anchor}.`,
      question: `Who should receive the ${anchor} analysis for deciding what to test first?`,
    }),
  },
  {
    ctaType: "founder_forward",
    build: (anchor, path) => ({
      offer: `A Japan opportunity analysis can give ${anchor}'s leadership a bounded view of the ${path} evidence before any broader market commitment.`,
      question: `Is the ${anchor} founder the right person to receive that analysis?`,
    }),
  },
]

function messageBlocks(message: string): string[] {
  return message
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function contentCta(message: string): string {
  const blocks = messageBlocks(message)
  if (/^hello\b/i.test(blocks[0] ?? "")) blocks.shift()
  if (/(?:best|kind|warm) regards/i.test(blocks.at(-1) ?? "")) blocks.pop()
  return blocks.at(-1) ?? ""
}

function stableHash(value: string): number {
  let hash = 2_166_136_261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return hash >>> 0
}

export function buildManualCtaContracts(input: {
  companyName: string
  requiredAnchor: string
  customerPathAnchor: string
  priorMessages: Array<Pick<PriorManualMessage, "companyName" | "message"> & Partial<Pick<PriorManualMessage, "id" | "domain">>>
  count?: number
}): ManualCtaContract[] {
  const count = Math.max(1, Math.min(input.count ?? 3, 3))
  const routeParts = CTA_ROUTES.map((route) => ({
    ctaType: route.ctaType,
    ...route.build(input.requiredAnchor, input.customerPathAnchor),
  }))
  const candidates = routeParts.flatMap((offerRoute, offerIndex) => routeParts.map((questionRoute, questionIndex) => {
    const paragraph = `${offerRoute.offer} ${questionRoute.question}`
    const maxPriorSimilarity = input.priorMessages.reduce((maximum, prior) => Math.max(
      maximum,
      manualMessageSimilarity(paragraph, contentCta(prior.message), [input.companyName, prior.companyName]),
    ), 0)
    const tieBreak = stableHash(`${input.companyName}:${input.requiredAnchor}:${offerIndex}:${questionIndex}`)
    return {
      contract: { id: `cta-route-${offerIndex + 1}-${questionIndex + 1}`, ctaType: questionRoute.ctaType, paragraph, question: questionRoute.question },
      maxPriorSimilarity,
      tieBreak,
    }
  })).sort((left, right) => left.maxPriorSimilarity - right.maxPriorSimilarity || left.tieBreak - right.tieBreak)

  const selected: ManualCtaContract[] = []
  for (const item of candidates) {
    if (selected.length >= count) break
    const duplicatesSelected = selected.some((prior) => manualMessageSimilarity(
      item.contract.paragraph,
      prior.paragraph,
      [input.companyName],
    ) >= 0.72)
    if (!duplicatesSelected) selected.push(item.contract)
  }
  return selected.length >= count
    ? selected
    : [...selected, ...candidates.map((item) => item.contract).filter((item) => !selected.some((chosen) => chosen.id === item.id))].slice(0, count)
}

export function applyManualCtaContract<T extends { message: string; cta_type: string }>(
  candidate: T,
  companyName: string,
  contract: ManualCtaContract,
): T {
  const blocks = messageBlocks(candidate.message)
  if (/^hello\b/i.test(blocks[0] ?? "")) blocks.shift()
  if (/(?:best|kind|warm) regards/i.test(blocks.at(-1) ?? "")) blocks.pop()
  if (blocks.length > 0) blocks[blocks.length - 1] = contract.paragraph
  return {
    ...candidate,
    cta_type: contract.ctaType,
    message: [manualFormGreeting(companyName), ...blocks, MANUAL_FORM_SIGNATURE].join("\n\n"),
  }
}
