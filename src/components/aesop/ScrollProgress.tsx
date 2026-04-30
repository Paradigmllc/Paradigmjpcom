"use client"

/**
 * ScrollProgress — thin reading-position bar at the top of the viewport.
 *
 * Width = (scrollTop / scrollableHeight) * 100. Uses requestAnimationFrame
 * to throttle updates so it doesn't hot-loop on every scroll pixel. The
 * bar hides on pages that fit in one viewport (docHeight ≤ 4 px) — a 100%
 * bar at the top of a short page is meaningless visual noise.
 *
 * Color uses `paradigm-accent` (refined indigo) instead of the high-contrast
 * crimson Sericia uses, because paradigm's brand is "calm tech" rather than
 * "warm/hot retail" — accent gives presence without urgency.
 *
 * AE-PHP-1: 64 lines. AE-PHP-4: pure UI primitive — no business logic.
 */

import { useEffect, useState } from "react"

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0)
  const [hasScroll, setHasScroll] = useState(false)

  useEffect(() => {
    let rafId: number | null = null

    const compute = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 4) {
        setHasScroll(false)
        setProgress(0)
        return
      }
      setHasScroll(true)
      setProgress(Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)))
    }

    const onScroll = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(() => {
        rafId = null
        compute()
      })
    }

    compute()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div
      aria-hidden
      className="fixed left-0 right-0 top-0 z-[99] pointer-events-none"
      style={{ height: 2 }}
    >
      <div
        className="h-full bg-paradigm-accent origin-left"
        style={{
          width: `${progress}%`,
          opacity: hasScroll && progress > 0.5 ? 1 : 0,
          transition: "width 80ms linear, opacity 200ms ease",
        }}
      />
    </div>
  )
}
