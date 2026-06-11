/**
 * Flowsint OSINT data source — enriches companies with WHOIS, subdomain, email breach data.
 * Requires Flowsint deployed on internal network (http://flowsint-api-prod:5001 or http://localhost:5001).
 */
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

const FLOWSINT_BASE = process.env.FLOWSINT_API_URL || "http://127.0.0.1:5001"
const FLOWSINT_TOKEN = process.env.FLOWSINT_API_TOKEN

interface FlowsintEnrichResult {
  source: string
  ok: boolean
  data?: Record<string, unknown>
  error?: string
}

async function flowsintRequest(path: string, method: string, body?: unknown): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (FLOWSINT_TOKEN) {
    headers["Authorization"] = `Bearer ${FLOWSINT_TOKEN}`
  } else {
    console.warn("[flowsint-source] FLOWSINT_API_TOKEN is not set, authentication headers will be omitted")
  }
  
  const res = await fetch(`${FLOWSINT_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  })
  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch (e) { console.error("[flowsint] JSON parse failed:", e); data = { raw: text } }
  return { status: res.status, data }
}

/**
 * Ensure a Flowsint graph node exists for this domain.
 * Creates node if not exists, returns node ID.
 */
async function ensureDomainNode(domain: string): Promise<string | null> {
  const res = await flowsintRequest(`/api/v1/graph/nodes?type=domain&value=${encodeURIComponent(domain)}`, "GET")
  if (res.status === 200 && (res.data as Record<string, unknown>)?.id) {
    return (res.data as Record<string, unknown>).id as string
  }
  // Try creating
  const create = await flowsintRequest("/api/v1/graph/nodes", "POST", {
    type: "domain",
    value: domain,
    labels: ["revenue-os", "enrichment"],
  })
  if (create.status === 200 || create.status === 201) {
    return (create.data as Record<string, unknown>)?.id as string ?? null
  }
  return null
}

/** Run an enricher on a node and return results */
async function runEnricher(nodeId: string, enricherName: string): Promise<Record<string, unknown> | null> {
  const res = await flowsintRequest(`/api/v1/graph/nodes/${nodeId}/enrich`, "POST", {
    enricher: enricherName,
  })
  if (res.status === 200) return (res.data as Record<string, unknown>) ?? null
  return null
}

export async function enrichDomainWithFlowsint(domain: string): Promise<FlowsintEnrichResult[]> {
  const results: FlowsintEnrichResult[] = []

  if (!domain || !domain.includes(".")) {
    return [{ source: "flowsint", ok: false, error: "invalid domain" }]
  }

  try {
    const nodeId = await ensureDomainNode(domain)
    if (!nodeId) {
      return [{ source: "flowsint", ok: false, error: "failed to create domain node" }]
    }

    // Run key enrichers in parallel
    const enrichers = [
      { name: "domain_whois", key: "whois" },
      { name: "domain_subdomains", key: "subdomains" },
      { name: "domain_reverse_dns", key: "reverse_dns" },
    ]

    const enriched = await Promise.all(
      enrichers.map(async ({ name, key }) => {
        try {
          const data = await runEnricher(nodeId, name)
          return { source: `flowsint_${key}`, ok: !!data, data: data ?? undefined, error: data ? undefined : `enricher ${name} returned no data` }
        } catch (e) {
          console.error(`[flowsint] enricher ${name} failed:`, e)
          return { source: `flowsint_${key}`, ok: false, error: String(e) }
        }
      })
    )
    results.push(...enriched)

    // Also check email breach if we have contact emails
    const sb = getServiceSalesSupabase()
    if (sb) {
      const { data: contacts } = await sb
        .from(DB_TABLES.SALES_COMPANIES)
        .select("contact_email, contact_name")
        .eq("domain", domain)
        .maybeSingle()
      
      if (contacts?.contact_email) {
        const emailNode = await ensureDomainNode(contacts.contact_email) // reuse domain node creation
        if (emailNode) {
          const breachData = await runEnricher(emailNode, "email_breaches")
          results.push({
            source: "flowsint_email_breach",
            ok: !!breachData,
            data: breachData ?? undefined,
            error: breachData ? undefined : "no breach data",
          })
        }
      }
    }

    return results
  } catch (error) {
    return [{ source: "flowsint", ok: false, error: String(error) }]
  }
}

/** Health check — returns true if Flowsint is reachable */
export async function checkFlowsintHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await flowsintRequest("/health", "GET")
    return { ok: res.status === 200, detail: `HTTP ${res.status}` }
  } catch (error) {
    return { ok: false, detail: String(error) }
  }
}
