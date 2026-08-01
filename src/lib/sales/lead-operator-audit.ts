import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"

type LeadOperatorEntity = "source" | "run" | "item"

export async function recordLeadOperatorEvent(input: {
  runId?: string
  entityType: LeadOperatorEntity
  entityId: string
  action: string
  operatorName: string
  detail?: Record<string, unknown>
}): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  const { error } = await sb.from(DB_TABLES.SALES_LEAD_OPERATOR_EVENTS).insert({
    run_id: input.runId ?? null,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    operator_name: input.operatorName.trim(),
    detail: input.detail ?? {},
  })
  if (error) throw new Error(error.message)
}
