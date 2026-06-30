import type { BrowserProvider } from "./browser-provider"
import type { SubmitFormInput, SubmitFormResult } from "./types"
import { guessFieldRole } from "./form-classifier"
import { getProxyFetchOptions } from "../proxy-agent"
import { submitWithCmsTemplate } from "./cms-form-templates"

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

const SUCCESS_RE =
  /ありがとうございます|送信(が)?(完了|されました|を受け付け)|受け付けました|thank you|successfully sent|message sent|mail_sent/i

interface ParsedForm {
  action: string
  method: string
  enctype: string
  fields: Record<string, string>
  inputNames: string[]
}

function parseForm(html: string, pageUrl: string): ParsedForm | null {
  const formRe = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi
  let match: RegExpExecArray | null

  while ((match = formRe.exec(html)) !== null) {
    const attrs = match[1]
    const inner = match[2]
    const names = [...inner.matchAll(/<(?:input|textarea|select)\b[^>]*\bname=["']([^"']+)["']/gi)].map((x) => x[1])
    const hasTarget = names.some((name) => ["message", "email"].includes(guessFieldRole(name)))
    if (!hasTarget) continue

    const action = /\baction=["']([^"']*)["']/i.exec(attrs)?.[1] ?? pageUrl
    const method = (/\bmethod=["']([^"']*)["']/i.exec(attrs)?.[1] ?? "POST").toUpperCase()
    const enctype = /\benctype=["']([^"']*)["']/i.exec(attrs)?.[1] ?? "application/x-www-form-urlencoded"

    const fields: Record<string, string> = {}
    const inputRe = /<input\b([^>]*)>/gi
    let inputMatch: RegExpExecArray | null
    while ((inputMatch = inputRe.exec(inner)) !== null) {
      const inputAttrs = inputMatch[1]
      const name = /\bname=["']([^"']+)["']/i.exec(inputAttrs)?.[1]
      if (!name) continue
      const value = /\bvalue=["']([^"']*)["']/i.exec(inputAttrs)?.[1] ?? ""
      fields[name] = value
    }

    return { action, method, enctype, fields, inputNames: names }
  }

  return null
}

function resolveUrl(base: string, action: string): string {
  try {
    return new URL(action, base).toString()
  } catch (error) {
    console.warn("[http-form-provider] invalid form action:", { base, action, error })
    return base
  }
}

function fillValues(parsed: ParsedForm, input: SubmitFormInput): Record<string, string> {
  const out = { ...parsed.fields }
  for (const name of parsed.inputNames) {
    const role = guessFieldRole(name)
    if (role === "message") out[name] = input.message
    else if (role === "email" && input.fields.email) out[name] = input.fields.email
    else if (role === "name" && input.fields.name) out[name] = input.fields.name
    else if (role === "company" && input.fields.company) out[name] = input.fields.company
    else if (role === "phone" && input.fields.phone) out[name] = input.fields.phone
  }
  return out
}

function collectPageHiddenFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {}
  const re = /<input\b[^>]*\btype=["']hidden["'][^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const tag = m[0]
    const name = /\bname=["']([^"']+)["']/i.exec(tag)?.[1]
    const value = /\bvalue=["']([^"']*)["']/i.exec(tag)?.[1]
    if (name && value !== undefined) fields[name] = value
  }
  return fields
}

export class HttpFormProvider implements BrowserProvider {
  readonly name = "http"

  async submitForm(input: SubmitFormInput): Promise<SubmitFormResult> {
    const timeout = input.timeoutMs ?? 15_000
    let html: string

    try {
      const res = await fetch(
        input.formUrl,
        getProxyFetchOptions({
          redirect: "follow",
          signal: AbortSignal.timeout(timeout),
          headers: { "User-Agent": UA },
        })
      )
      if (!res.ok) return { ok: false, outcome: "failed", detail: `form GET ${res.status}` }
      html = await res.text()
    } catch (error) {
      console.error("[http-form-provider] form GET failed:", error)
      return { ok: false, outcome: "failed", detail: `form GET error: ${error instanceof Error ? error.message : String(error)}` }
    }

    const parsed = parseForm(html, input.formUrl)
    if (!parsed) {
      return {
        ok: true,
        outcome: "uncertain",
        detail: "SPA or client-rendered form suspected; browser worker or manual handling is required",
      }
    }

    const cmsResult = await submitWithCmsTemplate(input, html)
    if (cmsResult) return cmsResult

    const body = fillValues(parsed, input)
    const pageHiddens = collectPageHiddenFields(html)
    const merged = { ...pageHiddens, ...body } // pageHiddens first, body overrides
    const actionUrl = resolveUrl(input.formUrl, parsed.action)

    if (input.dryRun) {
      return {
        ok: true,
        outcome: "uncertain",
        detail: `dry-run: prepared ${Object.keys(merged).length} fields -> ${parsed.method} ${actionUrl} (POST not executed)`,
      }
    }

    try {
      const res = await fetch(
        actionUrl,
        getProxyFetchOptions({
          method: parsed.method === "GET" ? "POST" : parsed.method,
          redirect: "follow",
          signal: AbortSignal.timeout(timeout),
          headers: {
            "User-Agent": UA,
            "Content-Type": parsed.enctype.includes("multipart") ? "application/x-www-form-urlencoded" : parsed.enctype,
            Referer: input.formUrl,
            Origin: new URL(input.formUrl).origin,
          },
          body: new URLSearchParams(merged).toString(),
        })
      )
      const text = await res.text().catch((error) => {
        console.warn("[http-form-provider] failed to read submit response:", error)
        return ""
      })
      if (!res.ok) return { ok: false, outcome: "failed", detail: `POST ${res.status}` }
      if (SUCCESS_RE.test(text)) return { ok: true, outcome: "submitted", detail: "submission completed; success text detected" }
      return { ok: true, outcome: "uncertain", detail: "POST returned 200 but no success text was detected" }
    } catch (error) {
      console.error("[http-form-provider] form POST failed:", error)
      return { ok: false, outcome: "failed", detail: `POST error: ${error instanceof Error ? error.message : String(error)}` }
    }
  }
}
