/**
 * lib/sales/form-message.ts — 営業フォームメッセージ生成 (Sprint 10-A)
 *
 * 役割: sales_companies (リード) と sales_templates (業種×課題) を組み合わせ、
 *       Dify workflow（モデルはDify側で管理）で「教えてあげる体裁」のフォーム送信文面を生成。
 *
 * 戦略原典:
 *   - グローバル CLAUDE.md s11.5 SALES-CENTER: Stage 1 = フォーム営業ドリブン
/**
 * lib/sales/form-message.ts — 営業フォームメッセージ生成 (Sprint 10-A)
 *
 * 役割: sales_companies (リード) と sales_templates (業種×課題) を組み合わせ、
 *       DeepSeek V3 で「教えてあげる体裁」のフォーム送信文面を生成。
 *
 * 戦略原典:
 *   - グローバル CLAUDE.md s11.5 SALES-CENTER: Stage 1 = フォーム営業ドリブン
 *   - 営業MVP壁打ち②: 「1 つの痛み × 1 つの数字 × 1 つのアクション」が CVR 最大
 *   - 心理設計: 損失訴求 > 欲望訴求 (プロスペクト理論 2.5x)
 *
 * 出力: 1 文面 = 200-300 文字程度 (フォーム入力欄に収まるサイズ)
 */

import { callDeepSeek, type DeepSeekResponse } from "@/lib/deepseek"
import { getAiPrompt } from "@/lib/sales/ai-prompts"
import { findCompanyById } from "./companies"
import { normalizeDifyCloudApiUrl, normalizeDifyCloudBaseUrl } from "./dify-cloud"
import { matchTemplate } from "./templates"
import { getServiceSalesSupabase } from "@/lib/supabase"
import type { Industry, IssueCode, SalesCompany } from "./types"
import { DB_TABLES } from "@/lib/sales/db-tables"
import {
  buildVerifiedOutreachContext,
  formatVerifiedOutreachContext,
  type VerifiedOutreachContext,
  type VerifiedOutreachMetric,
} from "./outreach/verified-metrics"
import { getOutreachEvidenceMode } from "./outreach/evidence-mode"

type JsonRecord = Record<string, unknown>

/* ───── User Prompt builder ───── */

function buildUserPrompt(input: {
  company: SalesCompany
  industry: Industry
  issueCode: IssueCode
  templateHeadline: string | null
  templatePain: string | null
  templateLoss: string | null
  verifiedContext: VerifiedOutreachContext
}): string {
  const { company, industry, issueCode, templateHeadline, templatePain, templateLoss, verifiedContext } = input
  return `【対象企業】
会社名: ${company.company_name}
業種: ${industry}
ドメイン: ${company.domain}
${company.prefecture ? `所在: ${company.prefecture}` : ""}

【検出した最重要課題】
コード: ${issueCode}
${templateHeadline ? `見出し: ${templateHeadline}` : ""}
${templatePain ? `痛み: ${templatePain}` : ""}
${templateLoss ? `損失: ${templateLoss}` : ""}

【検出データ】
${company.pagespeed_mobile != null ? `モバイルスコア: ${company.pagespeed_mobile}点` : ""}
${company.pagespeed_desktop != null ? `PCスコア: ${company.pagespeed_desktop}点` : ""}

${formatVerifiedOutreachContext(verifiedContext)}

 上記をもとに、200-300 文字のフォーム送信文面を 1 つ生成してください。
 検証済みメトリクスにない数値、conversion rate、売上損失、離脱率は絶対に作らないこと。
 推定値は必ず「estimated」と表現し、根拠URLのない数値は本文に含めないこと。
 末尾に {{report_url}} プレースホルダを必ず含めること。
 また、WEB制作診断レポートの場合は改善デモサイトのURLプレースホルダ {{demo_url}} も含めること。`
}

/* ───── Public API ───── */

export interface GenerateFormMessageResult {
  ok: boolean
  message?: string
  engine?: "dify" | "deepseek_fallback"
  evidence_mode?: "public-signals" | "paid-traffic"
  used_template_id?: string | null
  fallbacks?: {
    industry: boolean
    issueCode: boolean
  }
  verified_metrics?: VerifiedOutreachMetric[]
  metric_unknowns?: string[]
  evidence_ready?: boolean
  usage?: DeepSeekResponse["usage"]
  dify_workflow_run_id?: string | null
  fallback_allowed?: boolean
  error?: string
}

