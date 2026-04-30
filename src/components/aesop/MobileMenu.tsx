"use client"

/**
 * MobileMenu — left-side drawer for primary nav on small screens.
 *
 * Why custom (no vaul): Sericia ships vaul for cart drawer + this. paradigm
 * has framer-motion already and no other drawer use case, so a 30-line
 * AnimatePresence panel is leaner than adding a 40 KB dependency.
 *
 * Pattern: hamburger button visible only on `md:hidden`, sits LEFT of the
 * Logo. Drawer slides in from the left at 85vw, paper background, large
 * low-weight type with hairline dividers between items (Aesop pattern).
 *
 * Body scroll-lock on open: prevents background scroll bleed-through on
 * iOS Safari. We restore the previous overflow value rather than blanking
 * it because some pages (e.g. /admin) intentionally set overflow:hidden.
 *
 * AE-PHP-1: 110 lines. AE-PHP-4: drawer UX only — no business logic.
 * AE-PHP-2: all visible strings come through useTranslations.
 */

import { useEffect, useState } from "react"
import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"

export type MobileNavItem = { href: string; label: string }

export default function MobileMenu({ items }: { items: MobileNavItem[] }) {
  const t = useTranslations("nav")
  const tCta = useTranslations("cta")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-label={t("openMenu")}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="md:hidden p-1.5 text-paradigm-ink-soft hover:text-paradigm-ink transition-colors"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" aria-hidden>
          <line x1="3" y1="6" x2="19" y2="6" />
          <line x1="3" y1="11" x2="19" y2="11" />
          <line x1="3" y1="16" x2="19" y2="16" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[90] bg-paradigm-ink/30 backdrop-blur-[2px] md:hidden"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.aside
              key="panel"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-0 top-0 bottom-0 z-[100] flex flex-col bg-paradigm-paper border-r border-paradigm-line w-[85vw] max-w-[420px] md:hidden"
              aria-label={t("primaryNav")}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-paradigm-line">
                <p className="paradigm-eyebrow">{t("menu")}</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("closeMenu")}
                  className="p-1.5 -mr-1.5 text-paradigm-ink-soft hover:text-paradigm-ink transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
                    <line x1="3" y1="3" x2="15" y2="15" />
                    <line x1="15" y1="3" x2="3" y2="15" />
                  </svg>
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-6 py-4">
                <ul className="divide-y divide-paradigm-line">
                  {items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="block py-5 text-[24px] leading-tight font-light text-paradigm-ink hover:text-paradigm-accent transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="border-t border-paradigm-line px-6 py-5">
                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center text-[12px] tracking-[0.18em] uppercase border border-paradigm-ink py-3.5 text-paradigm-ink hover:bg-paradigm-ink hover:text-paradigm-paper transition-colors"
                >
                  {tCta("primary")}
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
