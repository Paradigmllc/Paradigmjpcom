import type { SalesCompany } from "@/lib/sales/types"

type JsonRecord = Record<string, unknown>

export function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

function stringAt(record: JsonRecord | null, path: string[]): string | null {
  let cursor: unknown = record
  for (const key of path) {
    const current = asRecord(cursor)
    if (!current) return null
    cursor = current[key]
  }
  return typeof cursor === "string" && cursor.trim().length > 0 ? cursor.trim() : null
}

export function companyMeta(company: SalesCompany): JsonRecord {
  return (company.meta ?? {}) as JsonRecord
}

export function companyPainDiagnosis(company: SalesCompany): JsonRecord | null {
  return asRecord(company.pain_diagnosis) ?? asRecord(companyMeta(company).pain_diagnosis)
}

export function companyDifyResult(company: SalesCompany): JsonRecord | null {
  return asRecord(company.dify_result) ?? asRecord(companyMeta(company).dify_diagnosis)
}

export function companyTechStack(company: SalesCompany): JsonRecord | null {
  return asRecord(company.tech_stack) ?? asRecord(companyMeta(company).tech)
}

export function companyJapanMarketAudit(company: SalesCompany): JsonRecord | null {
  return asRecord(company.japan_market_audit) ?? asRecord(companyMeta(company).japan_market_audit)
}

export function companyDemoSite(company: SalesCompany): JsonRecord | null {
  return asRecord(company.demo_site) ?? asRecord(companyMeta(company).demo_site)
}

export function companyVisualEvidence(company: SalesCompany): JsonRecord | null {
  return asRecord(company.visual_evidence) ?? asRecord(companyMeta(company).visual_evidence)
}

export function companyContactFormUrl(company: SalesCompany): string | null {
  const meta = companyMeta(company)
  return stringAt(meta, ["contact_form_url"]) ??
    stringAt(meta, ["form_discovery", "form_url"]) ??
    stringAt(meta, ["discovery", "contact_form_url"]) ??
    stringAt(meta, ["crawl4ai", "contact_form_url"])
}

export function mergedCompanyMeta(company: SalesCompany): JsonRecord {
  const meta = companyMeta(company)
  const painDiagnosis = companyPainDiagnosis(company)
  const difyResult = companyDifyResult(company)
  const tech = companyTechStack(company)
  const japanMarketAudit = companyJapanMarketAudit(company)
  const demoSite = companyDemoSite(company)
  const visualEvidence = companyVisualEvidence(company)

  return {
    ...meta,
    ...(painDiagnosis ? { pain_diagnosis: painDiagnosis } : {}),
    ...(difyResult ? { dify_diagnosis: difyResult } : {}),
    ...(tech ? { tech } : {}),
    ...(japanMarketAudit ? { japan_market_audit: japanMarketAudit } : {}),
    ...(demoSite ? { demo_site: demoSite } : {}),
    ...(visualEvidence ? { visual_evidence: visualEvidence } : {}),
  }
}
