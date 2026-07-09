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
import { motion } from "framer-motion"
import type { FooterNav } from "@/lib/navigation"

const EASE = [0.22, 1, 0.36, 1] as const

const SERVICE_LINKS = [
  { href: "/services/web", labelKey: "web" },
  { href: "/services/meo", labelKey: "meo" },
  { href: "/services/seo", labelKey: "seo" },
  { href: "/services/ai", labelKey: "ai" },
] as const

interface FooterProps {
  /** PayloadCMS Settings global から渡される編集可能な値 (admin で編集可能) */
  settings?: {
    contactEmail?: string | null
    social?: {
      twitter?: string | null
      instagram?: string | null
      facebook?: string | null
      linkedin?: string | null
      line?: string | null
    }
  }
  /** PayloadCMS Footer global 由来のナビ。null のとき従来の i18n 既定フッターを使用 (非破壊)。 */
  nav?: FooterNav | null
}

/** SNS プラットフォーム → アイコン SVG。未知のものは汎用リンクアイコン。 */
function SocialIcon({ platform }: { platform: string }) {
  const cls = "h-4 w-4"
  switch (platform) {
    case "twitter":
      return <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
    case "linkedin":
      return <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
    case "github":
      return <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden><path d="M12 .3a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.6-4.04-1.6-.55-1.39-1.34-1.76-1.34-1.76-1.1-.75.08-.74.08-.74 1.21.09 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .3z" /></svg>
    default:
      return <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
  }
}

export default function SiteFooter({ settings, nav }: FooterProps = {}) {
  const t = useTranslations("footer")
  const tNav = useTranslations("nav")
  const tLocale = useTranslations("locale")
  const locale = useLocale()
  const contactEmail = settings?.contactEmail ?? "info@paradigmjp.com"
  const social = settings?.social ?? {}
  // CMS Footer global 由来の SNS。無ければ Settings.social から組み立てる (後方互換)。
  const cmsSocials = nav?.socialLinks ?? []

  return (
    <footer className="bg-paradigm-paper-deep text-paradigm-ink mt-32 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-paradigm-accent/40 to-transparent" />
      <div className="max-w-[1440px] mx-auto px-6 md:px-12">
        {/* Band 1 — Editorial */}
        <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: EASE }}
          className="py-20 md:py-28 border-b border-paradigm-line">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-7">
              <p className="paradigm-eyebrow mb-6">{t("company")}</p>
              {/* 編集見出し (companyHeadline) と説明文 (companyTagline) は別キー。
                  旧実装は両方 companyTagline で同一文が二重表示されていた。 */}
              <h2 className="font-display text-[28px] md:text-[40px] leading-[1.18] font-normal tracking-tight max-w-[560px] text-paradigm-ink">
                {t("companyHeadline")}
              </h2>
            </div>
            <div className="lg:col-span-5 flex flex-col gap-6">
              <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85] max-w-md">
                {nav?.tagline || t("companyTagline")}
              </p>
              <Link
                href="/contact"
                className="self-start text-[11px] tracking-[0.18em] uppercase border border-paradigm-ink px-6 py-3 text-paradigm-ink hover:bg-paradigm-ink hover:text-paradigm-paper transition-colors"
              >
                {tNav("contact")}
              </Link>
            </div>
          </div>
        </motion.section>

        {/* Band 2 — Link columns. */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          className="py-16 md:py-20 border-b border-paradigm-line">
          {nav?.columns?.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10 md:gap-12">
              {nav.columns.map((col) => (
                <div key={col.heading}>
                  <p className="paradigm-eyebrow mb-5">{col.heading}</p>
                  <ul className="space-y-3 text-[14px] text-paradigm-ink-soft">
                    {col.links.map((l) => (
                      <li key={`${col.heading}-${l.href}`}>
                        {l.openInNewTab ? (
                          <a href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-paradigm-ink transition-colors">
                            {l.label}
                          </a>
                        ) : (
                          <Link href={l.href} className="hover:text-paradigm-ink transition-colors">
                            {l.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-10 md:gap-12">
              <div>
                <p className="paradigm-eyebrow mb-5">{t("servicesHeading")}</p>
                <ul className="space-y-3 text-[14px] text-paradigm-ink-soft">
                  {SERVICE_LINKS.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="hover:text-paradigm-ink transition-colors">
                        {t(`services.${l.labelKey}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="paradigm-eyebrow mb-5">{t("companyHeading")}</p>
                <ul className="space-y-3 text-[14px] text-paradigm-ink-soft">
                  <li><Link href="/about" className="hover:text-paradigm-ink transition-colors">{tNav("about")}</Link></li>
                  <li><Link href="/works" className="hover:text-paradigm-ink transition-colors">{tNav("works")}</Link></li>
                  <li><Link href="/pricing" className="hover:text-paradigm-ink transition-colors">{tNav("pricing")}</Link></li>
                  <li><Link href="/faq" className="hover:text-paradigm-ink transition-colors">{tNav("faq")}</Link></li>
                </ul>
              </div>
              <div className="col-span-2 md:col-span-1">
                <p className="paradigm-eyebrow mb-5">{t("contactHeading")}</p>
                <ul className="space-y-3 text-[14px] text-paradigm-ink-soft">
                  <li><Link href="/contact" className="hover:text-paradigm-ink transition-colors">{tNav("contact")}</Link></li>
                  <li><Link href="/blog" className="hover:text-paradigm-ink transition-colors">{tNav("blog")}</Link></li>
                </ul>
              </div>
            </div>
          )}
        </motion.section>

        {/* Band 3 — Studio + social */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
          className="py-12 border-b border-paradigm-line">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <p className="text-[13px] text-paradigm-ink-soft leading-[1.8] max-w-xl">
              {nav?.studioLocation || t("studioLocation")}
            </p>
            <div className="flex items-center gap-4">
              {cmsSocials.length > 0 ? (
                cmsSocials.map((s) => (
                  <a key={s.platform + s.url} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.platform}
                    className="inline-flex h-10 w-10 items-center justify-center border border-paradigm-line hover:border-paradigm-ink hover:bg-paradigm-ink hover:text-paradigm-paper transition-colors text-paradigm-ink-soft">
                    <SocialIcon platform={s.platform} />
                  </a>
                ))
              ) : null}
              <a
                href={`mailto:${contactEmail}`}
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
        </motion.section>

        {/* Band 4 — Legal micro-row */}
        <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
          className="py-7 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 text-[11px] tracking-wider text-paradigm-ink-mute">
          <p>
            © {new Date().getFullYear()}{" "}
            {nav?.copyright || `${t("company")} · ${t("rights")}`}
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {nav?.legalLinks?.length ? (
              nav.legalLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-paradigm-ink-soft transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))
            ) : (
              <>
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
              </>
            )}
          </ul>
          <p>
            <span className="text-paradigm-ink-mute/60 mr-2">{locale.toUpperCase()}</span>
            <span className="text-paradigm-ink-soft">{tLocale("name")}</span>
          </p>
        </motion.section>
      </div>
    </footer>
  )
}
