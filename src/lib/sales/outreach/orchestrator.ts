import { notifySlack } from "@/lib/notify"
import { generateFormMessage, fillReportUrl, fillDemoUrl } from "../form-message"
import { discoverFormUrl, normalizeOrigin } from "../sources/form-discovery"
import { isAllowedFormUrlForOrigin } from "../sources/external-form-discovery"
import type { Region, SalesCompany } from "../types"
import { classifyForm, detectFormFields } from "./form-classifier"
import { preflight } from "./preflight"
import { getBrowserProvider } from "./browser-provider"
import { recentlyContacted, type ActivityResult } from "./activity"
import { getProxyFetchOptions } from "../proxy-agent"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { applyOutcome, logActivity, persistDiscoveredFormUrl, enqueueOperatorTask, persistOutcome, saveFormStructureCache } from "./side-effects"
import { evaluateOutreachReadiness } from "./readiness"
import { detectCmsType } from "./cms-form-templates"
import { fetchCandidates } from "./candidate-selection"
import { syncOutreachDraftToTwenty } from "./draft-sync"
import type {
  OutreachBatchResult,
  OutreachItemResult,
  OutreachStage,
  SubmitOutcome,
  CachedFormStructure,
} from "./types"
export interface RunOutreachOptions {
  region?: Region
  companyId?: string
  /** Twenty の選択行を指定する。指定時はこの順序で処理する。 */
  companyIds?: string[]
  pipelineRunId?: string | null
  limit?: number
  dryRun?: boolean
  first5Approval?: boolean
  enableLlm?: boolean
  checkRobots?: boolean
  dedupDays?: number
  itemTimeoutMs?: number
}
const FROM_EMAIL = process.env.OUTREACH_FROM_EMAIL ?? process.env.PARADIGM_SENDER_ADDRESS ?? "contact@paradigmjp.com"
const FROM_NAME = process.env.OUTREACH_FROM_NAME ?? process.env.PARADIGM_SENDER_NAME ?? "PARADIGM"
const DEFAULT_ITEM_TIMEOUT_MS = 120_000
const FORM_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000

function readCachedForm(company: SalesCompany, formUrl: string): CachedFormStructure | null {
  const meta = (company.meta ?? {}) as Record<string, unknown>
  const cache = meta.parsed_form as Record<string, unknown> | undefined
  if (!cache || typeof cache.form_url !== "string" || cache.form_url !== formUrl) return null
  const cachedAt = typeof cache.cached_at === "string" ? new Date(cache.cached_at).getTime() : 0
  if (Date.now() - cachedAt > FORM_CACHE_MAX_AGE_MS) return null
  return {
    action: typeof cache.action === "string" ? cache.action : "",
    method: typeof cache.method === "string" ? cache.method : "POST",
    enctype: typeof cache.enctype === "string" ? cache.enctype : "application/x-www-form-urlencoded",
    inputNames: Array.isArray(cache.inputNames) ? cache.inputNames as string[] : [],
    cmsType: typeof cache.cmsType === "string" ? cache.cmsType : "generic",
    cachedAt: cache.cached_at as string,
  }
}

