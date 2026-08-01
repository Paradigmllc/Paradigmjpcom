import { load, type CheerioAPI } from "cheerio"
import type { AnyNode } from "domhandler"
import { isAllowedFormUrlForOrigin } from "./external-form-discovery"

export interface ContactFormInspection {
  status: "form" | "page" | "missing"
  reason: "verified_contact_fields" | "verified_trusted_embed" | "contact_page_only" | "no_contact_intent" | "non_contact_form" | "untrusted_action" | "empty_or_soft_404" | "spa_fallback_duplicate"
  fields: Array<"name" | "email" | "message" | "submit">
  formCount: number
  action: string | null
  sameOrigin: boolean
  trustedProvider: boolean
}

const CONTACT_INTENT_RE = /contact|inquiry|enquiry|get in touch|request a demo|talk to|sales|support|お問い合わせ|問い合わせ|お問合せ|ご相談|資料請求/i
const EMAIL_RE = /e-?mail|メール/i
const MESSAGE_RE = /message|inquiry|enquiry|question|comment|details|description|how can we help|問い合わせ|お問い合わせ|相談内容|ご質問|備考/i
const NAME_RE = /(?:^|[^a-z])name|full.?name|company|organization|お名前|氏名|会社名|法人名/i
const NON_CONTACT_RE = /newsletter|subscribe|mailing.?list|search|login|sign.?in|password|coupon|discount|cart|checkout|quantity|product|variant|ニュースレター|メルマガ|検索|ログイン/i
const SOFT_404_RE = /(?:\b404\b|page (?:was )?not found|not found|does(?:n't| not) exist|cannot be found|ページが見つかりません|お探しのページ|存在しません)/i
const HUBSPOT_EMBED_RE = /hbspt\.forms\.create\s*\(\s*\{[\s\S]{0,2000}?\bportalId\s*:\s*["']\d{3,20}["'][\s\S]{0,2000}?\bformId\s*:\s*["'][0-9a-f-]{20,50}["'][\s\S]{0,2000}?\}\s*\)/i

function empty(status: ContactFormInspection["status"], reason: ContactFormInspection["reason"], formCount = 0): ContactFormInspection {
  return { status, reason, fields: [], formCount, action: null, sameOrigin: false, trustedProvider: false }
}

function fieldText($: CheerioAPI, field: AnyNode): string {
  const node = $(field)
  const id = node.attr("id")
  const label = id ? $(`label[for="${id.replace(/"/g, "")}"]`).text() : ""
  return [
    node.attr("type"),
    node.attr("name"),
    node.attr("id"),
    node.attr("placeholder"),
    node.attr("aria-label"),
    label,
    node.closest("label").text(),
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim()
}

function actionSafety(origin: string, pageUrl: string, rawAction: string | undefined): { action: string; sameOrigin: boolean; trustedProvider: boolean } | null {
  try {
    const action = new URL(rawAction?.trim() || pageUrl, pageUrl).toString()
    if (!isAllowedFormUrlForOrigin(origin, action)) return null
    const normalize = (host: string) => host.toLowerCase().replace(/^www\./, "")
    const originHost = normalize(new URL(origin).hostname)
    const actionHost = normalize(new URL(action).hostname)
    const sameOrigin = actionHost === originHost || actionHost.endsWith(`.${originHost}`)
    return { action, sameOrigin, trustedProvider: !sameOrigin }
  } catch (error) {
    console.warn("[contact-form-inspection] invalid form action:", error)
    return null
  }
}

function trustedEmbeddedContactForm($: CheerioAPI, pageUrl: string): ContactFormInspection | null {
  for (const script of $("script").toArray()) {
    const node = $(script)
    const loader = `${node.attr("src") ?? ""} ${node.attr("data-src") ?? ""} ${node.attr("data-rocket-src") ?? ""}`
    const source = node.html() ?? ""
    if (!HUBSPOT_EMBED_RE.test(source)) continue
    if (!/hsforms\.net\/forms\/embed|hbspt\.forms/i.test(`${loader} ${source}`)) continue

    const container = node.closest("[class*='contact'],[class*='enquiry'],[class*='inquiry'],[class*='form'],section,article")
    const visibleContainer = container.clone()
    visibleContainer.find("script,style,noscript,template").remove()
    const context = visibleContainer.text().replace(/\s+/g, " ").trim()
    if (!CONTACT_INTENT_RE.test(context) || NON_CONTACT_RE.test(context) && !MESSAGE_RE.test(context)) continue

    return {
      status: "form",
      reason: "verified_trusted_embed",
      fields: ["email", "message", "submit"],
      formCount: 1,
      action: pageUrl,
      sameOrigin: true,
      trustedProvider: true,
    }
  }
  return null
}

export function inspectContactFormHtml(html: string, pageUrl: string, origin: string): ContactFormInspection {
  const $ = load(html)
  const trustedEmbed = trustedEmbeddedContactForm($, pageUrl)
  if (trustedEmbed) return trustedEmbed
  $("script,style,noscript,template").remove()
  const titleAndHeadings = `${$("title").text()} ${$("h1,h2").slice(0, 8).text()}`.replace(/\s+/g, " ").trim()
  const visibleBodyText = $("body").text().replace(/\s+/g, " ").trim()
  const forms = $("form")
  if (forms.length === 0 && (visibleBodyText.length < 12 || SOFT_404_RE.test(`${titleAndHeadings} ${visibleBodyText}`))) {
    return empty("missing", "empty_or_soft_404")
  }
  const pageText = `${new URL(pageUrl).pathname} ${titleAndHeadings}`.replace(/\s+/g, " ")
  const hasContactIntent = CONTACT_INTENT_RE.test(pageText)
  let sawNonContact = false
  let sawUntrusted = false

  for (const form of forms.toArray()) {
    const node = $(form)
    const fields = node.find("input,textarea,select,button").toArray()
    const formText = `${node.attr("id") ?? ""} ${node.attr("class") ?? ""} ${node.attr("name") ?? ""} ${node.text()} ${fields.map((field) => fieldText($, field)).join(" ")}`.replace(/\s+/g, " ")
    if (NON_CONTACT_RE.test(formText) && !MESSAGE_RE.test(formText)) {
      sawNonContact = true
      continue
    }
    const detected = new Set<ContactFormInspection["fields"][number]>()
    for (const field of fields) {
      const text = fieldText($, field)
      const tagName = field.tagName.toLowerCase()
      const type = ($(field).attr("type") ?? "").toLowerCase()
      if (type === "email" || EMAIL_RE.test(text)) detected.add("email")
      if (tagName === "textarea" || MESSAGE_RE.test(text)) detected.add("message")
      if (NAME_RE.test(text)) detected.add("name")
      if (type === "submit" || tagName === "button") detected.add("submit")
    }
    const safety = actionSafety(origin, pageUrl, node.attr("action"))
    if (!safety) {
      sawUntrusted = true
      continue
    }
    if (detected.has("email") && detected.has("message") && detected.has("submit") && (hasContactIntent || MESSAGE_RE.test(formText))) {
      return {
        status: "form",
        reason: "verified_contact_fields",
        fields: [...detected],
        formCount: forms.length,
        action: safety.action,
        sameOrigin: safety.sameOrigin,
        trustedProvider: safety.trustedProvider,
      }
    }
    sawNonContact = true
  }

  if (hasContactIntent) return empty("page", sawUntrusted ? "untrusted_action" : sawNonContact ? "non_contact_form" : "contact_page_only", forms.length)
  return empty("missing", sawUntrusted ? "untrusted_action" : sawNonContact ? "non_contact_form" : "no_contact_intent", forms.length)
}
