/**
 * Form safety classifier for the outreach pipeline.
 *
 * It classifies contact-form HTML into safe / risky / skip buckets. Only safe
 * classifications can reach preflight and submit. CAPTCHA and bot-protection
 * are always routed to a human queue.
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
    pattern:
      /recaptcha|g-recaptcha|grecaptcha|hcaptcha|h-captcha|cf-turnstile|turnstile|challenges\.cloudflare\.com|cdn-cgi\/challenge-platform|cf-chl-|cf-browser-verification|attention required! \| cloudflare|datadome|perimeterx|px-captcha|arkose|funcaptcha|botdetect/i,
    conf: 0.96,
    reason: "captcha / bot-protection detected; switch to human-led queue",
  },
  { classification: "risky_login", pattern: /<input[^>]+type=["']password["']/i, conf: 0.9 },
  { classification: "skip_payment", pattern: /\bstripe\.com\b|\bpaypal\.com\b|\bbraintree\b|\bsquareup\.com\b|\bsquare\s+(?:payments?|checkout|register)\b|\bcheckout\s*(?:\.js|\.com|now)\b|\bcard\.number\b/i, conf: 0.85 },
  { classification: "risky_iframe", pattern: /<iframe[^>]+(form|contact|hsforms|typeform)/i, conf: 0.8 },
  { classification: "safe_cf7", pattern: /wpcf7|contact-form-7/i, conf: 0.85 },
  { classification: "safe_wpforms", pattern: /wpforms|gform_|gravity-?form|ninja-?forms/i, conf: 0.85 },
]

/** Extract input/textarea/select name attributes. */
export function detectFormFields(html: string): string[] {
  const fields = new Set<string>()
  const re = /<(?:input|textarea|select)\b[^>]*\bname=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) fields.add(m[1])
  return [...fields]
}

/** Infer field role from common English/Japanese field names. */
export function guessFieldRole(name: string): "name" | "email" | "phone" | "company" | "message" | "other" {
  const n = name.toLowerCase()
  if (/mail|email|e-mail/.test(n)) return "email"
  if (/tel|phone|denwa|電話|携帯/.test(n)) return "phone"
  if (/company|corp|kaisha|会社|法人|企業|貴社/.test(n)) return "company"
  if (/message|body|content|inquiry|honbun|本文|内容|お問い合わせ|問い合わせ|相談|ご相談/.test(n)) {
    return "message"
  }
  if (/name|namae|お名前|氏名|名前|担当者|担当/.test(n)) return "name"
  return "other"
}

function hasUsableFields(fields: string[]): boolean {
  const roles = new Set(fields.map(guessFieldRole))
  return roles.has("message") || roles.has("email")
}

function regexClassify(html: string): ClassifyFormResult {
  // Extract just the form content to avoid footer/nav noise
  const formMatch = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/i)
  const isSPA = !formMatch
  const targetHtml = formMatch ? formMatch[0] : html
  const fields = detectFormFields(targetHtml)

  for (const h of REGEX_HINTS) {
    const matchTarget = h.classification === "risky_captcha" ? html : targetHtml
    if (h.pattern.test(matchTarget)) {
      // For SPA pages, skip_payment should only trigger if there are actual
      // payment-related input fields (card-number, etc.), not just brand
      // mentions in footer/client-logos
      if (isSPA && h.classification === "skip_payment") {
        const hasPaymentFields = /name=["'](?:card|cc-?number|cc-?cvv|cc-?exp|credit|payment)/i.test(targetHtml)
        if (!hasPaymentFields) continue
      }
      return {
        classification: h.classification,
        confidence: h.conf,
        reason: h.reason ?? `regex: ${h.pattern.source.slice(0, 36)}`,
        detectedFields: fields,
        source: "regex",
      }
    }
  }

  // Traditional forms with usable fields
  if (/<form\b/i.test(targetHtml) && hasUsableFields(fields)) {
    return {
      classification: "safe_generic",
      confidence: 0.6,
      reason: "form + usable fields (email/message)",
      detectedFields: fields,
      source: "regex",
    }
  }

  // SPA (no form tag) but has usable fields → treat as safe
  if (isSPA && hasUsableFields(fields)) {
    return {
      classification: "safe_generic",
      confidence: 0.5,
      reason: "SPA with usable fields (email/message)",
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

const LLM_SYSTEM = `You are a web contact-form safety classifier. Analyze HTML and return only JSON:
{\"classification\":\"safe_cf7|safe_wpforms|safe_generic|risky_captcha|risky_login|risky_iframe|skip_payment|skip_unknown\",\"confidence\":0.0-1.0,\"reason\":\"...\"}
safe_* means the form can proceed to preflight. risky_captcha means CAPTCHA/bot protection is present and must go to a human queue. skip_* means do not submit.`

/**
 * Regex-first classifier. DeepSeek is used only for ambiguous cases when
 * explicitly enabled.
 */
export async function classifyForm(input: {
  formHtml: string
  pageUrl: string
  enableLlm?: boolean
}): Promise<ClassifyFormResult> {
  const regex = regexClassify(input.formHtml)
  if (!input.enableLlm || regex.confidence >= 0.6) return regex

  const res = await callDeepSeek(
    [
      { role: "system", content: LLM_SYSTEM },
      { role: "user", content: `URL: ${input.pageUrl}\nHTML(first 3000 chars):\n${input.formHtml.slice(0, 3000)}` },
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
  } catch (error) {
    console.warn("[sales-form-classifier] DeepSeek JSON parse failed:", error)
    return regex
  }
}
