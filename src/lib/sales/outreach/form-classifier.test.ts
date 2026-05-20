/**
 * form-classifier.test.ts — regex 分類 + フィールド検出の単体テスト
 *
 * enableLlm 未指定なので DeepSeek は呼ばれない (regex のみ・ネットワーク不要)。
 */

import { describe, it, expect } from "vitest"
import { classifyForm, detectFormFields, guessFieldRole } from "./form-classifier"

describe("classifyForm (regex)", () => {
  it("reCAPTCHA を risky_captcha に分類", async () => {
    const r = await classifyForm({
      formHtml: '<form><div class="g-recaptcha"></div><textarea name="message"></textarea></form>',
      pageUrl: "https://a.com/contact",
    })
    expect(r.classification).toBe("risky_captcha")
    expect(r.source).toBe("regex")
  })

  it("Contact Form 7 を safe_cf7 に分類", async () => {
    const r = await classifyForm({
      formHtml: '<form class="wpcf7-form"><textarea name="your-message"></textarea></form>',
      pageUrl: "https://a.com/contact",
    })
    expect(r.classification).toBe("safe_cf7")
  })

  it("password フィールドを risky_login に分類", async () => {
    const r = await classifyForm({
      formHtml: '<form><input type="password" name="pw"></form>',
      pageUrl: "https://a.com/login",
    })
    expect(r.classification).toBe("risky_login")
  })

  it("汎用フォーム (form + email/message) を safe_generic に分類", async () => {
    const r = await classifyForm({
      formHtml: '<form><input name="email"><textarea name="message"></textarea></form>',
      pageUrl: "https://a.com/contact",
    })
    expect(r.classification).toBe("safe_generic")
  })

  it("フォームが無ければ skip_unknown", async () => {
    const r = await classifyForm({ formHtml: "<div>no form here</div>", pageUrl: "https://a.com" })
    expect(r.classification).toBe("skip_unknown")
  })
})

describe("detectFormFields / guessFieldRole", () => {
  it("input/textarea の name を抽出", () => {
    const fields = detectFormFields('<input name="お名前"><textarea name="message"></textarea><input name="email">')
    expect(fields).toContain("お名前")
    expect(fields).toContain("message")
    expect(fields).toContain("email")
  })

  it("フィールド名から役割を推定", () => {
    expect(guessFieldRole("email_address")).toBe("email")
    expect(guessFieldRole("your-message")).toBe("message")
    expect(guessFieldRole("会社名")).toBe("company")
    expect(guessFieldRole("電話番号")).toBe("phone")
    expect(guessFieldRole("お名前")).toBe("name")
    expect(guessFieldRole("xyz")).toBe("other")
  })
})
