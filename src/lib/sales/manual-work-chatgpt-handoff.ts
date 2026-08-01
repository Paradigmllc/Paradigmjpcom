import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"

export const MANUAL_CHATGPT_BATCH_MAX = 15
export const MANUAL_CHATGPT_HANDOFF_VERSION = "chatgpt-pro-handoff-v2"

export interface ManualChatGptEvidencePoint {
  id: string
  pageKind: string
  statement: string
  sourceUrl: string
}

export interface ManualChatGptBrief {
  version: string
  workId: string
  domain: string
  companyName: string
  countryCode: string | null
  countryConfidence: number
  countrySignals: string[]
  businessModel: string
  productNames: string[]
  productContext: string
  collectedAt: string
  contactUrl: string | null
  publicEmail: string | null
  contactFormDetected: boolean
  contactSignals: string[]
  japanPresence: {
    existing: boolean
    level: string
    signals: string[]
    urls: string[]
  }
  pages: Array<{
    url: string
    kind: string
    title: string | null
    description: string | null
    headings: string[]
  }>
  evidence: ManualChatGptEvidencePoint[]
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function string(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim())
    : []
}

function evidencePoints(value: unknown): ManualChatGptEvidencePoint[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const point = record(item)
    const id = string(point?.id)
    const pageKind = string(point?.pageKind)
    const statement = string(point?.statement)
    const sourceUrl = string(point?.sourceUrl)
    if (!id || !pageKind || !statement || !sourceUrl) return []
    return [{ id, pageKind, statement, sourceUrl }]
  })
}

function japanPresence(value: unknown): ManualChatGptBrief["japanPresence"] {
  const source = record(value)
  return {
    existing: source?.existing === true,
    level: string(source?.level) ?? "none",
    signals: strings(source?.signals),
    urls: strings(source?.urls),
  }
}

export function manualChatGptBrief(item: ManualJapanEntryWorkRow): ManualChatGptBrief | null {
  const raw = record(item.evidence.editorialBrief)
  if (!raw) return null
  const evidence = evidencePoints(raw.evidence)
  const workId = string(raw.workId) ?? item.id
  const domain = string(raw.domain) ?? item.domain
  const companyName = string(raw.companyName) ?? item.company_name ?? item.domain
  const productContext = string(raw.productContext) ?? item.product_context ?? ""
  if (!workId || !domain || !companyName || evidence.length < 3) return null
  const pages = Array.isArray(raw.pages) ? raw.pages.flatMap((value) => {
    const page = record(value)
    const url = string(page?.url)
    const kind = string(page?.kind)
    if (!url || !kind) return []
    return [{
      url,
      kind,
      title: string(page?.title),
      description: string(page?.description),
      headings: strings(page?.headings).slice(0, 8),
    }]
  }) : []
  return {
    version: string(raw.version) ?? MANUAL_CHATGPT_HANDOFF_VERSION,
    workId,
    domain,
    companyName,
    countryCode: string(raw.countryCode) ?? item.country_code,
    countryConfidence: number(raw.countryConfidence) ?? 0,
    countrySignals: strings(raw.countrySignals),
    businessModel: string(raw.businessModel) ?? item.business_model ?? "service",
    productNames: strings(raw.productNames).slice(0, 8),
    productContext,
    collectedAt: string(raw.collectedAt) ?? item.updated_at,
    contactUrl: string(raw.contactUrl),
    publicEmail: string(raw.publicEmail),
    contactFormDetected: raw.contactFormDetected === true,
    contactSignals: strings(raw.contactSignals),
    japanPresence: japanPresence(raw.japanPresence),
    pages,
    evidence,
  }
}

export function isManualChatGptBriefReady(item: ManualJapanEntryWorkRow): boolean {
  return item.evidence.analysis_mode === "chatgpt_brief_ready"
    && item.message_review.generation_status === "brief_ready"
    && Boolean(manualChatGptBrief(item))
    && !item.manually_sent_at
    && !item.reply_received_at
    && !item.founder_forwarded_at
    && !item.meeting_converted_at
}

function evidencePriority(kind: string): number {
  if (kind === "product") return 100
  if (kind === "pricing") return 90
  if (kind === "news") return 80
  if (kind === "about") return 70
  if (kind === "home") return 60
  if (kind === "contact") return 50
  return 10
}

