"use client"

/**
 * CookieConsent — compact bottom-fixed consent notice.
 *
 * Brand grammar (matches paradigm-Aesop direction exactly):
 *   - Paper background + ink type (no dark modal intrusion)
 *   - Hairline border, no drop shadow, no rounded corners
 *   - Editorial copy in brand voice — passes through next-intl
 *   - Two primary actions: Accept / Decline (primary on Accept)
 *   - "privacy policy" link to /privacy (no in-banner modal)
 *
 * Storage:
 *   localStorage["paradigm:cookie-consent"] = JSON.stringify({
 *     decision: "accept" | "decline", decidedAt: ISO-8601
 *   })
 * Re-prompt cadence: 365 days (GDPR / ePrivacy alignment).
 *
 * Side-effect: publishes the banner's live height as `--cookie-consent-h`
 * on :root so bottom-fixed siblings (DifyChatbot) can lift cleanly above
 * it without hard-coded margins. ResizeObserver tracks responsive
 * rewraps; resets to 0px on dismount.
 *
 * AE-PHP-1: 165 lines. AE-PHP-2: every visible string via t().
 * ConsentAwareTracking listens for the emitted event and loads optional tags
 * only after an explicit acceptance.
 */

import { useEffect, useRef, useState } from "react"
import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import {
  CONSENT_CHANGED_EVENT,
  CONSENT_SETTINGS_EVENT,
  CONSENT_STORAGE_KEY,
  isConsentStillValid,
  readStoredConsent,
  type ConsentDecision,
  type StoredConsent,
} from "@/lib/cookie-consent"

function writeDecision(decision: ConsentDecision) {
  if (typeof window === "undefined") return
  try {
    const payload: StoredConsent = { decision, decidedAt: new Date().toISOString() }
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload))
    window.dispatchEvent(
      new CustomEvent(CONSENT_CHANGED_EVENT, { detail: payload })
    )
  } catch (e) {
    console.error("[CookieConsent] failed to persist decision:", e)
  }
}

export default function CookieConsent() {
  const t = useTranslations("cookieConsent")
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = readStoredConsent()
    const openSettings = () => setVisible(true)
    let timer: number | undefined
    if (!stored || !isConsentStillValid(stored)) {
      timer = window.setTimeout(() => setVisible(true), 600)
    }
    window.addEventListener(CONSENT_SETTINGS_EVENT, openSettings)
    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
      window.removeEventListener(CONSENT_SETTINGS_EVENT, openSettings)
    }
  }, [])

  useEffect(() => {
    if (!visible) {
      document.documentElement.style.setProperty("--cookie-consent-h", "0px")
      return
    }
    const node = ref.current
    if (!node) return
    const apply = () => {
      const h = node.offsetHeight
      document.documentElement.style.setProperty("--cookie-consent-h", `${h}px`)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(node)
    return () => {
      ro.disconnect()
      document.documentElement.style.setProperty("--cookie-consent-h", "0px")
    }
  }, [visible])

  if (!visible) return null

  const handle = (decision: ConsentDecision) => {
    const previous = readStoredConsent()
    writeDecision(decision)
    setVisible(false)
    if (previous?.decision === "accept" && decision === "decline") {
      window.location.reload()
    }
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-body"
      className="fixed inset-x-3 bottom-3 z-[95] rounded-lg border border-paradigm-line bg-white shadow-lg shadow-zinc-200/70 md:left-auto md:right-6 md:bottom-4 md:max-w-xl"
    >
      <div className="flex flex-col gap-2 px-3 py-2.5 md:flex-row md:items-center md:gap-4 md:px-4 md:py-3">
        <div className="flex-1 min-w-0">
          <p id="cookie-consent-title" className="sr-only">
            {t("srTitle")}
          </p>
          <p
            id="cookie-consent-body"
            className="text-[11px] leading-snug text-paradigm-ink-soft md:text-[12px] md:leading-relaxed"
          >
            {t("bodyBeforeLink")}{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-4 decoration-paradigm-line hover:decoration-paradigm-ink hover:text-paradigm-ink transition-colors"
            >
              {t("privacyLink")}
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-row gap-2 md:gap-3 shrink-0">
          <button
            type="button"
            aria-label={t("decline")}
            onClick={() => handle("decline")}
            className="inline-flex h-8 items-center justify-center rounded-md border border-paradigm-line px-3 text-[11px] font-semibold text-paradigm-ink-soft transition-colors hover:border-paradigm-ink hover:text-paradigm-ink md:h-9"
          >
            {t("decline")}
          </button>
          <button
            type="button"
            aria-label={t("accept")}
            onClick={() => handle("accept")}
            className="inline-flex h-8 items-center justify-center rounded-md bg-paradigm-ink px-3 text-[11px] font-semibold text-paradigm-paper transition-colors hover:bg-paradigm-accent md:h-9"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  )
}
