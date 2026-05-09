/**
 * Schema adapter for `leads` table — Appexxme native schema → MVP code expected fields.
 *
 * Discovered 2026-05-09 audit: leads table does NOT have company_name/domain/country_code/language.
 * Actual columns: business_name / website_url / country / (no language column).
 *
 * Pattern: SELECT raw row, normalize via this adapter, expose canonical fields to caller.
 */

export interface LeadRaw {
  id: string;
  business_name?: string | null;
  website_url?: string | null;
  country?: string | null;
  region?: string | null;
  contact_form_url?: string | null;
  industry?: string | null;
  email?: string | null;
  phone?: string | null;
  entity_id?: string | null;
  entity_id_kind?: string | null;
  meta?: Record<string, unknown> | null;
  // legacy fallbacks if some collectors use these
  company_name?: string | null;
  domain?: string | null;
  country_code?: string | null;
}

export interface LeadCanonical {
  id: string;
  company_name: string | null;
  domain: string | null;
  country_code: string | null;
  region: string | null;
  language: string | null;
  contact_form_url: string | null;
  industry: string | null;
  email: string | null;
  phone: string | null;
  entity_id: string | null;
  entity_id_kind: string | null;
  meta: Record<string, unknown>;
}

export const LEAD_SELECT_COLUMNS = "id, business_name, website_url, country, region, contact_form_url, industry, email, phone, entity_id, entity_id_kind, meta";

export function normalizeLead(raw: LeadRaw | null | undefined): LeadCanonical | null {
  if (!raw) return null;
  const meta = (raw.meta ?? {}) as Record<string, unknown>;
  return {
    id: raw.id,
    company_name: raw.business_name ?? raw.company_name ?? (meta.company_name as string | undefined) ?? null,
    domain: raw.website_url ?? raw.domain ?? (meta.domain as string | undefined) ?? null,
    country_code: raw.country ?? raw.country_code ?? null,
    region: raw.region ?? (meta.region as string | undefined) ?? null,
    language: (meta.language as string | undefined) ?? null,
    contact_form_url: raw.contact_form_url ?? null,
    industry: raw.industry ?? (meta.industry_slug as string | undefined) ?? null,
    email: raw.email ?? null,
    phone: raw.phone ?? null,
    entity_id: raw.entity_id ?? (meta.entity_id as string | undefined) ?? null,
    entity_id_kind: raw.entity_id_kind ?? (meta.entity_id_kind as string | undefined) ?? null,
    meta,
  };
}
