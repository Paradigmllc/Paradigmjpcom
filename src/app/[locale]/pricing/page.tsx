/**
 * /[locale]/pricing — 全サービス料金プラン一覧 (バリューベース 3 ティア)
 *
 * 役割:   全サービス料金プラン一覧 (バリューベース 3 ティア)
 * 入力:   params.locale (currency: ja=JPY / en=USD with PPP)
 * 出力:   PageHero + 3-tier pricing table + comparison grid
 *
 * AE-PHP-2 (P18-D 2026-05-08): 全 visible text を messages/{locale}.json:pricingPage 経由に統一.
 *   旧 isJa ? "JP" : "EN" の二択 hardcode → 12 locale 対応 (next-intl getTranslations).
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import { buildServiceSchema } from "@/lib/seo/schemas"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import { filterByLocale, coerceLocale, assertLocale, localeFindOptions } from "@/lib/cms/filters"
import {
  formatPricePPP,
  formatPricePPPFromHeaders,
  detectCountryFromHeaders,
  type FormatPriceResult,
} from "@/lib/ppp"
import { LOCALE_HREFLANG } from "@/lib/locale-map"
import { withPayloadReadFallback } from "@/lib/payload-availability"
import { getPricingFor, getServices } from "@/lib/data"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ force_country?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "pricingPage" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/pricing"),
  }
}

type PricingDoc = {
  id: string | number
  planName?: string
  serviceId?: string
  price?: number
  currency?: "jpy" | "usd"
  billingCycle?: "monthly" | "yearly" | "one-time"
  description?: string
  features?: Array<{ feature?: string; included?: boolean }>
  isPopular?: boolean
  ctaLabel?: string
}

export default async function PricingPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params
  const { force_country } = await searchParams
  const locale = assertLocale(rawLocale)            // 実 locale（UI + CMS 12-locale 配信）
  const contentLocale = coerceLocale(rawLocale)     // ja/en（通貨フォーマット判定専用: formatPricePPP）
  const t = await getTranslations({ locale, namespace: "pricingPage" })
  const faqPairs = (t.raw("pricingFaqs") as Array<{ q: string; a: string }>) ?? []

  // Billing cycle ラベルは namespace 経由で locale 別取得 (旧 BILLING_LABEL hardcode 廃止)
  const billingLabelFor = (cycle: string | undefined): string => {
    switch (cycle) {
      case "monthly": return t("billingMonthly")
      case "yearly": return t("billingYearly")
      case "one-time": return t("billingOnetime")
      default: return ""
    }
  }

  const h = await headers()
  const forcedCountry = force_country?.toUpperCase()
  const country = forcedCountry || detectCountryFromHeaders(h)

  let plans = await withPayloadReadFallback<PricingDoc[]>("pricing.payload.find", async () => {
      const [{ getPayload }, { default: config }] = await Promise.all([
        import("payload"),
        import("@payload-config"),
      ])
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: "pricing",
        where: filterByLocale(locale),
        sort: "sortOrder",
        limit: 100,
        depth: 0,
        ...localeFindOptions(locale),
      })
      return (res.docs as unknown as PricingDoc[]) ?? []
  }, [])
  if (plans.length === 0) {
    plans = getServices(contentLocale).flatMap((service) =>
      getPricingFor(contentLocale, service.id as "web" | "meo" | "seo" | "ai").plans.map((plan, index) => ({
        id: `${service.id}-${plan.name}`,
        planName: `${service.title} / ${plan.name}`,
        serviceId: service.id,
        price: Number(plan.price.replace(/,/g, "")),
        currency: "jpy" as const,
        billingCycle: plan.period.includes("/") ? "monthly" as const : "one-time" as const,
        description: plan.desc,
        features: plan.features.map((feature) => ({ feature, included: true })),
        isPopular: plan.popular ?? index === 1,
        ctaLabel: t("defaultCta"),
      }))
    )
  }

  const priceFor = (plan: PricingDoc): FormatPriceResult => {
    const priceJPY = plan.price ?? 0
    const currency = (plan.currency ?? "jpy").toUpperCase() as "JPY" | "USD"
    return forcedCountry
      ? formatPricePPP(priceJPY, currency, forcedCountry, contentLocale)
      : formatPricePPPFromHeaders(priceJPY, currency, h, contentLocale)
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
          {plans.length === 0 ? (
            <FadeIn className="text-center max-w-xl mx-auto paradigm-glass rounded-lg p-8 paradigm-glow-md">
              <p className="text-[14px] text-paradigm-ink-soft leading-[1.85] mb-7">
                {t("emptyMessage")}
              </p>
              <Link href="/contact" className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-7 py-3.5 rounded-lg text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors">
                {t("emptyCta")}
              </Link>
            </FadeIn>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {plans.map((plan, idx) => {
                  const price = priceFor(plan)
                  const billingLabel = billingLabelFor(plan.billingCycle)
                  const cta = plan.ctaLabel ?? t("defaultCta")
                  const localeForFmt =
                    (LOCALE_HREFLANG as Record<string, string>)[locale] ?? "en-US"
                  return (
                    <FadeIn key={String(plan.id)} delay={idx * 0.08}>
                      <div
                        className={`relative paradigm-glass rounded-lg p-6 md:p-7 transition-all duration-500 flex flex-col h-full ${
                          plan.isPopular
                            ? "border border-paradigm-accent/40 paradigm-glow-lg"
                            : "paradigm-glow-sm hover:paradigm-glow-md "
                        }`}
                      >
                        <p className="paradigm-eyebrow mb-3">
                          {plan.isPopular ? (
                            <span className="text-paradigm-accent paradigm-glass rounded-full px-2.5 py-1 paradigm-glow-sm text-[10px]">
                              {t("popularBadge")}
                            </span>
                          ) : (
                            <span className="text-paradigm-ink-mute text-[10px]">{t("planEyebrow")}</span>
                          )}
                        </p>
                        <h3 className="font-display text-[20px] md:text-[24px] leading-[1.15] text-paradigm-ink mb-2 ">
                          {plan.planName ?? "—"}
                        </h3>
                        {plan.description && (
                          <p className="text-[12px] text-paradigm-ink-soft mb-5 leading-[1.65]">{plan.description}</p>
                        )}
                        <div className="mb-5">
                          <div className="flex items-baseline gap-1">
                            <span className="font-display text-[32px] md:text-[40px] leading-none">
                              <span className="bg-gradient-to-br from-paradigm-accent via-paradigm-accent to-paradigm-ink bg-clip-text text-transparent">
                                {price.display}
                              </span>
                            </span>
                            {billingLabel && <span className="text-[12px] text-paradigm-ink-soft ml-1">{billingLabel}</span>}
                          </div>
                          {price.discounted && (
                            <p className="mt-1.5 paradigm-eyebrow text-paradigm-ink-mute text-[10px]">
                              {t("pppHint", { originalPrice: price.original.toLocaleString(localeForFmt) })}
                            </p>
                          )}
                        </div>
                        {plan.features && plan.features.length > 0 && (
                          <ul className="border-t border-paradigm-line/60 mb-6 flex-1">
                            {plan.features.map((f, i) => (
                              <li
                                key={i}
                                className={`border-b border-paradigm-line/60 py-2.5 text-[12px] leading-[1.65] ${
                                  f.included === false
                                    ? "text-paradigm-ink-mute line-through"
                                    : "text-paradigm-ink-soft"
                                }`}
                              >
                                {f.feature ?? ""}
                              </li>
                            ))}
                          </ul>
                        )}
                        <Link
                          href="/contact"
                          className={`mt-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-[11px] tracking-[0.14em] uppercase font-semibold transition-colors ${
                            plan.isPopular
                              ? "bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent"
                              : "paradigm-glass text-paradigm-ink-soft hover:text-paradigm-ink"
                          }`}
                        >
                          {cta}
                        </Link>
                      </div>
                    </FadeIn>
                  )
                })}
              </div>
              <p className="mt-6 paradigm-eyebrow text-paradigm-ink-mute text-center text-[10px]">
                {t("regionFooter", { country })}
              </p>
            </>
          )}
        </div>
      </section>

      {faqPairs.length > 0 && (
        <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
          <div className="paradigm-mesh opacity-30" />
          <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
            <FadeIn className="mb-8 max-w-2xl">
              <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("faqEyebrow")}</p>
              <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15]  text-paradigm-ink">
                <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-ink to-paradigm-accent bg-clip-text text-transparent">
                  {t("faqTitle")}
                </span>
              </h2>
            </FadeIn>
            <ul className="space-y-3">
              {faqPairs.map((faq, i) => (
                <FadeIn key={i} delay={i * 0.04}>
                  <li className="paradigm-glass rounded-lg paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 overflow-hidden">
                    <details className="group">
                      <summary className="cursor-pointer flex items-start gap-4 p-5 list-none [&::-webkit-details-marker]:hidden">
                        <span className="font-display text-[18px] leading-none text-paradigm-accent mt-1 flex-shrink-0">
                          Q.
                        </span>
                        <span className="font-display text-[15px] md:text-[18px] leading-[1.4] text-paradigm-ink flex-1 pr-4 ">
                          {faq.q}
                        </span>
                        <span aria-hidden className="shrink-0 text-paradigm-ink-mute mt-1 group-open:rotate-45 transition-transform text-[20px] leading-none">+</span>
                      </summary>
                      <div className="px-5 pb-5 pl-12 -mt-1">
                        <p className="text-[13px] md:text-[14px] text-paradigm-ink-soft leading-[1.85] whitespace-pre-line">{faq.a}</p>
                      </div>
                    </details>
                  </li>
                </FadeIn>
              ))}
            </ul>
          </div>
        </section>
      )}

      <RichCtaBand
        eyebrow={t("ctaEyebrow")}
        title={t("ctaTitle")}
        highlight={t("ctaHighlight")}
        desc={t("ctaDesc")}
        buttonLabel={t("ctaButton")}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildServiceSchema({
              name: t("heroTitle"),
              description: t("heroDesc"),
              url: `https://paradigmjp.com/${locale}/pricing`,
              locale,
              serviceType: "Pricing Plans",
            })
          ),
        }}
      />
    </>
  )
}
