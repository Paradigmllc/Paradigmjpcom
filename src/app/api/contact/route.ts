/**
 * /api/contact — お問い合わせ受信エンドポイント
 *
 * Validates the public form, atomically persists lead + DB outbox, and sends
 * an idempotent Slack alert under a DB-backed notification lease.
 *
 * 永久ルール (BB / E): catch{} 握りつぶし禁止 — エラーは console.error で可視化。
 */

import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp, verifyTurnstile } from "@/lib/rate-limit"
import { captureException } from "@/lib/error-monitor"
import { LOCALE_COUNTRY, localeContentVariant } from "@/lib/locale-map"
import { normalizeReportLocale } from "@/lib/sales/routing"
import { notifyBothChannels } from "@/lib/notify"
import {
  JAPAN_ENTRY_INTENT,
  normalizeCompanyCountry,
  parseContactPayload,
  scoreContactQualification,
  validateContactPayload,
} from "./contact-payload"
import {
  ContactChallengeReplayError,
  completeContactNotification,
  persistContactLead,
} from "./contact-lead"
import { startContactEnrichment } from "./contact-enrichment"
import { verifyContactChallenge } from "./contact-challenge"
import {
  buildContactLeadMeta,
  buildContactSlackText,
  contactChallengeHash,
  contactIdempotencyKey,
  contactNotificationTitle,
  leadRegionForLocale,
  localized,
  requestLanguage,
  slackInline,
} from "./contact-route-helpers"

export { GET } from "./contact-challenge-route"

