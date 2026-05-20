/**
 * /[locale]/services — サービス一覧 (Web/MEO/SEO/AI を横並び比較)
 *
 * 役割:   サービス一覧 (Web/MEO/SEO/AI を横並び比較)
 * 入力:   params.locale
 * 出力:   PageHero + ItemList JSON-LD + 4 service cards + RichCtaBand
 *
 * AE-PHP-2 (P18-D 2026-05-08): 全 visible text を messages/{locale}.json:servicesPage 経由に統一.
 *   旧 isJa ? "JP" : "EN" の二択 hardcode → 12 locale 対応 (next-intl getTranslations).
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { getPayload } from "payload"
import config from "@payload-config"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import { filterByLocale, assertLocale, localeFindOptions } from "@/lib/cms/filters"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "servicesPage" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/services"),
  }
}

type ServiceDoc = {
  id: string | number
  name?: string
  slug?: string
  tagline?: string
  icon?: string
  features?: Array<{ feature?: string }>
  sortOrder?: number
}

const CARD_GRADIENTS = [
  "from-pink-400 via-paradigm-accent to-paradigm-tech",
  "from-paradigm-tech via-paradigm-glow to-violet-400",
  "from-paradigm-glow via-violet-400 to-paradigm-accent",
  "from-paradigm-accent via-pink-400 to-orange-300",
]

export default async function ServicesPage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = assertLocale(rawLocale)            // 実 locale（UI + CMS 12-locale 配信）
  const t = await getTranslations({ locale, namespace: "servicesPage" })

  let services: ServiceDoc[] = []
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: "services",
      where: filterByLocale(locale, { isActive: { equals: true } }),
      sort: "sortOrder",
      limit: 100,
      depth: 0,
      ...localeFindOptions(locale),
    })
    services = (res.docs as unknown as ServiceDoc[]) ?? []
  } catch (e) {
    console.error("[services] payload.find failed:", e)
  }

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
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          {services.length === 0 ? (
            <FadeIn className="text-center py-12 max-w-xl mx-auto paradigm-glass rounded-2xl p-8 paradigm-glow-md">
              <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85] mb-7">
                {t("emptyMessage")}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-7 py-3.5 rounded-xl text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors"
              >
                {t("emptyCta")}
              </Link>
            </FadeIn>
          ) : (
            <div className="space-y-12 md:space-y-16">
              {services.map((s, i) => {
                const features = (s.features ?? []).map((f) => f.feature).filter(Boolean) as string[]
                const reversed = i % 2 === 1
                const gradient = CARD_GRADIENTS[i % CARD_GRADIENTS.length]
                return (
                  <FadeIn key={String(s.id)} delay={i * 0.05}>
                    <article
                      className={`grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-stretch ${reversed ? "md:[direction:rtl]" : ""}`}
                    >
                      <div className={`relative rounded-2xl bg-gradient-to-br ${gradient} aspect-[4/3] flex items-center justify-center text-paradigm-paper paradigm-glow-lg ${reversed ? "md:[direction:ltr]" : ""}`}>
                        <div className="absolute inset-0 paradigm-mesh opacity-30 rounded-2xl" />
                        <div className="relative z-10 text-center px-6">
                          {s.icon && <span aria-hidden className="block mb-3 text-[44px] leading-none opacity-90">{s.icon}</span>}
                          {s.tagline && (
                            <p className="font-display text-[20px] md:text-[26px] leading-[1.2] tracking-[-0.015em] paradigm-glow-text">
                              {s.tagline}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className={`flex flex-col justify-center ${reversed ? "md:[direction:ltr]" : ""}`}>
                        <p className="paradigm-eyebrow text-paradigm-accent mb-3">{String(i + 1).padStart(2, "0")}</p>
                        <h2 className="font-display text-[24px] md:text-[34px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink mb-4">
                          {s.name ?? "—"}
                        </h2>
                        {features.length > 0 && (
                          <ul className="paradigm-glass rounded-xl divide-y divide-paradigm-line/60 mb-6 paradigm-glow-sm">
                            {features.map((f, idx) => (
                              <li
                                key={idx}
                                className="px-4 py-2.5 text-[13px] md:text-[14px] text-paradigm-ink-soft leading-[1.6]"
                              >
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          {s.slug && (
                            <Link
                              href={`/services/${s.slug}`}
                              className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-6 py-3 rounded-xl text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors"
                            >
                              {t("learnMore")}
                            </Link>
                          )}
                          <Link
                            href="/contact"
                            className="inline-flex items-center gap-2 paradigm-glass text-paradigm-ink-soft hover:text-paradigm-ink px-6 py-3 rounded-xl text-[12px] tracking-[0.14em] uppercase font-medium transition-colors"
                          >
                            {t("getInTouch")}
                          </Link>
                        </div>
                      </div>
                    </article>
                  </FadeIn>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <RichCtaBand
        eyebrow={t("ctaEyebrow")}
        title={t("ctaTitle")}
        highlight={t("ctaHighlight")}
        desc={t("ctaDesc")}
        buttonLabel={t("ctaButton")}
      />
    </>
  )
}