export interface GenerateFormMessageOptions {
  /** Require at least one verified metric and reject unsupported numeric claims. */
  requireVerifiedMetrics?: boolean
  /**
   * Allow the direct DeepSeek path only for an explicit operator/dev invocation.
   * Production outreach must keep this false so a Dify outage fails closed.
   */
  allowDirectFallback?: boolean
}

const DEFAULT_OUTREACH_INDUSTRY: Industry = "consulting"
const DEFAULT_OUTREACH_ISSUE: IssueCode = "no_ogp"

function readOptionalEnv(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

function readDifyMessage(raw: JsonRecord): string | null {
  const data = asRecord(raw.data) ?? raw
  const outputs = asRecord(data.outputs) ?? asRecord(raw.outputs)
  const candidates = [
    outputs?.message,
    outputs?.text,
    outputs?.body,
    outputs?.result,
    data.answer,
    raw.answer,
  ]
  const hit = candidates.find((value) => typeof value === "string" && value.trim().length > 0)
  return typeof hit === "string" ? hit.trim() : null
}

async function generateWithDify(input: {
  company: SalesCompany
  industry: Industry
  issueCode: IssueCode
  templateHeadline: string | null
  templatePain: string | null
  templateLoss: string | null
  fallbacks: GenerateFormMessageResult["fallbacks"]
  verifiedContext: VerifiedOutreachContext
  evidenceMode: "public-signals" | "paid-traffic"
}): Promise<{ ok: true; message: string; workflowRunId: string | null } | { ok: false; configured: boolean; error: string }> {
  const apiKey =
    readOptionalEnv("DIFY_FORM_MESSAGE_API_KEY") ??
    readOptionalEnv("DIFY_FORM_MESSAGE_KEY") ??
    readOptionalEnv("DIFY_API_KEY")
  const baseUrl = normalizeDifyCloudBaseUrl(readOptionalEnv("DIFY_FORM_MESSAGE_BASE_URL") ?? readOptionalEnv("DIFY_BASE_URL"))
  const endpoint = normalizeDifyCloudApiUrl(readOptionalEnv("DIFY_FORM_MESSAGE_API_URL") ?? `${baseUrl}/v1/workflows/run`)
  if (!apiKey) return { ok: false, configured: false, error: "Dify form-message API key is not configured" }

  try {
    const systemPrompt = await getAiPrompt("sales_form_message_system")
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          system_prompt: systemPrompt,
          user_payload: JSON.stringify({
            company_id: input.company.id,
            company_name: input.company.company_name,
            domain: input.company.domain,
            industry: input.industry,
            region: input.company.region,
            issue_code: input.issueCode,
            fallback_context: input.fallbacks,
            template_headline: input.templateHeadline,
            template_pain: input.templatePain,
            template_loss: input.templateLoss,
            verified_metrics: input.verifiedContext.metrics,
            metric_unknowns: input.verifiedContext.unknowns,
            evidence_mode: input.evidenceMode,
            numeric_claim_policy: "Only use numbers present in verified_metrics or the fixed offer facts; never invent revenue, conversion, traffic, or loss values.",
            pagespeed_mobile: input.company.pagespeed_mobile,
            pagespeed_desktop: input.company.pagespeed_desktop,
            detected_issues: input.company.detected_issues,
            enrichment_meta: input.company.meta,
            required_placeholder: "{{report_url}}",
          }),
        },
        response_mode: "blocking",
        user: `paradigm-sales-form-${input.company.id}`,
      }),
      signal: AbortSignal.timeout(60_000),
    })
    const text = await res.text()
    const raw = text ? (JSON.parse(text) as JsonRecord) : {}
    if (!res.ok) {
      console.error("[sales-form-message] Dify request failed:", res.status, text.slice(0, 300))
      return { ok: false, configured: true, error: `Dify HTTP ${res.status}` }
    }
    const message = readDifyMessage(raw)
    if (!message) return { ok: false, configured: true, error: "Dify response did not include a message" }
    const data = asRecord(raw.data)
    const workflowRunId = typeof raw.workflow_run_id === "string"
      ? raw.workflow_run_id
      : typeof data?.workflow_run_id === "string"
        ? data.workflow_run_id
        : null
    return {
      ok: true,
      message: message.includes("{{report_url}}") ? message : `${message}\n{{report_url}}`,
      workflowRunId,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error("[sales-form-message] Dify failed:", message)
    return { ok: false, configured: true, error: message }
  }
}

