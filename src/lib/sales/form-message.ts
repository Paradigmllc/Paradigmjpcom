/**
 * lib/sales/form-message.ts — 営業フォームメッセージ生成 (Sprint 10-A)
 *
 * 役割: sales_companies (リード) と sales_templates (業種×課題) を組み合わせ、
 *       DeepSeek V3 で「教えてあげる体裁」のフォーム送信文面を生成。
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
 *   - Notion 営業MVP壁打ち②: 「1 つの痛み × 1 つの数字 × 1 つのアクション」が CVR 最大
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

type JsonRecord = Record<string, unknown>

/* ───── User Prompt builder ───── */

function buildUserPrompt(input: {
  company: SalesCompany
  industry: Industry
  issueCode: IssueCode
  templateHeadline: string | null
  templatePain: string | null
  templateLoss: string | null
}): string {
  const { company, industry, issueCode, templateHeadline, templatePain, templateLoss } = input
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

上記をもとに、200-300 文字のフォーム送信文面を 1 つ生成してください。
末尾に {{report_url}} プレースホルダを必ず含めること。`
}

/* ───── Public API ───── */

export interface GenerateFormMessageResult {
  ok: boolean
  message?: string
  engine?: "dify" | "deepseek_fallback"
  used_template_id?: string | null
  usage?: DeepSeekResponse["usage"]
  error?: string
}

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
  issueCode: IssueCode
  templateHeadline: string | null
  templatePain: string | null
  templateLoss: string | null
}): Promise<{ ok: true; message: string } | { ok: false; configured: boolean; error: string }> {
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
            industry: input.company.industry,
            region: input.company.region,
            issue_code: input.issueCode,
            template_headline: input.templateHeadline,
            template_pain: input.templatePain,
            template_loss: input.templateLoss,
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
    return { ok: true, message: message.includes("{{report_url}}") ? message : `${message}\n{{report_url}}` }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error("[sales-form-message] Dify failed:", message)
    return { ok: false, configured: true, error: message }
  }
}

/**
 * companyId から 1 つフォームメッセージを生成して返す.
 *
 * 1. company を取得
 * 2. detected_issues[0] と industry でテンプレを matching
 * 3. DeepSeek にプロンプト投入 (system prompt 固定で cache hit 90%+)
 * 4. 結果テキストをそのまま返す (caller 側で {{report_url}} を実 URL に置換)
 */
export async function generateFormMessage(
  companyId: string,
): Promise<GenerateFormMessageResult> {
  const company = await findCompanyById(companyId)
  if (!company) return { ok: false, error: "company not found" }
  if (!company.industry) return { ok: false, error: "company.industry is null" }
  const firstIssue = (company.detected_issues ?? [])[0]
  if (!firstIssue) return { ok: false, error: "company has no detected_issues" }

  // テンプレ取得 (なければ null pain/loss でも DeepSeek に投げる)
  const template = await matchTemplate(company.industry, firstIssue)

  const templateContext = {
    industry: company.industry,
    issueCode: firstIssue,
    templateHeadline: template?.headline ?? null,
    templatePain: template?.pain ?? null,
    templateLoss: template?.loss ?? null,
  }

  const dify = await generateWithDify({
    company,
    ...templateContext,
  })
  if (dify.ok) {
    await saveFormMessageToCompany(company.id, dify.message, "dify")
    return {
      ok: true,
      message: dify.message,
      engine: "dify",
      used_template_id: template?.id ?? null,
    }
  }

  if (dify.configured) {
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
  await saveFormMessageToCompany(company.id, message, "deepseek_fallback")
  return {
    ok: true,
    message,
    engine: "deepseek_fallback",
    used_template_id: template?.id ?? null,
    usage: res.usage,
  }
}

async function saveFormMessageToCompany(companyId: string, message: string, engine: string): Promise<boolean> {
  try {
    const sb = getServiceSalesSupabase()
    if (!sb) return false
    // TOCTOU race: concurrent form submissions may lose history entries since
    // this reads meta, spreads it, then writes back. form_message_history is best-effort.
    const { data: current } = await sb.from(DB_TABLES.SALES_COMPANIES).select("meta").eq("id", companyId).single()
    const prevMeta = (current?.meta as Record<string, unknown>) ?? {}
    const history = Array.isArray(prevMeta.form_message_history) ? prevMeta.form_message_history as Array<unknown> : []
    await sb.from(DB_TABLES.SALES_COMPANIES).update({
      meta: {
        ...prevMeta,
        form_message: message,
        form_message_engine: engine,
        form_message_generated_at: new Date().toISOString(),
        form_message_history: [
          { message, engine, generated_at: new Date().toISOString() },
          ...history.slice(0, 9),
        ],
      },
    }).eq("id", companyId)
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
