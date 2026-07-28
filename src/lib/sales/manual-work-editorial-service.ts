import "server-only"

import type { BusinessModel } from "./japan-entry-projection"
import {
  findManualWorkById,
  listRecentManualMessages,
  updateManualWork,
} from "./manual-japan-entry-store"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"
import { normalizeManualWorkUrl } from "./manual-japan-entry-workflow-helpers"
import { collectManualEditorialBrief } from "./manual-work-editorial-brief"
import { generateManualEditorialMessage } from "./manual-work-gpt56-writer"

export interface ManualEditorialProcessResult {
  item: ManualJapanEntryWorkRow
  duplicate: false
  artifactsPreserved: false
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function hasOutcome(item: ManualJapanEntryWorkRow): boolean {
  return Boolean(item.manually_sent_at || item.reply_received_at || item.founder_forwarded_at || item.meeting_converted_at)
}

function businessModel(value: ManualJapanEntryWorkRow["business_model"]): BusinessModel {
  return value === "ecommerce" || value === "saas" || value === "service" ? value : "service"
}

export async function processManualEditorialMessage(input: {
  rawUrl: string
  expectedWorkId: string
}): Promise<ManualEditorialProcessResult> {
  const normalized = normalizeManualWorkUrl(input.rawUrl)
  const existing = await findManualWorkById(input.expectedWorkId)
  if (!existing || existing.domain !== normalized.domain) {
    throw new Error("The selected work record changed. Refresh /work and try again.")
  }
  if (hasOutcome(existing)) {
    throw new Error("A sent or responded-to record cannot be regenerated automatically.")
  }
  if (existing.is_japanese_company === true || existing.country_code === "JP") {
    throw new Error("Japanese companies are outside this outbound workflow.")
  }

  const originalEvidence = record(existing.evidence)
  let work = await updateManualWork(existing.id, {
    status: "processing",
    stage: "copy_generation",
    attempts: existing.attempts + 1,
    error_message: null,
    initial_message: null,
    evidence: { ...originalEvidence, analysis_mode: "gpt56_editorial_processing" },
    message_review: {
      purpose: "editorial_generation",
      generation_status: "processing",
      automatic_send_allowed: false,
    },
  })

  try {
    const productNames = strings(originalEvidence.productNames)
    const observedContext = strings(record(existing.profile).observedFacts).join(" | ").trim()
    const productContext = existing.product_context?.trim() || observedContext || existing.domain
    const brief = await collectManualEditorialBrief({
      domain: existing.domain,
      companyName: existing.company_name ?? existing.domain,
      countryCode: existing.country_code,
      businessModel: businessModel(existing.business_model),
      productNames,
      productContext,
    })
    const priorMessages = await listRecentManualMessages(80, existing.id)
    const generated = await generateManualEditorialMessage({ brief, priorMessages })
    const editorialEvidence = {
      collectedAt: brief.collectedAt,
      contactUrl: brief.contactUrl,
      publicEmail: brief.publicEmail,
      pages: brief.pages.map((page) => ({
        url: page.url,
        kind: page.kind,
        title: page.title,
        headings: page.headings,
      })),
      evidence: brief.evidence,
    }

    if (!generated.ok || !generated.message) {
      work = await updateManualWork(work.id, {
        status: "needs_review",
        stage: "complete",
        initial_message: null,
        message_review: {
          purpose: "editorial_generation",
          generation_status: "failed_quality_gate",
          automatic_send_allowed: false,
          strategy: generated.strategy ?? null,
          usage: generated.usage ?? null,
          error: generated.error ?? "The editorial quality gate rejected the draft.",
        },
        evidence: { ...originalEvidence, analysis_mode: "gpt56_editorial", editorialBrief: editorialEvidence },
        form_discovery: {
          outcome: brief.contactUrl ? "contact_page_only" : "deferred_to_manual_contact",
          outcomeReason: brief.contactUrl
            ? "A public contact route was found during bounded editorial research; form fields were not auto-verified."
            : "No public contact route was found in the bounded editorial research pages.",
          verification: brief.contactUrl ? "page" : "none",
          confidence: brief.contactUrl ? 75 : 0,
          candidates: brief.contactUrl ? [brief.contactUrl] : [],
          checkedUrlCount: brief.pages.length,
          checkedAt: new Date().toISOString(),
          publicEmail: brief.publicEmail,
        },
        form_url: null,
        twenty_sync_status: "skipped",
        error_message: generated.error ?? "The editorial quality gate rejected the draft.",
      })
      return { item: work, duplicate: false, artifactsPreserved: false }
    }

    work = await updateManualWork(work.id, {
      status: "completed",
      stage: "complete",
      initial_message: generated.message,
      message_review: {
        ...generated.review,
        purpose: "initial_interest",
        generation_status: "passed_gpt56_editorial",
        strategy: generated.strategy ?? null,
        evidence_ids: generated.evidenceIds ?? [],
        usage: generated.usage ?? null,
        contact_url: brief.contactUrl,
        public_email: brief.publicEmail,
        automatic_send_allowed: false,
      },
      evidence: { ...originalEvidence, analysis_mode: "gpt56_editorial", editorialBrief: editorialEvidence },
      form_discovery: {
        outcome: brief.contactUrl ? "contact_page_only" : "deferred_to_manual_contact",
        outcomeReason: brief.contactUrl
          ? "A public contact route was found during bounded editorial research; open it and verify the destination before sending."
          : brief.publicEmail
            ? "A public business email was found; no contact page was confirmed in the bounded research pages."
            : "No public contact route was confirmed in the bounded editorial research pages.",
        verification: brief.contactUrl ? "page" : "none",
        confidence: brief.contactUrl ? 80 : brief.publicEmail ? 70 : 0,
        candidates: brief.contactUrl ? [brief.contactUrl] : [],
        checkedUrlCount: brief.pages.length,
        checkedAt: new Date().toISOString(),
        publicEmail: brief.publicEmail,
      },
      form_url: null,
      twenty_sync_status: "skipped",
      error_message: null,
    })
    return { item: work, duplicate: false, artifactsPreserved: false }
  } catch (error) {
    work = await updateManualWork(work.id, {
      status: "failed",
      stage: "failed",
      evidence: { ...originalEvidence, analysis_mode: "gpt56_editorial_failed" },
      message_review: {
        purpose: "editorial_generation",
        generation_status: "failed",
        automatic_send_allowed: false,
      },
      twenty_sync_status: "skipped",
      error_message: error instanceof Error ? error.message.slice(0, 2_000) : "High-quality message generation failed.",
    })
    return { item: work, duplicate: false, artifactsPreserved: false }
  }
}
