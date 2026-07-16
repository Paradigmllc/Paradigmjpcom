/**
 * /[locale]/pricing — Japan Entry 固定オファーと提供範囲
 *
 * 役割:   全サービス料金プラン一覧 (バリューベース 3 ティア)
 * 入力:   params.locale (currency: ja=JPY / en=USD with PPP)
 * 出力:   PageHero + fixed package + scope/comparison grid
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
import JapanEntryJourney from "@/components/japan-entry/JapanEntryJourney"
import JapanEntryVisualProof from "@/components/japan-entry/JapanEntryVisualProof"
import { JapanMarketUrgency } from "@/components/japan-entry/JapanMarketUrgency"
import JapanEntryVisualContext, { type VisualContextCopy } from "@/components/japan-entry/JapanEntryVisualContext"
import JapanEntryCampaign, { type CampaignCopy } from "@/components/japan-entry/JapanEntryCampaign"
import { coerceLocale, assertLocale } from "@/lib/cms/filters"
import {
  formatPricePPP,
  formatPricePPPFromHeaders,
  detectCountryFromHeaders,
  type FormatPriceResult,
} from "@/lib/ppp"
import { LOCALE_HREFLANG } from "@/lib/locale-map"
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

type ScopeGroup = { title: string; items: string[] }
type PackageModule = { title: string; description: string; deliverables: string[] }
type PackageBenefit = { title: string; description: string }
type ComparisonRow = { criterion: string; package: string; hire: string; vendors: string }
type PaymentMethod = { name: string; description: string }

function readRawArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

export default async function PricingPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params
  const { force_country } = await searchParams
  const locale = assertLocale(rawLocale)            // 実 locale（UI + CMS 12-locale 配信）
  const contentLocale = coerceLocale(rawLocale)     // ja/en（通貨フォーマット判定専用: formatPricePPP）
  const isJapanEntry = locale !== "ja"
  const t = await getTranslations({ locale, namespace: "pricingPage" })
  const packageCopy = isJapanEntry
    ? await getTranslations({ locale: "en", namespace: "packagePage" })
    : null
  const campaign = packageCopy ? packageCopy.raw("campaign") as CampaignCopy : null
  const visualContextLocale = locale === "ja" ? "ja" : "en"
  const visualContextT = await getTranslations({ locale: visualContextLocale, namespace: "home" })
  const faqPairs = locale === "ja"
    ? []
    : (t.raw("pricingFaqs") as Array<{ q: string; a: string }>) ?? []
  const scopeGroups = isJapanEntry ? (t.raw("scopeGroups") as ScopeGroup[]) : []
  const packageModules = isJapanEntry ? readRawArray<PackageModule>(t.raw("packageModules")) : []
  const packageBenefits = isJapanEntry ? readRawArray<PackageBenefit>(t.raw("packageBenefits")) : []
  const comparisonRows = isJapanEntry ? readRawArray<ComparisonRow>(t.raw("comparisonRows")) : []
  const paymentMethods = isJapanEntry ? readRawArray<PaymentMethod>(t.raw("paymentMethods")) : []

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

  const plans: PricingDoc[] = isJapanEntry
    ? [{
        id: "japan-entry",
        planName: t("fixedPlanName"),
        serviceId: "japan-entry",
        price: 12000,
        currency: "usd",
        billingCycle: "one-time",
        description: t("fixedPlanDescription"),
        features: (t.raw("fixedPlanFeatures") as string[]).map((feature) => ({ feature, included: true })),
        isPopular: true,
        ctaLabel: t("defaultCta"),
      }]
    : getServices(contentLocale).flatMap((service) =>
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

  const priceFor = (plan: PricingDoc): FormatPriceResult => {
    const priceJPY = plan.price ?? 0
    const currency = (plan.currency ?? "jpy").toUpperCase() as "JPY" | "USD"
    if (isJapanEntry) {
      return {
        display: "$12,000",
        adjusted: 12000,
        original: 12000,
        factor: 1,
        discounted: false,
      }
    }
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

      {isJapanEntry && <JapanMarketUrgency compact source="pricing" />}

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          {plans.length === 0 ? (
            <FadeIn className="text-center max-w-xl mx-auto paradigm-glass rounded-lg p-8 paradigm-glow-md">
              <p className="text-[14px] text-paradigm-ink-soft leading-[1.85] mb-7">
                {t("emptyMessage")}
              </p>
              <Link
                href={isJapanEntry ? "/contact?intent=japan-entry" : "/contact"}
                {...(isJapanEntry ? { "data-umami-event": "japan-entry-apply", "data-umami-event-source": "pricing-empty" } : {})}
                className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-7 py-3.5 rounded-lg text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors"
              >
                {t("emptyCta")}
              </Link>
            </FadeIn>
          ) : (
            <>
              <div className={`grid grid-cols-1 gap-3 md:gap-4 ${isJapanEntry ? "max-w-2xl mx-auto" : "md:grid-cols-2 lg:grid-cols-3"}`}>
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
                          href={isJapanEntry ? "/contact?intent=japan-entry" : "/contact"}
                          {...(isJapanEntry ? {
                            "data-umami-event": "japan-entry-apply",
                            "data-umami-event-source": "pricing-card",
                          } : {})}
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
              {!isJapanEntry && (
                <p className="mt-6 paradigm-eyebrow text-paradigm-ink-mute text-center text-[10px]">
                  {t("regionFooter", { country })}
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {campaign && <JapanEntryCampaign copy={campaign} source="pricing" />}

      {packageCopy && (
        <section className="border-b border-paradigm-line bg-paradigm-paper-deep px-5 py-8 sm:px-8 lg:px-12" aria-label={packageCopy("navLabel")}>
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 rounded-lg border border-paradigm-line bg-paradigm-paper p-5 sm:flex-row sm:items-center sm:px-6">
            <p className="max-w-2xl text-[13px] leading-[1.75] text-paradigm-ink-soft">{packageCopy("includedDesc")}</p>
            <Link href="/package" className="inline-flex shrink-0 items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-paradigm-ink transition-colors hover:text-paradigm-accent">
              {packageCopy("navLabel")}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      )}

      {isJapanEntry && paymentMethods.length > 0 && (
        <section className="relative overflow-hidden bg-paradigm-paper-deep paradigm-section" aria-labelledby="payment-assurance-heading">
          <div className="paradigm-mesh opacity-20" />
          <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-8">
            <FadeIn className="mb-8 max-w-3xl">
              <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("paymentEyebrow")}</p>
              <h2 id="payment-assurance-heading" className="font-display text-[24px] leading-[1.15] text-paradigm-ink md:text-[38px]">{t("paymentTitle")}</h2>
              <p className="mt-4 text-[14px] leading-[1.8] text-paradigm-ink-soft">{t("paymentDesc")}</p>
            </FadeIn>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {paymentMethods.map((method) => (
                <article key={method.name} className="rounded-lg border border-paradigm-line bg-paradigm-paper p-5 paradigm-glow-sm">
                  <h3 className="font-display text-[18px] text-paradigm-ink">{method.name}</h3>
                  <p className="mt-2 text-[12px] leading-[1.75] text-paradigm-ink-soft">{method.description}</p>
                </article>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-paradigm-accent/40 bg-paradigm-accent/5 p-5">
              <p className="paradigm-eyebrow text-paradigm-accent">{t("deliveryGuaranteeEyebrow")}</p>
              <h3 className="mt-2 font-display text-[20px] leading-[1.2] text-paradigm-ink">{t("deliveryGuaranteeTitle")}</h3>
              <p className="mt-2 text-[13px] leading-[1.8] text-paradigm-ink-soft">{t("deliveryGuaranteeDesc")}</p>
            </div>
          </div>
        </section>
      )}

      {isJapanEntry && <JapanEntryJourney locale={locale} />}

      {isJapanEntry && <JapanEntryVisualProof locale={locale as "en" | "ja"} />}

      <JapanEntryVisualContext
        locale={visualContextLocale}
        copy={visualContextT.raw("visualContext") as VisualContextCopy}
      />

      {packageModules.length > 0 && (
        <section className="relative overflow-hidden bg-paradigm-paper paradigm-section" aria-labelledby="package-modules-heading">
          <div className="paradigm-mesh opacity-20" />
          <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-8">
            <FadeIn className="mb-8 max-w-3xl">
              <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("packageEyebrow")}</p>
              <h2 id="package-modules-heading" className="font-display text-[24px] leading-[1.15] text-paradigm-ink md:text-[38px]">{t("packageTitle")}</h2>
              <p className="mt-4 text-[14px] leading-[1.8] text-paradigm-ink-soft">{t("packageDesc")}</p>
            </FadeIn>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {packageModules.map((module, index) => (
                <FadeIn key={module.title} delay={index * 0.04}>
                  <article className="h-full rounded-lg border border-paradigm-line bg-paradigm-paper-deep p-5 paradigm-glow-sm">
                    <p className="paradigm-eyebrow text-paradigm-accent">{String(index + 1).padStart(2, "0")}</p>
                    <h3 className="mt-3 font-display text-[18px] leading-[1.2] text-paradigm-ink">{module.title}</h3>
                    <p className="mt-3 text-[13px] leading-[1.75] text-paradigm-ink-soft">{module.description}</p>
                    <ul className="mt-4 space-y-2 border-t border-paradigm-line/60 pt-4 text-[12px] leading-[1.65] text-paradigm-ink-soft">
                      {module.deliverables.map((deliverable) => <li key={deliverable} className="flex gap-2"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-paradigm-accent" /><span>{deliverable}</span></li>)}
                    </ul>
                  </article>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {packageBenefits.length > 0 && (
        <section className="relative overflow-hidden bg-paradigm-paper-deep paradigm-section" aria-labelledby="package-benefits-heading">
          <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-8">
            <FadeIn className="mb-8 max-w-3xl">
              <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("benefitsEyebrow")}</p>
              <h2 id="package-benefits-heading" className="font-display text-[24px] leading-[1.15] text-paradigm-ink md:text-[38px]">{t("benefitsTitle")}</h2>
              <p className="mt-4 text-[14px] leading-[1.8] text-paradigm-ink-soft">{t("benefitsDesc")}</p>
            </FadeIn>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {packageBenefits.map((benefit, index) => (
                <FadeIn key={benefit.title} delay={index * 0.05}>
                  <article className="h-full rounded-lg border border-paradigm-line bg-paradigm-paper p-6 paradigm-glow-sm">
                    <h3 className="font-display text-[18px] leading-[1.2] text-paradigm-ink">{benefit.title}</h3>
                    <p className="mt-3 text-[13px] leading-[1.8] text-paradigm-ink-soft">{benefit.description}</p>
                  </article>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {comparisonRows.length > 0 && (
        <section className="relative overflow-hidden bg-paradigm-paper paradigm-section" aria-labelledby="package-comparison-heading">
          <div className="paradigm-mesh opacity-20" />
          <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-8">
            <FadeIn className="mb-8 max-w-3xl">
              <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("comparisonEyebrow")}</p>
              <h2 id="package-comparison-heading" className="font-display text-[24px] leading-[1.15] text-paradigm-ink md:text-[38px]">{t("comparisonTitle")}</h2>
              <p className="mt-4 text-[14px] leading-[1.8] text-paradigm-ink-soft">{t("comparisonDesc")}</p>
            </FadeIn>
            <div className="overflow-x-auto rounded-lg border border-paradigm-line bg-paradigm-paper-deep paradigm-glow-sm">
              <table className="min-w-[760px] w-full border-collapse text-left text-[13px] leading-[1.7]">
                <caption className="sr-only">{t("comparisonTitle")}</caption>
                <thead>
                  <tr className="border-b border-paradigm-line bg-paradigm-paper">
                    <th scope="col" className="w-[20%] px-4 py-4 font-semibold text-paradigm-ink">{t("comparisonHeaders.criterion")}</th>
                    <th scope="col" className="w-[27%] px-4 py-4 font-semibold text-paradigm-accent">{t("comparisonHeaders.package")}</th>
                    <th scope="col" className="w-[26%] px-4 py-4 font-semibold text-paradigm-ink">{t("comparisonHeaders.hire")}</th>
                    <th scope="col" className="w-[27%] px-4 py-4 font-semibold text-paradigm-ink">{t("comparisonHeaders.vendors")}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.criterion} className="border-b border-paradigm-line/60 last:border-0 align-top">
                      <th scope="row" className="px-4 py-4 font-semibold text-paradigm-ink">{row.criterion}</th>
                      <td className="px-4 py-4 text-paradigm-ink-soft">{row.package}</td>
                      <td className="px-4 py-4 text-paradigm-ink-soft">{row.hire}</td>
                      <td className="px-4 py-4 text-paradigm-ink-soft">{row.vendors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {scopeGroups.length > 0 && (
        <section className="relative overflow-hidden bg-paradigm-paper-deep paradigm-section" aria-labelledby="scope-heading">
          <div className="paradigm-mesh opacity-30" />
          <div className="relative z-10 mx-auto max-w-5xl px-6 md:px-8">
            <FadeIn className="mb-8 max-w-2xl">
              <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("scopeEyebrow")}</p>
              <h2 id="scope-heading" className="font-display text-[24px] leading-[1.15] text-paradigm-ink md:text-[36px]">
                {t("scopeTitle")}
              </h2>
              <p className="mt-4 text-[14px] leading-[1.8] text-paradigm-ink-soft">{t("scopeDesc")}</p>
            </FadeIn>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {scopeGroups.map((group) => (
                <FadeIn key={group.title}>
                  <div className="h-full rounded-lg border border-paradigm-line bg-paradigm-paper p-6 paradigm-glow-sm">
                    <h3 className="font-display text-[18px] text-paradigm-ink">{group.title}</h3>
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-[13px] leading-[1.75] text-paradigm-ink-soft">
                      {group.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

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
                <FadeIn key={i} delay={i * 0.04} as="li" className="paradigm-glass rounded-lg paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 overflow-hidden">
                    <details className="group">
                      <summary className="cursor-pointer flex items-start gap-4 p-5 list-none [&::-webkit-details-marker]:hidden">
                        <span aria-hidden className="font-display text-[18px] leading-none text-paradigm-accent mt-1 flex-shrink-0">
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
        buttonHref={isJapanEntry ? "/contact?intent=japan-entry" : "/contact"}
        analyticsSource="pricing-final-cta"
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
