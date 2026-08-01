"use client"

/**
 * ThemeToggle — three-state cycle (system → light → dark → system).
 *
 * Pattern borrowed from Aesop / Le Labo (single icon button, current state
 * shown rather than next state). next-themes' `theme` value reflects the
 * user's intent ("system" | "light" | "dark"); `resolvedTheme` is the
 * actually-applied theme. We display intent so users see "where they are."
 *
 * Hydration: next-themes resolves theme client-side after mount. We render
 * the system icon during SSR to avoid mismatched markup, then swap on
 * mount. aria-label always announces the next state for cyclical toggles
 * (WCAG 2.2 AA pattern).
 *
 * AE-PHP-1: 78 lines. AE-PHP-4: this file's role is theme cycling UX only;
 * actual storage / SSR handling lives in next-themes.
 */

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

const NEXT_INTENT: Record<string, "light" | "dark" | "system"> = {
  system: "light",
  light: "dark",
  dark: "system",
}

function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </svg>
  )
}

function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
    </svg>
  )
}

function SystemIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const intent = (mounted ? theme : "system") as "system" | "light" | "dark"
  const next = NEXT_INTENT[intent] ?? "light"

  const icon =
    intent === "light" ? <SunIcon className="h-5 w-5" />
    : intent === "dark" ? <MoonIcon className="h-5 w-5" />
    : <SystemIcon className="h-5 w-5" />

  const label = `Theme: ${intent}. Press to switch to ${next}.`

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className="p-1.5 text-paradigm-ink-soft hover:text-paradigm-ink transition-colors"
    >
      {icon}
    </button>
  )
}