export async function POST(req: NextRequest) {
  let responseLanguage = requestLanguage(req)
  try {
    const ip = getClientIp(req)
    const rateLimit = checkRateLimit({
      ip,
      key: "contact-post",
      max: 5,
      windowMs: 60_000,
    })
    if (!rateLimit.ok) {
      return NextResponse.json(
        {
          error: localized(responseLanguage, {
            en: "Too many requests. Please wait a moment and try again.",
            ja: "リクエストが多すぎます。しばらくしてから再度お試しください。",
          }),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
            ),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetAt / 1000)),
          },
        },
      )
    }

    let body: unknown
    try {
      body = await req.json()
    } catch (error) {
      console.error("[contact] Invalid JSON request body:", error)
      return NextResponse.json(
        {
          error: localized(responseLanguage, {
            en: "The request body is invalid.",
            ja: "リクエストの形式が正しくありません。",
          }),
        },
        { status: 400 },
      )
    }

    const payload = parseContactPayload(body)
    if (!payload) {
      return NextResponse.json(
        {
          error: localized(responseLanguage, {
            en: "The request payload is invalid.",
            ja: "リクエスト内容が正しくありません。",
          }),
        },
        { status: 400 },
      )
    }
    responseLanguage = requestLanguage(req, payload.locale)

    const validationError = validateContactPayload(payload)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    if (payload.honeypot) {
      console.warn("[contact] Honeypot rejected a form submission")
      return NextResponse.json(
        {
          error: localized(responseLanguage, {
            en: "Form verification failed.",
            ja: "フォーム認証に失敗しました。",
          }),
          code: "honeypot_rejected",
        },
        { status: 400 },
      )
    }

    const headerSubmissionIdentity =
      req.headers.get("x-contact-submission-id")?.trim() ?? ""
    if (
      headerSubmissionIdentity &&
      headerSubmissionIdentity !== payload.idempotencyKey
    ) {
      return NextResponse.json(
        {
          error: localized(responseLanguage, {
            en: "Form verification identity does not match. Reload the page and try again.",
            ja: "フォーム認証情報が一致しません。ページを再読み込みしてお試しください。",
          }),
          code: "challenge_identity_mismatch",
        },
        { status: 400 },
      )
    }

    const challengeResult = verifyContactChallenge(payload.formChallenge, {
      clientIp: ip,
      submissionIdentity: payload.idempotencyKey,
    })
    if (!challengeResult.ok) {
      const status = challengeResult.reason === "not_configured" ? 503 : 400
      const error =
        challengeResult.reason === "too_fast"
          ? localized(responseLanguage, {
              en: "Please take a moment to complete the form before submitting.",
              ja: "内容をご確認のうえ、少し時間を置いてから送信してください。",
            })
          : challengeResult.reason === "not_configured"
            ? localized(responseLanguage, {
                en: "Form verification is temporarily unavailable.",
                ja: "フォーム認証を一時的に利用できません。",
              })
            : localized(responseLanguage, {
                en: "Form verification expired. Reload the page and try again.",
                ja: "フォーム認証の有効期限が切れました。ページを再読み込みしてお試しください。",
              })
      console.warn(
        `[contact] Form challenge rejected: ${challengeResult.reason}`,
      )
      return NextResponse.json(
        { error, code: `challenge_${challengeResult.reason}` },
        { status },
      )
    }

    const {
      name,
      company,
      email,
      phone,
      services,
      message,
      locale,
      turnstileToken,
      intent,
      companyCountry,
      idempotencyKey: clientIdempotencyKey,
    } = payload

    const captchaOk = await verifyTurnstile(turnstileToken)
    if (!captchaOk) {
      return NextResponse.json(
        {
          error: localized(responseLanguage, {
            en: "Bot verification failed. Reload the page and try again.",
            ja: "ボット検証に失敗しました。ページを再読み込みしてもう一度お試しください。",
          }),
        },
        { status: 403 },
      )
    }

    const reportLocale = normalizeReportLocale(locale, "jp")
    const variant = localeContentVariant(reportLocale)
    const localeCountry =
      (LOCALE_COUNTRY as Record<string, string>)[reportLocale] ?? "US"
    const targetCountry = normalizeCompanyCountry(companyCountry, localeCountry)
    const qualification = scoreContactQualification(payload)
    const idempotencyKey = contactIdempotencyKey({
      clientKey: clientIdempotencyKey,
      email,
      company,
      message,
    })
    const challengeHash = contactChallengeHash(challengeResult)
    const submittedAt = new Date().toISOString()
    const leadMeta = buildContactLeadMeta({
      payload,
      qualification,
      reportLocale,
      targetCountry,
      idempotencyKey,
      clientBinding: challengeResult.clientBinding,
      submittedAt,
    })
    const slackTextBase = buildContactSlackText({
      payload,
      reportLocale,
      qualification,
    })
    const notificationTitle = contactNotificationTitle(intent, qualification)
    const safeDisplayName = slackInline(company || name)

    const persistedLead = await persistContactLead({
      idempotencyKey,
      challengeHash,
      lead: {
        business_name: company || name,
        email,
        phone: phone || null,
        country: targetCountry,
        industry: services[0] || "問い合わせ",
        pipeline_stage: "new",
        region: leadRegionForLocale(reportLocale),
        meta: leadMeta,
      },
      notification: {
        title: notificationTitle,
        message: `${safeDisplayName} submitted ${intent === JAPAN_ENTRY_INTENT ? "a Japan Entry application" : "an inquiry"}.`,
        link: "https://twenty.paradigmjp.com",
        type:
          intent === JAPAN_ENTRY_INTENT
            ? "japan_entry_application"
            : "contact_inquiry",
        region: "global",
        priority: qualification.priority,
        slack_text: slackTextBase,
      },
    })

    let notificationStatus = persistedLead.notificationStatus
    if (persistedLead.notificationClaimed) {
      if (!persistedLead.notificationClaimToken) {
        throw new Error(
          "Atomic contact submission returned a claim without a token",
        )
      }
      const slackText = slackTextBase.replace("{{lead_id}}", persistedLead.id)
      const notifyResult = await notifyBothChannels(slackText, {
        title: notificationTitle,
        message: `${safeDisplayName} submitted ${intent === JAPAN_ENTRY_INTENT ? "a Japan Entry application" : "an inquiry"}. Lead ${persistedLead.id}.`,
        link: "https://twenty.paradigmjp.com",
        type:
          intent === JAPAN_ENTRY_INTENT
            ? "japan_entry_application"
            : "contact_inquiry",
        region: "global",
        priority: qualification.priority,
        leadId: persistedLead.id,
        idempotencyKey,
        existingQueueItemId: persistedLead.outboxId,
        clientMessageId: persistedLead.outboxId,
      })
      notificationStatus = notifyResult.ok ? "complete" : "degraded"
      try {
        await completeContactNotification({
          idempotencyKey,
          claimToken: persistedLead.notificationClaimToken,
          status: notificationStatus,
          slackError: notifyResult.slack.error,
        })
      } catch (error) {
        notificationStatus = "degraded"
        console.error(
          `[contact] Lead ${persistedLead.id} and DB outbox were saved, but Slack completion persistence failed:`,
          error,
        )
      }
    }

    if (persistedLead.created) {
      startContactEnrichment({
        leadId: persistedLead.id,
        email,
        company: company || null,
        message,
        services,
        reportLocale,
        targetCountry,
      })
    }

    return NextResponse.json({
      success: true,
      message:
        variant === "ja"
          ? "お問い合わせを受け付けました。1営業日以内にご連絡いたします。"
          : "Thank you. We'll reply within one business day.",
      deduplicated: !persistedLead.created,
      notificationStatus,
    })
  } catch (error) {
    if (error instanceof ContactChallengeReplayError) {
      return NextResponse.json(
        {
          error: localized(responseLanguage, {
            en: "This form verification has already been used. Reload the page and try again.",
            ja: "このフォーム認証は使用済みです。ページを再読み込みしてお試しください。",
          }),
          code: "challenge_replayed",
        },
        { status: 409 },
      )
    }
    await captureException(error, {
      source: "/api/contact",
      severity: "error",
    })
    return NextResponse.json(
      {
        error: localized(responseLanguage, {
          en: "Submission failed. Please try again in a moment.",
          ja: "送信に失敗しました。しばらく後にお試しください。",
        }),
      },
      { status: 500 },
    )
  }
}
