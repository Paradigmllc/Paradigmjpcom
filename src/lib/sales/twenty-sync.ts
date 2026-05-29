import { getServiceSalesSupabase } from "@/lib/supabase"
import {
  companyKarteMarkdown,
  fetchCompanyKarte,
  type CompanyKarteSnapshot,
} from "@/lib/sales/company-karte"

interface TwentyRecord {
  id?: string
  name?: string
  domainName?: {
    primaryLinkUrl?: string | null
    primaryLinkLabel?: string | null
  } | null
}

interface TwentyListResponse<T> {
  data?: {
    companies?: T[]
    notes?: T[]
  }
}

export interface TwentySyncResult {
  ok: boolean
  configured: boolean
  companyId?: string
  noteId?: string
  error?: string
}

function env(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

function twentyBaseUrl(): string | null {
  const base = env("TWENTY_BASE_URL")
  return base ? base.replace(/\/$/, "") : null
}

function domainMatches(record: TwentyRecord, domain: string): boolean {
  const normalized = domain.toLowerCase()
  const url = record.domainName?.primaryLinkUrl?.toLowerCase() ?? ""
  const label = record.domainName?.primaryLinkLabel?.toLowerCase() ?? ""
  return url.includes(normalized) || label === normalized
}

async function twentyFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const baseUrl = twentyBaseUrl()
  const apiKey = env("TWENTY_API_KEY")
  if (!baseUrl || !apiKey) return { ok: false, error: "TWENTY_BASE_URL or TWENTY_API_KEY is not configured" }

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })

  const text = await res.text()
  if (!res.ok) return { ok: false, error: text || `Twenty API HTTP ${res.status}` }

  try {
    return { ok: true, data: JSON.parse(text) as T }
  } catch (e) {
    console.error("[twenty-sync] invalid JSON response:", e)
    return { ok: false, error: "Twenty API returned invalid JSON" }
  }
}

async function findTwentyCompany(karte: CompanyKarteSnapshot): Promise<TwentyRecord | null> {
  const result = await twentyFetch<TwentyListResponse<TwentyRecord>>("/rest/companies?limit=200")
  if (!result.ok) throw new Error(result.error)
  return result.data.data?.companies?.find((company) => domainMatches(company, karte.domain)) ?? null
}

async function createTwentyCompany(karte: CompanyKarteSnapshot): Promise<TwentyRecord> {
  const result = await twentyFetch<{ data?: { createCompany?: TwentyRecord; company?: TwentyRecord } }>(
    "/rest/companies",
    {
      method: "POST",
      body: JSON.stringify({
        name: karte.companyName,
        domainName: {
          primaryLinkLabel: karte.domain,
          primaryLinkUrl: `https://${karte.domain}`,
        },
      }),
    },
  )
  if (!result.ok) throw new Error(result.error)
  const company = result.data.data?.createCompany ?? result.data.data?.company
  if (!company?.id) throw new Error("Twenty company create response did not include id")
  return company
}

async function createTwentyKarteNote(karte: CompanyKarteSnapshot, twentyCompanyId: string): Promise<string> {
  const body = companyKarteMarkdown(karte)
  const result = await twentyFetch<{ data?: { createNote?: { id?: string }; note?: { id?: string } } }>(
    "/rest/notes",
    {
      method: "POST",
      body: JSON.stringify({
        title: `企業カルテ: ${karte.companyName}`,
        bodyV2Markdown: body,
        noteTargets: [
          {
            targetCompanyId: twentyCompanyId,
          },
        ],
      }),
    },
  )
  if (!result.ok) throw new Error(result.error)
  const noteId = result.data.data?.createNote?.id ?? result.data.data?.note?.id
  if (!noteId) throw new Error("Twenty note create response did not include id")
  return noteId
}

export async function syncCompanyKarteToTwenty(companyId: string): Promise<TwentySyncResult> {
  const baseUrl = twentyBaseUrl()
  const apiKey = env("TWENTY_API_KEY")
  if (!baseUrl || !apiKey) {
    return { ok: false, configured: false, error: "TWENTY_BASE_URL or TWENTY_API_KEY is not configured" }
  }

  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, configured: true, error: "Supabase service_role not configured" }

  const karteResult = await fetchCompanyKarte(sb, companyId)
  if (!karteResult.ok) return { ok: false, configured: true, error: karteResult.error }

  try {
    const existing = await findTwentyCompany(karteResult.karte)
    const twentyCompany = existing?.id ? existing : await createTwentyCompany(karteResult.karte)
    if (!twentyCompany.id) throw new Error("Twenty company id missing")
    const noteId = await createTwentyKarteNote(karteResult.karte, twentyCompany.id)

    await sb.from("sales_sync_logs").insert({
      direction: "supabase->twenty",
      entity_type: "company",
      entity_id: companyId,
      action: "karte_note_sync",
      status: "success",
      payload: {
        twenty_company_id: twentyCompany.id,
        twenty_note_id: noteId,
        report_url: karteResult.karte.reportUrl,
        form_url: karteResult.karte.formUrl,
      },
    })

    return { ok: true, configured: true, companyId: twentyCompany.id, noteId }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Twenty sync failed"
    console.error("[twenty-sync] failed:", e)
    await sb.from("sales_sync_logs").insert({
      direction: "supabase->twenty",
      entity_type: "company",
      entity_id: companyId,
      action: "karte_note_sync",
      status: "error",
      error_message: message,
    })
    return { ok: false, configured: true, error: message }
  }
}
