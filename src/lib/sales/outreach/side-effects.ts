import { getServiceSalesSupabase } from "@/lib/supabase"
import { notifySlack } from "@/lib/notify"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { normalizeOrigin } from "../sources/form-discovery"
import { isAllowedFormUrlForOrigin } from "../sources/external-form-discovery"
import { logOutreachActivity, type ActivityResult } from "./activity"
import { reportUrlForCompany } from "./readiness"
import { stageToPipelineStatus, MAX_UNCERTAIN_RETRIES } from "./state-machine"
import type { Region, SalesCompany } from "../types"
import type { OutreachStage } from "./types"

export async function applyOutcome(company: SalesCompany, stage: OutreachStage, sendResult: string): Promise<boolean> {
  const sb = getServiceSalesSupabase()
  if (!sb) return false
  const reportUrl = reportUrlForCompany(company)

  const companyMeta = (company.meta ?? {}) as Record<string, unknown>
  const uncertainCount = typeof companyMeta.uncertain_count === "number" ? companyMeta.uncertain_count : 0

  let pipelineStatus = stageToPipelineStatus(stage)

  if (stage === "submit_uncertain") {
    const newCount = uncertainCount + 1
    if (newCount >= MAX_UNCERTAIN_RETRIES) {
      pipelineStatus = "manual_queue"
    }
  }

  const patch: Record<string, unknown> = {
    pipeline_status: pipelineStatus,
    send_result: sendResult,
  }
  if (reportUrl) patch.report_url = reportUrl
  if (stage === "submitted") patch.sent_at = new Date().toISOString()
  if (stage === "submit_uncertain") {
    patch.meta = { ...companyMeta, uncertain_count: uncertainCount + 1 }
  }
  const { error } = await sb.from(DB_TABLES.SALES_COMPANIES).update(patch).eq("id", company.id)
  if (error) {
    console.error("[sales-outreach] outcome update failed:", error.message)
    return false
  }
  return true
}

export async function logActivity(
  company: SalesCompany,
  stage: OutreachStage,
  result: ActivityResult,
  meta: Record<string, unknown>,
  pipelineRunId?: string | null,
): Promise<void> {
  try {
    await logOutreachActivity({
      companyId: company.id,
      region: company.region,
      pipelineRunId,
      subject: `Form outreach (${stage})`,
      body: typeof meta.message === "string" ? meta.message : "",
      result,
      outreachStage: stage,
      meta,
    })
  } catch (e) {
    console.error("[sales-outreach] log activity failed:", e)
  }
}

export async function persistDiscoveredFormUrl(
  company: SalesCompany,
  input: { formUrl: string; source: string; confidence?: number; candidates?: string[] },
): Promise<boolean> {
  const sb = getServiceSalesSupabase()
  if (!sb) return false
  const origin = normalizeOrigin(company.domain)
  if (origin && !isAllowedFormUrlForOrigin(origin, input.formUrl)) return false
  const currentMeta = (company.meta ?? {}) as Record<string, unknown>
  const currentUrl = typeof currentMeta.contact_form_url === "string" ? currentMeta.contact_form_url : null
  if (currentUrl === input.formUrl) return true

  const { error } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .update({
      meta: {
        ...currentMeta,
        contact_form_url: input.formUrl,
        form_discovery: {
          source: input.source,
          confidence: input.confidence ?? null,
          candidates: input.candidates?.slice(0, 20) ?? [],
          discovered_at: new Date().toISOString(),
        },
      },
    })
    .eq("id", company.id)
  if (error) {
    console.error("[sales-outreach] form URL persistence failed:", error.message)
    return false
  }
  return true
}

export async function saveFormStructureCache(
  company: SalesCompany,
  formUrl: string,
  parsed: { action: string; method: string; enctype: string; inputNames: string[]; cmsType: string },
): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb) return
  const currentMeta = (company.meta ?? {}) as Record<string, unknown>
  const { error } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .update({
      meta: {
        ...currentMeta,
        parsed_form: {
          form_url: formUrl,
          ...parsed,
          cached_at: new Date().toISOString(),
        },
      },
    })
    .eq("id", company.id)
  if (error) console.error("[sales-outreach] form cache save failed:", error.message)
}

export async function enqueueOperatorTask(
  company: SalesCompany,
  input: {
    reason: string
    formUrl?: string | null
    message?: string | null
    classification?: string | null
    priority?: number
    approvalRequired?: boolean
    pipelineRunId?: string | null
  },
): Promise<boolean> {
  const sb = getServiceSalesSupabase()
  if (!sb) return false
  const title = input.reason.slice(0, 80) || "unknown"
  const { error } = await sb.from(DB_TABLES.SALES_OPERATOR_QUEUE_ITEMS).insert({
    region: company.region,
    company_id: company.id,
    queue_type: "form_send",
    title,
    pipeline_run_id: input.pipelineRunId ?? null,
    priority: input.priority ?? (input.approvalRequired ? 90 : 70),
    status: "open",
    source_tool: "trigger_dev",
    target_tool: "appsmith",
    meta: {
      reason: input.reason,
      form_url: input.formUrl ?? null,
      message: input.message ?? null,
      classification: input.classification ?? null,
      approval_required: input.approvalRequired ?? false,
      report_url: reportUrlForCompany(company),
      pipeline_run_id: input.pipelineRunId ?? null,
      created_by: "sales_outreach_orchestrator",
    },
  })
  if (error) {
    console.error("[sales-outreach] operator queue insert failed:", error.message)
    return false
  }
  return true
}

export async function persistOutcome(
  company: SalesCompany,
  stage: OutreachStage,
  result: ActivityResult,
  sendResult: string,
  meta: Record<string, unknown>,
  dryRun: boolean,
  pipelineRunId?: string | null,
): Promise<void> {
  if (dryRun) return
  await logActivity(company, stage, result, meta, pipelineRunId)
  await applyOutcome(company, stage, sendResult)
  if (stage === "manual_queue") {
    const queued = await enqueueOperatorTask(company, {
      reason: sendResult,
      formUrl: typeof meta.formUrl === "string" ? meta.formUrl : null,
      message: typeof meta.message === "string" ? meta.message : null,
      classification: typeof meta.classification === "string" ? meta.classification : null,
      priority: meta.approvalRequired === true ? 95 : undefined,
      approvalRequired: meta.approvalRequired === true,
      pipelineRunId,
    })
    if (!queued) {
      console.error("[sales-outreach] operator queue enqueue failed silently for:", company.id)
    }
  }
}
