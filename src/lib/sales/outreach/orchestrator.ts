import { getServiceSalesSupabase } from "@/lib/supabase"
import { notifySlack } from "@/lib/notify"
import { generateFormMessage, fillReportUrl } from "../form-message"
import { discoverFormUrl, normalizeOrigin } from "../sources/form-discovery"
import { isAllowedFormUrlForOrigin } from "../sources/external-form-discovery"
import { getRoutingMeta } from "../routing"
import type { Region, SalesCompany } from "../types"
import { classifyForm } from "./form-classifier"
import { preflight } from "./preflight"
import { getBrowserProvider } from "./browser-provider"
import { logOutreachActivity, recentlyContacted, type ActivityResult } from "./activity"
import { getProxyFetchOptions } from "../proxy-agent"
import { stageToPipelineStatus } from "./state-machine"
import type {
  OutreachBatchResult,
  OutreachItemResult,
  OutreachStage,
  SubmitOutcome,
} from "./types"

export interface RunOutreachOptions {
  region?: Region
  companyId?: string
  pipelineRunId?: string | null
  limit?: number
  dryRun?: boolean
  first5Approval?: boolean
  enableLlm?: boolean
  checkRobots?: boolean
  dedupDays?: number
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://paradigmjp.com"
const FROM_EMAIL = process.env.OUTREACH_FROM_EMAIL ?? process.env.PARADIGM_SENDER_ADDRESS ?? "contact@paradigmjp.com"
const FROM_NAME = process.env.OUTREACH_FROM_NAME ?? process.env.PARADIGM_SENDER_NAME ?? "PARADIGM"

function reportUrlFor(company: SalesCompany): string {
  if (company.report_url) return company.report_url
  if (!company.slug) return SITE
  const routing = getRoutingMeta(company.meta)
  const locale = company.report_locale ?? routing.report_locale ?? (company.region === "jp" ? "ja" : "en")
  return `${SITE}/${locale}/report/${company.slug}`
}

function buildFields(message: string): Record<string, string> {
  return { name: FROM_NAME, company: FROM_NAME, email: FROM_EMAIL, message }
}

const OUTCOME_TO_RESULT: Record<SubmitOutcome, ActivityResult> = {
  submitted: "success",
  uncertain: "follow_up",
  failed: "no_answer",
  skipped: "declined",
}

async function fetchPageHtml(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(
      url,
      getProxyFetchOptions({
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "User-Agent": "ParadigmFormDiscovery/1.0 (+https://paradigmjp.com)" },
      })
    )
    if (!res.ok) return null
    return await res.text()
  } catch (e) {
    console.warn("[sales-outreach] fetch form html failed:", e)
    return null
  }
}

async function fetchCandidates(region: Region, limit: number, companyId?: string): Promise<SalesCompany[]> {
  const sb = getServiceSalesSupabase()
  if (!sb) return []
  if (companyId) {
    const { data, error } = await sb
      .from("sales_companies")
      .select("*")
      .eq("id", companyId)
      .maybeSingle()
    if (error) {
      console.error("[sales-outreach] fetch pipeline company failed:", error.message)
      return []
    }
    return data ? [data as SalesCompany] : []
  }

  const { data, error } = await sb
    .from("sales_companies")
    .select("*")
    .eq("region", region)
    .eq("pipeline_status", "report_ready")
    .not("industry", "is", null)
    .order("updated_at", { ascending: true })
    .limit(limit * 3)

  if (error) {
    console.error("[sales-outreach] fetch candidates failed:", error.message)
    return []
  }

  const rows = (data as SalesCompany[]) ?? []
  return rows.filter((company) => (company.detected_issues ?? []).length > 0).slice(0, limit)
}

async function applyOutcome(company: SalesCompany, stage: OutreachStage, sendResult: string): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb) return
  const patch: Record<string, unknown> = {
    pipeline_status: stageToPipelineStatus(stage),
    send_result: sendResult,
    report_url: reportUrlFor(company),
  }
  if (stage === "submitted") patch.sent_at = new Date().toISOString()
  const { error } = await sb.from("sales_companies").update(patch).eq("id", company.id)
  if (error) console.error("[sales-outreach] outcome update failed:", error.message)
}

async function logActivity(
  company: SalesCompany,
  stage: OutreachStage,
  result: ActivityResult,
  meta: Record<string, unknown>,
  pipelineRunId?: string | null,
): Promise<void> {
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
}

async function persistDiscoveredFormUrl(
  company: SalesCompany,
  input: { formUrl: string; source: string; confidence?: number; candidates?: string[] },
): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb) return
  const origin = normalizeOrigin(company.domain)
  if (origin && !isAllowedFormUrlForOrigin(origin, input.formUrl)) return
  const currentMeta = (company.meta ?? {}) as Record<string, unknown>
  const currentUrl = typeof currentMeta.contact_form_url === "string" ? currentMeta.contact_form_url : null
  if (currentUrl === input.formUrl) return

  const { error } = await sb
    .from("sales_companies")
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
  if (error) console.error("[sales-outreach] form URL persistence failed:", error.message)
}