const FIXED_OFFER_NUMBERS = new Set(["0", "6", "7", "13,000", "13000", "21", "20", "200", "300"])

function numericTokens(message: string): string[] {
  return message.match(/(?:[$€£¥]\s*)?\d[\d,]*(?:\.\d+)?%?/g) ?? []
}

function validateNumericClaims(message: string, context: VerifiedOutreachContext, requireVerifiedMetrics: boolean): string | null {
  if (requireVerifiedMetrics && context.metrics.length === 0) return "No verified metrics available for personalized numeric copy"
  const allowed = new Set([
    ...FIXED_OFFER_NUMBERS,
    ...context.metrics.map((metric) => String(metric.value)),
    ...context.metrics.map((metric) => metric.value.toLocaleString("en-US")),
    ...context.metrics
      .filter((metric) => metric.unit === "%")
      .flatMap((metric) => [`${metric.value}%`, `${metric.value.toFixed(2)}%`]),
  ])
  const unsupported = numericTokens(message).filter((token) => {
    const normalized = token.replace(/^[$€£¥]\s*/, "")
    return !allowed.has(token) && !allowed.has(normalized)
  })
  return unsupported.length > 0 ? `Unsupported numeric claims: ${unsupported.slice(0, 5).join(", ")}` : null
}

function selectOutreachIssue(company: SalesCompany): { issueCode: IssueCode; fallback: boolean } {
  const firstIssue = (company.detected_issues ?? [])[0]
  if (firstIssue) return { issueCode: firstIssue, fallback: false }
  if (company.pagespeed_mobile != null && company.pagespeed_mobile < 50) {
    return { issueCode: "speed_critical", fallback: true }
  }
  if (company.pagespeed_desktop != null && company.pagespeed_desktop < 50) {
    return { issueCode: "speed_critical", fallback: true }
  }
  return { issueCode: DEFAULT_OUTREACH_ISSUE, fallback: true }
}

/**
 * companyId から 1 つフォームメッセージを生成して返す.
 *
 * 1. company を取得
 * 2. detected_issues[0] と industry でテンプレを matching
 * 3. Dify workflow にプロンプト投入（system prompt と根拠データを監査可能な形で渡す）
 * 4. 結果テキストをそのまま返す (caller 側で {{report_url}} を実 URL に置換)
 */