async function withTimeout<T extends OutreachItemResult>(
  promise: Promise<T>,
  companyId: string,
  timeoutMs: number = DEFAULT_ITEM_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`item timeout after ${timeoutMs}ms`)), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
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

  try {
    return await processOneInner(company, opts, index)
  } catch (error) {
    console.error(`[sales-outreach] unhandled error for company ${company.id} (${company.domain}):`, error)
    return base("submit_failed", `unhandled: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function processOneInner(
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
  const generated = await generateFormMessage(company.id, { requireVerifiedMetrics: true })
  if (!generated.ok || !generated.message) {
    return base("discovery_failed", `message generation failed: ${generated.error ?? "empty"}`)
  }
  const message = fillReportUrl(generated.message, reportUrl)
  // Inject demo URL if company has one for the website diagnostic variant.
  const companyMeta = (company.meta ?? {}) as Record<string, unknown>
  const demoSite = companyMeta.demo_site as Record<string, unknown> | undefined
  const demoUrl = typeof demoSite?.url === "string" ? demoSite.url as string : null
  const finalMessage = demoUrl ? fillDemoUrl(message, demoUrl) : message

  const draftSync = await syncOutreachDraftToTwenty(company.id)
  if (!draftSync.ok) {
    const reason = `Twenty draft sync failed: ${draftSync.error}`
    await persistOutcome(company, "manual_queue", "follow_up", reason, { message: finalMessage }, opts.dryRun, opts.pipelineRunId)
    return { ...base("manual_queue", reason), message: finalMessage }
  }

  const msg = finalMessage // alias for readability in closures below

  // Companies in report_ready state are pre-vetted — bypass per-company gate
  const isReportReady = company.pipeline_status === "report_ready"
  if (!opts.dryRun && !isReportReady && (generated.fallbacks?.issueCode || readiness.status !== "send_ready")) {
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
      const title = `CAPTCHA手動対応: ${company.company_name}`
      const notificationMessage = `会社「${company.company_name}」（${company.domain}）でCAPTCHAまたはロボット防御を検出したため、手動キューに送信しました。Twenty CRMで送信可否を確認してください。\n送信先URL: ${formUrl ?? "不明"}`

      await notifyBothChannels(
        `*CAPTCHA手動対応が必要です*\n*会社名*: ${company.company_name} (${company.domain})\n*フォーム*: ${formUrl ?? "不明"}\n*対応*: Twenty CRMで手動確認してください。`,
        {
          title,
          message: notificationMessage,
          link: "https://twenty.paradigmjp.com",
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
    const title = `送信承認待ち: ${company.company_name}`
    const notificationMessage = `会社「${company.company_name}」（${company.domain}）への初回フォーム送信は、first-5ゲートにより人間の承認が必要です。Twenty CRMで承認してください。\n送信先URL: ${formUrl ?? "不明"}\n診断レポート: ${reportUrl}`

    await notifyBothChannels(
        `*送信承認待ち* (初回送信ゲート)\n*会社名*: ${company.company_name} (${company.domain})\n*フォーム*: ${formUrl ?? "不明"}\n*診断*: ${reportUrl}\nTwenty CRMで確認してください。`,
      {
        title,
        message: notificationMessage,
        link: process.env.TWENTY_BASE_URL || "https://twenty.paradigmjp.com",
        type: "approval_required"
      }
    ).catch((e) => console.error("[sales-outreach] notifyBothChannels failed:", e))
    return { ...base("manual_queue", "approval required before live form submit"), formUrl, message: msg, classification: classification.classification }
  }

  const cmsType = detectCmsType(html)
  const cachedParsed = readCachedForm(company, formUrl)

  const submit = await provider.submitForm({
    formUrl,
    fields: buildFields(msg),
    message: msg,
    dryRun: opts.dryRun,
    cachedParsed,
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
    const title = `送信完了: ${company.company_name}`
    const notificationMessage = `会社「${company.company_name}」（${company.domain}）へのフォーム送信が完了しました。(送信件数: #${index + 1})\n診断レポート: ${reportUrl}`

    await notifyBothChannels(
      `*フォーム送信完了* (#${index + 1})\n*会社名*: ${company.company_name} (${company.domain})\n*診断*: ${reportUrl}`,
      {
        title,
        message: notificationMessage,
        link: reportUrl,
        type: "form_submitted"
      }
    ).catch((e) => console.error("[sales-outreach] notifyBothChannels failed:", e))
  }

  if (!opts.dryRun && stage === "submitted" && !cachedParsed) {
    const fields = detectFormFields(html)
    saveFormStructureCache(company, formUrl, {
      action: "", // action URL is resolved by provider
      method: "POST",
      enctype: "application/x-www-form-urlencoded",
      inputNames: fields,
      cmsType,
    }).catch((e) => console.error("[sales-outreach] form cache save failed:", e))
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
    companyIds: options.companyIds ?? [],
    pipelineRunId: options.pipelineRunId ?? null,
    limit: options.limit ?? 5,
    dryRun: options.dryRun ?? true,
    first5Approval: options.first5Approval ?? true,
    enableLlm: options.enableLlm ?? false,
    checkRobots: options.checkRobots ?? true,
    dedupDays: options.dedupDays ?? 30,
    itemTimeoutMs: options.itemTimeoutMs ?? DEFAULT_ITEM_TIMEOUT_MS,
  }

  const selection = await fetchCandidates(
    opts.region,
    opts.limit,
    opts.companyId || undefined,
    opts.companyIds,
  )
  const candidates = selection.companies
  const items: OutreachItemResult[] = []

  // Per-domain rate limiting: prevent rapid repeated submissions to same domain
  const domainLastSend = new Map<string, number>()
  const DOMAIN_RATE_LIMIT_MS = parseInt(process.env.OUTREACH_DOMAIN_RATE_LIMIT_MS ?? "30000", 10) || 30000
  // Circuit breaker: skip domain after N consecutive failures
  const domainFailures = new Map<string, number>()
  const MAX_DOMAIN_FAILURES = 3

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]
    const candidateDomain = (candidate as { domain?: string }).domain
    if (candidateDomain && (domainFailures.get(candidateDomain) ?? 0) >= MAX_DOMAIN_FAILURES) {
      items.push({
        companyId: candidate.id,
        domain: candidateDomain,
        finalStage: "classified_skip",
        reason: `circuit open: ${MAX_DOMAIN_FAILURES}+ consecutive failures for this domain`,
        dryRun: opts.dryRun,
      })
      continue
    }
    if (candidateDomain && !opts.dryRun) {
      const last = domainLastSend.get(candidateDomain)
      if (last && Date.now() - last < DOMAIN_RATE_LIMIT_MS) {
        const result = await withTimeout(processOne(candidate, { ...opts, dryRun: true }, i), candidate.id)
        if (result.finalStage !== "submitted") items.push(result)
        continue
      }
    }
    const result = await withTimeout(processOne(candidate, opts, i), candidate.id)
    items.push(result)
    if (result.finalStage === "submitted" && candidateDomain) {
      domainLastSend.set(candidateDomain, Date.now())
      domainFailures.set(candidateDomain, 0)
    } else if (candidateDomain && ["submit_failed", "preflight_failed", "discovery_failed"].includes(result.finalStage)) {
      const current = domainFailures.get(candidateDomain) ?? 0
      domainFailures.set(candidateDomain, current + 1)
      if (current + 1 >= MAX_DOMAIN_FAILURES) {
        console.warn(`[sales-outreach] circuit breaker opened for domain ${candidateDomain} after ${current + 1} failures`)
      }
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
    selection: {
      requestedCompanyIds: opts.companyIds.length > 0
        ? opts.companyIds
        : opts.companyId
          ? [opts.companyId]
          : [],
      acceptedCompanyIds: candidates.map((candidate) => candidate.id),
      missingCompanyIds: selection.missingCompanyIds,
      notReadyCompanyIds: selection.notReadyCompanyIds,
    },
    items,
  }
}
