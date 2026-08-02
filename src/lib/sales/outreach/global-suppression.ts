import { createHash } from "node:crypto"
import { getServiceSalesSupabase } from "@/lib/supabase"

export type OutboundGuardInput = {
  companyId: string
  channel: string
  recipient: string
  message: string
  dryRun: boolean
}

export type OutboundGuardResult = {
  allowed: boolean
  reason: string
  messageSha256: string
  authorizationId: string | null
  operatorCaseId: string | null
}

export function outboundMessageSha256(message: string): string {
  return createHash("sha256").update(message.normalize("NFC")).digest("hex")
}

export async function authorizeOutboundAttempt(input: OutboundGuardInput): Promise<OutboundGuardResult> {
  const messageSha256 = outboundMessageSha256(input.message)
  if (input.dryRun) {
    return { allowed: true, reason: "dry_run", messageSha256, authorizationId: null, operatorCaseId: null }
  }

  const supabase = getServiceSalesSupabase()
  if (!supabase) {
    console.error("[outbound-guard] Supabase service role is unavailable; live outbound blocked")
    return { allowed: false, reason: "guard_unavailable", messageSha256, authorizationId: null, operatorCaseId: null }
  }

  const { data, error } = await supabase.rpc("sales_check_outbound_authorization", {
    p_company_id: input.companyId,
    p_channel: input.channel,
    p_recipient: input.recipient,
    p_message_sha256: messageSha256,
  })
  if (error) {
    console.error("[outbound-guard] authorization check failed:", error.message)
    return { allowed: false, reason: "guard_query_failed", messageSha256, authorizationId: null, operatorCaseId: null }
  }

  const row = Array.isArray(data) ? data[0] : data
  const authorizationId = typeof row?.authorization_id === "string" ? row.authorization_id : null
  const operatorCaseId = typeof row?.case_id === "string" ? row.case_id : null
  if (row?.allowed !== true) {
    return {
      allowed: false,
      reason: typeof row?.reason === "string" ? row.reason : "outbound_blocked",
      messageSha256,
      authorizationId,
      operatorCaseId,
    }
  }

  if (authorizationId) {
    const consumed = await supabase.rpc("sales_consume_outbound_authorization", {
      p_authorization_id: authorizationId,
      p_sales_activity_id: null,
    })
    if (consumed.error || consumed.data !== true) {
      console.error("[outbound-guard] one-time authorization could not be consumed:", consumed.error?.message ?? "already consumed")
      return { allowed: false, reason: "authorization_consumption_failed", messageSha256, authorizationId, operatorCaseId }
    }
  }

  return {
    allowed: true,
    reason: typeof row?.reason === "string" ? row.reason : "authorized",
    messageSha256,
    authorizationId,
    operatorCaseId,
  }
}
