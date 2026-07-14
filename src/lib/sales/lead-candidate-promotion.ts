import { getServiceSalesSupabase } from "@/lib/supabase"
import { upsertCompanyByDomain } from "./companies"
import { DB_TABLES } from "./db-tables"
import { normalizeDomain } from "./dedup"
import { salesScopeFromCountry } from "./locale-scope"
import type { CandidateScore } from "./lead-candidate-scoring"
import type { FormDiscoveryResult } from "./sources/form-discovery"
import type { TechItem } from "./sources/wappalyzer"
import { syncCompanyKarteToTwenty } from "./twenty-sync-companies"

interface PromotionInput {
  runId: string
  countryCode: string
  syncTwenty: boolean
  candidateId: string
  domain: string
  score: CandidateScore
  detections: TechItem[]
  form: FormDiscoveryResult
  source: string
}

function guessedCompanyName(domain: string): string {
  const normalized = normalizeDomain(domain) ?? domain
  const label = normalized.split(".")[0] ?? normalized
  return label.split(/[-_]/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ") || normalized
}

export async function promoteFormQualifiedCandidate(input: PromotionInput) {
  const scope = salesScopeFromCountry({ targetCountry: input.countryCode })
  const saved = await upsertCompanyByDomain({
    domain: input.domain,
    company_name: guessedCompanyName(input.domain),
    region: scope.region,
    report_locale: scope.reportLocale,
    target_country: scope.targetCountry,
    source: input.source,
    pipeline_status: "scanning",
    tech_stack: { detections: input.detections, source: input.source },
    meta: {
      skip_enrichment: true,
      list_only: true,
      contact_form_url: input.form.formUrl,
      form_discovery: input.form,
      lead_candidate: { id: input.candidateId, run_id: input.runId, source: input.source, score: input.score, promoted_at: new Date().toISOString() },
    },
  })
  if (!saved.ok || !saved.company) return { promoted: false, twentySynced: false, error: saved.error ?? "company upsert failed" }

  let twentyCompanyId: string | null = null
  if (input.syncTwenty) {
    const synced = await syncCompanyKarteToTwenty(saved.company.id, { syncOpportunities: false })
    if (!synced.ok) return { promoted: false, companyId: saved.company.id, twentySynced: false, error: synced.error ?? "Twenty sync failed" }
    twentyCompanyId = synced.companyId ?? null
  }

  const sb = getServiceSalesSupabase()
  if (!sb) return { promoted: false, companyId: saved.company.id, twentySynced: false, error: "Supabase service_role not configured" }
  const marker = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS).update({ status: "promoted", company_id: saved.company.id }).eq("id", input.candidateId)
  if (marker.error) return { promoted: false, companyId: saved.company.id, twentySynced: false, error: marker.error.message }
  return { promoted: true, companyId: saved.company.id, twentySynced: input.syncTwenty, twentyCompanyId }
}
