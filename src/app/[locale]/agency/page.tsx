/**
 * /[locale]/agency — 代理店向けホワイトラベル LP (Sprint 9-C)
 *
 * 役割:   動画制作 WL パッケージの LP。代理店 CEO / 創業者向け.
 * 入力:   params.locale
 * 出力:   PageHero + ROI Calc + WL Pricing + 機能比較 + CTA
 *
 * 戦略原典:
 *   - product-strategy.jsx: WL は単価高・解約率低・pMoat
 *   - Notion 営業MVP壁打ち②: 「損失訴求 > 欲望訴求」(プロスペクト理論 2.5x)
 *
 * 想定顧客: 5-50 名規模の代理店 CEO・「Video Editor 求人中」シグナル
 * 訴求軸:   新収益源 (損失フレーミング: 「年 $X 消えている」)
 *
 * AE-PHP-4 準拠.
 * AE-PHP-5 (2026-05-14): agencyPage namespace 経由の完全 i18n 化.
 *   全静的テキストを messages/{locale}.json:agencyPage に移管.
 *   WL_PLANS / COMPARISON_WL / FAQ_ITEMS / steps / cta をすべて翻訳キー化.
 */
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import RoiCalculator from "@/components/agency/RoiCalculator"

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "agencyPage" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/agency"),
  }
}

