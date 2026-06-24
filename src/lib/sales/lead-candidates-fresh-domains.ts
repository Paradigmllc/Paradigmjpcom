import { normalizeDomain } from "./dedup"
import { normalizeSalesCountryCode } from "./country-code"
import { inferCountrySignals, scoreCandidate } from "./lead-candidate-scoring"
import { listLeadCandidates } from "./lead-candidate-list"
import { triggerEnrichmentRunner } from "./enrichment-jobs"
import {
  FRESH_DOMAIN_WEBSITE_STATES,
  inferFreshDomainSignals,
  type FreshDomainWebsiteState,
} from "./global-smb-scoring"
import {
  guessedCompanyName,
  promoteCandidate,
  saveCandidateEvidence,
  upsertCandidateDomain,
  type CandidateAcquisitionSummary,
} from "./lead-candidates"

export interface FreshDomainInputRow {
  domain: string
  countryCode: string
  registeredAt?: string | null
  changedAt?: string | null
  companyName?: string | null
  industryHint?: string | null
  websiteState?: FreshDomainWebsiteState | null
  contactEmail?: string | null
  publicContactUrl?: string | null
  sourceUrl?: string | null
  raw?: Record<string, unknown>
}

export async function ingestFreshDomainCandidates(rows: FreshDomainInputRow[], promote = false): Promise<CandidateAcquisitionSummary> {
  const source = "dns_freshness"
  const failures: Array<{ key: string; reason: string }> = []
  let upserted = 0
  let scored = 0
  let promoted = 0
  let jobsEnqueued = 0

  for (const row of rows.slice(0, 500)) {
    try {
      const countryCode = normalizeSalesCountryCode(row.countryCode)
      const domain = normalizeDomain(row.domain)
      if (!domain) {
        failures.push({ key: row.domain, reason: "invalid domain" })
        continue
      }
      const websiteState = row.websiteState && FRESH_DOMAIN_WEBSITE_STATES.includes(row.websiteState) ? row.websiteState : "unknown"
      const evidenceText = [row.companyName, row.industryHint, row.publicContactUrl, row.sourceUrl].filter(Boolean).join("\n")
      const signals = inferFreshDomainSignals({
        domain,
        countryCode,
        registeredAt: row.registeredAt,
        changedAt: row.changedAt,
        companyName: row.companyName,
        industryHint: row.industryHint,
        websiteState,
        hasPublicContact: Boolean(row.contactEmail || row.publicContactUrl),
        evidenceText,
      })

      if (signals.isEnterpriseLike) {
        failures.push({ key: domain, reason: "enterprise-like candidate skipped before promotion" })
        continue
      }

      const candidate = await upsertCandidateDomain({
        domain,
        rootUrl: `https://${domain}`,
        lane: "dns_freshness",
        sourceSlug: source,
        meta: {
          country_code: countryCode,
          company_name: row.companyName ?? null,
          industry_hint: row.industryHint ?? null,
          website_state: websiteState,
          contact_email_present: Boolean(row.contactEmail),
          public_contact_url: row.publicContactUrl ?? null,
          source_url: row.sourceUrl ?? null,
          market: {
            report_locale: signals.market.reportLocale,
            currency: signals.market.currency,
            one_time_price: signals.market.oneTimePrice,
            maintenance_price: signals.market.maintenancePrice,
          },
          raw: row.raw ?? {},
        },
      })
      upserted++

      const countrySignals = inferCountrySignals({ domain, targetCountry: countryCode, evidenceText })
      const score = scoreCandidate({
        countrySignals,
        lane: "dns_freshness",
        hasWebsite: !["dead", "parked", "under_construction", "default_server"].includes(websiteState),
        hasContactSignal: signals.contactabilityHint,
        source,
        isEnterpriseLike: signals.isEnterpriseLike,
        websiteWeaknessScore: signals.websiteWeaknessScore,
        freshnessHintScore: signals.freshnessHintScore,
        marketFitScore: signals.localServiceFitScore,
      })
      score.details = { ...score.details, websiteState, freshDomainReasons: signals.reasons, countryCode }

      await saveCandidateEvidence({
        candidate,
        sourceSlug: source,
        observedUrl: row.sourceUrl ?? `https://${domain}`,
        rawEvidence: {
          domain,
          country_code: countryCode,
          registered_at: row.registeredAt ?? null,
          changed_at: row.changedAt ?? null,
          company_name: row.companyName ?? null,
          industry_hint: row.industryHint ?? null,
          website_state: websiteState,
          public_contact_url: row.publicContactUrl ?? null,
          contact_email_present: Boolean(row.contactEmail),
          market: signals.market,
          raw: row.raw ?? {},
        },
        signatureHits: [],
        countrySignals,
        score,
      })
      scored++

      if (promote && score.opportunityScore >= 64 && websiteState !== "modern") {
        const promotion = await promoteCandidate({
          candidate,
          countryCode,
          sourceSlug: source,
          companyName: row.companyName?.trim() || guessedCompanyName(domain),
          score,
          detections: [],
        })
        if (promotion.ok) {
          promoted++
          if (promotion.jobQueued) jobsEnqueued++
        } else {
          failures.push({ key: domain, reason: promotion.error ?? "promotion failed" })
        }
      }
    } catch (error) {
      console.error("[lead-candidates] fresh domain ingestion failed:", row.domain, error)
      failures.push({ key: row.domain, reason: error instanceof Error ? error.message : "fresh domain ingestion failed" })
    }
  }

  if (jobsEnqueued > 0) {
    const trigger = await triggerEnrichmentRunner(Math.min(jobsEnqueued, 3))
    if (!trigger.ok) failures.push({ key: "trigger_enrichment_runner", reason: trigger.error ?? "trigger failed" })
  }

  const countryCode = rows[0]?.countryCode ? normalizeSalesCountryCode(rows[0].countryCode) : null
  const candidates = await listLeadCandidates({ countryCode, lane: "dns_freshness", limit: 30 })
  return { ok: failures.length === 0 || upserted > 0, source, fetched: rows.length, upserted, verified: rows.length, matchedTechnology: 0, scored, promoted, jobsEnqueued, failures: failures.slice(0, 30), candidates }
}
