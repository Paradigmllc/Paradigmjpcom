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
import Link from "next/link"
import { Mail, Clock, Calendar } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import { buildPageSchema } from "@/lib/seo/schemas"
import {
  JAPAN_ENTRY_CONTACT_CANONICAL_URL,
  JAPAN_ENTRY_DESCRIPTION,
  JAPAN_ENTRY_TITLE,
  getJapanEntryApplicationJsonLd,
} from "@/lib/jsonld"
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
  const isJapanEntry = locale === "en"
  if (isJapanEntry) {
    const title = `Apply for the ${JAPAN_ENTRY_TITLE}`
    return {
      title,
      description: JAPAN_ENTRY_DESCRIPTION,
      alternates: pageAlternates("en", "/contact"),
      openGraph: {
        type: "website",
        url: JAPAN_ENTRY_CONTACT_CANONICAL_URL,
        title,
        description: JAPAN_ENTRY_DESCRIPTION,
        images: [
          {
            url: "/en/opengraph-image",
            width: 1200,
            height: 630,
            alt: `${JAPAN_ENTRY_TITLE} — application`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: JAPAN_ENTRY_DESCRIPTION,
        images: ["/en/opengraph-image"],
      },
    }
  }

  const t = await getTranslations({ locale, namespace: "contactPage" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/contact"),
  }
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "contactPage" })
  const isJapanEntry = locale === "en"
  const sidebarBlocks = isJapanEntry
    ? [
        {
          icon: Calendar,
          gradient: "from-zinc-950 via-zinc-800 to-blue-700",
          label: "Fixed commercial terms",
          items: ["$12,000 setup paid before kickoff", "$0/month for the first six months", "$995/month from month seven", "Future billing is cancellable under the signed terms"],
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
  const nextSteps = isJapanEntry
    ? t.raw("nextSteps") as Array<{ title: string; body: string }>
    : []

  return (
    <>
      <PageHero
        badge={isJapanEntry ? "Japan Entry" : t("heroBadge")}
        title={isJapanEntry ? "Apply for the fixed Japan Entry package." : t("heroTitle")}
        highlight={isJapanEntry ? "Japan Entry package." : t("heroHighlight")}
        desc={isJapanEntry ? "$12,000 fixed setup. $0/month for the first six months. Confirm your decision authority and launch timing below." : t("heroDesc")}
        asideText={isJapanEntry ? "Built for companies that can decide this week and launch with one accountable owner." : undefined}
        asideCta={isJapanEntry ? { label: "Review the fixed offer", href: "/en#japan-entry-pricing" } : undefined}
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8 grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          <div className="lg:col-span-3 paradigm-glass rounded-lg p-6 md:p-8 paradigm-glow-md">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{isJapanEntry ? "Application" : t("formEyebrow")}</p>
            <h2 className="font-display text-[22px] md:text-[28px] leading-[1.2] text-paradigm-ink mb-7 ">
              {isJapanEntry ? "Confirm your fit and launch timing" : t("formTitle")}
            </h2>
            {isJapanEntry && (
              <Link
                href="/en"
                className="mb-6 inline-flex min-h-11 items-center text-sm font-semibold text-paradigm-accent underline decoration-paradigm-accent/40 underline-offset-4 transition-colors hover:text-paradigm-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paradigm-accent"
              >
                ← Back to the Japan Entry Package
              </Link>
            )}
            <ContactForm />
          </div>

          <aside className="lg:col-span-2 space-y-4">
            {sidebarBlocks.map((b) => {
              const Icon = b.icon
              return (
                <div key={b.label} className="paradigm-glass rounded-lg p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${b.gradient} text-paradigm-paper mb-3 paradigm-glow-sm`}>
                    <Icon aria-hidden="true" size={18} strokeWidth={1.5} />
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
                  <Clock aria-hidden="true" size={18} strokeWidth={1.5} />
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
      {isJapanEntry && nextSteps.length > 0 && (
        <section className="relative overflow-hidden bg-paradigm-paper-deep paradigm-section" aria-labelledby="application-next-title">
          <div className="relative z-10 mx-auto max-w-5xl px-6 md:px-8">
            <div className="mb-8 max-w-3xl">
              <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("nextEyebrow")}</p>
              <h2 id="application-next-title" className="font-display text-[24px] leading-[1.15] text-paradigm-ink md:text-[36px]">{t("nextTitle")}</h2>
              <p className="mt-4 text-[14px] leading-[1.8] text-paradigm-ink-soft">{t("nextDesc")}</p>
            </div>
            <ol className="grid gap-4 md:grid-cols-3">
              {nextSteps.map((step, index) => (
                <li key={step.title} className="rounded-lg border border-paradigm-line bg-paradigm-paper p-6 paradigm-glow-sm">
                  <span className="font-display text-[28px] text-paradigm-accent">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="mt-4 font-display text-[18px] text-paradigm-ink">{step.title}</h3>
                  <p className="mt-3 text-[13px] leading-[1.8] text-paradigm-ink-soft">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            isJapanEntry
              ? getJapanEntryApplicationJsonLd()
              : buildPageSchema({
                  type: "ContactPage",
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