export default async function AgencyPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "agencyPage" })

  const comparisonHeaderItem = t("comparison.headerItem")
  const comparisonHeaderParadigm = t("comparison.headerParadigm")
  const comparisonHeaderOutsourcing = t("comparison.headerOutsourcing")
  const comparisonRowsRaw = t.raw("comparison.rows") as Array<{
    item: string
    paradigm: string
    outsourcing: string
  }>

  const stepsRaw = t.raw("steps") as Array<{
    step: string
    title: string
    desc: string
  }>

  const faqsRaw = t.raw("faqs") as Array<{ q: string; a: string }>

  const plansRaw = t.raw("plans")
  const planAgency = (plansRaw as Record<string, unknown>).agency as Record<string, unknown>
  const planWhite = (plansRaw as Record<string, unknown>).white as Record<string, unknown>

  const plans = [
    {
      name: planAgency.name as string,
      price: planAgency.price as string,
      period: planAgency.period as string,
      videos: planAgency.videos as string,
      desc: planAgency.desc as string,
      features: planAgency.features as string[],
      popular: planAgency.popular as boolean,
    },
    {
      name: planWhite.name as string,
      price: planWhite.price as string,
      period: planWhite.period as string,
      videos: planWhite.videos as string,
      desc: planWhite.desc as string,
      features: planWhite.features as string[],
      popular: planWhite.popular as boolean,
    },
  ]

  return (
    <>
      <PageHero
        badge={t("heroBadge")}
        title={t("heroTitle")}
        highlight={t("heroHighlight")}
        desc={t("heroDesc")}
      />

      {/* ROI Calculator */}
      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-5xl mx-auto px-6 md:px-8">
          <RoiCalculator />
        </div>
      </section>

      {/* 構造説明 */}
      <section className="bg-paradigm-paper-deep paradigm-section">
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          <FadeIn>
            <p className="paradigm-eyebrow text-paradigm-accent mb-3 text-center">
              {t("howItWorksEyebrow")}
            </p>
            <h2 className="font-display text-[28px] md:text-[36px] leading-tight tracking-tight text-paradigm-ink text-center mb-10">
              {t("howItWorksTitle")}
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stepsRaw.map((s, i) => (
              <FadeIn key={s.step} delay={i * 0.1}>
                <div className="paradigm-glass rounded-2xl p-6 h-full">
                  <div className="paradigm-eyebrow text-paradigm-accent mb-3">{s.step}</div>
                  <h3 className="font-display text-[18px] text-paradigm-ink mb-2 leading-tight">
                    {s.title}
                  </h3>
                  <p className="text-[12.5px] text-paradigm-ink-soft leading-relaxed">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-20" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn>
            <p className="paradigm-eyebrow text-paradigm-accent mb-3 text-center">
              {t("pricingEyebrow")}
            </p>
            <h2 className="font-display text-[28px] md:text-[36px] leading-tight tracking-tight text-paradigm-ink text-center mb-3">
              {t("pricingTitle")}
            </h2>
            <p className="text-[14px] text-paradigm-ink-soft text-center mb-12 max-w-2xl mx-auto leading-relaxed">
              {t("pricingDesc")}
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
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
                      {t("recommendedLabel")}
                    </span>
                  )}
                  <h3 className="font-display text-[24px] text-paradigm-ink mb-1">{plan.name}</h3>
                  <p className="text-[12px] text-paradigm-ink-mute mb-3">{plan.desc}</p>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="font-display text-[40px] text-paradigm-ink">
                      {plan.price}
                    </span>
                    <span className="text-[14px] text-paradigm-ink-mute">{plan.period}</span>
                  </div>
                  <div className="paradigm-eyebrow text-paradigm-accent mb-5">{plan.videos}</div>
                  <ul className="flex-1 space-y-2.5 text-[13px] text-paradigm-ink-soft leading-relaxed mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="text-paradigm-accent mt-0.5">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="mailto:info@paradigmjp.com?subject=代理店WLパッケージの相談"
                    className="inline-flex w-full justify-center items-center gap-2 bg-paradigm-ink text-paradigm-paper rounded-xl py-3 text-[12px] tracking-wider uppercase font-semibold hover:bg-paradigm-accent transition-colors"
                  >
                    {t("planButton")}
                  </a>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 比較表 */}
      <section className="bg-paradigm-paper-deep paradigm-section">
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          <FadeIn>
            <p className="paradigm-eyebrow text-paradigm-accent mb-3 text-center">
              {t("comparisonEyebrow")}
            </p>
            <h2 className="font-display text-[28px] md:text-[36px] leading-tight tracking-tight text-paradigm-ink text-center mb-10">
              {t("comparisonTitle")}
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="paradigm-glass rounded-2xl paradigm-glow-md overflow-hidden">
              <div className="grid grid-cols-3 bg-paradigm-paper-card border-b border-paradigm-line p-5">
                <div className="text-[12px] paradigm-eyebrow text-paradigm-ink-soft">
                  {comparisonHeaderItem}
                </div>
                <div className="text-[12px] paradigm-eyebrow text-paradigm-accent text-center">
                  {comparisonHeaderParadigm}
                </div>
                <div className="text-[12px] paradigm-eyebrow text-paradigm-ink-mute text-center">
                  {comparisonHeaderOutsourcing}
                </div>
              </div>
              {comparisonRowsRaw.map((row, i) => (
                <div
                  key={row.item}
                  className={`grid grid-cols-3 p-5 ${
                    i < comparisonRowsRaw.length - 1
                      ? "border-b border-paradigm-line/60"
                      : ""
                  }`}
                >
                  <div className="text-[13px] font-semibold text-paradigm-ink">{row.item}</div>
                  <div className="text-[13px] text-paradigm-accent font-semibold text-center">
                    ✓ {row.paradigm}
                  </div>
                  <div className="text-[13px] text-paradigm-ink-mute text-center">
                    {row.outsourcing}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-8">
          <FadeIn>
            <p className="paradigm-eyebrow text-paradigm-accent mb-3 text-center">
              {t("faqEyebrow")}
            </p>
            <h2 className="font-display text-[28px] md:text-[36px] leading-tight tracking-tight text-paradigm-ink text-center mb-10">
              {t("faqTitle")}
            </h2>
          </FadeIn>
          <div className="space-y-3">
            {faqsRaw.map((item, i) => (
              <FadeIn key={i} delay={i * 0.05}>
                <details className="paradigm-glass rounded-xl px-6 py-5 group">
                  <summary className="cursor-pointer flex items-start gap-4 list-none [&::-webkit-details-marker]:hidden">
                    <span className="font-display text-[15px] md:text-[17px] text-paradigm-ink flex-1 leading-tight">
                      {item.q}
                    </span>
                    <span
                      aria-hidden
                      className="shrink-0 text-paradigm-ink-mute mt-1 group-open:rotate-45 transition-transform text-[16px] leading-none"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-4 text-[13px] text-paradigm-ink-soft leading-relaxed">
                    {item.a}
                  </p>
                </details>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <RichCtaBand
        eyebrow={t("cta.eyebrow")}
        title={t("cta.title")}
        desc={t("cta.desc")}
        buttonLabel={t("cta.buttonLabel")}
        buttonHref="/contact"
      />
    </>
  )
}
