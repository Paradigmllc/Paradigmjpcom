import { getServiceSalesSupabase } from "@/lib/supabase"
import { notifySlack } from "@/lib/notify"
import { generateFormMessage, fillReportUrl, fillDemoUrl } from "../form-message"
import { discoverFormUrl, normalizeOrigin } from "../sources/form-discovery"
import { isAllowedFormUrlForOrigin } from "../sources/external-form-discovery"
import type { Region, SalesCompany } from "../types"
import { classifyForm } from "./form-classifier"
import { preflight } from "./preflight"
import { getBrowserProvider } from "./browser-provider"
import { recentlyContacted, type ActivityResult } from "./activity"
import { getProxyFetchOptions } from "../proxy-agent"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { applyOutcome, logActivity, persistDiscoveredFormUrl, enqueueOperatorTask, persistOutcome } from "./side-effects"
import { evaluateOutreachReadiness } from "./readiness"
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
const FROM_EMAIL = process.env.OUTREACH_FROM_EMAIL ?? process.env.PARADIGM_SENDER_ADDRESS ?? "contact@paradigmjp.com"
const FROM_NAME = process.env.OUTREACH_FROM_NAME ?? process.env.PARADIGM_SENDER_NAME ?? "PARADIGM"
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
      .from(DB_TABLES.SALES_COMPANIES)
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
    .from(DB_TABLES.SALES_COMPANIES)
    .select("*")
    .eq("region", region)
    .eq("pipeline_status", "report_ready")
    .order("updated_at", { ascending: true })
    .limit(limit)
  if (error) {
    console.error("[sales-outreach] fetch candidates failed:", error.message)
    return []
  }
  return (data as SalesCompany[]) ?? []
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

  const readiness = evaluateOutreachReadiness(company)
  if (!readiness.reportUrl) {
    await persistOutcome(
      company,
      "manual_queue",
      "follow_up",
      "diagnostic report URL is missing; generate report before outreach",
      { readiness },
      opts.dryRun,
      opts.pipelineRunId,
    )
    return { ...base("manual_queue", "diagnostic report URL is missing; generate report before outreach") }
  }

  const reportUrl = readiness.reportUrl
  const generated = await generateFormMessage(company.id)
  if (!generated.ok || !generated.message) {
    return base("discovery_failed", `message generation failed: ${generated.error ?? "empty"}`)
  }
  const message = fillReportUrl(generated.message, reportUrl)
  // Inject demo URL if company has one (WEB制作診断レポ�EチEvariant only)
  const companyMeta = (company.meta ?? {}) as Record<string, unknown>
  const demoSite = companyMeta.demo_site as Record<string, unknown> | undefined
  const demoUrl = typeof demoSite?.url === "string" ? demoSite.url as string : null
  const finalMessage = demoUrl ? fillDemoUrl(message, demoUrl) : message

  const msg = finalMessage // alias for readability in closures below

  if (!opts.dryRun && (generated.fallbacks?.issueCode || readiness.status !== "send_ready")) {
    await persistOutcome(
      company,
      "manual_queue",
      "follow_up",
      `outreach quality gate requires review: ${[...readiness.warnings, ...(generated.fallbacks?.issueCode ? ["diagnostic issue was inferred"] : [])].join("; ")}`,
      { message: msg, fallbacks: generated.fallbacks, readiness },
      opts.dryRun,
      opts.pipelineRunId,
    )
    return { ...base("manual_queue", "outreach quality gate requires review before automatic submission"), message: msg }
  }

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
        { formUrl, discovery, message: msg },
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
      { formUrl, message: msg },
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
      { formUrl, message: msg },
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
      { formUrl, classification: classification.classification, message: msg },
      opts.dryRun,
      opts.pipelineRunId,
    )
    if (!opts.dryRun) {
      const { notifyBothChannels } = await import("@/lib/notify")
      const title = `🤁ECAPTCHA手動対忁E ${company.company_name}`
      const notificationMessage = `会社、E{company.company_name}」！E{company.domain}�E�にてロボット防御�E�EAPTCHA�E�を検�Eしたため、手動キューに送信しました、Eppsmithで送信承認また�E手動送信を行ってください、En送信允ERL: ${formUrl ?? "不�E"}`

      await notifyBothChannels(
        `🚨 *CAPTCHA手動対応が忁E��E 🚨\n*会社吁E: ${company.company_name} (${company.domain})\n*フォーム*: ${formUrl ?? "不�E"}\n*対忁E: 営業ダチE��ュボ�Eド等で手動対応を行ってください。`,
        {
          title,
          message: notificationMessage,
          link: "/ja/admin/sales",
          type: "manual_handling"
        }
      ).catch((e) => console.error("[sales-outreach] notifyBothChannels failed:", e))
    }
    return { ...base("manual_queue", "captcha detected"), formUrl, message: msg, classification: classification.classification }
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
    return { ...base("classified_skip", `unsafe: ${classification.classification}`), formUrl, message: msg, classification: classification.classification }
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
    return { ...base("preflight_failed", preflightResult.reason), formUrl, message: msg, classification: classification.classification }
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
    const { notifyBothChannels } = await import("@/lib/notify")
    const title = `⏳ 送信承認征E��: ${company.company_name}`
    const notificationMessage = `会社、E{company.company_name}」！E{company.domain}�E�への初回のフォーム送信�E�Eirst-5ゲート）前に、人間による承認が忁E��です。営業ダチE��ュボ�Eドで承認してください、En送信允ERL: ${formUrl ?? "不�E"}\n診断レポ�EチE ${reportUrl}`

    await notifyBothChannels(
      `⏳ *送信承認征E��* (初回送信ゲーチE\n*会社吁E: ${company.company_name} (${company.domain})\n*フォーム*: ${formUrl ?? "不�E"}\n*診断*: ${reportUrl}\n営業ダチE��ュボ�Eドで確認してください。`,
      {
        title,
        message: notificationMessage,
        link: "/ja/admin/sales",
        type: "approval_required"
      }
    ).catch((e) => console.error("[sales-outreach] notifyBothChannels failed:", e))
    return { ...base("manual_queue", "approval required before live form submit"), formUrl, message: msg, classification: classification.classification }
  }

  const submit = await provider.submitForm({
    formUrl,
    fields: buildFields(msg),
    message: msg,
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
      message: msg,
    },
    opts.dryRun,
    opts.pipelineRunId,
  )

  if (!opts.dryRun && opts.first5Approval && index < 5 && stage === "submitted") {
    const { notifyBothChannels } = await import("@/lib/notify")
    const title = `✁E送信完亁E ${company.company_name}`
    const notificationMessage = `会社、E{company.company_name}」！E{company.domain}�E�へのフォーム送信が完亁E��ました、E(送信件数: #${index + 1})\n診断レポ�EチE ${reportUrl}`

    await notifyBothChannels(
      `✁E*フォーム送信完亁E (#${index + 1})\n*会社吁E: ${company.company_name} (${company.domain})\n*診断*: ${reportUrl}`,
      {
        title,
        message: notificationMessage,
        link: reportUrl,
        type: "form_submitted"
      }
    ).catch((e) => console.error("[sales-outreach] notifyBothChannels failed:", e))
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

  // Per-domain rate limiting: prevent rapid repeated submissions to same domain
  const domainLastSend = new Map<string, number>()
  const DOMAIN_RATE_LIMIT_MS = parseInt(process.env.OUTREACH_DOMAIN_RATE_LIMIT_MS ?? "30000", 10) || 30000

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]
    const candidateDomain = (candidate as { domain?: string }).domain
    if (candidateDomain && !opts.dryRun) {
      const last = domainLastSend.get(candidateDomain)
      if (last && Date.now() - last < DOMAIN_RATE_LIMIT_MS) {
        const result = await processOne(candidate, { ...opts, dryRun: true }, i)
        if (result.finalStage !== "submitted") items.push(result)
        continue
      }
    }
    const result = await processOne(candidate, opts, i)
    items.push(result)
    if (result.finalStage === "submitted" && candidateDomain) {
      domainLastSend.set(candidateDomain, Date.now())
    }
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
