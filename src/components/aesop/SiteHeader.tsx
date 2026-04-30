"use client"

/**
 * SiteHeader — Aesop-style minimal top navigation.
 *
 * Layout (desktop ≥ md):  Logo (left) — 6 nav links (center) — Locale + Theme + CTA (right)
 * Layout (mobile  < md):  Hamburger + Logo (left) — empty (center) — Locale + Theme (right)
 *
 * Behaviour:
 *   - Sticky `fixed top-0` with paper background that fades in on scroll
 *     (transparent at top, blurred paper after 12px scroll). The Aesop
 *     pattern uses NO box-shadow — only a hairline border-bottom for the
 *     scrolled state.
 *   - Hidden entirely on `/p/*` and `/report/*` proposal-viewer pages
 *     where the proposal renders its own chrome.
 *   - Nav labels and CTA come through next-intl (AE-PHP-2). No hardcoded
 *     UI strings in JSX.
 *
 * Why no SiteHeader→HeaderShell→HeaderClient triad like Sericia: paradigm
 * has no announcement-bar / region-banner above-fold and no
 * cart-drawer / search-modal client-only pieces, so a single client
 * component with a single layout div is sufficient. Splitting for the
 * sake of mirroring Sericia would create dead seams (AE-PHP-4).
 *
 * AE-PHP-1: 95 lines (under 200 / 500). AE-PHP-2: zero hardcoded strings.
 */

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import Logo from "./Logo"
import ThemeToggle from "./ThemeToggle"
import MobileMenu from "./MobileMenu"
import LocaleSwitcher from "@/components/LocaleSwitcher"

export default function SiteHeader() {
  const t = useTranslations("nav")
  const tCta = useTranslations("cta")
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Hide on proposal-viewer routes (they ship their own chrome)
  if (pathname.includes("/report/") || pathname.includes("/p/")) return null

  const NAV: { href: string; label: string }[] = [
    { href: "/about", label: t("about") },
    { href: "/services", label: t("services") },
    { href: "/works", label: t("works") },
    { href: "/pricing", label: t("pricing") },
    { href: "/blog", label: t("blog") },
    { href: "/faq", label: t("faq") },
  ]

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled
          ? "bg-paradigm-paper/85 backdrop-blur-md border-b border-paradigm-line"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-16 md:h-20 flex items-center justify-between gap-6">
        {/* Left: hamburger (mobile) + wordmark */}
        <div className="flex items-center gap-3 md:gap-0">
          <MobileMenu items={NAV} />
          <Logo />
        </div>

        {/* Center: primary nav (desktop only) */}
        <nav className="hidden md:flex items-center gap-7 lg:gap-9">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-[12px] tracking-[0.16em] uppercase text-paradigm-ink-soft hover:text-paradigm-ink transition-colors whitespace-nowrap"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Right: locale + theme + CTA */}
        <div className="flex items-center gap-2 md:gap-4 text-paradigm-ink-soft">
          <LocaleSwitcher />
          <ThemeToggle />
          <Link
            href="/contact"
            className="hidden md:inline-flex text-[11px] tracking-[0.18em] uppercase border border-paradigm-ink px-5 py-2.5 text-paradigm-ink hover:bg-paradigm-ink hover:text-paradigm-paper transition-colors whitespace-nowrap"
          >
            {tCta("primary")}
          </Link>
        </div>
      </div>
    </header>
  )
}
