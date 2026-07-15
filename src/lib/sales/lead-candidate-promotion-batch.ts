import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { normalizeCompanyName, normalizeDomain } from "./dedup"
import type { LeadQualityGate } from "./lead-quality-gate"
import type { CandidateScore } from "./lead-candidate-scoring"
import { salesScopeFromCountry } from "./locale-scope"
import type { FormDiscoveryResult } from "./sources/form-discovery"
import type { TechItem } from "./sources/wappalyzer"

type JsonRecord = Record<string, unknown>

export interface BatchPromotionInput {
  itemId: string
  runId: string
  countryCode: string
  candidateId: string
  companyName: string
  domain: string
  sourcePageUrl: string
  qualityGate: LeadQualityGate
  score: CandidateScore
  detections: TechItem[]
  form: FormDiscoveryResult
  source: string
}

export interface PreparedBatchPromotion {
  itemId: string
  candidateId: string
  companyId: string
  domain: string
}

interface ExistingCompany {
  id: string
  domain: string
  slug: string | null
  meta: unknown
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function listLeadSlug(companyName: string, domain: string): string {
  const name = companyName.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lead"
  const host = domain.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  return `${name}-${host}`.slice(0, 180)
}

export async function prepareFormQualifiedCandidatesBatch(inputs: BatchPromotionInput[]): Promise<PreparedBatchPromotion[]> {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  if (inputs.length === 0) return []
  if (inputs.length > 60) throw new Error("Twenty promotion batches are limited to 60 companies")

  const normalized = inputs.map((input) => ({
    ...input,
    domain: normalizeDomain(input.domain) ?? input.domain.trim().toLowerCase(),
  }))
  const domains = [...new Set(normalized.map((input) => input.domain))]
  if (domains.length !== normalized.length) throw new Error("Duplicate domains are not allowed in a promotion batch")

  const existingResult = await sb.from(DB_TABLES.SALES_COMPANIES)
    .select("id, domain, slug, meta")
    .in("domain", domains)
  if (existingResult.error) throw new Error(existingResult.error.message)
  const existing = new Map((existingResult.data as ExistingCompany[] | null ?? []).map((company) => [company.domain, company]))
  const promotedAt = new Date().toISOString()
  const rows = normalized.map((input) => {
    const current = existing.get(input.domain)
    const currentMeta = record(current?.meta)
    const scope = salesScopeFromCountry({ targetCountry: input.countryCode })
    return {
      domain: input.domain,
      company_name: input.companyName,
      name_key: normalizeCompanyName(input.companyName),
      region: scope.region,
      slug: current?.slug ?? listLeadSlug(input.companyName, input.domain),
      report_url: null,
      report_locale: scope.reportLocale,
      target_country: scope.targetCountry,
      template_variant: "japan_entry",
      pipeline_status: "pending",
      source: input.source,
      tech_stack: { detections: input.detections, source: input.source },
      meta: {
        ...currentMeta,
        skip_enrichment: true,
        list_only: true,
        contact_form_url: input.form.formUrl,
        form_discovery: input.form,
        source_page_url: input.sourcePageUrl,
        quality_gate: input.qualityGate,
        lead_candidate: {
          id: input.candidateId,
          run_id: input.runId,
          source: input.source,
          score: input.score,
          promoted_at: promotedAt,
        },
        routing: {
          ...record(currentMeta.routing),
          report_locale: scope.reportLocale,
          target_country: scope.targetCountry,
          template_variant: "japan_entry",
          report_url: null,
        },
      },
    }
  })

  const saved = await sb.from(DB_TABLES.SALES_COMPANIES)
    .upsert(rows, { onConflict: "domain", ignoreDuplicates: false })
    .select("id, domain")
  if (saved.error) throw new Error(saved.error.message)
  const companyByDomain = new Map((saved.data ?? []).map((company) => [String(company.domain), String(company.id)]))
  return normalized.map((input) => {
    const companyId = companyByDomain.get(input.domain)
    if (!companyId) throw new Error(`Prepared company was not returned: ${input.domain}`)
    return { itemId: input.itemId, candidateId: input.candidateId, companyId, domain: input.domain }
  })
}
