/**
 * lib/sales/outreach/orchestrator.ts — ④フォーム営業オーケストレータ (Phase 3)
 *
 * 役割: report_ready のリードを取り、1 件ずつ
 *       文面生成 → discovery → classify → preflight → submit →
 *       sales_companies 更新 + sales_activity_log 記録 + Slack 通知
 *       を回す自走ループ。判断は Next 側、実ブラウザは BrowserProvider 越し。
 *
 * 安全弁:
 *   - dryRun=true (default) では実送信しない (監査・preflight 用)
 *   - dedup: 直近 30 日送信済みは skip
 *   - risky_captcha → manual_queue + Slack escalate (人間判断)
 *   - first5Approval: 最初の N 件だけ Slack 承認通知を出す (SALES-CENTER #5)
 */

import { getServiceSupabase } from "@/lib/supabase"
import { findCompanyById } from "../companies"
import { generateFormMessage, fillReportUrl } from "../form-message"
import { discoverFormUrl } from "../sources/form-discovery"
import { classifyForm, guessFieldRole } from "./form-classifier"
import { preflight } from "./preflight"
import { getBrowserProvider } from "./browser-provider"
import { logOutreachActivity, recentlyContacted, type ActivityResult } from "./activity"
import { stageToPipelineStatus } from "./state-machine"
import { notifySlack } from "@/lib/notify"
import { getRoutingMeta } from "../routing"
import type { Region, SalesCompany } from "../types"
import type {
  OutreachBatchResult,
  OutreachItemResult,
  OutreachStage,
  SubmitOutcome,
} from "./types"

export interface RunOutreachOptions {
  region?: Region
  limit?: number
  dryRun?: boolean
  first5Approval?: boolean
  enableLlm?: boolean
  checkRobots?: boolean
  dedupDays?: number
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://paradigmjp.com"
// 既存 Coolify env (PARADIGM_SENDER_*) を fallback に採用 (archived MVP と共通の送信者識別)
const FROM_EMAIL =
  process.env.OUTREACH_FROM_EMAIL ?? process.env.PARADIGM_SENDER_ADDRESS ?? "contact@paradigmjp.com"
const FROM_NAME =
  process.env.OUTREACH_FROM_NAME ?? process.env.PARADIGM_SENDER_NAME ?? "PARADIGM 合同会社"

function reportUrlFor(company: SalesCompany): string {
  if (company.report_url) return company.report_url
  if (!company.slug) return SITE
  const routing = getRoutingMeta(company.meta)
  const locale = company.report_locale ?? routing.report_locale ?? (company.region === "jp" ? "ja" : "en")
  return `${SITE}/${locale}/report/${company.slug}`
}

/** 営業文面 → フォームフィールド辞書 (worker 側 field-mapper が実マッピング) */
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
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "ParadigmFormDiscovery/1.0 (+https://paradigmjp.com)" },
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

/** 候補リード取得: report_ready・業種あり・課題ありを updated_at 順で */
async function fetchCandidates(region: Region, limit: number): Promise<SalesCompany[]> {
  const sb = getServiceSupabase()
  if (!sb) return []
  const { data } = await sb
    .from("sales_companies")
    .select("*")
    .eq("region", region)
    .eq("pipeline_status", "report_ready")
    .not("industry", "is", null)
    .order("updated_at", { ascending: true })
    .limit(limit * 3) // detected_issues フィルタは JS 側で (空配列除外)
  const rows = (data as SalesCompany[]) ?? []
  return rows.filter((c) => (c.detected_issues ?? []).length > 0).slice(0, limit)
}

async function applyOutcome(
  company: SalesCompany,
  stage: OutreachStage,
  sendResult: string,
): Promise<void> {
  const sb = getServiceSupabase()
  if (!sb) return
  const pipeline = stageToPipelineStatus(stage)
  const patch: Record<string, unknown> = {
    pipeline_status: pipeline,
    send_result: sendResult,
    report_url: reportUrlFor(company),
  }
  if (stage === "submitted") patch.sent_at = new Date().toISOString()
  await sb.from("sales_companies").update(patch).eq("id", company.id)
}

