/**
 * /[locale]/video — 動画サブスク LP（DesignJoy 型 productized video subscription）
 *
 * 役割:   月額動画サブスク商材の LP。月額固定・プラン別上限・契約条件を表示。
 * 入力:   params.locale
 * 出力:   PageHero + 比較表 + 3-Tier pricing + Process + CTA
 *
 * 想定顧客: SMB CMO / マーケター / スタートアップ創業者（JP）+ グローバル（/en）
 * 訴求軸:   DesignJoy 型 anti-positioning（採用は高い遅い / 代理店割高 / フリーランス離脱）
 *
 * AE-PHP-2: 全 visible text は getTranslations("videoPage") 経由（旧: 100% ハードコード JP で
 *           /en・10 locale が日本語固定だった）。ja=日本語 / en=DesignJoy 英語 / 他=英語フォールバック。
 * AE-PHP-4 準拠（役割/入力/出力 明示）。
 */

import type { Metadata } from "next"
import { permanentRedirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import { buildServiceSchema } from "@/lib/seo/schemas"
import { assertLocale } from "@/lib/cms/filters"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ locale: string }>
}

type Plan = { name: string; price: string; period: string; volume: string; popular: boolean; features: string[] }
type ComparisonRow = { item: string; paradigm: string; traditional: string }
type ProcessStep = { step: string; title: string; desc: string }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "videoPage" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/video"),
  }
}

export default async function VideoSubscriptionPage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = assertLocale(rawLocale)
  if (locale === "en") permanentRedirect("/en/services#package-modules")
  const t = await getTranslations({ locale, namespace: "videoPage" })

  const plans = t.raw("plans") as Plan[]
  const comparison = t.raw("comparison") as ComparisonRow[]
  const process = t.raw("process") as ProcessStep[]

  return (
    <>
      <PageHero
        badge={t("heroBadge")}
        title={t("heroTitle")}
        highlight={t("heroHighlight")}
        desc={t("heroDesc")}
      />

      {/* 比較表 — DesignJoy anti-positioning */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8">
          <FadeIn>
            <p className="paradigm-eyebrow text-paradigm-accent mb-3 text-center">{t("comparisonEyebrow")}</p>
            <h2 className="font-display text-[28px] md:text-[36px] leading-tight tracking-tight text-paradigm-ink text-center mb-10">
              {t("comparisonTitle")}
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="paradigm-glass rounded-2xl paradigm-glow-md overflow-hidden">
              <div className="grid grid-cols-3 bg-paradigm-paper-card border-b border-paradigm-line p-5">
                <div className="text-[12px] paradigm-eyebrow text-paradigm-ink-soft">{t("comparisonItemHead")}</div>
                <div className="text-[12px] paradigm-eyebrow text-paradigm-accent text-center">{t("comparisonParadigmHead")}</div>
                <div className="text-[12px] paradigm-eyebrow text-paradigm-ink-mute text-center">{t("comparisonTraditionalHead")}</div>
              </div>
              {comparison.map((row, i) => (
                <div
                  key={row.item}
                  className={`grid grid-cols-3 p-5 ${i < comparison.length - 1 ? "border-b border-paradigm-line/60" : ""}`}
                >
                  <div className="text-[13px] font-semibold text-paradigm-ink">{row.item}</div>
                  <div className="text-[13px] text-paradigm-accent font-semibold text-center">✓ {row.paradigm}</div>
                  <div className="text-[13px] text-paradigm-ink-mute text-center">{row.traditional}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Pricing — 3 Tier */}
      <section className="bg-paradigm-paper-deep paradigm-section">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <FadeIn>
            <p className="paradigm-eyebrow text-paradigm-accent mb-3 text-center">{t("pricingEyebrow")}</p>
            <h2 className="font-display text-[28px] md:text-[36px] leading-tight tracking-tight text-paradigm-ink text-center mb-3">
              {t("pricingTitle")}
            </h2>
            <p className="text-[14px] text-paradigm-ink-soft text-center mb-12 max-w-2xl mx-auto leading-relaxed whitespace-pre-line">
              {t("pricingDesc")}
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan, idx) => (
              <FadeIn key={plan.name} delay={idx * 0.1}>
                <div
                  className={`paradigm-glass rounded-2xl p-7 flex flex-col h-full transition-all duration-500 ${
                    plan.popular
                      ? "border border-paradigm-accent/40 paradigm-glow-lg"
                      : "paradigm-glow-sm hover:paradigm-glow-md hover:-translate-y-1"
                  }`}
                >
                  {plan.popular && (
                    <span className="self-start paradigm-eyebrow text-paradigm-accent bg-paradigm-accent/10 px-3 py-1 rounded-full text-[10px] mb-3">
                      {t("popularLabel")}
                    </span>
                  )}
                  <h3 className="font-display text-[22px] text-paradigm-ink mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="font-display text-[36px] text-paradigm-ink">{plan.price}</span>
                    <span className="text-[14px] text-paradigm-ink-mute">{plan.period}</span>
                  </div>
                  <div className="paradigm-eyebrow text-paradigm-accent mb-5">{plan.volume}</div>
                  <ul className="flex-1 space-y-2.5 text-[13px] text-paradigm-ink-soft leading-relaxed mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="text-paradigm-accent mt-0.5">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/contact?intent=video"
                    className="inline-flex w-full justify-center items-center gap-2 bg-paradigm-ink text-paradigm-paper rounded-xl py-3 text-[12px] tracking-wider uppercase font-semibold hover:bg-paradigm-accent transition-colors"
                  >
                    {t("ctaButton")}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Process — 4 step */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-20" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn>
            <p className="paradigm-eyebrow text-paradigm-accent mb-3 text-center">{t("processEyebrow")}</p>
            <h2 className="font-display text-[28px] md:text-[36px] leading-tight tracking-tight text-paradigm-ink text-center mb-12">
              {t("processTitle")}
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {process.map((step, idx) => (
              <FadeIn key={step.step} delay={idx * 0.1}>
                <div className="paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 h-full">
                  <div className="paradigm-eyebrow text-paradigm-accent mb-3">{step.step}</div>
                  <h3 className="font-display text-[18px] text-paradigm-ink mb-2 leading-tight">{step.title}</h3>
                  <p className="text-[12.5px] text-paradigm-ink-soft leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <RichCtaBand
        eyebrow={t("ctaBandEyebrow")}
        title={t("ctaBandTitle")}
        desc={t("ctaBandDesc")}
        buttonLabel={t("ctaBandButton")}
        buttonHref="/contact?intent=video"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildServiceSchema({
              name: t("metaTitle"),
              description: t("metaDescription"),
              url: `https://paradigmjp.com/${locale}/video`,
              locale,
              serviceType: "Video Subscription",
            })
          ),
        }}
      />
    </>
  )
}
