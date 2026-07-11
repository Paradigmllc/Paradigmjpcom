import { upsertCompanyByDomain } from "@/lib/sales/companies"
import { enqueueCompanyEnrichment } from "@/lib/sales/enrichment-jobs"

interface ContactEnrichmentInput {
  leadId: string
  email: string
  company: string | null
  message: string
  services: string[]
  reportLocale: string
  targetCountry: string
}
/**
 * Persist the enrichment intent before returning the contact response.
 * Heavy source collection is performed by the durable enrichment runner; it
 * must never depend on a fire-and-forget promise tied to an HTTP request.
 */
export async function startContactEnrichment(input: ContactEnrichmentInput): Promise<void> {
  const atIndex = input.email.indexOf("@")
  const domain = atIndex >= 0 ? input.email.slice(atIndex + 1).trim().toLowerCase() : ""
  if (!domain || !domain.includes(".")) {
    console.warn(`[contact] Lead ${input.leadId} enrichment skipped: invalid email domain`)
    return
  }

  const companyResult = await upsertCompanyByDomain({
    domain,
    company_name: input.company?.trim() || domain,
    report_locale: input.reportLocale,
    target_country: input.targetCountry,
    pipeline_status: "scanning",
    source: "paradigmjp.com/contact",
    meta: {
      contact: {
        lead_id: input.leadId,
        email: input.email,
        services: input.services,
        message_excerpt: input.message.slice(0, 200),
        received_at: new Date().toISOString(),
      },
    },
  })

  if (!companyResult.ok || !companyResult.company) {
    console.error(`[contact] Lead ${input.leadId} enrichment company enqueue failed:`, companyResult.error)
    return
  }

  const jobResult = await enqueueCompanyEnrichment({
    companyId: companyResult.company.id,
    source: "paradigmjp.com/contact",
    triggeredBy: "contact_submission",
    priority: 90,
    payload: { lead_id: input.leadId, report_locale: input.reportLocale, target_country: input.targetCountry },
  })
  if (!jobResult.ok) {
    console.error(`[contact] Lead ${input.leadId} enrichment job enqueue failed:`, jobResult.error)
  }
}
