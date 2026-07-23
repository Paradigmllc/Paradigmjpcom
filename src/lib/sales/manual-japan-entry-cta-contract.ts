import {
  MANUAL_FORM_SIGNATURE,
  manualFormCompanyName,
  manualFormGreeting,
} from "./manual-japan-entry-copy-envelope"
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
  const safeProductName = input.productNames
    ?.map((name) => manualFormCompanyName(name))
    .find(Boolean)
  return {
    requiredAnchor: safeProductName ?? manualFormCompanyName(input.companyName),
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
      offer: `I can send a short Japan opportunity analysis for ${anchor}, focused on the open Japan evaluation question.`,
      question: `Would you like me to send it for the ${path} decision?`,
    }),
  },
  {
    ctaType: "right_person",
    build: (anchor, path) => ({
      offer: `I can prepare a concise Japan opportunity analysis for ${anchor} around the open Japan entry decision.`,
      question: `Who owns the ${path} decision?`,
    }),
  },
  {
    ctaType: "founder_forward",
    build: (anchor, path) => ({
      offer: `A short Japan opportunity analysis for ${anchor} can set out the product evidence and the entry decision it leaves open.`,
      question: `Would the founder or international-growth lead be the right recipient for the ${path} decision?`,
    }),
  },
  {
    ctaType: "permission_to_send",
    build: (anchor, path) => ({
      offer: `I can share a focused Japan opportunity analysis for ${anchor} based on the public product and Japan-path findings.`,
      question: `May I send it for the ${path} review?`,
    }),
  },
  {
    ctaType: "right_person",
    build: (anchor, path) => ({
      offer: `I can send a Japan opportunity analysis for ${anchor} that treats the observed market-readiness point as a testable question.`,
      question: `Who should receive it to decide how to handle the ${path} question?`,
    }),
  },
  {
    ctaType: "founder_forward",
    build: (anchor, path) => ({
      offer: `The useful next step for ${anchor} would be a short Japan opportunity analysis linking the product evidence to the unresolved Japan entry decision.`,
      question: `Should I route the ${path} decision brief to the founder or international-growth lead?`,
    }),
  },
  {
    ctaType: "permission_to_send",
    build: (anchor, path) => ({
      offer: `I can prepare a Japan opportunity analysis for ${anchor}, with product evidence and assumptions clearly separated.`,
      question: `Would you like to receive it for the ${path} decision?`,
    }),
  },
  {
    ctaType: "right_person",
    build: (anchor, path) => ({
      offer: `A Japan opportunity analysis for ${anchor} would frame the current market-readiness question as a testable entry decision.`,
      question: `Are you the person who owns the ${path} entry decision?`,
    }),
  },
  {
    ctaType: "founder_forward",
    build: (anchor, path) => ({
      offer: `I can send a short Japan opportunity analysis for ${anchor} focused on whether the observed public-page gap warrants a limited evaluation.`,
      question: `Should I route the ${path} evaluation decision to the founder or international-growth owner?`,
    }),
  },
  {
    ctaType: "permission_to_send",
    build: (anchor, path) => ({
      offer: `I can provide a short Japan opportunity analysis for ${anchor}, focused on the unresolved Japan validation choice.`,
      question: `Would you like to receive it for the ${path} validation decision?`,
    }),
  },
  {
    ctaType: "right_person",
    build: (anchor, path) => ({
      offer: `I can document the public-page finding and the unresolved validation choice in a Japan opportunity analysis for ${anchor}.`,
      question: `Who should receive it to decide what to test first for the ${path} path?`,
    }),
  },
  {
    ctaType: "founder_forward",
    build: (anchor, path) => ({
      offer: `A Japan opportunity analysis for ${anchor} can turn the documented product capability and customer-path gap into a concrete first validation decision.`,
      question: `Should I send it to the founder to decide what to test first for the ${path} path?`,
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
