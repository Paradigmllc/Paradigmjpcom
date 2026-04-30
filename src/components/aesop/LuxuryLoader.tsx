"use client"

/**
 * LuxuryLoader — first-paint corner spinner.
 *
 * Pattern from Aesop / Le Labo: a single rotating arc, no full-screen
 * overlay, no backdrop blur. The page underneath stays visible so the
 * loader never feels like an interstitial. Two-stage dismiss (fade at
 * 600ms, unmount at 800ms) so the page "settles in" rather than the
 * spinner snapping out.
 *
 * Auto-dismisses after 800ms. Subsequent hydrations don't re-show it
 * (mount-once via useState). Respects `prefers-reduced-motion` by
 * unmounting immediately without spinning.
 *
 * Stroke uses `rgb(var(--paradigm-ink))` directly so the arc adapts to
 * dark mode without theme-conditional logic. Track uses opacity so it
 * lifts off both paper backgrounds.
 *
 * AE-PHP-1: 95 lines (under 200 / 500). AE-PHP-4: pure UI primitive.
 */

import { useEffect, useState } from "react"

export default function LuxuryLoader() {
  const [gone, setGone] = useState(false)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    if (reduced) {
      setGone(true)
      return
    }

    const fadeTimer = window.setTimeout(() => setFading(true), 600)
    const unmountTimer = window.setTimeout(() => setGone(true), 800)
    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(unmountTimer)
    }
  }, [])

  if (gone) return null

  return (
    <div
      aria-hidden
      role="presentation"
      className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
      style={{
        opacity: fading ? 0 : 1,
        transform: fading ? "scale(0.85)" : "scale(1)",
        transition:
          "opacity 220ms cubic-bezier(0.65, 0, 0.35, 1), transform 220ms cubic-bezier(0.65, 0, 0.35, 1)",
      }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 22 22"
        fill="none"
        className="paradigm-kuru md:w-10 md:h-10"
        aria-hidden
      >
        <circle
          cx="11"
          cy="11"
          r="9"
          stroke="rgb(var(--paradigm-ink) / 0.1)"
          strokeWidth="2"
          fill="none"
        />
        <circle
          cx="11"
          cy="11"
          r="9"
          stroke="rgb(var(--paradigm-ink))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="51 56.55"
          fill="none"
          transform="rotate(-90 11 11)"
        />
      </svg>
      <style jsx>{`
        @keyframes paradigm-kuru-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .paradigm-kuru {
          animation: paradigm-kuru-spin 900ms cubic-bezier(0.65, 0, 0.35, 1) infinite;
          transform-origin: center;
        }
        @media (prefers-reduced-motion: reduce) {
          .paradigm-kuru { animation: none; }
        }
      `}</style>
    </div>
  )
}