export async function generateFormMessage(
  companyId: string,
  options: GenerateFormMessageOptions = {},
): Promise<GenerateFormMessageResult> {
  const company = await findCompanyById(companyId)
  if (!company) return { ok: false, error: "company not found" }
  const requireVerifiedMetrics = options.requireVerifiedMetrics === true
  const allowDirectFallback = options.allowDirectFallback === true
  const evidenceMode = getOutreachEvidenceMode()
  const verifiedContext = buildVerifiedOutreachContext(company)
  if (requireVerifiedMetrics && verifiedContext.metrics.length === 0) {
    return {
      ok: false,
      evidence_ready: false,
      evidence_mode: evidenceMode,
      verified_metrics: [],
      metric_unknowns: verifiedContext.unknowns,
      error: "No verified metrics available for personalized numeric copy",
    }
  }
  const industry = company.industry ?? DEFAULT_OUTREACH_INDUSTRY
  const issue = selectOutreachIssue(company)
  const fallbacks = {
    industry: !company.industry,
    issueCode: issue.fallback,
  }

  // テンプレ取得 (なければ null pain/loss でも DeepSeek に投げる)
  const template = await matchTemplate(industry, issue.issueCode, company.region, {
    reportLocale: company.report_locale,
    targetCountry: company.target_country,
    templateVariant: company.template_variant,
  })

  const templateContext = {
    industry,
    issueCode: issue.issueCode,
    templateHeadline: template?.headline ?? null,
    templatePain: template?.pain ?? null,
    templateLoss: template?.loss ?? null,
    fallbacks,
    verifiedContext,
  }

  const dify = await generateWithDify({
    company,
    ...templateContext,
    evidenceMode,
  })
  if (dify.ok) {
    const validationError = validateNumericClaims(dify.message, verifiedContext, requireVerifiedMetrics)
    if (!validationError) {
      await saveFormMessageToCompany(company.id, dify.message, "dify", verifiedContext, dify.workflowRunId)
      return {
        ok: true,
        message: dify.message,
        engine: "dify",
        evidence_mode: evidenceMode,
        used_template_id: template?.id ?? null,
        fallbacks,
        verified_metrics: verifiedContext.metrics,
        metric_unknowns: verifiedContext.unknowns,
        evidence_ready: verifiedContext.metrics.length > 0,
        dify_workflow_run_id: dify.workflowRunId,
        fallback_allowed: allowDirectFallback,
      }
    }
    console.warn("[sales-form-message] Dify numeric claim validation failed:", validationError)
  }

  if (!allowDirectFallback) {
    return {
      ok: false,
      verified_metrics: verifiedContext.metrics,
      metric_unknowns: verifiedContext.unknowns,
      evidence_mode: evidenceMode,
      evidence_ready: verifiedContext.metrics.length > 0,
      fallback_allowed: false,
      error: dify.ok
        ? "Dify generated a message that failed numeric evidence validation"
        : `Dify form-message generation failed: ${dify.error}`,
    }
  }

  if (!dify.ok && dify.configured) {
    console.warn("[sales-form-message] Dify workflow failed, falling back to DeepSeek V3:", dify.error?.slice(0, 120))
  }

  console.warn("[sales-form-message] Using DeepSeek V3 for form message generation.")

  const systemPrompt = await getAiPrompt("sales_form_message_system")
  const res = await callDeepSeek(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildUserPrompt({ company, ...templateContext }) },
    ],
    { temperature: 0.5, maxTokens: 500 },
  )

  if (!res.ok || !res.text) {
    return { ok: false, error: res.error ?? "DeepSeek empty response" }
  }

  const message = res.text.trim()
  const validationError = validateNumericClaims(message, verifiedContext, requireVerifiedMetrics)
  if (validationError) {
    return {
      ok: false,
      verified_metrics: verifiedContext.metrics,
      metric_unknowns: verifiedContext.unknowns,
      evidence_mode: evidenceMode,
      evidence_ready: verifiedContext.metrics.length > 0,
      error: validationError,
    }
  }
  await saveFormMessageToCompany(company.id, message, "deepseek_fallback", verifiedContext)
  return {
    ok: true,
    message,
    engine: "deepseek_fallback",
    evidence_mode: evidenceMode,
    used_template_id: template?.id ?? null,
    fallbacks,
    verified_metrics: verifiedContext.metrics,
    metric_unknowns: verifiedContext.unknowns,
    evidence_ready: verifiedContext.metrics.length > 0,
    fallback_allowed: true,
    usage: res.usage,
  }
}

async function saveFormMessageToCompany(
  companyId: string,
  message: string,
  engine: string,
  verifiedContext: VerifiedOutreachContext,
  difyWorkflowRunId: string | null = null,
): Promise<boolean> {
  try {
    const sb = getServiceSalesSupabase()
    if (!sb) return false
    const generatedAt = new Date().toISOString()
    // Atomic via Postgres function: single UPDATE avoids SELECT→merge→UPDATE TOCTOU race.
    const { error } = await sb.rpc("sales_atomic_meta_history_prepend", {
      p_company_id: companyId,
      p_message: message,
      p_engine: engine,
      p_generated_at: generatedAt,
    })
    if (error) {
      console.error("[sales-form-message] RPC failed:", error.message)
      return false
    }
    const { error: evidenceError } = await sb.rpc("sales_atomic_meta_merge", {
      p_company_id: companyId,
      p_patch: {
        form_message_evidence: {
          metrics: verifiedContext.metrics,
          unknowns: verifiedContext.unknowns,
          provider: engine === "dify" ? "dify" : "deepseek_direct",
          dify_workflow_run_id: difyWorkflowRunId,
          saved_at: generatedAt,
        },
      },
    })
    if (evidenceError) {
      console.error("[sales-form-message] evidence context RPC failed:", evidenceError.message)
      return false
    }
    return true
  } catch (e) {
    console.error("[sales-form-message] failed to persist message:", e)
    return false
  }
}

/**
 * 生成済みメッセージの {{report_url}} を実 URL に置換するヘルパ.
 * Trigger.dev task が送信直前に置換するために使う.
 */
export function fillReportUrl(message: string, reportUrl: string): string {
  return message.replaceAll("{{report_url}}", reportUrl)
}

/** 生成済みメッセージの {{demo_url}} を実URLに置換するヘルパ */
export function fillDemoUrl(message: string, demoUrl: string): string {
  return message.replaceAll("{{demo_url}}", demoUrl)
}
