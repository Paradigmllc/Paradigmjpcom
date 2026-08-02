import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"
import type { SalesApiPrincipal } from "@/lib/sales/api-auth"
import type { WorkspaceAction } from "@/lib/sales/japan-operator-workspace-schema"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

type DraftAction = Extract<WorkspaceAction, { action: "create_contract_draft" }>

type DocusealSubmitter = {
  id?: number
  submission_id?: number
  slug?: string
  embed_src?: string
  status?: string
}

function docusealSubmissionsUrl(): string {
  const explicit = process.env.DOCUSEAL_API_URL?.trim().replace(/\/$/, "")
  if (explicit) return `${explicit}/submissions`
  const base = process.env.DOCUSEAL_BASE_URL?.trim().replace(/\/$/, "")
  if (!base) throw new Error("DOCUSEAL_BASE_URL is not configured")
  return `${base}${base.includes("api.docuseal.com") ? "" : "/api"}/submissions`
}

function parseSubmitter(value: unknown): DocusealSubmitter {
  if (!Array.isArray(value) || !value[0] || typeof value[0] !== "object") {
    throw new Error("DocuSeal returned an invalid submission response")
  }
  const submitter = value[0] as DocusealSubmitter
  if (!submitter.submission_id || !submitter.embed_src) {
    throw new Error("DocuSeal response is missing the submission ID or signing URL")
  }
  return submitter
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

async function findReusableContractDraft(supabase: ServiceSupabase, action: DraftAction) {
  const existing = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_CONTRACT_LINKS)
    .select("sales_contract_id,docuseal_submission_id,status,detail")
    .eq("case_id", action.caseId)
    .eq("contract_kind", action.contractKind)
    .in("status", ["draft", "sent", "viewed", "signed"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existing.error) throw new Error(existing.error.message)
  if (!existing.data) return null
  if (existing.data.status === "signed") throw new Error("This contract kind is already signed for the engagement")
  const signingUrl = record(existing.data.detail).embed_src
  if (typeof signingUrl !== "string" || !signingUrl.startsWith("http")) {
    throw new Error("An active contract already exists without a reusable DocuSeal signing URL")
  }
  return {
    contractId: existing.data.sales_contract_id,
    submissionId: existing.data.docuseal_submission_id,
    submitterId: null,
    signingUrl,
    emailSent: false,
    reused: true,
  }
}

export async function createJapanOperatorContractDraft(
  supabase: ServiceSupabase,
  action: DraftAction,
  principal: SalesApiPrincipal,
) {
  const reusable = await findReusableContractDraft(supabase, action)
  if (reusable) return reusable
  const apiKey = process.env.DOCUSEAL_API_KEY?.trim()
  if (!apiKey) throw new Error("DOCUSEAL_API_KEY is not configured")

  const metadata = {
    japanOperatorCaseId: action.caseId,
    operatorContractKind: action.contractKind,
    currency: action.currency.toUpperCase(),
    amountMinor: action.amountMinor,
  }
  const response = await fetch(docusealSubmissionsUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Auth-Token": apiKey },
    body: JSON.stringify({
      template_id: action.templateId,
      send_email: false,
      send_sms: false,
      expire_at: action.expiresAt ?? undefined,
      submitters: [{
        name: action.submitterName,
        email: action.submitterEmail,
        role: action.submitterRole,
        external_id: action.caseId,
        values: action.values,
        metadata,
        send_email: false,
        send_sms: false,
      }],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  })

  const raw: unknown = await response.json().catch((error) => {
    console.error("[japan-operator-docuseal] invalid JSON response:", error)
    return null
  })
  if (!response.ok) {
    console.error("[japan-operator-docuseal] draft creation failed with HTTP status:", response.status)
    throw new Error(`DocuSeal draft creation failed with HTTP ${response.status}`)
  }
  const submitter = parseSubmitter(raw)
  const submissionId = String(submitter.submission_id)
  const currency = action.currency.toUpperCase()
  const contractRow = {
    region: "global",
    contract_name: action.contractName,
    contract_type: "japan_entry",
    amount_yen: currency === "JPY" ? action.amountMinor : null,
    amount_usd: currency === "USD" ? action.amountMinor / 100 : null,
    currency,
    docusign_envelope_id: submissionId,
    docusign_status: "draft",
    status: "draft",
    signer_name: action.submitterName,
    signer_email: action.submitterEmail,
    last_synced: new Date().toISOString(),
    meta: {
      provider: "docuseal",
      send_email: false,
      template_id: action.templateId,
      embed_src: submitter.embed_src,
      ...metadata,
    },
  }
  const contractResult = await supabase
    .from(DB_TABLES.SALES_CONTRACTS)
    .upsert(contractRow, { onConflict: "docusign_envelope_id" })
    .select("id")
    .single()
  if (contractResult.error || !contractResult.data) {
    throw new Error(contractResult.error?.message ?? "Contract SSOT write failed")
  }

  const linked = await supabase.rpc("sales_link_japan_operator_contract_v1", {
    p_case_id: action.caseId,
    p_contract_kind: action.contractKind,
    p_sales_contract_id: contractResult.data.id,
    p_docuseal_submission_id: submissionId,
    p_status: "draft",
    p_signed_at: null,
    p_actor_key: principal.key,
    p_actor_email: principal.email,
    p_actor_role: principal.role,
    p_detail: { template_id: action.templateId, embed_src: submitter.embed_src, send_email: false },
  })
  if (linked.error) throw new Error(linked.error.message)

  return {
    contractId: contractResult.data.id,
    submissionId,
    submitterId: submitter.id ?? null,
    signingUrl: submitter.embed_src,
    emailSent: false,
    reused: false,
  }
}
