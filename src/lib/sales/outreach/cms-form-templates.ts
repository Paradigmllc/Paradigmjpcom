import { getProxyFetchOptions } from "../proxy-agent"
import type { SubmitFormInput, SubmitFormResult } from "./types"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

export type CmsType = "cf7" | "wpforms" | "gravity_forms" | "generic"

export interface CmsFormTemplate {
  cmsType: CmsType
  submit: (input: SubmitFormInput, html: string) => Promise<SubmitFormResult>
}

function resolveUrl(base: string, action: string): string {
  try { return new URL(action, base).toString() }
  catch { return base }
}

function extractNonce(html: string): string | null {
  const m = /name=["']_wpnonce["']\s+value=["']([^"']+)["']/i.exec(html)
    ?? /name=["']_wpcf7_nonce["']\s+value=["']([^"']+)["']/i.exec(html)
  return m?.[1] ?? null
}

function extractCf7FormId(html: string): string | null {
  const m = /contact-form-7["'][^>]*\bid=["'](\d+)["']/i.exec(html)
    ?? /wpcf7-form["'][^>]*data-id=["'](\d+)["']/i.exec(html)
    ?? /_wpcf7["'][^>]*value=["'](\d+)["']/i.exec(html)
  return m?.[1] ?? null
}

async function submitCf7(input: SubmitFormInput, html: string): Promise<SubmitFormResult> {
  const formId = extractCf7FormId(html)
  const nonce = extractNonce(html)
  if (!formId) {
    return { ok: false, outcome: "failed", detail: "CF7 form ID not found; falling back to generic HTTP POST" }
  }

  const origin = new URL(input.formUrl).origin
  const endpoint = `${origin}/wp-json/contact-form-7/v1/contact-forms/${formId}/feedback`

  const body: Record<string, string> = {
    _wpcf7: formId,
  }
  if (nonce) body._wpcf7_nonce = nonce

  for (const [key, value] of Object.entries(input.fields)) {
    if (value) body[key] = value
    else { body[`your-${key}`] = "" }
  }
  body["your-message"] = input.message

  if (input.dryRun) {
    return { ok: true, outcome: "uncertain", detail: `CF7 dry-run: prepared ${Object.keys(body).length} fields for ${endpoint}` }
  }

  try {
    const res = await fetch(endpoint, getProxyFetchOptions({
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded", Origin: origin, Referer: input.formUrl },
      body: new URLSearchParams(body).toString(),
      signal: AbortSignal.timeout(input.timeoutMs ?? 15_000),
    }))
    const text = await res.text().catch(() => "")
    if (!res.ok) return { ok: false, outcome: "failed", detail: `CF7 API ${res.status}` }
    const json = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    if (json.status === "mail_sent" || json.status === "mail_success") {
      return { ok: true, outcome: "submitted", detail: "CF7 confirmed: mail sent" }
    }
    return { ok: true, outcome: "uncertain", detail: `CF7 responded but status=${String(json.status ?? "unknown")}` }
  } catch (error) {
    return { ok: false, outcome: "failed", detail: `CF7 API error: ${error instanceof Error ? error.message : String(error)}` }
  }
}

function extractWpFormsNonce(html: string): string | null {
  const m = /wpforms\[nonce\]["'][^>]*value=["']([^"']+)["']/i.exec(html)
    ?? /name=["']_wpnonce["'][^>]*value=["']([^"']+)["']/i.exec(html)
  return m?.[1] ?? null
}

function extractWpFormsAction(html: string): string | null {
  const m = /name=["']wpforms\[action\]["'][^>]*value=["']([^"']+)["']/i.exec(html)
  return m?.[1] ?? null
}

function extractWpFormsFieldMap(html: string): Record<string, string> {
  const fields: Record<string, string> = {}
  const re = /wpforms\[fields\]\[(\d+)\]\[/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    fields[`wpforms[fields][${m[1]}]`] = ""
  }
  return fields
}

async function submitWpForms(input: SubmitFormInput, html: string): Promise<SubmitFormResult> {
  const nonce = extractWpFormsNonce(html)
  const action = extractWpFormsAction(html)
  const fieldMap = extractWpFormsFieldMap(html)
  const fieldEntries = Object.entries(fieldMap)
  if (fieldEntries.length === 0) {
    return { ok: false, outcome: "failed", detail: "WPForms field map not found; falling back to generic HTTP POST" }
  }

  const formId = /wpforms\[id\]/i.test(html) ? html.match(/wpforms\[id\]\["?\]?value=["'](\d+)["']/i)?.[1] : null
  const body: Record<string, string> = {}
  if (nonce) body["wpforms[nonce]"] = nonce
  if (formId) body["wpforms[id]"] = formId
  if (action) body["wpforms[action]"] = action

  for (let i = 0; i < fieldEntries.length; i++) {
    const [base] = fieldEntries[i]
    if (i === 0 && input.fields.name) body[`${base}[value]`] = input.fields.name
    else if (i === 1 && input.fields.email) body[`${base}[value]`] = input.fields.email
    else if (i === fieldEntries.length - 1) body[`${base}[value]`] = input.message
    else body[`${base}[value]`] = ""
  }
  body["wpforms[submit]"] = "Submit"

  const origin = new URL(input.formUrl).origin
  if (input.dryRun) {
    return { ok: true, outcome: "uncertain", detail: `WPForms dry-run: prepared ${Object.keys(body).length} fields` }
  }

  try {
    const res = await fetch(input.formUrl, getProxyFetchOptions({
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded", Origin: origin, Referer: input.formUrl },
      body: new URLSearchParams(body).toString(),
      signal: AbortSignal.timeout(input.timeoutMs ?? 15_000),
    }))
    const text = await res.text().catch(() => "")
    if (!res.ok) return { ok: false, outcome: "failed", detail: `WPForms POST ${res.status}` }
    if (/wpforms-confirmation|thanks|success/i.test(text)) {
      return { ok: true, outcome: "submitted", detail: "WPForms confirmed: success message detected" }
    }
    return { ok: true, outcome: "uncertain", detail: "WPForms POST returned 200 but no confirmation detected" }
  } catch (error) {
    return { ok: false, outcome: "failed", detail: `WPForms POST error: ${error instanceof Error ? error.message : String(error)}` }
  }
}

async function submitGravityForms(input: SubmitFormInput, html: string): Promise<SubmitFormResult> {
  const formId = /gform_(\d+)/i.exec(html)?.[1] ?? /id=["']gform_(\d+)["']/i.exec(html)?.[1]
  if (!formId) {
    return { ok: false, outcome: "failed", detail: "Gravity Forms ID not found; falling back to generic HTTP POST" }
  }

  const body: Record<string, string> = {
    [`is_submit_${formId}`]: "1",
    [`gform_submit`]: formId,
    gform_unique_id: "",
    gform_target_page_number_1: "0",
    state_1: "",
    gform_field_values: "",
  }

  body[`input_${formId}_1`] = input.fields.name ?? ""
  body[`input_${formId}_2`] = input.fields.email ?? ""
  body[`input_${formId}_3`] = input.fields.company ?? ""
  body[`input_${formId}_4`] = input.message

  const nonceRe = /gform_ajax_nonce["']:\s*["']([^"']+)["']/i
  const ajaxRe = /ajax_url["']:\s*["']([^"']+)["']/i
  const nonce = nonceRe.exec(html)?.[1]
  const ajaxUrl = ajaxRe.exec(html)?.[1]

  const origin = new URL(input.formUrl).origin

  if (input.dryRun) {
    return { ok: true, outcome: "uncertain", detail: `Gravity Forms dry-run: prepared ${Object.keys(body).length} fields` }
  }

  if (ajaxUrl && nonce) {
    body.action = "gf_submit_form"
    body.nonce = nonce
    body.form_id = formId
    try {
      const endpoint = resolveUrl(origin, ajaxUrl)
      const res = await fetch(endpoint, getProxyFetchOptions({
        method: "POST",
        headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded", Origin: origin, Referer: input.formUrl },
        body: new URLSearchParams(body).toString(),
        signal: AbortSignal.timeout(input.timeoutMs ?? 15_000),
      }))
      const text = await res.text().catch(() => "")
      if (!res.ok) return { ok: false, outcome: "failed", detail: `Gravity Forms AJAX ${res.status}` }
      if (/"is_valid":true/.test(text)) return { ok: true, outcome: "submitted", detail: "Gravity Forms AJAX confirmed" }
      return { ok: true, outcome: "uncertain", detail: "Gravity Forms AJAX returned but no confirmation" }
    } catch (error) {
      return { ok: false, outcome: "failed", detail: `Gravity Forms AJAX error: ${error instanceof Error ? error.message : String(error)}` }
    }
  }

  try {
    const res = await fetch(input.formUrl, getProxyFetchOptions({
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded", Origin: origin, Referer: input.formUrl },
      body: new URLSearchParams(body).toString(),
      signal: AbortSignal.timeout(input.timeoutMs ?? 15_000),
    }))
    const text = await res.text().catch(() => "")
    if (!res.ok) return { ok: false, outcome: "failed", detail: `Gravity Forms POST ${res.status}` }
    if (/gform_confirmation|thanks|success/i.test(text)) return { ok: true, outcome: "submitted", detail: "Gravity Forms confirmed" }
    return { ok: true, outcome: "uncertain", detail: "Gravity Forms POST returned 200 but no confirmation" }
  } catch (error) {
    return { ok: false, outcome: "failed", detail: `Gravity Forms POST error: ${error instanceof Error ? error.message : String(error)}` }
  }
}

export function detectCmsType(html: string): CmsType {
  if (/wpcf7|contact-form-7/i.test(html)) return "cf7"
  if (/wpforms|wpforms-container/i.test(html)) return "wpforms"
  if (/gform_|gravity-?form|gform_body/i.test(html)) return "gravity_forms"
  return "generic"
}

export async function submitWithCmsTemplate(input: SubmitFormInput, html: string): Promise<SubmitFormResult | null> {
  const cms = detectCmsType(html)
  if (cms === "cf7") return submitCf7(input, html)
  if (cms === "wpforms") return submitWpForms(input, html)
  if (cms === "gravity_forms") return submitGravityForms(input, html)
  return null
}
