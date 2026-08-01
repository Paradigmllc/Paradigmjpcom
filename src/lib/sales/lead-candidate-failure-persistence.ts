import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"

const FAILURE_PERSIST_ATTEMPTS = 3

export interface FailedRunItem {
  id: string
  run_id: string
  domain: string
  attempts: number
}

export async function persistRunItemFailure(item: FailedRunItem, message: string): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  let lastError = "failure status was not persisted"

  for (let attempt = 1; attempt <= FAILURE_PERSIST_ATTEMPTS; attempt += 1) {
    const result = await sb
      .from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS)
      .update({
        status: "failed",
        attempts: item.attempts + 1,
        error_message: message,
        processed_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .select("id, status")
      .maybeSingle()
    const row = result.data as { id?: string; status?: string } | null

    if (!result.error && row?.id === item.id && row.status === "failed") return

    lastError = result.error?.message ?? "failure update returned no matching row"
    console.error("[lead-candidate-runs] failed to persist item failure:", {
      runId: item.run_id,
      itemId: item.id,
      domain: item.domain,
      attempt,
      error: lastError,
    })
    if (attempt < FAILURE_PERSIST_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 250))
    }
  }

  throw new Error(`Failed to persist verification failure for ${item.domain}: ${lastError}`)
}
