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

function structuredFit(input: {
  businessModel: BusinessModel
  productCount: number
  evidenceCount: number
  countryCode: string | null
  contactFound: boolean
  japanPresenceLevel: "none" | "language" | "support" | "sales"
}): number {
  if (input.japanPresenceLevel === "sales") return 0
  if (input.japanPresenceLevel === "support") return 5
  if (input.japanPresenceLevel === "language") return 20
  let score = 35
  if (input.businessModel === "ecommerce" || input.businessModel === "saas") score += 20
  if (input.productCount > 0) score += 10
  if (input.evidenceCount >= 8) score += 10
  if (input.countryCode) score += 5
  if (input.contactFound) score += 5
  return Math.min(85, score)
}

function japanFitEvidence(input: {
  businessModel: BusinessModel
  productCount: number
  countryCode: string | null
  contactFound: boolean
  presence: { existing: boolean; level: string; signals: string[] }
}): string[] {
  if (input.presence.existing) {
    return [
      input.presence.level === "sales"
        ? "日本向け販売店・購入導線を公式サイトで確認しました。"
        : input.presence.level === "support"
          ? "日本向けサポートまたは現地パートナー導線を公式サイトで確認しました。"
          : "日本語の顧客導線を公式サイトで確認しました。",
      "日本未進出企業向けの新規Japan Country Partner営業対象にはしません。",
      ...input.presence.signals.slice(0, 4),
    ]
  }
  return [
    input.businessModel === "ecommerce" || input.businessModel === "saas"
      ? "日本へ遠隔提供しやすい商品・デジタル型の事業構造を確認しました。"
      : "サービス型のため、日本での提供方法は追加確認が必要です。",
    input.productCount > 0 ? "具体的な商品・サービス名を公式ページから取得しました。" : "商品名は追加確認が必要です。",
    input.countryCode ? `本拠地候補を ${input.countryCode} として公開情報から整理しました。` : "本拠地は公開情報だけでは確定できませんでした。",
    input.contactFound ? "公開された問い合わせ経路を確認しました。" : "公開問い合わせ経路は追加確認が必要です。",
  ]
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
      version: "chatgpt-pro-handoff-v2",
      workId: existing.id,
      domain: brief.domain,
      companyName: brief.companyName,
      countryCode: brief.countryCode,
      countryConfidence: brief.countryConfidence,
      countrySignals: brief.countrySignals,
      businessModel: brief.businessModel,
      productNames: brief.productNames,
      productContext: brief.productContext,
      collectedAt: brief.collectedAt,
      contactUrl: brief.contactUrl,
      publicEmail: brief.publicEmail,
      contactFormDetected: brief.contactFormDetected,
      contactSignals: brief.contactSignals,
      japanPresence: brief.japanPresence,
      pages: brief.pages.map((page) => ({
        url: page.url,
        kind: page.kind,
        title: page.title,
        description: page.description,
        headings: page.headings,
        hasContactForm: page.hasContactForm,
      })),
      evidence: brief.evidence,
    }

    const contactFound = Boolean(brief.contactUrl || brief.publicEmail)
    const fitConfidence = structuredFit({
      businessModel: brief.businessModel,
      productCount: brief.productNames.length,
      evidenceCount: brief.evidence.length,
      countryCode: brief.countryCode,
      contactFound,
      japanPresenceLevel: brief.japanPresence.level,
    })
    const fitEvidence = japanFitEvidence({
      businessModel: brief.businessModel,
      productCount: brief.productNames.length,
      countryCode: brief.countryCode,
      contactFound,
      presence: brief.japanPresence,
    })
    const existingJapanPresence = brief.japanPresence.existing
    const existingProfile = record(existing.profile)
    const industry = brief.businessModel === "ecommerce"
      ? "E-Commerce / Retail"
      : brief.businessModel === "saas"
        ? "Technology / IT"
        : existing.industry ?? "Other"

    work = await updateManualWork(work.id, {
      status: existingJapanPresence ? "rejected" : "completed",
      stage: "complete",
      company_name: brief.companyName,
      country_code: brief.countryCode,
      business_model: brief.businessModel,
      industry,
      product_context: brief.productContext,
      japan_entry_fit_status: existingJapanPresence
        ? "rejected"
        : brief.businessModel === "ecommerce" || brief.businessModel === "saas"
          ? "qualified"
          : "review_required",
      japan_entry_fit_confidence: fitConfidence,
      profile: {
        ...existingProfile,
        companyName: brief.companyName,
        countryCode: brief.countryCode,
        businessModel: brief.businessModel,
        industry,
        productContext: brief.productContext,
        observedFacts: brief.evidence.slice(0, 10).map((point) => point.statement),
        japanEntryFitStatus: existingJapanPresence
          ? "rejected"
          : brief.businessModel === "ecommerce" || brief.businessModel === "saas"
            ? "qualified"
            : "review_required",
        japanEntryFitConfidence: fitConfidence,
        japanEntryFitEvidence: fitEvidence,
        existingJapanPresence: brief.japanPresence,
        countryConfidence: brief.countryConfidence,
        countrySignals: brief.countrySignals,
      },
      initial_message: null,
      message_review: {
        purpose: "chatgpt_handoff",
        generation_status: existingJapanPresence ? "existing_japan_presence" : "brief_ready",
        brief_version: handoffBrief.version,
        contact_url: brief.contactUrl,
        public_email: brief.publicEmail,
        contact_form_detected: brief.contactFormDetected,
        existing_japan_presence: brief.japanPresence,
        automatic_send_allowed: false,
        api_used: false,
      },
      evidence: {
        ...originalEvidence,
        analysis_mode: existingJapanPresence ? "existing_japan_presence" : "chatgpt_brief_ready",
        editorialBrief: handoffBrief,
        structuredSummary: {
          companyName: brief.companyName,
          countryCode: brief.countryCode,
          countryConfidence: brief.countryConfidence,
          countrySignals: brief.countrySignals,
          businessModel: brief.businessModel,
          productNames: brief.productNames,
          productContext: brief.productContext,
          contactUrl: brief.contactUrl,
          publicEmail: brief.publicEmail,
          contactFormDetected: brief.contactFormDetected,
          contactSignals: brief.contactSignals,
          japanPresence: brief.japanPresence,
        },
      },
      form_discovery: {
        outcome: brief.contactFormDetected && brief.contactUrl
          ? "verified_form"
          : brief.contactUrl
            ? "contact_page_only"
            : brief.publicEmail
              ? "public_email_only"
              : "deferred_to_manual_contact",
        outcomeReason: brief.contactFormDetected && brief.contactUrl
          ? "A business inquiry form with identity and message fields was detected on a first-party page."
          : brief.contactUrl
            ? "A public contact route was found while preparing the ChatGPT handoff brief; form fields were not fully verified."
            : brief.publicEmail
              ? "A public business email was found while preparing the ChatGPT handoff brief."
              : "No public contact route was confirmed in the bounded research pages.",
        verification: brief.contactFormDetected ? "html_form" : brief.contactUrl ? "page" : brief.publicEmail ? "email" : "none",
        confidence: brief.contactFormDetected ? 92 : brief.contactUrl ? 80 : brief.publicEmail ? 70 : 0,
        candidates: brief.contactUrl ? [brief.contactUrl] : [],
        checkedUrlCount: brief.pages.length,
        checkedAt: new Date().toISOString(),
        publicEmail: brief.publicEmail,
      },
      form_url: brief.contactFormDetected ? brief.contactUrl : null,
      qualification_ledger: {},
      master_lead_ledger: {},
      report_data: {},
      report_url: null,
      twenty_company_id: null,
      twenty_sync_status: "skipped",
      error_message: existingJapanPresence ? fitEvidence.join(" ").slice(0, 2_000) : null,
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
