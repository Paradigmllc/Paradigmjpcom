/**
 * /[locale]/contact — お問い合わせ (form + Cal.com sidebar)
 *
 * 役割:   お問い合わせ (form + Cal.com sidebar)
 * 入力:   params.locale
 * 出力:   PageHero + ContactForm + Cal.com booking aside
 *
 * AE-PHP-2 (P18-D 2026-05-08): 全 visible text を messages/{locale}.json:contactPage 経由に統一.
 *   旧 isJa ? "JP" : "EN" の二択 hardcode → 12 locale 対応 (next-intl getTranslations).
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { Mail, Clock, Calendar } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import { buildArticleSchema } from "@/lib/seo/schemas"
import PageHero from "@/components/PageHero"
import { ContactForm } from "./ContactForm"
import { calendarUrlFor, getSiteSettings } from "@/lib/settings"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ intent?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "contactPage" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/contact"),
  }
}

export default async function ContactPage({ params, searchParams }: Props) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  const t = await getTranslations({ locale, namespace: "contactPage" })
  const isJapanEntry = locale === "en" && query.intent === "japan-entry"
  const sidebarBlocks = isJapanEntry
    ? [
        {
          icon: Calendar,
          gradient: "from-zinc-950 via-zinc-800 to-blue-700",
          label: "Fixed commercial terms",
          items: ["$12,000 setup paid before kickoff", "$0/month for the first six months", "$995/month from month seven", "Cancel the monthly service anytime"],
        },
        {
          icon: Mail,
          gradient: "from-zinc-900 via-blue-800 to-emerald-700",
          label: "Fast-decision qualification",
          items: ["Final approval within seven days", "One internal launch owner", "Required assets within 48 hours", "21-business-day launch target"],
        },
      ]
    : [
        {
          icon: Calendar,
          gradient: "from-zinc-950 via-zinc-800 to-blue-700",
          label: t("consultLabel"),
          items: t.raw("consultItems") as string[],
        },
        {
          icon: Mail,
          gradient: "from-zinc-900 via-blue-800 to-emerald-700",
          label: t("contactLabel"),
          items: t.raw("contactItems") as string[],
        },
      ]
  // PayloadCMS Settings global から admin 編集可能な calendar URL を取得
  const settings = await getSiteSettings(locale)
  const bookingUrl = calendarUrlFor(settings, locale)

  return (
    <>
      <PageHero
        badge={isJapanEntry ? "Japan Entry" : t("heroBadge")}
        title={isJapanEntry ? "Apply for a Japan launch slot." : t("heroTitle")}
        highlight={isJapanEntry ? "Japan launch slot." : t("heroHighlight")}
        desc={isJapanEntry ? "$12,000 fixed setup. $0/month for the first six months. Confirm your decision authority and launch timing below." : t("heroDesc")}
        asideText={isJapanEntry ? "Built for companies that can decide this week and launch with one accountable owner." : undefined}
        asideCta={isJapanEntry ? { label: "Review the fixed offer", href: "/#japan-entry-pricing" } : undefined}
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8 grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          <div className="lg:col-span-3 paradigm-glass rounded-lg p-6 md:p-8 paradigm-glow-md">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{isJapanEntry ? "Application" : t("formEyebrow")}</p>
            <h2 className="font-display text-[22px] md:text-[28px] leading-[1.2] text-paradigm-ink mb-7 ">
              {isJapanEntry ? "Confirm your fit and launch timing" : t("formTitle")}
            </h2>
            <ContactForm />
          </div>

          <aside className="lg:col-span-2 space-y-4">
            {sidebarBlocks.map((b) => {
              const Icon = b.icon
              return (
                <div key={b.label} className="paradigm-glass rounded-lg p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${b.gradient} text-paradigm-paper mb-3 paradigm-glow-sm`}>
                    <Icon size={18} strokeWidth={1.5} />
                  </div>
                  <p className="paradigm-eyebrow text-paradigm-accent mb-3">{b.label}</p>
                  <ul className="space-y-2 text-[13px] text-paradigm-ink-soft leading-[1.75]">
                    {b.items.map((item) => (<li key={item}>{item}</li>))}
                  </ul>
                </div>
              )
            })}

            {/* 2026-05-13 fail-soft: bookingUrl 未設定なら CTA カードを skip render.
                admin が PayloadCMS Settings > calendarByLocale (12-locale) で URL を
                設定したら自動的に表示される。 */}
            {!isJapanEntry && bookingUrl && (
              <div className="paradigm-glass rounded-lg p-6 paradigm-glow-md border border-paradigm-accent/30">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-paradigm-glow via-paradigm-accent to-paradigm-accent text-paradigm-paper mb-3 paradigm-glow-sm">
                  <Clock size={18} strokeWidth={1.5} />
                </div>
                <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("hurryLabel")}</p>
                <p className="text-[13px] text-paradigm-ink-soft leading-[1.75] mb-4">
                  {t("hurryDesc")}
                </p>
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full justify-center items-center gap-2 bg-paradigm-ink text-paradigm-paper rounded-lg py-3 text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors"
                >
                  {t("hurryButton")}
                </a>
              </div>
            )}
          </aside>
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildArticleSchema({
              title: t("heroTitle"),
              description: t("heroDesc"),
              url: `https://paradigmjp.com/${locale}/contact`,
              locale,
            })
          ),
        }}
      />
    </>
  )
}
