"use client"

import { Link } from "@/i18n/routing"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

/**
 * Footer — locale-aware site footer
 *
 * 仕様: すべての href は `@/i18n/routing` の Link が自動で `/{locale}` prefix を付与する。
 * 提案ページ（/ja/p/xxx / /en/p/xxx）では非表示。
 */
export default function Footer() {
  const t = useTranslations("footer")
  const tNav = useTranslations("nav")
  const tCta = useTranslations("cta")
  const pathname = usePathname()
  if (pathname.includes("/p/")) return null

  const services = [
    { href: "/services/web", label: t("services.web") },
    { href: "/services/meo", label: t("services.meo") },
    { href: "/services/seo", label: t("services.seo") },
    { href: "/services/ai", label: t("services.ai") },
  ]

  const company = [
    { href: "/about", label: tNav("about") },
    { href: "/blog", label: tNav("blog") },
    { href: "/contact", label: tNav("contact") },
  ]

  const legal = [
    { href: "/privacy", label: t("privacy") },
    { href: "/legal", label: t("legal") },
  ]

  return (
    <footer className="bg-primary text-white/70">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-indigo-400 flex items-center justify-center text-white text-xs font-bold">P</div>
              <span className="text-lg font-bold text-white">Paradigm</span>
            </div>
            <p className="text-sm leading-relaxed">
              {t("companyTagline")}
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{t("servicesHeading")}</h4>
            <ul className="space-y-2.5">
              {services.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{t("companyHeading")}</h4>
            <ul className="space-y-2.5">
              {company.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{t("contactHeading")}</h4>
            <div className="space-y-2.5 text-sm">
              <p>contact@paradigmjp.com</p>
              <Link href="/contact" className="inline-block mt-3 px-5 py-2.5 rounded-lg bg-accent/20 text-accent-light hover:bg-accent/30 font-medium transition-colors">
                {tCta("bookConsult")}
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs">&copy; {new Date().getFullYear()} {t("company")}. {t("rights")}</p>
          <div className="flex items-center gap-6">
            {legal.map(l => (
              <Link key={l.href} href={l.href} className="text-xs hover:text-white transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
