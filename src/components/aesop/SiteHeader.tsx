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
import { useLocale, useTranslations } from "next-intl"
import Logo from "./Logo"
import ThemeToggle from "./ThemeToggle"
import MobileMenu from "./MobileMenu"
import LocaleSwitcher from "@/components/LocaleSwitcher"
import type { HeaderNav, NavLink } from "@/lib/navigation"

interface SiteHeaderProps {
  /** PayloadCMS Header global 由来のナビ。null のとき i18n message 既定ナビを使用 (非破壊)。 */
  nav?: HeaderNav | null
  /** 告知バー表示中はヘッダーを 36px (top-9) 下げて重なりを回避 */
  announcementActive?: boolean
}

export default function SiteHeader({ nav, announcementActive = false }: SiteHeaderProps = {}) {
  const t = useTranslations("nav")
  const tCta = useTranslations("cta")
  const locale = useLocale()
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

  // CMS nav があればそれを、無ければ従来の i18n 既定ナビを使う (非破壊フォールバック)
  const DEFAULT_NAV: NavLink[] = [
    { href: "/about", label: t("about") },
    { href: "/services", label: t("services") },
    { href: "/works", label: t("works") },
    { href: "/pricing", label: t("pricing") },
    { href: "/blog", label: t("blog") },
    { href: "/faq", label: t("faq") },
    { href: "/tools/japan-entry-score", label: t("japanEntryScore") },
  ]
  // International public routes sell the fixed Japan Entry package. The
  // Japanese route is the domestic/general site and keeps a normal contact CTA.
  const isJapanEntryConversionRoute = locale !== "ja"
  const JAPAN_ENTRY_NAV: NavLink[] = [
    { href: "/about", label: t("about") },
    { href: "/pricing", label: t("pricing") },
    { href: "/works", label: t("works") },
    { href: "/faq", label: t("faq") },
    { href: "/blog", label: t("blog") },
    { href: "/tools/japan-entry-score", label: t("japanEntryScore") },
  ]
  const NAV: NavLink[] = isJapanEntryConversionRoute
    ? JAPAN_ENTRY_NAV
    : nav?.items?.length
      ? nav.items
      : DEFAULT_NAV
  const ctaEnabled = isJapanEntryConversionRoute
    ? true
    : nav?.cta
      ? nav.cta.enabled
      : true
  const ctaLabel = isJapanEntryConversionRoute ? tCta("primary") : nav?.cta?.label || tCta("primary")
  const ctaHref = isJapanEntryConversionRoute
    ? "/contact?intent=japan-entry"
    : nav?.cta?.href || "/contact"
  const showLocale = nav ? nav.showLocaleSwitcher : true
  const showTheme = nav ? nav.showThemeToggle : true

  return (
    <header
      className={`fixed inset-x-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        announcementActive ? "top-9" : "top-0"
      } ${
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

        {/* Center: primary nav (desktop only). children があればホバードロップダウン。 */}
        <nav aria-label={t("primaryNav")} className="hidden md:flex items-center gap-7 lg:gap-9">
          {NAV.map((n) =>
            n.children?.length ? (
              <div key={n.href} className="relative group">
                <Link
                  href={n.href}
                  {...(n.openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="text-[12px] tracking-[0.16em] uppercase text-paradigm-ink-soft hover:text-paradigm-ink transition-colors whitespace-nowrap"
                >
                  {n.label}
                </Link>
                <div className="absolute left-0 top-full pt-3 hidden group-hover:block group-focus-within:block min-w-[180px]">
                  <ul className="bg-paradigm-paper border border-paradigm-line shadow-lg py-2">
                    {n.children.map((c) => (
                      <li key={c.href}>
                        <Link
                          href={c.href}
                          {...(c.openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          className="block px-4 py-2 text-[12px] tracking-[0.1em] text-paradigm-ink-soft hover:text-paradigm-ink hover:bg-paradigm-paper-deep transition-colors whitespace-nowrap"
                        >
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <Link
                key={n.href}
                href={n.href}
                {...(n.openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="text-[12px] tracking-[0.16em] uppercase text-paradigm-ink-soft hover:text-paradigm-ink transition-colors whitespace-nowrap"
              >
                {n.label}
              </Link>
            ),
          )}
        </nav>

        {/* Right: locale + theme + CTA */}
        <div className="flex items-center gap-2 md:gap-4 text-paradigm-ink-soft">
          {showLocale && <LocaleSwitcher />}
          {showTheme && <ThemeToggle />}
          {ctaEnabled && (
            <Link
              href={ctaHref}
              {...(isJapanEntryConversionRoute ? {
                "data-umami-event": "japan-entry-apply",
                "data-umami-event-source": "header",
              } : {})}
              className="hidden md:inline-flex text-[11px] tracking-[0.18em] uppercase border border-paradigm-ink px-5 py-2.5 text-paradigm-ink hover:bg-paradigm-ink hover:text-paradigm-paper transition-colors whitespace-nowrap"
            >
              {ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
