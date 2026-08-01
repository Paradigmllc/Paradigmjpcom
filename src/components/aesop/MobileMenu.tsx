"use client"

/**
 * MobileMenu — left-side drawer for primary nav on small screens.
 *
 * **Bug fix (P18-D-10)**: drawer panel rendered via React Portal to
 * document.body to escape containing-block traps. Previously the panel
 * was a child of SiteHeader (which has `backdrop-blur-md` when scrolled);
 * `backdrop-filter` creates a CSS containing block, which makes the
 * drawer's `fixed top-0 bottom-0` positioning relative to the **header's
 * bounding box** (only 16-20px tall) instead of the viewport. The drawer
 * appeared squished into the header strip on scroll. createPortal
 * teleports the drawer to document.body so it's relative to the viewport.
 *
 * Why custom (no vaul): paradigm has framer-motion already and no other
 * drawer use case, so a portal + AnimatePresence is leaner than a 40 KB
 * dependency.
 *
 * Body scroll-lock on open: prevents background scroll bleed-through on
 * iOS Safari. Restore previous overflow value rather than blanking it.
 *
 * AE-PHP-1: 145 lines. AE-PHP-4: drawer UX only — no business logic.
 * AE-PHP-2: all visible strings via useTranslations.
 */

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { createPortal } from "react-dom"
import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"

export type MobileNavItem = { href: string; label: string; openInNewTab?: boolean }

export default function MobileMenu({ items }: { items: MobileNavItem[] }) {
  const t = useTranslations("nav")
  const tCta = useTranslations("cta")
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()
  const ctaHref = pathname === "/en" || pathname.startsWith("/en/")
    ? "/contact?intent=japan-entry"
    : "/contact"
  const isJapanEntryCta = ctaHref.includes("intent=japan-entry")

  // Portal target only resolves client-side; server-render returns hamburger only
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
      if (event.key !== "Tab") return
      const panel = document.getElementById("mobile-navigation-dialog")
      const focusable = panel
        ? Array.from(panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"))
        : []
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    const focusFrame = window.requestAnimationFrame(() => closeRef.current?.focus())
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener("keydown", handleKeyDown)
      trigger?.focus()
    }
  }, [open])

  const drawer =
    open && mounted
      ? createPortal(
          <AnimatePresence>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[9990] bg-paradigm-ink/40 backdrop-blur-[3px] md:hidden"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.aside
              id="mobile-navigation-dialog"
              key="panel"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-0 top-0 bottom-0 z-[9991] flex flex-col bg-paradigm-paper border-r border-paradigm-line w-[85vw] max-w-[420px] md:hidden paradigm-glow-xl"
              aria-label={t("primaryNav")}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-menu-title"
            >
              {/* Vivid mesh accent on header strip */}
              <div className="relative flex items-center justify-between px-6 py-5 border-b border-paradigm-line overflow-hidden">
                <div className="paradigm-mesh opacity-40" />
                <p id="mobile-menu-title" className="relative paradigm-eyebrow text-paradigm-accent">{t("menu")}</p>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("closeMenu")}
                  className="relative p-1.5 -mr-1.5 text-paradigm-ink-soft hover:text-paradigm-ink transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                    <line x1="3" y1="3" x2="15" y2="15" />
                    <line x1="15" y1="3" x2="3" y2="15" />
                  </svg>
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-6 py-2">
                <ul className="divide-y divide-paradigm-line/70">
                  {items.map((item, idx) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        {...(item.openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        onClick={() => setOpen(false)}
                        className="group flex items-center justify-between py-5 text-[22px] leading-tight font-light text-paradigm-ink hover:text-paradigm-accent transition-colors"
                      >
                        <span className="flex items-baseline gap-3">
                          <span className="paradigm-eyebrow text-paradigm-ink-mute text-[10px] w-7 group-hover:text-paradigm-accent transition-colors">
                            0{idx + 1}
                          </span>
                          {item.label}
                        </span>
                        <span aria-hidden className="text-paradigm-ink-mute group-hover:text-paradigm-accent group-hover:translate-x-1 transition-all">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="border-t border-paradigm-line px-6 py-5 space-y-3">
                <Link
                  href={ctaHref}
                  {...(isJapanEntryCta ? {
                    "data-umami-event": "japan-entry-apply",
                    "data-umami-event-source": "mobile-menu",
                  } : {})}
                  onClick={() => setOpen(false)}
                  className="group relative block w-full text-center text-[12px] tracking-[0.18em] uppercase font-semibold bg-paradigm-ink text-paradigm-paper py-3.5 rounded-xl paradigm-glow-md overflow-hidden hover:paradigm-glow-lg transition-all"
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-r from-fuchsia-300/0 via-paradigm-glow/40 to-paradigm-tech/0 bg-[length:200%_100%] animate-[gradientShift_2.5s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  <span className="relative z-10">{tCta("primary")}</span>
                </Link>
              </div>
            </motion.aside>
          </AnimatePresence>,
          document.body,
        )
      : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("openMenu")}
        aria-expanded={open}
        aria-controls="mobile-navigation-dialog"
        onClick={() => setOpen(true)}
        className="md:hidden p-1.5 text-paradigm-ink-soft hover:text-paradigm-ink transition-colors"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
          <line x1="3" y1="6" x2="19" y2="6" />
          <line x1="3" y1="11" x2="19" y2="11" />
          <line x1="3" y1="16" x2="19" y2="16" />
        </svg>
      </button>
      {drawer}
    </>
  )
}
