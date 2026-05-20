/**
 * worker/src/submit.ts — フォーム入力 → 送信 (Playwright Stealth)
 *
 * Next 側の preflight を通過した safe フォームのみ来る前提。
 * dryRun=true なら入力までで送信ボタンは押さない (監査)。
 */

import type { Page } from "playwright"
import { withContext } from "./browser.js"

export interface SubmitInput {
  formUrl: string
  fields: Record<string, string>
  message: string
  dryRun: boolean
  timeoutMs?: number
}

export interface SubmitResult {
  ok: boolean
  outcome: "submitted" | "uncertain" | "failed" | "skipped"
  detail: string
  evidenceUrl?: string | null
}

type Role = "name" | "email" | "phone" | "company" | "message" | "other"

function roleOf(name: string): Role {
  const n = name.toLowerCase()
  if (/mail|email|e-mail/.test(n)) return "email"
  if (/tel|phone|denwa|電話/.test(n)) return "phone"
  if (/company|corp|kaisha|会社|法人/.test(n)) return "company"
  if (/message|body|content|inquiry|honbun|本文|内容|問い合わせ/.test(n)) return "message"
  if (/name|namae|お名前|氏名|担当/.test(n)) return "name"
  return "other"
}

const SUCCESS_RE = /ありがとう|送信(が)?(完了|されました|を受け付け)|受け付けました|thank you|successfully sent|message sent/i

async function fillFields(page: Page, input: SubmitInput): Promise<number> {
  const controls = await page.$$("input, textarea")
  let filled = 0
  for (const el of controls) {
    const name = (await el.getAttribute("name")) ?? ""
    const type = (await el.getAttribute("type")) ?? "text"
    if (["hidden", "submit", "button", "checkbox", "radio", "file"].includes(type)) continue
    const role = roleOf(name)
    const value =
      role === "message"
        ? input.message
        : role === "email"
          ? input.fields.email ?? ""
          : role === "name"
            ? input.fields.name ?? ""
            : role === "company"
              ? input.fields.company ?? ""
              : role === "phone"
                ? input.fields.phone ?? ""
                : ""
    if (!value) continue
    try {
      await el.fill(value)
      filled++
    } catch {
      // 個別フィールド失敗は無視 (必須でないことが多い)
    }
  }
  return filled
}

export async function submitForm(input: SubmitInput): Promise<SubmitResult> {
  const timeout = input.timeoutMs ?? Number(process.env.NAV_TIMEOUT_MS ?? 30_000)
  try {
    return await withContext(async (ctx) => {
      const page = await ctx.newPage()
      page.setDefaultTimeout(timeout)
      await page.goto(input.formUrl, { waitUntil: "domcontentloaded" })

      const filled = await fillFields(page, input)
      if (filled === 0) {
        return { ok: false, outcome: "failed", detail: "入力可能なフィールドが見つからない" }
      }

      if (input.dryRun) {
        return {
          ok: true,
          outcome: "uncertain",
          detail: `dry-run: ${filled} フィールド入力済 (送信ボタン未押下)`,
        }
      }

      const submitBtn = page
        .locator(
          'button[type="submit"], input[type="submit"], button:has-text("送信"), button:has-text("Send"), button:has-text("確認")',
        )
        .first()
      if ((await submitBtn.count()) === 0) {
        return { ok: false, outcome: "failed", detail: "送信ボタンが見つからない" }
      }
      await submitBtn.click()
      await page.waitForLoadState("networkidle").catch(() => {})

      const body = await page.content()
      if (SUCCESS_RE.test(body)) {
        return { ok: true, outcome: "submitted", detail: "送信完了 (確認文言検出)" }
      }
      return { ok: true, outcome: "uncertain", detail: "送信したが確認文言を検出できず" }
    })
  } catch (e) {
    return {
      ok: false,
      outcome: "failed",
      detail: e instanceof Error ? e.message : String(e),
    }
  }
}
