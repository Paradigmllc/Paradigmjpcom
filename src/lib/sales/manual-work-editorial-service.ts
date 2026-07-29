import "server-only"

import type { BusinessModel } from "./japan-entry-projection"
import {
  findManualWorkById,
  updateManualWork,
} from "./manual-japan-entry-store"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"
import { normalizeManualWorkUrl } from "./manual-japan-entry-workflow-helpers"
import { collectManualEditorialBrief } from "./manual-work-editorial-brief"

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

/**
 * Collects a bounded, first-party research brief for manual use in ChatGPT.
 *
 * This service intentionally performs no LLM or external writing API call. It
 * only fetches public company pages, persists exact evidence and prepares the
 * record for copy/paste handoff to the user's ChatGPT subscription.
 */
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
    stage: "fetching",
    attempts: existing.attempts + 1,
    error_message: null,
    initial_message: null,
    evidence: { ...originalEvidence, analysis_mode: "chatgpt_brief_processing" },
    message_review: {
      purpose: "chatgpt_handoff",
      generation_status: "brief_processing",
      automatic_send_allowed: false,
      api_used: false,
    },
    form_discovery: {},
    form_url: null,
    qualification_ledger: {},
    master_lead_ledger: {},
    report_data: {},
    report_url: null,
    twenty_company_id: null,
    twenty_sync_status: "skipped",
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
    const handoffBrief = {
      version: "chatgpt-pro-handoff-v1",
      workId: existing.id,
      domain: brief.domain,
      companyName: brief.companyName,
      countryCode: brief.countryCode,
      businessModel: brief.businessModel,
      productNames: brief.productNames,
      productContext: brief.productContext,
      collectedAt: brief.collectedAt,
      contactUrl: brief.contactUrl,
      publicEmail: brief.publicEmail,
      pages: brief.pages.map((page) => ({
        url: page.url,
        kind: page.kind,
        title: page.title,
        description: page.description,
        headings: page.headings,
      })),
      evidence: brief.evidence,
    }

    work = await updateManualWork(work.id, {
      status: "completed",
      stage: "complete",
      initial_message: null,
      message_review: {
        purpose: "chatgpt_handoff",
        generation_status: "brief_ready",
        brief_version: handoffBrief.version,
        contact_url: brief.contactUrl,
        public_email: brief.publicEmail,
        automatic_send_allowed: false,
        api_used: false,
      },
      evidence: {
        ...originalEvidence,
        analysis_mode: "chatgpt_brief_ready",
        editorialBrief: handoffBrief,
      },
      form_discovery: {
        outcome: brief.contactUrl ? "contact_page_only" : "deferred_to_manual_contact",
        outcomeReason: brief.contactUrl
          ? "A public contact route was found while preparing the ChatGPT handoff brief; form fields were not auto-verified."
          : brief.publicEmail
            ? "A public business email was found while preparing the ChatGPT handoff brief."
            : "No public contact route was confirmed in the bounded research pages.",
        verification: brief.contactUrl ? "page" : "none",
        confidence: brief.contactUrl ? 80 : brief.publicEmail ? 70 : 0,
        candidates: brief.contactUrl ? [brief.contactUrl] : [],
        checkedUrlCount: brief.pages.length,
        checkedAt: new Date().toISOString(),
        publicEmail: brief.publicEmail,
      },
      form_url: null,
      qualification_ledger: {},
      master_lead_ledger: {},
      report_data: {},
      report_url: null,
      twenty_company_id: null,
      twenty_sync_status: "skipped",
      error_message: null,
    })
    return { item: work, duplicate: false, artifactsPreserved: false }
  } catch (error) {
    work = await updateManualWork(work.id, {
      status: "failed",
      stage: "failed",
      evidence: { ...originalEvidence, analysis_mode: "chatgpt_brief_failed" },
      message_review: {
        purpose: "chatgpt_handoff",
        generation_status: "brief_failed",
        automatic_send_allowed: false,
        api_used: false,
      },
      form_discovery: {},
      form_url: null,
      qualification_ledger: {},
      master_lead_ledger: {},
      report_data: {},
      report_url: null,
      twenty_company_id: null,
      twenty_sync_status: "skipped",
      error_message: error instanceof Error ? error.message.slice(0, 2_000) : "ChatGPT handoff brief preparation failed.",
    })
    return { item: work, duplicate: false, artifactsPreserved: false }
  }
}
