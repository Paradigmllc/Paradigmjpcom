"use client"

/**
 * CookieConsent — Aesop-style bottom-fixed editorial banner.
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
 * AE-PHP-4: privacy banner UX only — no analytics opt-in glue here.
 */

import { useEffect, useRef, useState } from "react"
import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"

type Decision = "accept" | "decline"
type Stored = { decision: Decision; decidedAt: string }

const STORAGE_KEY = "paradigm:cookie-consent"
const REASK_AFTER_DAYS = 365

function readStored(): Stored | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Stored
    if (parsed?.decision && parsed?.decidedAt) return parsed
    return null
  } catch (e) {
    console.warn("[CookieConsent] failed to read stored consent:", e)
    return null
  }
}

function isStillValid(stored: Stored): boolean {
  const decidedAt = new Date(stored.decidedAt).getTime()
  if (Number.isNaN(decidedAt)) return false
  const ageMs = Date.now() - decidedAt
  const maxAgeMs = REASK_AFTER_DAYS * 24 * 60 * 60 * 1000
  return ageMs < maxAgeMs
}

function writeDecision(decision: Decision) {
  if (typeof window === "undefined") return
  try {
    const payload: Stored = { decision, decidedAt: new Date().toISOString() }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    window.dispatchEvent(
      new CustomEvent("paradigm:consent-changed", { detail: payload })
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
    const stored = readStored()
    if (!stored || !isStillValid(stored)) {
      const timer = window.setTimeout(() => setVisible(true), 600)
      return () => window.clearTimeout(timer)
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

  const handle = (decision: Decision) => {
    writeDecision(decision)
    setVisible(false)
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-body"
      className="fixed inset-x-0 bottom-0 z-[95] border-t border-paradigm-line bg-paradigm-paper"
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-3 md:py-3.5 flex flex-col md:flex-row md:items-center gap-3 md:gap-8">
        <div className="flex-1 min-w-0">
          <p id="cookie-consent-title" className="sr-only">
            {t("srTitle")}
          </p>
          <p
            id="cookie-consent-body"
            className="text-[13px] md:text-[13.5px] leading-snug text-paradigm-ink-soft max-w-4xl"
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
            onClick={() => handle("decline")}
            className="inline-flex items-center justify-center px-4 md:px-5 py-2 text-[11px] tracking-[0.18em] uppercase border border-paradigm-line text-paradigm-ink-soft hover:border-paradigm-ink hover:text-paradigm-ink transition-colors"
          >
            {t("decline")}
          </button>
          <button
            type="button"
            onClick={() => handle("accept")}
            autoFocus
            className="inline-flex items-center justify-center px-4 md:px-5 py-2 text-[11px] tracking-[0.18em] uppercase bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent transition-colors"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  )
}
