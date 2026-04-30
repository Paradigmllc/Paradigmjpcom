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

/**
 * /[locale]/pricing — Productized pricing plans (Aesop voice).
 *
 * P18-D-3 rewrite. 3-up plan grid switches from rounded shadow cards
 * to hairline editorial tiles on paper-deep, with the popular plan
 * marked by a paradigm-eyebrow caps tag rather than ring/scale chrome.
 * PPP region note becomes quiet eyebrow caps line.
 *
 * AE-PHP-1: 200 lines (cap reached, watch for further growth).
 */

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
        badge="Pricing"
        title={isJa ? "料金プラン" : "Productized Pricing"}
        desc={
          isJa
            ? "明朗な定額制パッケージ。お客様の地域に合わせた価格調整（PPP）対応。"
            : "Transparent, productized engagements. Prices auto-adjust to your region's purchasing power."
        }
      />

      <section className="bg-paradigm-paper-deep paradigm-section">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          {plans.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[15px] text-paradigm-ink-soft leading-[1.85] mb-10 max-w-md mx-auto">
                {isJa
                  ? "現在、公開中のプランはありません。詳細は直接お問い合わせください。"
                  : "No pricing plans are currently published. Please contact us for a tailored quote."}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border border-paradigm-ink text-paradigm-ink px-8 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-ink hover:text-paradigm-paper transition-colors"
              >
                {isJa ? "お問い合わせ" : "Contact us"}
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-paradigm-line">
                {plans.map((plan) => {
                  const price = priceFor(plan)
                  const billing = BILLING_LABEL[plan.billingCycle ?? "one-time"]
                  const billingLabel = isJa ? billing?.ja : billing?.en
                  const cta = plan.ctaLabel ?? (isJa ? "お問い合わせ" : "Get started")
                  return (
                    <div
                      key={String(plan.id)}
                      className="bg-paradigm-paper-deep p-8 md:p-10 flex flex-col"
                    >
                      <p className="paradigm-eyebrow mb-4">
                        {plan.isPopular ? (
                          <span className="text-paradigm-accent">
                            {isJa ? "人気No.1" : "Most popular"}
                          </span>
                        ) : (
                          <span className="text-paradigm-ink-mute">Plan</span>
                        )}
                      </p>
                      <h3 className="font-display text-[26px] md:text-[30px] leading-[1.2] text-paradigm-ink mb-3">
                        {plan.planName ?? "—"}
                      </h3>
                      {plan.description && (
                        <p className="text-[13px] md:text-[14px] text-paradigm-ink-soft mb-7 leading-[1.7]">
                          {plan.description}
                        </p>
                      )}
                      <div className="mb-7">
                        <div className="flex items-baseline gap-1">
                          <span className="font-display text-[38px] md:text-[42px] text-paradigm-ink">
                            {price.display}
                          </span>
                          {billingLabel && (
                            <span className="text-[13px] text-paradigm-ink-soft ml-1">
                              {billingLabel}
                            </span>
                          )}
                        </div>
                        {price.discounted && (
                          <p className="mt-2 paradigm-eyebrow text-paradigm-ink-mute">
                            {isJa
                              ? `PPP 調整 — 通常 ¥${price.original.toLocaleString("ja-JP")}`
                              : `PPP-adjusted — standard ¥${price.original.toLocaleString("en-US")}`}
                          </p>
                        )}
                      </div>
                      {plan.features && plan.features.length > 0 && (
                        <ul className="border-t border-paradigm-line mb-8 flex-1">
                          {plan.features.map((f, i) => (
                            <li
                              key={i}
                              className={`border-b border-paradigm-line py-3 text-[13px] leading-[1.7] ${
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
                        className={`mt-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-[12px] tracking-[0.18em] uppercase transition-colors ${
                          plan.isPopular
                            ? "bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent"
                            : "border border-paradigm-line text-paradigm-ink-soft hover:border-paradigm-ink hover:text-paradigm-ink"
                        }`}
                      >
                        {cta}
                      </Link>
                    </div>
                  )
                })}
              </div>

              <p className="mt-10 paradigm-eyebrow text-paradigm-ink-mute text-center">
                {isJa
                  ? `価格は ${country} からのアクセスに基づき表示しています。「~」付きは地域調整後の参考価格です。`
                  : `Prices shown are adjusted for visitors from ${country}. "~" prefix indicates PPP-adjusted pricing.`}
              </p>
            </>
          )}
        </div>
      </section>

      <section className="bg-paradigm-ink text-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">Custom</p>
          <h2 className="font-display text-[32px] md:text-[52px] leading-[1.1] tracking-[-0.015em] text-paradigm-paper mb-6">
            {isJa ? "カスタムプランをご希望の方へ" : "Need a custom scope?"}
          </h2>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/65 max-w-xl mx-auto mb-10 leading-[1.85]">
            {isJa
              ? "大規模案件・継続支援・ホワイトラベルのご相談もお気軽にどうぞ。"
              : "Enterprise engagements, ongoing retainers, and white-label partnerships — let's talk."}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 border border-paradigm-paper text-paradigm-paper px-10 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-paper hover:text-paradigm-ink transition-colors"
          >
            {isJa ? "無料相談を予約する" : "Book a free consultation"}
          </Link>
        </div>
      </section>
    </>
  )
}