function compactBrief(brief: ManualChatGptBrief) {
  const evidence = [...brief.evidence]
    .sort((left, right) => evidencePriority(right.pageKind) - evidencePriority(left.pageKind))
    .filter((point, index, values) => values.findIndex((candidate) => candidate.statement === point.statement) === index)
    .slice(0, 12)
    .map((point) => ({
      id: point.id,
      pageKind: point.pageKind,
      statement: point.statement.slice(0, 320),
      sourceUrl: point.sourceUrl,
    }))
  return {
    workId: brief.workId,
    companyName: brief.companyName,
    domain: brief.domain,
    countryCode: brief.countryCode,
    countryConfidence: brief.countryConfidence,
    countrySignals: brief.countrySignals.slice(0, 4),
    businessModel: brief.businessModel,
    productNames: brief.productNames,
    productContext: brief.productContext.slice(0, 1_200),
    contactRoute: brief.contactUrl ?? brief.publicEmail,
    contactFormDetected: brief.contactFormDetected,
    contactSignals: brief.contactSignals.slice(0, 4),
    japanPresence: {
      existing: brief.japanPresence.existing,
      level: brief.japanPresence.level,
      signals: brief.japanPresence.signals.slice(0, 6),
      urls: brief.japanPresence.urls.slice(0, 4),
    },
    evidence,
  }
}

export function buildManualChatGptHandoffPrompt(items: ManualJapanEntryWorkRow[]): string {
  const briefs = items
    .filter(isManualChatGptBriefReady)
    .map((item) => manualChatGptBrief(item))
    .filter((brief): brief is ManualChatGptBrief => Boolean(brief))
    .slice(0, MANUAL_CHATGPT_BATCH_MAX)
    .map(compactBrief)
  if (briefs.length === 0) throw new Error("ChatGPT用ブリーフ準備済みの企業がありません")

  const schema = {
    items: [{
      workId: "UUID copied exactly from the input",
      status: "ready or insufficient",
      subject: "optional email subject, otherwise null",
      body: "65-120 English words, 2-4 short paragraphs, greeting and signature excluded; null when insufficient",
      evidenceIds: ["e01", "e02"],
      score: 92,
      reasoningSummary: "one concise Japanese or English explanation of the company-specific angle",
      insufficiencyReason: null,
    }],
  }

  return [
    "You are GPT-5.6 Pro acting as a senior founder-led outbound strategist for Paradigm LLC, a Japan market operator.",
    "Write one genuinely company-specific first-touch message for every supplied record. This is not a template-filling task.",
    "",
    "NON-NEGOTIABLE RULES",
    "- Use only the supplied evidence. Never invent Japan traffic, demand, revenue, ROI, customers, competitors, funding, urgency, measured loss, or legal conclusions.",
    "- A record with japanPresence.existing=true should normally be returned as status='insufficient' for greenfield Japan-entry outreach unless the supplied evidence clearly supports a different, specific operating gap.",
    "- Missing Japanese language alone is not a thesis. Connect the company's actual product, commercial model, or current expansion choices to one practical Japan validation question.",
    "- The body must be 65-120 English words in 2-4 short paragraphs. Exclude greeting and signature; the system adds them later.",
    "- Use at least two valid evidence IDs and include concrete nouns or operating details that could not survive a company-name swap.",
    "- End with one low-pressure permission or routing question. Do not quote price, list the whole service scope, or force a meeting.",
    "- Avoid stock phrases such as 'I reviewed your website', 'untapped opportunity', 'Japan is a large market', 'explore a partnership', and 'hope this message finds you well'.",
    "- If the evidence is too thin for a strong message, return status='insufficient' and explain why. Do not pad.",
    "- Self-score strictly. status='ready' requires score >= 88.",
    "- Return exactly one item for every input workId, in the same order.",
    "",
    "Return STRICT JSON only. No Markdown fences and no commentary outside the JSON.",
    `Required schema example: ${JSON.stringify(schema)}`,
    "",
    "COMPANY BRIEFS",
    JSON.stringify(briefs, null, 2),
  ].join("\n")
}