async function enqueueOperatorTask(
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
): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb) return
  const { error } = await sb.from("sales_operator_queue_items").insert({
    region: company.region,
    company_id: company.id,
    queue_type: "form_send",
    pipeline_run_id: input.pipelineRunId ?? null,
    priority: input.priority ?? (input.approvalRequired ? 90 : 70),
    status: "open",
    source_tool: "n8n",
    target_tool: "appsmith",
    meta: {
      reason: input.reason,
      form_url: input.formUrl ?? null,
      message: input.message ?? null,
      classification: input.classification ?? null,
      approval_required: input.approvalRequired ?? false,
      report_url: reportUrlFor(company),
      pipeline_run_id: input.pipelineRunId ?? null,
      created_by: "sales_outreach_orchestrator",
    },
  })
  if (error) console.error("[sales-outreach] operator queue insert failed:", error.message)
}

async function persistOutcome(
  company: SalesCompany,
  stage: OutreachStage,
  result: ActivityResult,
  sendResult: string,
  meta: Record<string, unknown>,
  dryRun: boolean,
  pipelineRunId?: string | null,
): Promise<void> {
  if (dryRun) return
  await applyOutcome(company, stage, sendResult)
  await logActivity(company, stage, result, meta, pipelineRunId)
  if (stage === "manual_queue") {
    await enqueueOperatorTask(company, {
      reason: sendResult,
      formUrl: typeof meta.formUrl === "string" ? meta.formUrl : null,
      message: typeof meta.message === "string" ? meta.message : null,
      classification: typeof meta.classification === "string" ? meta.classification : null,
      priority: meta.approvalRequired === true ? 95 : undefined,
      approvalRequired: meta.approvalRequired === true,
      pipelineRunId,
    })
  }
}