/** 1 件処理 */
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

  // 0) dedup
  if (await recentlyContacted(company.id, opts.dedupDays)) {
    return base("classified_skip", `dedup: 直近 ${opts.dedupDays} 日に送信済み`)
  }

  // 1) 文面生成
  const reportUrl = reportUrlFor(company)
  const gen = await generateFormMessage(company.id)
  if (!gen.ok || !gen.message) {
    return base("discovery_failed", `文面生成失敗: ${gen.error ?? "empty"}`)
  }
  const message = fillReportUrl(gen.message, reportUrl)

  // 2) discovery
  const provider = getBrowserProvider()
  const knownFormUrl = (company.meta as Record<string, unknown>)?.contact_form_url as string | undefined
  let formUrl = knownFormUrl ?? null
  if (!formUrl) {
    const disc = await discoverFormUrl({
      homeUrl: company.domain,
      region: company.region,
      enableLlm: opts.enableLlm,
      spaDiscover: provider.discoverSpaForm?.bind(provider),
    })
    formUrl = disc.formUrl
    if (!formUrl || disc.method === "fallback") {
      return { ...base("discovery_failed", `フォーム URL 未特定 (method=${disc.method})`), formUrl, message }
    }
  }

  // 3) classify
  const html = await fetchPageHtml(formUrl, 8_000)
  if (!html) return { ...base("discovery_failed", "フォーム HTML 取得失敗"), formUrl, message }
  const cls = await classifyForm({ formHtml: html, pageUrl: formUrl, enableLlm: opts.enableLlm })

  if (cls.classification === "risky_captcha") {
    await applyOutcome(company, "manual_queue", "captcha: 人間対応")
    await logActivity(company, "manual_queue", "follow_up", { formUrl, classification: cls.classification, message })
    await notifySlack(
      `🟡 手動対応キュー: ${company.company_name} (${company.domain}) — CAPTCHA 検出。フォーム手動送信を要請。`,
    )
    return { ...base("manual_queue", "captcha 検出 → 手動キュー"), formUrl, message, classification: cls.classification }
  }
  if (!cls.classification.startsWith("safe_")) {
    await applyOutcome(company, "classified_skip", `unsafe: ${cls.classification}`)
    await logActivity(company, "classified_skip", "declined", { formUrl, classification: cls.classification })
    return { ...base("classified_skip", `送信不可: ${cls.classification}`), formUrl, message, classification: cls.classification }
  }

  // 4) preflight
  const pf = await preflight({ formUrl, classification: cls, checkRobots: opts.checkRobots })
  if (!pf.pass) {
    await applyOutcome(company, "preflight_failed", `preflight: ${pf.reason}`)
    await logActivity(company, "preflight_failed", "declined", { formUrl, classification: cls.classification, preflight: pf.reason })
    return { ...base("preflight_failed", pf.reason), formUrl, message, classification: cls.classification }
  }

  // 5) submit (dryRun なら provider が未送信を返す)
  const fields = buildFields(message)
  const submit = await provider.submitForm({ formUrl, fields, message, dryRun: opts.dryRun })
  const stage: OutreachStage =
    submit.outcome === "submitted"
      ? "submitted"
      : submit.outcome === "uncertain"
        ? "submit_uncertain"
        : submit.outcome === "skipped"
          ? "classified_skip"
          : "submit_failed"

  await applyOutcome(company, stage, `${submit.outcome}: ${submit.detail.slice(0, 120)}`)
  await logActivity(company, stage, OUTCOME_TO_RESULT[submit.outcome], {
    formUrl,
    classification: cls.classification,
    provider: provider.name,
    outcome: submit.outcome,
    detail: submit.detail,
    evidenceUrl: submit.evidenceUrl ?? null,
    message,
  })

  // first5 承認通知 (実送信時のみ)
  if (!opts.dryRun && opts.first5Approval && index < 5 && stage === "submitted") {
    await notifySlack(
      `✅ フォーム送信 #${index + 1}: ${company.company_name} (${company.domain})\nレポート: ${reportUrl}`,
    )
  }

  return {
    ...base(stage, submit.detail.slice(0, 160)),
    formUrl,
    message,
    classification: cls.classification,
    outcome: submit.outcome,
  }
}

async function logActivity(
  company: SalesCompany,
  stage: OutreachStage,
  result: ActivityResult,
  meta: Record<string, unknown>,
): Promise<void> {
  await logOutreachActivity({
    companyId: company.id,
    region: company.region,
    subject: `フォーム営業 (${stage})`,
    body: typeof meta.message === "string" ? meta.message : "",
    result,
    meta,
  })
}

/** バッチ実行 (cron / API / audit から呼ぶ) */
export async function runOutreachBatch(
  options: RunOutreachOptions = {},
): Promise<OutreachBatchResult> {
  const opts: Required<RunOutreachOptions> = {
    region: options.region ?? "jp",
    limit: options.limit ?? 5,
    dryRun: options.dryRun ?? true,
    first5Approval: options.first5Approval ?? true,
    enableLlm: options.enableLlm ?? false,
    checkRobots: options.checkRobots ?? true,
    dedupDays: options.dedupDays ?? 30,
  }

  const candidates = await fetchCandidates(opts.region, opts.limit)
  const items: OutreachItemResult[] = []

  for (let i = 0; i < candidates.length; i++) {
    const result = await processOne(candidates[i], opts, i)
    items.push(result)
    // ドメイン別レート制御 (実送信時のみ・礼儀的 1.5s 間隔)
    if (!opts.dryRun && i < candidates.length - 1) {
      await new Promise((r) => setTimeout(r, 1_500))
    }
  }

  return {
    processed: items.length,
    submitted: items.filter((i) => i.finalStage === "submitted").length,
    manualQueue: items.filter((i) => i.finalStage === "manual_queue").length,
    skipped: items.filter((i) => i.finalStage === "classified_skip").length,
    failed: items.filter((i) =>
      ["discovery_failed", "preflight_failed", "submit_failed"].includes(i.finalStage),
    ).length,
    dryRun: opts.dryRun,
    items,
  }
}
