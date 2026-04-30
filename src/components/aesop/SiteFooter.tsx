"use client"

/**
 * SiteFooter — four-band Aesop-tier footer.
 *
 *   Band 1 — Editorial heading + studio body
 *   Band 2 — Three-column link grid (Services / Company / Contact)
 *   Band 3 — Studio location + social row
 *   Band 4 — Legal micro-row (copyright + locale label)
 *
 * Why simpler than Sericia: paradigm has no email-list yet (Sericia's
 * Band 1 carries a subscribe form), no CMS-controlled footerCopy, and no
 * shipping/tokushoho legal columns specific to D2C. A 4-link Services
 * column + 4-link Company column + contact row covers the IA cleanly.
 *
 * All visible strings resolve through `useTranslations("footer")` and
 * `useTranslations("nav")` (AE-PHP-2). Locale label uses next-intl
 * `useLocale` against the `locale.name` key in messages/{locale}.json.
 *
 * AE-PHP-1: 165 lines (under 200 / 500). AE-PHP-2: zero hardcoded strings.
 */

import { Link } from "@/i18n/routing"
import { useLocale, useTranslations } from "next-intl"

const SERVICE_LINKS = [
  { href: "/services/web", labelKey: "web" },
  { href: "/services/meo", labelKey: "meo" },
  { href: "/services/seo", labelKey: "seo" },
  { href: "/services/ai", labelKey: "ai" },
] as const

export default function SiteFooter() {
  const t = useTranslations("footer")
  const tNav = useTranslations("nav")
  const tLocale = useTranslations("locale")
  const locale = useLocale()

  return (
    <footer className="bg-paradigm-paper-deep text-paradigm-ink mt-32">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12">
        {/* Band 1 — Editorial */}
        <section className="py-20 md:py-28 border-b border-paradigm-line">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-7">
              <p className="paradigm-eyebrow mb-6">{t("company")}</p>
              <h2 className="font-display text-[28px] md:text-[40px] leading-[1.18] font-normal tracking-tight max-w-[560px] text-paradigm-ink">
                {t("companyTagline")}
              </h2>
            </div>
            <div className="lg:col-span-5 flex flex-col gap-6">
              <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85] max-w-md">
                {t("companyTagline")}
              </p>
              <Link
                href="/contact"
                className="self-start text-[11px] tracking-[0.18em] uppercase border border-paradigm-ink px-6 py-3 text-paradigm-ink hover:bg-paradigm-ink hover:text-paradigm-paper transition-colors"
              >
                {tNav("contact")}
              </Link>
            </div>
          </div>
        </section>

        {/* Band 2 — Link columns */}
        <section className="py-16 md:py-20 border-b border-paradigm-line">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-10 md:gap-12">
            <div>
              <p className="paradigm-eyebrow mb-5">{t("servicesHeading")}</p>
              <ul className="space-y-3 text-[14px] text-paradigm-ink-soft">
                {SERVICE_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="hover:text-paradigm-ink transition-colors"
                    >
                      {t(`services.${l.labelKey}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="paradigm-eyebrow mb-5">{t("companyHeading")}</p>
              <ul className="space-y-3 text-[14px] text-paradigm-ink-soft">
                <li>
                  <Link href="/about" className="hover:text-paradigm-ink transition-colors">
                    {tNav("about")}
                  </Link>
                </li>
                <li>
                  <Link href="/works" className="hover:text-paradigm-ink transition-colors">
                    {tNav("works")}
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-paradigm-ink transition-colors">
                    {tNav("pricing")}
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-paradigm-ink transition-colors">
                    {tNav("faq")}
                  </Link>
                </li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="paradigm-eyebrow mb-5">{t("contactHeading")}</p>
              <ul className="space-y-3 text-[14px] text-paradigm-ink-soft">
                <li>
                  <Link href="/contact" className="hover:text-paradigm-ink transition-colors">
                    {tNav("contact")}
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-paradigm-ink transition-colors">
                    {tNav("blog")}
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/Paradigmllc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-paradigm-ink transition-colors"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Band 3 — Studio + social */}
        <section className="py-12 border-b border-paradigm-line">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <p className="text-[13px] text-paradigm-ink-soft leading-[1.8] max-w-xl">
              {t("studioLocation")}
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/Paradigmllc"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("socialGithub")}
                className="inline-flex h-10 w-10 items-center justify-center border border-paradigm-line hover:border-paradigm-ink hover:bg-paradigm-ink hover:text-paradigm-paper transition-colors text-paradigm-ink-soft"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <path d="M12 .3a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.6-4.04-1.6-.55-1.39-1.34-1.76-1.34-1.76-1.1-.75.08-.74.08-.74 1.21.09 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .3z" />
                </svg>
              </a>
              <a
                href="mailto:contact@paradigmjp.com"
                aria-label={t("socialEmail")}
                className="inline-flex h-10 w-10 items-center justify-center border border-paradigm-line hover:border-paradigm-ink hover:bg-paradigm-ink hover:text-paradigm-paper transition-colors text-paradigm-ink-soft"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <rect x="3" y="5" width="18" height="14" rx="1.5" />
                  <path d="M3 6l9 7 9-7" />
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* Band 4 — Legal micro-row */}
        <section className="py-7 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 text-[11px] tracking-wider text-paradigm-ink-mute">
          <p>© {new Date().getFullYear()} {t("company")} · {t("rights")}</p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <li>
              <Link href="/privacy" className="hover:text-paradigm-ink-soft transition-colors">
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/legal" className="hover:text-paradigm-ink-soft transition-colors">
                {t("legal")}
              </Link>
            </li>
          </ul>
          <p>
            <span className="text-paradigm-ink-mute/60 mr-2">{locale.toUpperCase()}</span>
            <span className="text-paradigm-ink-soft">{tLocale("name")}</span>
          </p>
        </section>
      </div>
    </footer>
  )
}
