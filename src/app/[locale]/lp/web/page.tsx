/**
 * /[locale]/lp/web — Web 制作専用 LP (リード獲得導線)
 *
 * 役割:   Web 制作専用 LP (リード獲得導線)
 * 入力:   params.locale
 * 出力:   Pain → Solution → Plans → CTA Band
 *
 * AE-PHP-2 準拠: 全 visible text を messages/{locale}.json:lpWeb 経由に統一。
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import { buildServiceSchema } from "@/lib/seo/schemas"
import { X, Check } from "lucide-react"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import { Link } from "@/i18n/routing"

export const dynamic = "force-dynamic"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "lpWeb" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/lp/web"),
  }
}

type Solution = { gradient: string; title: string; desc: string }
type Plan = { name: string; price: string; desc: string; features: string[]; popular?: boolean }

export default async function WebLP({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "lpWeb" })
  const pains = t.raw("pains") as string[]
  const solutions = t.raw("solutions") as Solution[]
  const plans = t.raw("plans") as Plan[]

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
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("painsEyebrow")}</p>
            <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15]  text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-ink to-paradigm-accent bg-clip-text text-transparent">
                {t("painsHeading")}
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
            {pains.map((p, i) => (
              <FadeIn key={p} delay={i * 0.05}>
                <div className="paradigm-glass rounded-lg p-4 paradigm-glow-sm flex items-start gap-3 hover:paradigm-glow-md transition-all duration-500">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-paradigm-accent to-paradigm-ink text-paradigm-paper flex-shrink-0">
                    <X size={12} strokeWidth={2.5} />
                  </span>
                  <span className="text-[13px] md:text-[14px] text-paradigm-ink leading-[1.6]">{p}</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-50" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-10 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("solutionsEyebrow")}</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1]  text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-ink to-paradigm-accent bg-clip-text text-transparent">
                {t("solutionsHeading")}
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {solutions.map((s, i) => (
              <FadeIn key={s.title} delay={i * 0.08}>
                <article className="paradigm-glass rounded-lg p-5 md:p-6 paradigm-glow-sm hover:paradigm-glow-lg  transition-all duration-500 h-full">
                  <p className={`paradigm-eyebrow inline-block bg-gradient-to-br ${s.gradient} bg-clip-text text-transparent text-[10px] mb-3`}>0{i + 1}</p>
                  <h3 className="font-display text-[18px] md:text-[22px] leading-[1.2] text-paradigm-ink mb-2 ">{s.title}</h3>
                  <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.7]">{s.desc}</p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("pricingEyebrow")}</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1]  text-paradigm-ink">
              {t("pricingHeading")}
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {plans.map((p, i) => (
              <FadeIn key={p.name} delay={i * 0.08}>
                <div className={`relative paradigm-glass rounded-lg p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 flex flex-col h-full ${p.popular ? "border border-paradigm-accent/40 paradigm-glow-lg" : ""}`}>
                  {p.popular && (
                    <p className="absolute top-4 right-4 paradigm-eyebrow text-paradigm-accent paradigm-glass rounded-full px-2.5 py-1 text-[10px] paradigm-glow-sm">
                      {t("popularBadge")}
                    </p>
                  )}
                  <h3 className="font-display text-[20px] leading-[1.15] text-paradigm-ink mb-1  relative z-10">{p.name}</h3>
                  <p className="text-[12px] text-paradigm-ink-soft mb-4 leading-[1.65] relative z-10">{p.desc}</p>
                  <p className="font-display text-[28px] md:text-[34px] leading-none mb-1 relative z-10">
                    <span className="bg-gradient-to-br from-paradigm-accent via-paradigm-accent to-paradigm-ink bg-clip-text text-transparent">¥{p.price}</span>
                    <span className="text-[12px] font-sans text-paradigm-ink-soft ml-1">{t("priceSuffix")}</span>
                  </p>
                  <ul className="border-t border-paradigm-line/60 mt-4 mb-5 flex-1 relative z-10">
                    {p.features.map((f) => (
                      <li key={f} className="border-b border-paradigm-line/60 py-2 text-[12px] text-paradigm-ink-soft leading-[1.6] flex items-center gap-2">
                        <Check size={11} className="text-paradigm-accent flex-shrink-0" strokeWidth={2.5} />{f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/contact" className={`relative z-10 mt-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-[11px] tracking-[0.14em] uppercase font-semibold transition-colors ${p.popular ? "bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent" : "paradigm-glass text-paradigm-ink-soft hover:text-paradigm-ink"}`}>
                    {t("consultButton")}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

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
              name: t("metaTitle"),
              description: t("metaDescription"),
              url: `https://paradigmjp.com/${locale}/lp/web`,
              locale,
              serviceType: "Web Development",
            })
          ),
        }}
      />
    </>
  )
}
