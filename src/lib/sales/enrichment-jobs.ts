import { getServiceSalesSupabase } from "@/lib/supabase"
import { runEnrichmentJobs } from "./enrichment-jobs-runner"
import { DB_TABLES } from "@/lib/sales/db-tables"

export type JsonRecord = Record<string, unknown>
export type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export type EnrichmentJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled"
export type EnrichmentJobType = "company_karte" | "dify_diagnosis" | "report_personalize" | "twenty_sync"

export interface SalesEnrichmentJob {
  id: string
  company_id: string
  job_type: EnrichmentJobType
  status: EnrichmentJobStatus
  priority: number
  attempts: number
  max_attempts: number
  source: string | null
  triggered_by: string | null
  next_run_at: string
  started_at: string | null
  completed_at: string | null
  locked_at: string | null
  lock_owner: string | null
  error_message: string | null
  input_payload: JsonRecord
  result_payload: JsonRecord
  created_at: string
  updated_at: string
}

export interface EnqueueEnrichmentInput {
  companyId: string
  source: string
  triggeredBy: string
  priority?: number
  payload?: JsonRecord
}

export interface EnrichmentRunResult {
  ok: boolean
  processed: number
  completed: number
  failed: number
  errors: string[]
}

interface JobCompanyProjection {
  company_name?: string | null
  domain?: string | null
}

interface RecentJobRow {
  id: string
  company_id: string
  job_type: string
  status: string
  priority: number | null
  attempts: number | null
  max_attempts: number | null
  source: string | null
  triggered_by: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  sales_companies?: JobCompanyProjection | JobCompanyProjection[] | null
}

export interface DashboardEnrichmentJob {
  id: string
  companyId: string
  companyName: string | null
  domain: string | null
  jobType: string
  status: string
  priority: number
  attempts: number
  maxAttempts: number
  source: string | null
  triggeredBy: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

function getSb(): ServiceSupabase | null {
  return getServiceSalesSupabase()
}

import { optionalEnv } from "./japan-readiness-utils"

function triggerSecretKey(): string | null {
  return optionalEnv("TRIGGER_SECRET_KEY") ?? optionalEnv("TRIGGER_ACCESS_TOKEN") ?? optionalEnv("TRIGGER_DEV_API_KEY")
}

function enrichmentTriggerEndpoint(): string | null {
  const taskId =
    optionalEnv("TRIGGER_SALES_ENRICHMENT_TASK_ID") ??
    optionalEnv("TRIGGER_DEV_SALES_ENRICHMENT_TASK_ID") ??
    "sales-enrichment-runner"

  const apiUrlRaw = optionalEnv("TRIGGER_API_URL")
  if (!apiUrlRaw) {
    console.error("[enrichment-jobs] TRIGGER_API_URL is not configured")
    return null
  }
  const apiUrl = apiUrlRaw.replace(/\/+$/, "")
  return `${apiUrl}/api/v1/tasks/${encodeURIComponent(taskId)}/trigger`
}

export async function enqueueCompanyEnrichment(
  input: EnqueueEnrichmentInput,
): Promise<{ ok: boolean; job?: SalesEnrichmentJob; error?: string }> {
  const sb = getSb()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }

  const { data, error } = await sb
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .insert({
      company_id: input.companyId,
      job_type: "company_karte",
      status: "queued",
      priority: input.priority ?? 50,
      source: input.source,
      triggered_by: input.triggeredBy,
      input_payload: input.payload ?? {},
    })
    .select("*")
    .single()

  if (!error) return { ok: true, job: data as SalesEnrichmentJob }

  if (error.code === "23505") {
    const existing = await sb
      .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
      .select("*")
      .eq("company_id", input.companyId)
      .eq("job_type", "company_karte")
      .in("status", ["queued", "running"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existing.data) return { ok: true, job: existing.data as SalesEnrichmentJob }
  }

  console.error("[sales-enrichment] enqueue failed:", error.message)
  return { ok: false, error: error.message }
}

export async function triggerEnrichmentRunner(limit = 3): Promise<{ ok: boolean; error?: string }> {
  const endpoint = enrichmentTriggerEndpoint()
  const secret = triggerSecretKey()
  if (!endpoint || !secret) {
    console.error("[sales-enrichment] CRITICAL: Trigger.dev task or secret is not configured. Running enrichment inline may cause server timeouts for long tasks.")
    return { ok: false, error: "runner trigger not configured - missing external orchestrator" }
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        payload: { limit },
        context: { source: "revenue-os", job: "sales-enrichment" },
        options: {
          idempotencyKey: `sales-enrichment-runner-${new Date().toISOString().slice(0, 16)}`,
          concurrencyKey: "sales-enrichment-runner",
          queue: { name: "sales-enrichment", concurrencyLimit: 1 },
        },
      }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) {
      const text = await res.text().catch((e: unknown) => `read body failed: ${String(e)}`)
      console.error("[sales-enrichment] runner trigger failed:", res.status, text.slice(0, 300))
      return { ok: false, error: `runner HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error("[sales-enrichment] runner trigger exception:", message)
    return { ok: false, error: message }
  }
}

export async function fetchRecentEnrichmentJobs(limit = 30): Promise<DashboardEnrichmentJob[]> {
  const sb = getSb()
  if (!sb) return []

  const { data, error } = await sb
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .select("id, company_id, job_type, status, priority, attempts, max_attempts, source, triggered_by, error_message, created_at, updated_at, sales_companies(company_name, domain)")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[sales-enrichment] fetch recent jobs failed:", error.message)
    return []
  }

  return ((data ?? []) as RecentJobRow[]).map((item) => {
    const company = Array.isArray(item.sales_companies) ? item.sales_companies[0] : item.sales_companies
    return {
      id: item.id,
      companyId: item.company_id,
      companyName: company?.company_name ?? null,
      domain: company?.domain ?? null,
      jobType: item.job_type,
      status: item.status,
      priority: item.priority ?? 50,
      attempts: item.attempts ?? 0,
      maxAttempts: item.max_attempts ?? 3,
      source: item.source,
      triggeredBy: item.triggered_by,
      errorMessage: item.error_message,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }
  })
}

export { runEnrichmentJobs }
