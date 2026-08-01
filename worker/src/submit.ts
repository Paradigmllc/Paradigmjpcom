/**
 * Fill and optionally submit safe contact forms with Playwright Stealth.
 *
 * Next.js performs discovery, classification, robots checks, and approval gates
 * first. dryRun=true fills fields only and never clicks the submit button.
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
  if (/tel|phone|denwa|電話|携帯/.test(n)) return "phone"
  if (/company|corp|kaisha|会社|法人|企業|貴社/.test(n)) return "company"
  if (/message|body|content|inquiry|honbun|本文|内容|お問い合わせ|問い合わせ|相談/.test(n)) {
    return "message"
  }
  if (/name|namae|お名前|氏名|名前|担当者|担当/.test(n)) return "name"
  return "other"
}

const SUCCESS_RE =
  /ありがとうございます|送信(が)?(完了しました|されました|を受け付け)|受け付けました|受付しました|thank you|successfully sent|message sent|mail_sent/i

const THANK_YOU_URL_RE =
  /thank(?:s|.?you)|complete|confirm|success|sent|thanks|done|finish|完了|送信完了|確認|サンクス/i

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
    } catch (error) {
      console.warn("[worker/submit] failed to fill field:", { name, role, error })
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
      await page.goto(input.formUrl, { waitUntil: "domcontentloaded", timeout })

      const filled = await fillFields(page, input)
      if (filled === 0) {
        return { ok: false, outcome: "failed", detail: "No fillable fields were found." }
      }

      if (input.dryRun) {
        return {
          ok: true,
          outcome: "uncertain",
          detail: `dry-run: filled ${filled} fields; submit button was not clicked.`,
        }
      }

      const submitBtn = page
        .locator(
          'button[type="submit"], input[type="submit"], button:has-text("送信"), button:has-text("Send"), button:has-text("確認")',
        )
        .first()
      if ((await submitBtn.count()) === 0) {
        return { ok: false, outcome: "failed", detail: "Submit button was not found." }
      }
      await submitBtn.click()
      await page.waitForLoadState("networkidle", { timeout }).catch((error) => {
        console.warn("[worker/submit] networkidle wait failed:", error)
      })

      const currentUrl = page.url()
      if (currentUrl !== input.formUrl && THANK_YOU_URL_RE.test(currentUrl)) {
        return { ok: true, outcome: "submitted", detail: "Submit completed; redirected to thank-you page." }
      }

      const body = await page.content()
      if (SUCCESS_RE.test(body)) {
        return { ok: true, outcome: "submitted", detail: "Submit completed; success text detected." }
      }
      if (currentUrl !== input.formUrl) {
        return { ok: true, outcome: "submitted", detail: "Submit completed; page URL changed after submission." }
      }
      return { ok: true, outcome: "uncertain", detail: "Submitted, but success text was not detected." }
    })
  } catch (e) {
    return {
      ok: false,
      outcome: "failed",
      detail: e instanceof Error ? e.message : String(e),
    }
  }
}
