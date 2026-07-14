"use client"

/**
 * Localized contact form with a qualification-first Japan Entry flow.
 * International routes use the Japan Entry application; the Japanese route
 * always remains domestic Web production contact, including legacy campaign
 * links that still carry `intent=japan-entry`.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import Script from "next/script"
import { useSearchParams } from "next/navigation"
import { Link } from "@/i18n/routing"
import { useLocale, useTranslations } from "next-intl"
import {
  ContactFormFields,
  EMPTY_CONTACT_FORM,
  type BudgetOption,
} from "./ContactFormFields"

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          "error-callback"?: () => void
          "expired-callback"?: () => void
          theme?: "light" | "dark" | "auto"
          size?: "normal" | "compact" | "invisible"
        },
      ) => string
      reset: (widgetId?: string) => void
    }
  }
}

function newSubmissionKey(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID()
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  )
}

export function isJapanEntryContact(
  locale: string,
  _intent?: string | null,
): boolean {
  return locale !== "ja"
}

export function shouldRotateSubmissionIdentity(status: number): boolean {
  return [400, 401, 403, 409, 422].includes(status)
}

async function requestFormChallenge(
  submissionIdentity: string,
  locale: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch("/api/contact", {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Contact-Submission-Id": submissionIdentity,
      "X-Contact-Locale": locale,
    },
    cache: "no-store",
    signal,
  })
  const data: unknown = await response.json()
  const challenge =
    typeof data === "object" &&
    data !== null &&
    "challenge" in data &&
    typeof data.challenge === "string"
      ? data.challenge
      : ""
  if (!response.ok || !challenge) {
    throw new Error(`Form challenge request failed with HTTP ${response.status}`)
  }
  return challenge
}

export function ContactForm() {
  const t = useTranslations("contactForm")
  const locale = useLocale()
  const searchParams = useSearchParams()
  const isJapanEntry = isJapanEntryContact(locale, searchParams.get("intent"))
  const servicesList = t.raw("servicesList") as string[]
  const budgetOptions = t.raw("budgetOptions") as BudgetOption[]
  const challengeLoadError =
    locale === "en"
      ? "Form verification could not be loaded. Reload the page and try again."
      : t("errorNetwork")

  const [form, setForm] = useState(() => ({
    ...EMPTY_CONTACT_FORM,
    company: (searchParams.get("company") ?? "").trim().slice(0, 200),
  }))
  const [services, setServices] = useState<string[]>([])
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")
  const [msg, setMsg] = useState("")
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileScriptReady, setTurnstileScriptReady] = useState(false)
  const [formChallenge, setFormChallenge] = useState("")
  const [honeypot, setHoneypot] = useState("")
  const turnstileRef = useRef<HTMLDivElement>(null)
  const turnstileWidgetIdRef = useRef<string | null>(null)
  const idempotencyKeyRef = useRef<string | null>(null)

  const refreshVerification = useCallback(
    async (options?: {
      rotateSubmissionIdentity?: boolean
      resetWidget?: boolean
      signal?: AbortSignal
    }) => {
      setFormChallenge("")
      setTurnstileToken(null)
      if (options?.resetWidget && window.turnstile) {
        window.turnstile.reset(turnstileWidgetIdRef.current ?? undefined)
      }
      if (options?.rotateSubmissionIdentity || !idempotencyKeyRef.current) {
        idempotencyKeyRef.current = newSubmissionKey()
      }
      const submissionIdentity = idempotencyKeyRef.current
      if (!submissionIdentity) {
        throw new Error("Unable to create a form submission identity")
      }
      const challenge = await requestFormChallenge(
        submissionIdentity,
        locale,
        options?.signal,
      )
      setFormChallenge(challenge)
    },
    [locale],
  )

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    void (async () => {
      try {
        await refreshVerification({ signal: controller.signal })
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        console.error("[ContactForm] form challenge loading failed:", error)
        if (active) {
          setStatus("error")
          setMsg(challengeLoadError)
        }
      }
    })()
    return () => {
      active = false
      controller.abort()
    }
  }, [challengeLoadError, refreshVerification])

  useEffect(() => {
    if (
      !TURNSTILE_SITE_KEY ||
      !turnstileScriptReady ||
      !window.turnstile ||
      !turnstileRef.current ||
      turnstileWidgetIdRef.current
    ) {
      return
    }
    try {
      const turnstile = window.turnstile
      turnstileWidgetIdRef.current = turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => {
          setTurnstileToken(token)
          setStatus((current) => (current === "error" ? "idle" : current))
          setMsg("")
        },
        "expired-callback": () => {
          console.warn("[ContactForm] Turnstile token expired")
          setTurnstileToken(null)
          setStatus("error")
          setMsg(challengeLoadError)
          window.turnstile?.reset(turnstileWidgetIdRef.current ?? undefined)
        },
        "error-callback": () => {
          console.error("[ContactForm] Turnstile verification failed to render")
          setTurnstileToken(null)
          setStatus("error")
          setMsg(challengeLoadError)
        },
        theme: "light",
        size: "normal",
      })
    } catch (error) {
      console.error("[ContactForm] Turnstile widget rendering failed:", error)
      window.queueMicrotask(() => {
        setTurnstileToken(null)
        setStatus("error")
        setMsg(challengeLoadError)
      })
    }
  }, [challengeLoadError, turnstileScriptReady])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus("loading")
    try {
      if (!idempotencyKeyRef.current)
        idempotencyKeyRef.current = newSubmissionKey()

      const referrer = document.referrer
      const referrerParams =
        referrer && URL.canParse(referrer)
          ? new URL(referrer).searchParams
          : new URLSearchParams()
      const navigationEntry = performance.getEntriesByType("navigation")[0]
      const landingPage =
        navigationEntry?.name && URL.canParse(navigationEntry.name)
          ? navigationEntry.name
          : window.location.href
      const landingParams = new URL(landingPage).searchParams
      const attributionValue = (key: string) =>
        searchParams.get(key) ??
        landingParams.get(key) ??
        referrerParams.get(key) ??
        ""
      const ctaSource =
        attributionValue("cta_source") ||
        attributionValue("cta") ||
        attributionValue("source") ||
        (isJapanEntry ? "japan-entry-application" : "contact-form")

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
          "X-Contact-Submission-Id": idempotencyKeyRef.current,
          "X-Contact-Locale": locale,
        },
        body: JSON.stringify({
          ...form,
          intent: isJapanEntry ? "japan-entry" : "general",
          services: isJapanEntry ? ["Japan Entry Package"] : services,
          locale,
          turnstileToken,
          idempotencyKey: idempotencyKeyRef.current,
          utmSource: attributionValue("utm_source"),
          utmMedium: attributionValue("utm_medium"),
          utmCampaign: attributionValue("utm_campaign"),
          utmTerm: attributionValue("utm_term"),
          utmContent: attributionValue("utm_content"),
          referrer,
          landingPage,
          ctaSource,
          formChallenge,
          honeypot,
        }),
      })
      const data: unknown = await response.json()
      const result =
        typeof data === "object" && data !== null
          ? (data as { success?: boolean; message?: string; error?: string })
          : {}
      if (response.ok && result.success === true) {
        setStatus("success")
        setMsg(result.message || t("successDefault"))
        setForm({ ...EMPTY_CONTACT_FORM })
        setServices([])
      } else {
        setStatus("error")
        setMsg(result.error || t("errorDefault"))
        try {
          await refreshVerification({
            rotateSubmissionIdentity: shouldRotateSubmissionIdentity(
              response.status,
            ),
            resetWidget: true,
          })
        } catch (error) {
          console.error(
            "[ContactForm] form verification refresh failed:",
            error,
          )
          setMsg(challengeLoadError)
        }
      }
    } catch (error) {
      console.error("[ContactForm] form submission failed:", error)
      setStatus("error")
      setMsg(t("errorNetwork"))
      try {
        // Preserve the same identity after an ambiguous network/5xx failure so
        // a server-side success can be recovered through the idempotent RPC.
        await refreshVerification({ resetWidget: true })
      } catch (refreshError) {
        console.error(
          "[ContactForm] form verification recovery failed:",
          refreshError,
        )
        setMsg(challengeLoadError)
      }
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-12 paradigm-glass rounded-2xl p-8 paradigm-glow-md">
        <div className="font-display text-[40px] text-paradigm-accent mb-4">
          ✓
        </div>
        <h3 className="font-display text-[22px] md:text-[26px] leading-[1.2] text-paradigm-ink mb-3 tracking-[-0.015em]">
          {t("success")}
        </h3>
        <p className="text-[14px] text-paradigm-ink-soft leading-[1.7]">
          {msg}
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-7"
      aria-busy={status === "loading"}
    >
      <div
        className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label htmlFor="companyFax">Company fax</label>
        <input
          id="companyFax"
          name="companyFax"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>
      <ContactFormFields
        isJapanEntry={isJapanEntry}
        form={form}
        setForm={setForm}
        services={services}
        setServices={setServices}
        servicesList={servicesList}
        budgetOptions={budgetOptions}
        t={t}
      />

      {TURNSTILE_SITE_KEY && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
            async
            defer
            onReady={() => setTurnstileScriptReady(true)}
            onError={(error) => {
              console.error("[ContactForm] Turnstile script loading failed:", error)
              setTurnstileScriptReady(false)
              setTurnstileToken(null)
              setStatus("error")
              setMsg(challengeLoadError)
            }}
          />
          <div
            ref={turnstileRef}
            className="flex justify-center"
            aria-label="CAPTCHA"
          />
        </>
      )}

      {status === "error" && (
        <div
          className="paradigm-glass rounded-xl p-4 border border-pink-500/40 paradigm-glow-sm"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-[13px] text-pink-500">{msg}</p>
        </div>
      )}

      <button
        type="submit"
        {...(isJapanEntry
          ? {
              "data-umami-event": "japan-entry-apply-submit",
              "data-umami-event-source": "contact-form",
            }
          : {})}
        disabled={
          status === "loading" ||
          !formChallenge ||
          (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)
        }
        className="group relative w-full inline-flex items-center justify-center gap-2 bg-paradigm-ink text-paradigm-paper py-3.5 rounded-xl text-[12px] tracking-[0.14em] uppercase font-semibold paradigm-glow-md hover:paradigm-glow-lg disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden transition-all"
      >
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-pink-300/0 via-paradigm-glow/40 to-paradigm-tech/0 bg-[length:200%_100%] animate-[gradientShift_2.5s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <span className="relative z-10">
          {status === "loading"
            ? t("submitting")
            : isJapanEntry
              ? "Submit Japan Entry Application"
              : t("submit")}
        </span>
      </button>

      <p className="text-[11px] text-paradigm-ink-mute text-center leading-[1.6]">
        {t("privacy")}
        <Link
          href="/privacy"
          className="underline hover:text-paradigm-accent ml-1"
        >
          {t("privacyLink")}
        </Link>
        {t("privacySuffix")}
      </p>
    </form>
  )
}