async function processOne(
  company: SalesCompany,
  opts: Required<RunOutreachOptions>,
  index: number,
): Promise<OutreachItemResult> {
  const base = (stage: OutreachStage, reason: string): OutreachItemResult => ({
    companyId: company.id,
    domain: company.domain,
    finalStage: stage,
    reason,
    dryRun: opts.dryRun,
  })

  if (await recentlyContacted(company.id, opts.dedupDays)) {
    return base("classified_skip", `dedup: contacted within ${opts.dedupDays} days`)
  }

  const reportUrl = reportUrlFor(company)
  const generated = await generateFormMessage(company.id)
  if (!generated.ok || !generated.message) {
    return base("discovery_failed", `message generation failed: ${generated.error ?? "empty"}`)
  }
  const message = fillReportUrl(generated.message, reportUrl)

  const provider = getBrowserProvider()
  const meta = (company.meta ?? {}) as Record<string, unknown>
  let formUrl = typeof meta.contact_form_url === "string" ? meta.contact_form_url : null
  if (!formUrl) {
    const discovery = await discoverFormUrl({
      homeUrl: company.domain,
      region: company.region,
      enableLlm: opts.enableLlm,
      spaDiscover: provider.discoverSpaForm?.bind(provider),
    })
    formUrl = discovery.formUrl
    if (!formUrl || discovery.method === "fallback") {
      await persistOutcome(
        company,
        "manual_queue",
        "follow_up",
        `form URL not found: ${discovery.method}`,
        { formUrl, discovery, message },
        opts.dryRun,
        opts.pipelineRunId,
      )
      return { ...base("manual_queue", `form URL not found: ${discovery.method}`), formUrl, message }
    }
    await persistDiscoveredFormUrl(company, {
      formUrl,
      source: discovery.method,
      confidence: discovery.confidence,
      candidates: discovery.candidates,
    })
  }

  const origin = normalizeOrigin(company.domain)
  if (origin && !isAllowedFormUrlForOrigin(origin, formUrl)) {
    await persistOutcome(
      company,
      "manual_queue",
      "follow_up",
      "form URL is outside the company domain and trusted hosted-form allowlist",
      { formUrl, message },
      opts.dryRun,
      opts.pipelineRunId,
    )
    return { ...base("manual_queue", "form URL domain is not trusted for automatic submission"), formUrl, message }
  }

  const html = await fetchPageHtml(formUrl, 8_000)
  if (!html) {
    await persistOutcome(
      company,
      "manual_queue",
      "follow_up",
      "form HTML fetch failed",
      { formUrl, message },
      opts.dryRun,
      opts.pipelineRunId,
    )
    return { ...base("manual_queue", "form HTML fetch failed"), formUrl, message }
  }
  const classification = await classifyForm({ formHtml: html, pageUrl: formUrl, enableLlm: opts.enableLlm })

  if (classification.classification === "risky_captcha") {
    await persistOutcome(
      company,
      "manual_queue",
      "follow_up",
      "captcha requires manual handling",
      { formUrl, classification: classification.classification, message },
      opts.dryRun,
      opts.pipelineRunId,
    )
    if (!opts.dryRun) {
      await notifySlack(`Manual form queue: ${company.company_name} (${company.domain}) requires CAPTCHA handling.`)
    }
    return { ...base("manual_queue", "captcha detected"), formUrl, message, classification: classification.classification }
  }

  if (!classification.classification.startsWith("safe_")) {
    await persistOutcome(
      company,
      "classified_skip",
      "declined",
      `unsafe: ${classification.classification}`,
      { formUrl, classification: classification.classification },
      opts.dryRun,
      opts.pipelineRunId,
    )
    return { ...base("classified_skip", `unsafe: ${classification.classification}`), formUrl, message, classification: classification.classification }
  }

  const preflightResult = await preflight({ formUrl, classification, checkRobots: opts.checkRobots })
  if (!preflightResult.pass) {
    await persistOutcome(
      company,
      "preflight_failed",
      "declined",
      `preflight: ${preflightResult.reason}`,
      { formUrl, classification: classification.classification, preflight: preflightResult.reason },
      opts.dryRun,
      opts.pipelineRunId,
    )
    return { ...base("preflight_failed", preflightResult.reason), formUrl, message, classification: classification.classification }
  }

  if (!opts.dryRun && opts.first5Approval && index < 5) {
    await persistOutcome(
      company,
      "manual_queue",
      "follow_up",
      "first-5 approval gate before live form submit",
      { formUrl, classification: classification.classification, message, approvalRequired: true },
      opts.dryRun,
      opts.pipelineRunId,
    )
    await notifySlack(
      `Approval required before first live form submit: ${company.company_name} (${company.domain})\nForm: ${formUrl}\nReport: ${reportUrl}`,
    )
    return { ...base("manual_queue", "approval required before live form submit"), formUrl, message, classification: classification.classification }
  }

  const submit = await provider.submitForm({
    formUrl,
    fields: buildFields(message),
    message,
    dryRun: opts.dryRun,
  })
  const stage: OutreachStage =
    submit.outcome === "submitted"
      ? "submitted"
      : submit.outcome === "uncertain"
        ? "submit_uncertain"
        : submit.outcome === "skipped"
          ? "classified_skip"
          : "submit_failed"

  await persistOutcome(
    company,
    stage,
    OUTCOME_TO_RESULT[submit.outcome],
    `${submit.outcome}: ${submit.detail.slice(0, 120)}`,
    {
      formUrl,
      classification: classification.classification,
      provider: provider.name,
      outcome: submit.outcome,
      detail: submit.detail,
      evidenceUrl: submit.evidenceUrl ?? null,
      message,
    },
    opts.dryRun,
    opts.pipelineRunId,
  )

  if (!opts.dryRun && opts.first5Approval && index < 5 && stage === "submitted") {
    await notifySlack(`Form submitted #${index + 1}: ${company.company_name} (${company.domain})\nReport: ${reportUrl}`)
  }

  return {
    ...base(stage, submit.detail.slice(0, 160)),
    formUrl,
    message,
    classification: classification.classification,
    outcome: submit.outcome,
  }
}

export async function runOutreachBatch(options: RunOutreachOptions = {}): Promise<OutreachBatchResult> {
  const opts: Required<RunOutreachOptions> = {
    region: options.region ?? "jp",
    companyId: options.companyId ?? "",
    pipelineRunId: options.pipelineRunId ?? null,
    limit: options.limit ?? 5,
    dryRun: options.dryRun ?? true,
    first5Approval: options.first5Approval ?? true,
    enableLlm: options.enableLlm ?? false,
    checkRobots: options.checkRobots ?? true,
    dedupDays: options.dedupDays ?? 30,
  }

  const candidates = await fetchCandidates(opts.region, opts.limit, opts.companyId || undefined)
  const items: OutreachItemResult[] = []

  for (let i = 0; i < candidates.length; i++) {
    const result = await processOne(candidates[i], opts, i)
    items.push(result)
    if (!opts.dryRun && i < candidates.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1_500))
    }
  }

  return {
    processed: items.length,
    submitted: items.filter((item) => item.finalStage === "submitted").length,
    manualQueue: items.filter((item) => item.finalStage === "manual_queue").length,
    skipped: items.filter((item) => item.finalStage === "classified_skip").length,
    failed: items.filter((item) =>
      ["discovery_failed", "preflight_failed", "submit_failed"].includes(item.finalStage),
    ).length,
    dryRun: opts.dryRun,
    items,
  }
}
