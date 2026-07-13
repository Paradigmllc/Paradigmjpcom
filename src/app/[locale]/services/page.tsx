/**
 * /[locale]/services — Japan Entry パッケージの提供モジュール
 *
 * 役割:   サービス一覧 (Web/MEO/SEO/AI を横並び比較)
 * 入力:   params.locale
 * 出力:   PageHero + package modules + RichCtaBand
 *
 * AE-PHP-2 (P18-D 2026-05-08): 全 visible text を messages/{locale}.json:servicesPage 経由に統一.
 *   旧 isJa ? "JP" : "EN" の二択 hardcode → 12 locale 対応 (next-intl getTranslations).
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { ArrowRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import JapanEntryJourney from "@/components/japan-entry/JapanEntryJourney"
import JapanEntryVisualProof from "@/components/japan-entry/JapanEntryVisualProof"
import { JapanMarketUrgency } from "@/components/japan-entry/JapanMarketUrgency"
import { filterByLocale, assertLocale, localeFindOptions } from "@/lib/cms/filters"
import { withPayloadReadFallback } from "@/lib/payload-availability"
import { getServices } from "@/lib/data"
import { containsUnverifiedJapaneseMarketingClaim } from "@/lib/public-content-safety"

export const revalidate = 300

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

type EnglishModule = { title: string; short: string; details: string[] }
type OperatingStep = { title: string; desc: string }

const CARD_GRADIENTS = [
  "from-zinc-950 via-zinc-800 to-blue-700",
  "from-zinc-900 via-blue-800 to-emerald-700",
  "from-zinc-900 via-emerald-800 to-blue-700",
  "from-zinc-950 via-blue-800 to-amber-600",
]

const SERVICE_DETAIL_SLUGS = new Set(["web", "meo", "seo", "ai"])

export default async function ServicesPage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = assertLocale(rawLocale)            // 実 locale（UI + CMS 12-locale 配信）
  const t = await getTranslations({ locale, namespace: "servicesPage" })
  const japanEntryLocale = locale !== "ja"
  const packageCopy = japanEntryLocale
    ? await getTranslations({ locale: "en", namespace: "packagePage" })
    : null
  const packageModules = japanEntryLocale ? (t.raw("moduleCards") as EnglishModule[]) : []
  const operatingSteps = japanEntryLocale ? (t.raw("operatingSteps") as OperatingStep[]) : []

  let services = packageModules.length > 0
    ? packageModules.map((module, index) => ({
        id: `japan-entry-module-${index}`,
        name: module.title,
        slug: "",
        icon: "◆",
        tagline: module.short,
        features: module.details.map((feature) => ({ feature })),
        sortOrder: index,
      }))
    : locale === "ja"
      ? []
      : await withPayloadReadFallback<ServiceDoc[]>("services.payload.find", async () => {
      const [{ getPayload }, { default: config }] = await Promise.all([
        import("payload"),
        import("@payload-config"),
      ])
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: "services",
        where: filterByLocale(locale, { isActive: { equals: true } }),
        sort: "sortOrder",
        limit: 100,
        depth: 0,
        ...localeFindOptions(locale),
      })
      return (res.docs as unknown as ServiceDoc[]) ?? []
      }, [])
  if (services.length === 0) {
    services = getServices(locale).map((service, index) => ({
      id: service.id,
      name: service.title,
      slug: service.id,
      tagline: service.tagline,
      icon: service.icon,
      features: service.features.slice(0, 4).map((feature) => ({ feature })),
      sortOrder: index,
    }))
  } else if (locale === "ja") {
    const safeFallbacks = new Map(
      getServices(locale).map((service, index) => [service.id, {
        id: service.id,
        name: service.title,
        slug: service.id,
        tagline: service.tagline,
        icon: service.icon,
        features: service.features.slice(0, 4).map((feature) => ({ feature })),
        sortOrder: index,
      }]),
    )
    services = services.map((service) => {
      if (!containsUnverifiedJapaneseMarketingClaim(service)) return service
      const fallback = service.slug ? safeFallbacks.get(service.slug) : undefined
      return fallback ?? service
    })
  }

  return (
    <>
      <PageHero
        badge={t("heroBadge")}
        title={t("heroTitle")}
        highlight={t("heroHighlight")}
        desc={t("heroDesc")}
      />

      {japanEntryLocale && <JapanMarketUrgency compact source="services" />}

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          {japanEntryLocale && (
            <FadeIn className="mb-10 max-w-3xl">
              <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("moduleEyebrow")}</p>
              <h2 id="package-modules" className="font-display text-[26px] md:text-[40px] leading-[1.1] text-paradigm-ink">{t("moduleTitle")}</h2>
              <p className="mt-4 text-[14px] md:text-[16px] text-paradigm-ink-soft leading-[1.85]">{t("moduleDesc")}</p>
              {packageCopy && (
                <Link href="/package" className="mt-5 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-paradigm-ink transition-colors hover:text-paradigm-accent">
                  {packageCopy("navLabel")}
                  <ArrowRight size={14} aria-hidden />
                </Link>
              )}
            </FadeIn>
          )}
          {services.length === 0 ? (
            <FadeIn className="text-center py-12 max-w-xl mx-auto paradigm-glass rounded-lg p-8 paradigm-glow-md">
              <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85] mb-7">
                {t("emptyMessage")}
              </p>
              <Link
                href={japanEntryLocale ? "/contact?intent=japan-entry" : "/contact"}
                className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-7 py-3.5 rounded-lg text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors"
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
                const hasDetailPage = Boolean(
                  s.slug && SERVICE_DETAIL_SLUGS.has(s.slug),
                )
                return (
                  <FadeIn key={String(s.id)} delay={i * 0.05}>
                    <article
                      className={`grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-stretch ${reversed ? "md:[direction:rtl]" : ""}`}
                    >
                      <div className={`relative rounded-lg bg-gradient-to-br ${gradient} aspect-[4/3] flex items-center justify-center text-paradigm-paper paradigm-glow-lg ${reversed ? "md:[direction:ltr]" : ""}`}>
                        <div className="absolute inset-0 paradigm-mesh opacity-30 rounded-lg" />
                        <div className="relative z-10 text-center px-6">
                          {s.icon && <span aria-hidden className="block mb-3 text-[44px] leading-none opacity-90">{s.icon}</span>}
                          {s.tagline && (
                            <p className="font-display text-[20px] md:text-[26px] leading-[1.2]  paradigm-glow-text">
                              {s.tagline}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className={`flex flex-col justify-center ${reversed ? "md:[direction:ltr]" : ""}`}>
                        <p className="paradigm-eyebrow text-paradigm-accent mb-3">{String(i + 1).padStart(2, "0")}</p>
                        <h2 className="font-display text-[24px] md:text-[34px] leading-[1.15]  text-paradigm-ink mb-4">
                          {s.name ?? "—"}
                        </h2>
                        {features.length > 0 && (
                          <ul className="paradigm-glass rounded-lg divide-y divide-paradigm-line/60 mb-6 paradigm-glow-sm">
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
                          {hasDetailPage && s.slug && (
                            <Link
                              href={`/services/${s.slug}`}
                              className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-6 py-3 rounded-lg text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors"
                            >
                              {t("learnMore")}
                            </Link>
                          )}
                          <Link
                            href={japanEntryLocale ? "/contact?intent=japan-entry" : "/contact"}
                            className="inline-flex items-center gap-2 paradigm-glass text-paradigm-ink-soft hover:text-paradigm-ink px-6 py-3 rounded-lg text-[12px] tracking-[0.14em] uppercase font-medium transition-colors"
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

      {japanEntryLocale && operatingSteps.length > 0 && (
        <section className="relative overflow-hidden bg-paradigm-paper-deep paradigm-section" aria-labelledby="module-operating-heading">
          <div className="paradigm-mesh opacity-30" />
          <div className="relative z-10 mx-auto max-w-5xl px-6 md:px-8">
            <FadeIn className="mb-8 max-w-3xl">
              <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("operatingEyebrow")}</p>
              <h2 id="module-operating-heading" className="font-display text-[24px] leading-[1.15] text-paradigm-ink md:text-[38px]">{t("operatingTitle")}</h2>
              <p className="mt-4 text-[14px] leading-[1.8] text-paradigm-ink-soft">{t("operatingDesc")}</p>
            </FadeIn>
            <ol className="grid gap-4 md:grid-cols-2">
              {operatingSteps.map((step, index) => (
                <FadeIn key={step.title} delay={index * 0.05} as="li" className="rounded-lg border border-paradigm-line bg-paradigm-paper p-6 paradigm-glow-sm">
                  <span className="font-display text-[22px] text-paradigm-accent">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 font-display text-[18px] leading-[1.2] text-paradigm-ink">{step.title}</h3>
                  <p className="mt-3 text-[13px] leading-[1.8] text-paradigm-ink-soft">{step.desc}</p>
                </FadeIn>
              ))}
            </ol>
          </div>
        </section>
      )}

      {japanEntryLocale && <JapanEntryJourney locale={locale} />}

      {japanEntryLocale && <JapanEntryVisualProof locale={locale as "en" | "ja"} />}

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
