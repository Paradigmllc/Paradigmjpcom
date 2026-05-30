/**
 * lib/sales/outreach/form-classifier.ts — フォーム安全性分類 (Phase 3)
 *
 * 役割: フォーム HTML を safe / risky / skip に分類し、送信可否を判定する。
 *       Appexxme form-classifier の「Dify → DeepSeek → regex」を
 *       「regex-first → optional DeepSeek」に簡素化 (self-contained・コスト 0 優先)。
 *
 * safe_* のみ preflight → submit に進む。risky_captcha は人間 escalate。
 */

import { callDeepSeek } from "@/lib/deepseek"
import type { FormClassification } from "./types"

export interface ClassifyFormResult {
  classification: FormClassification
  confidence: number
  reason: string
  detectedFields: string[]
  source: "regex" | "deepseek"
}

const REGEX_HINTS: Array<{ classification: FormClassification; pattern: RegExp; conf: number; reason?: string }> = [
  {
    classification: "risky_captcha",
    pattern: /recaptcha|g-recaptcha|grecaptcha|hcaptcha|h-captcha|cf-turnstile|turnstile|challenges\.cloudflare\.com|cdn-cgi\/challenge-platform|cf-chl-|cf-browser-verification|attention required! \| cloudflare|datadome|perimeterx|px-captcha|arkose|funcaptcha|botdetect/i,
    conf: 0.96,
    reason: "captcha / bot-protection detected; switch to human-led queue",
  },
  { classification: "risky_login", pattern: /<input[^>]+type=["']password["']/i, conf: 0.9 },
  { classification: "skip_payment", pattern: /stripe|paypal|braintree|square|checkout\.js|card-number/i, conf: 0.75 },
  { classification: "risky_iframe", pattern: /<iframe[^>]+(form|contact|hsforms|typeform)/i, conf: 0.8 },
  { classification: "safe_cf7", pattern: /wpcf7|contact-form-7/i, conf: 0.85 },
  { classification: "safe_wpforms", pattern: /wpforms|gform_|gravity-?form|ninja-?forms/i, conf: 0.85 },
]

/** input/textarea の name 属性を抽出 (フィールド検出) */
export function detectFormFields(html: string): string[] {
  const fields = new Set<string>()
  const re = /<(?:input|textarea|select)\b[^>]*\bname=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) fields.add(m[1])
  return [...fields]
}

/** フィールド名から役割を推定 (worker の field-mapper の簡易版) */
export function guessFieldRole(name: string): "name" | "email" | "phone" | "company" | "message" | "other" {
  const n = name.toLowerCase()
  if (/mail|email|e-mail/.test(n)) return "email"
  if (/tel|phone|denwa|電話/.test(n)) return "phone"
  if (/company|corp|kaisha|会社|法人/.test(n)) return "company"
  if (/message|body|content|inquiry|honbun|本文|内容|お問い合わせ|問い合わせ/.test(n)) return "message"
  if (/name|namae|お名前|氏名|担当/.test(n)) return "name"
  return "other"
}

function hasUsableFields(fields: string[]): boolean {
  const roles = new Set(fields.map(guessFieldRole))
  // 最低 message か email のどちらかが要る
  return roles.has("message") || roles.has("email")
}

function regexClassify(html: string): ClassifyFormResult {
  const fields = detectFormFields(html)
  for (const h of REGEX_HINTS) {
    if (h.pattern.test(html)) {
      return {
        classification: h.classification,
        confidence: h.conf,
        reason: h.reason ?? `regex: ${h.pattern.source.slice(0, 36)}`,
        detectedFields: fields,
        source: "regex",
      }
    }
  }
  // フレームワーク不明だが <form> + 使えるフィールドがあれば generic safe
  if (/<form\b/i.test(html) && hasUsableFields(fields)) {
    return {
      classification: "safe_generic",
      confidence: 0.6,
      reason: "form + usable fields (email/message)",
      detectedFields: fields,
      source: "regex",
    }
  }
  return {
    classification: "skip_unknown",
    confidence: 0.3,
    reason: "no form pattern / fields",
    detectedFields: fields,
    source: "regex",
  }
}

const LLM_SYSTEM = `あなたは Web フォーム分類器です。HTML を分析し JSON で返す:
{"classification":"safe_cf7|safe_wpforms|safe_generic|risky_captcha|risky_login|risky_iframe|skip_payment|skip_unknown","confidence":0.0-1.0,"reason":"..."}
safe_*=標準フォーム送信可・risky_captcha=CAPTCHA有・skip_*=送信不可。`

/**
 * フォーム分類: regex-first (cost 0)。曖昧 (skip_unknown かつ enableLlm) のみ DeepSeek。
 */
export async function classifyForm(input: {
  formHtml: string
  pageUrl: string
  enableLlm?: boolean
}): Promise<ClassifyFormResult> {
  const regex = regexClassify(input.formHtml)
  // regex で確信があるか、LLM 無効なら regex 結果を採用
  if (!input.enableLlm || regex.confidence >= 0.6) return regex

  const res = await callDeepSeek(
    [
      { role: "system", content: LLM_SYSTEM },
      { role: "user", content: `URL: ${input.pageUrl}\nHTML(前3000字):\n${input.formHtml.slice(0, 3000)}` },
    ],
    { temperature: 0.2, maxTokens: 200, responseFormat: "json_object", timeoutMs: 30_000 },
  )
  if (!res.ok || !res.text) return regex
  try {
    const parsed = JSON.parse(res.text) as { classification?: FormClassification; confidence?: number; reason?: string }
    if (!parsed.classification) return regex
    return {
      classification: parsed.classification,
      confidence: parsed.confidence ?? 0.5,
      reason: parsed.reason ?? "deepseek",
      detectedFields: regex.detectedFields,
      source: "deepseek",
    }
  } catch {
    return regex
  }
}
