import type { Metadata } from "next"
import { headers } from "next/headers"
import { getPayload } from "payload"
import config from "@payload-config"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import { filterByLocale, coerceLocale, localeFindOptions } from "@/lib/cms/filters"
import {
  formatPricePPP,
  formatPricePPPFromHeaders,
  detectCountryFromHeaders,
  type FormatPriceResult,
} from "@/lib/ppp"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ force_country?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "料金プラン" : "Pricing",
    description: isJa
      ? "Paradigm合同会社の料金プラン。Web制作・MEO対策・SEO/GEO対策・AI導入の明朗な定額制パッケージ。"
      : "Transparent, productized pricing from Paradigm LLC. PPP-adjusted for your region.",
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
  sortOrder?: number
}

const BILLING_LABEL: Record<string, { ja: string; en: string }> = {
  monthly: { ja: "/月", en: "/mo" },
  yearly: { ja: "/年", en: "/yr" },
  "one-time": { ja: "一括", en: "one-time" },
}

export default async function PricingPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params
  const { force_country } = await searchParams
  const locale = coerceLocale(rawLocale)
  const isJa = locale === "ja"

  const h = await headers()
  const forcedCountry = force_country?.toUpperCase()
  const country = forcedCountry || detectCountryFromHeaders(h)

  let plans: PricingDoc[] = []
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: "pricing",
      where: filterByLocale(locale),
      sort: "sortOrder",
      limit: 100,
      depth: 0,
      ...localeFindOptions(locale),
    })
    plans = (res.docs as unknown as PricingDoc[]) ?? []
  } catch (e) {
    console.error("[pricing] payload.find failed:", e)
  }

  const priceFor = (plan: PricingDoc): FormatPriceResult => {
    const priceJPY = plan.price ?? 0
    const currency = (plan.currency ?? "jpy").toUpperCase() as "JPY" | "USD"
    return forcedCountry
      ? formatPricePPP(priceJPY, currency, forcedCountry, locale)
      : formatPricePPPFromHeaders(priceJPY, currency, h, locale)
  }

  return (
    <>
      <PageHero
        badge={isJa ? "Pricing" : "Pricing"}
        title={isJa ? "料金プラン" : "Productized Pricing"}
        desc={
          isJa
            ? "明朗な定額制パッケージ。お客様の地域に合わせた価格調整（PPP）対応。"
            : "Transparent, productized engagements. Prices auto-adjust to your region's purchasing power."
        }
        accent="indigo"
      />

      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          {plans.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg text-text-muted mb-6">
                {isJa
                  ? "現在、公開中のプランはありません。詳細は直接お問い合わせください。"
                  : "No pricing plans are currently published. Please contact us for a tailored quote."}
              </p>
              <Link
                href="/contact"
                className="inline-flex bg-accent text-white px-8 py-3 rounded-xl font-semibold hover:bg-accent/90 transition-colors"
              >
                {isJa ? "お問い合わせ" : "Contact Us"}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {plans.map((plan) => {
                const price = priceFor(plan)
                const billing = BILLING_LABEL[plan.billingCycle ?? "one-time"]
                const billingLabel = isJa ? billing?.ja : billing?.en
                const cta =
                  plan.ctaLabel ?? (isJa ? "お問い合わせ" : "Get Started")
                return (
                  <div
                    key={String(plan.id)}
                    className={`relative rounded-2xl bg-white p-8 shadow-sm transition-all ${
                      plan.isPopular
                        ? "border-2 border-accent shadow-xl shadow-accent/20 md:scale-105"
                        : "border border-gray-200 hover:border-accent/40 hover:shadow-lg"
                    }`}
                  >
                    {plan.isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                        {isJa ? "人気No.1" : "Most Popular"}
                      </span>
                    )}
                    <h3 className="text-xl font-bold text-primary mb-2">
                      {plan.planName ?? "—"}
                    </h3>
                    {plan.description && (
                      <p className="text-sm text-text-muted mb-6 leading-relaxed">
                        {plan.description}
                      </p>
                    )}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-primary">
                          {price.display}
                        </span>
                        {billingLabel && (
                          <span className="text-sm text-text-muted">
                            {billingLabel}
                          </span>
                        )}
                      </div>
                      {price.discounted && (
                        <p className="mt-2 text-xs text-text-muted">
                          {isJa
                            ? `地域価格 (PPP調整) — 通常 ¥${price.original.toLocaleString("ja-JP")}`
                            : `PPP-adjusted for your region — standard ¥${price.original.toLocaleString("en-US")}`}
                        </p>
                      )}
                    </div>
                    {plan.features && plan.features.length > 0 && (
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((f, i) => (
                          <li
                            key={i}
                            className={`flex items-start gap-3 text-sm ${
                              f.included === false
                                ? "text-text-muted/60 line-through"
                                : "text-text-muted"
                            }`}
                          >
                            <span
                              className={`shrink-0 mt-0.5 ${
                                f.included === false
                                  ? "text-gray-300"
                                  : "text-accent"
                              }`}
                            >
                              {f.included === false ? "✗" : "✓"}
                            </span>
                            <span>{f.feature ?? ""}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      href="/contact"
                      className={`block text-center py-3 rounded-xl font-semibold transition-colors ${
                        plan.isPopular
                          ? "bg-accent text-white hover:bg-accent/90"
                          : "bg-gray-100 text-primary hover:bg-gray-200"
                      }`}
                    >
                      {cta}
                    </Link>
                  </div>
                )
              })}
            </div>
          )}

          <p className="mt-12 text-center text-xs text-text-muted">
            {isJa
              ? `価格は ${country} からのアクセスに基づき表示しています。「~」付きは地域調整後の参考価格です。`
              : `Prices shown are adjusted for visitors from ${country}. "~" prefix indicates PPP-adjusted pricing.`}
          </p>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-primary mb-4">
            {isJa
              ? "カスタムプランをご希望の方へ"
              : "Need a custom scope?"}
          </h2>
          <p className="text-text-muted mb-8">
            {isJa
              ? "大規模案件・継続支援・ホワイトラベルのご相談もお気軽にどうぞ。"
              : "Enterprise engagements, ongoing retainers, and white-label partnerships — let's talk."}
          </p>
          <Link
            href="/contact"
            className="inline-flex bg-accent text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-accent/90 transition-all shadow-lg"
          >
            {isJa ? "無料相談を予約する" : "Book a Free Consultation"}
          </Link>
        </div>
      </section>
    </>
  )
}
