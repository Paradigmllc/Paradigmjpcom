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
import PageHero from "@/components/PageHero"
import { ContactForm } from "./ContactForm"
import { calendarUrlFor, getSiteSettings } from "@/lib/settings"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "contactPage" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  }
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "contactPage" })
  const SIDEBAR_BLOCKS = [
    {
      icon: Calendar,
      gradient: "from-pink-400 via-paradigm-accent to-paradigm-tech",
      label: t("consultLabel"),
      items: t.raw("consultItems") as string[],
    },
    {
      icon: Mail,
      gradient: "from-paradigm-tech via-paradigm-glow to-violet-400",
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
        badge={t("heroBadge")}
        title={t("heroTitle")}
        highlight={t("heroHighlight")}
        desc={t("heroDesc")}
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8 grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          <div className="lg:col-span-3 paradigm-glass rounded-2xl p-6 md:p-8 paradigm-glow-md">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("formEyebrow")}</p>
            <h2 className="font-display text-[22px] md:text-[28px] leading-[1.2] text-paradigm-ink mb-7 tracking-[-0.015em]">
              {t("formTitle")}
            </h2>
            <ContactForm />
          </div>

          <aside className="lg:col-span-2 space-y-4">
            {SIDEBAR_BLOCKS.map((b) => {
              const Icon = b.icon
              return (
                <div key={b.label} className="paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500">
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

            <div className="paradigm-glass rounded-2xl p-6 paradigm-glow-md border border-paradigm-accent/30">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-paradigm-glow via-paradigm-accent to-pink-400 text-paradigm-paper mb-3 paradigm-glow-sm">
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
                className="inline-flex w-full justify-center items-center gap-2 bg-paradigm-ink text-paradigm-paper rounded-xl py-3 text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors"
              >
                {t("hurryButton")}
              </a>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
