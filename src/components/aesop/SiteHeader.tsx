"use client"

/**
 * SiteHeader — Aesop-style minimal top navigation.
 *
 * The public information architecture is intentionally asymmetric:
 * - Japanese: Video as a Service first, with Web and AI as supporting services.
 * - English/international: Japan Market Partner and Video as a Service.
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
  /** PayloadCMS Header global 由来のナビ。国内サイトでは services 以外を継承する。 */
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

  if (pathname.includes("/report/") || pathname.includes("/p/")) return null

  const isInternational = locale !== "ja"
  const serviceNav: NavLink = {
    href: "/services",
    label: t("services"),
    children: isInternational
      ? [
          { href: "/japan-market-partner", label: "Japan Market Partner" },
          { href: "/video-as-a-service", label: "Video as a Service" },
        ]
      : [
          { href: "/video-as-a-service", label: "Video as a Service" },
          { href: "/services/web", label: "Web制作" },
          { href: "/services/ai", label: "AI制作・導入支援" },
        ],
  }

  const defaultJapaneseNav: NavLink[] = [
    serviceNav,
    { href: "/works", label: t("works") },
    { href: "/pricing", label: t("pricing") },
    { href: "/about", label: t("about") },
    { href: "/blog", label: t("blog") },
    { href: "/faq", label: t("faq") },
  ]

  const cmsJapaneseNav = nav?.items?.length
    ? [serviceNav, ...nav.items.filter((item) => item.href !== "/services")]
    : defaultJapaneseNav

  const internationalNav: NavLink[] = [
    serviceNav,
    { href: "/package", label: t("package") },
    { href: "/works", label: t("works") },
    { href: "/about", label: t("about") },
    { href: "/faq", label: t("faq") },
    { href: "/blog", label: t("blog") },
    { href: "/tools/japan-entry-score", label: t("japanEntryScore") },
  ]

  const NAV = isInternational ? internationalNav : cmsJapaneseNav
  const ctaEnabled = isInternational
    ? true
    : nav?.cta
      ? nav.cta.enabled
      : true
  const ctaLabel = isInternational ? t("contact") : nav?.cta?.label || tCta("primary")
  const ctaHref = isInternational ? "/contact" : nav?.cta?.href || "/contact"
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
        <div className="flex items-center gap-3 md:gap-0">
          <MobileMenu items={NAV} />
          <Logo />
        </div>

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
                <div className="absolute left-0 top-full pt-3 hidden group-hover:block group-focus-within:block min-w-[220px]">
                  <ul className="bg-paradigm-paper border border-paradigm-line shadow-lg py-2">
                    {n.children.map((c) => (
                      <li key={c.href}>
                        <Link
                          href={c.href}
                          {...(c.openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          className="block px-4 py-2 text-[12px] tracking-[0.08em] text-paradigm-ink-soft hover:text-paradigm-ink hover:bg-paradigm-paper-deep transition-colors whitespace-nowrap"
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

        <div className="flex items-center gap-2 md:gap-4 text-paradigm-ink-soft">
          {showLocale && <LocaleSwitcher />}
          {showTheme && <ThemeToggle />}
          {ctaEnabled && (
            <Link
              href={ctaHref}
              {...(isInternational ? {
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
