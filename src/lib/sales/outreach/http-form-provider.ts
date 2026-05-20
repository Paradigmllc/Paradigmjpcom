/**
 * lib/sales/outreach/http-form-provider.ts — ブラウザ不要のフォーム送信 (Phase 3 改)
 *
 * 役割: 標準的な server-rendered フォーム (Contact Form 7 / WPForms / 素の POST) を
 *       <form> 解析 → hidden フィールド保持 → 直接 HTTP POST で送信する。
 *       Chromium を一切使わないため **新サーバー不要・Droplet ディスク汚染ゼロ・課金ゼロ**。
 *       (ユーザー制約「サーバー増強できない」への解。旧MVP の cheerio 内製 submit と同系統)
 *
 * 限界: JS でしか動かない SPA フォームは送れない → uncertain で返し manual_queue へ。
 *       その少数ケースは将来 worker/ (managed CDP・ローカル Chromium 不要) で補完。
 *
 * dryRun=true: 解析・組み立てまで実施し POST はしない (preflight/監査)。
 */

import type { BrowserProvider } from "./browser-provider"
import type { SubmitFormInput, SubmitFormResult } from "./types"
import { guessFieldRole } from "./form-classifier"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
const SUCCESS_RE = /ありがとう|送信(が)?(完了|されました|を受け付け)|受け付けました|thank you|successfully sent|message sent|mail_sent/i

interface ParsedForm {
  action: string
  method: string
  enctype: string
  /** name → value (hidden/既定値を保持) */
  fields: Record<string, string>
  inputNames: string[]
}

/** HTML から最初の「メッセージ系フィールドを含む <form>」を解析 */
function parseForm(html: string, pageUrl: string): ParsedForm | null {
  const formRe = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi
  let m: RegExpExecArray | null
  while ((m = formRe.exec(html)) !== null) {
    const attrs = m[1]
    const inner = m[2]
    const names = [...inner.matchAll(/<(?:input|textarea|select)\b[^>]*\bname=["']([^"']+)["']/gi)].map((x) => x[1])
    const hasTarget = names.some((n) => ["message", "email"].includes(guessFieldRole(n)))
    if (!hasTarget) continue

    const action = /\baction=["']([^"']*)["']/i.exec(attrs)?.[1] ?? pageUrl
    const method = (/\bmethod=["']([^"']*)["']/i.exec(attrs)?.[1] ?? "POST").toUpperCase()
    const enctype = /\benctype=["']([^"']*)["']/i.exec(attrs)?.[1] ?? "application/x-www-form-urlencoded"

    // 既存 value (hidden / nonce / 既定値) を保持
    const fields: Record<string, string> = {}
    const inputRe = /<input\b([^>]*)>/gi
    let im: RegExpExecArray | null
    while ((im = inputRe.exec(inner)) !== null) {
      const a = im[1]
      const name = /\bname=["']([^"']+)["']/i.exec(a)?.[1]
      if (!name) continue
      const value = /\bvalue=["']([^"']*)["']/i.exec(a)?.[1] ?? ""
      fields[name] = value
    }
    return { action, method, enctype, fields, inputNames: names }
  }
  return null
}

function resolveUrl(base: string, action: string): string {
  try {
    return new URL(action, base).toString()
  } catch {
    return base
  }
}

/** 解析済みフォームに営業値を流し込む (role マッピング) */
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

export class HttpFormProvider implements BrowserProvider {
  readonly name = "http"

  async submitForm(input: SubmitFormInput): Promise<SubmitFormResult> {
    const timeout = input.timeoutMs ?? 15_000
    let html: string
    try {
      const res = await fetch(input.formUrl, {
        redirect: "follow",
        signal: AbortSignal.timeout(timeout),
        headers: { "User-Agent": UA },
      })
      if (!res.ok) return { ok: false, outcome: "failed", detail: `form GET ${res.status}` }
      html = await res.text()
    } catch (e) {
      return { ok: false, outcome: "failed", detail: `form GET error: ${e instanceof Error ? e.message : String(e)}` }
    }

    const parsed = parseForm(html, input.formUrl)
    if (!parsed) {
      // server-rendered フォームが見つからない = SPA の可能性 → uncertain (manual/worker 行き)
      return { ok: true, outcome: "uncertain", detail: "server-rendered form 未検出 (SPA の可能性・要 browser)" }
    }

    const body = fillValues(parsed, input)
    const actionUrl = resolveUrl(input.formUrl, parsed.action)

    if (input.dryRun) {
      return {
        ok: true,
        outcome: "uncertain",
        detail: `dry-run: ${Object.keys(body).length} フィールド組立済 → ${parsed.method} ${actionUrl} (POST 未実行)`,
      }
    }

    // 実 POST (urlencoded)
    try {
      const res = await fetch(actionUrl, {
        method: parsed.method === "GET" ? "POST" : parsed.method, // contact フォームの GET は実質 POST 扱い
        redirect: "follow",
        signal: AbortSignal.timeout(timeout),
        headers: {
          "User-Agent": UA,
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: input.formUrl,
          Origin: new URL(input.formUrl).origin,
        },
        body: new URLSearchParams(body).toString(),
      })
      const text = await res.text().catch(() => "")
      if (!res.ok) return { ok: false, outcome: "failed", detail: `POST ${res.status}` }
      if (SUCCESS_RE.test(text)) return { ok: true, outcome: "submitted", detail: "送信完了 (確認文言検出)" }
      // 200 だが確認文言なし → 送れた可能性が高いが断定しない
      return { ok: true, outcome: "uncertain", detail: "POST 200 だが確認文言を検出できず" }
    } catch (e) {
      return { ok: false, outcome: "failed", detail: `POST error: ${e instanceof Error ? e.message : String(e)}` }
    }
  }
}
