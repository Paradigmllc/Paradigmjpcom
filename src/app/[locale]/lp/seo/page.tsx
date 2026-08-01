/**
 * /[locale]/lp/seo — SEO/GEO 対策専用 LP
 *
 * 役割:   SEO/GEO 対策専用 LP
 * 入力:   params.locale
 * 出力:   Comparison (SEO vs GEO) → CTA Band
 *
 * AE-PHP-2 準拠: 全 visible text を messages/{locale}.json:lpSeo 経由に統一。
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { permanentRedirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import { buildServiceSchema } from "@/lib/seo/schemas"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"

export const dynamic = "force-dynamic"

interface Props { params: Promise<{ locale: string }> }

interface ProcessStep { step: string; title: string; desc: string }
interface Plan { name: string; price: string; period: string; desc: string; features: string[] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "lpSeo" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/lp/seo"),
  }
}

export default async function SeoLP({ params }: Props) {
  const { locale } = await params
  if (locale !== "ja") permanentRedirect(`/${locale}/services#package-modules`)
  const t = await getTranslations({ locale, namespace: "lpSeo" })
  const STEPS = t.raw("process") as ProcessStep[]
  const PLANS = t.raw("plans") as Plan[]

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
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("comparisonEyebrow")}</p>
            <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15]  text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-ink to-paradigm-accent bg-clip-text text-transparent">
                {t("comparisonHeading")}
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <FadeIn>
              <div className="paradigm-glass rounded-lg p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 h-full">
                <p className="paradigm-eyebrow text-paradigm-ink-mute mb-3">{t("conventionalLabel")}</p>
                <h3 className="font-display text-[20px] md:text-[24px] leading-[1.15] text-paradigm-ink mb-3 ">
                  {t("conventionalTitle")}
                </h3>
                <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft mb-4 leading-[1.7]">
                  {t("conventionalDesc")}
                </p>
                <p className="font-display text-[28px] text-paradigm-ink mb-1 ">
                  {t("conventionalStat")}
                </p>
                <p className="paradigm-eyebrow text-paradigm-ink-mute text-[10px]">
                  {t("conventionalStatLabel")}
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="relative paradigm-glass rounded-lg p-6 paradigm-glow-md hover:paradigm-glow-lg transition-all duration-500 h-full border border-paradigm-accent/30">
                <p className="paradigm-eyebrow text-paradigm-accent mb-3 relative z-10">{t("newLabel")}</p>
                <h3 className="font-display text-[20px] md:text-[24px] leading-[1.15] text-paradigm-ink mb-3  relative z-10">
                  <span className="bg-gradient-to-br from-paradigm-tech via-paradigm-glow to-paradigm-accent bg-clip-text text-transparent">
                    {t("newTitle")}
                  </span>
                </h3>
                <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft mb-4 leading-[1.7] relative z-10">
                  {t("newDesc")}
                </p>
                <p className="font-display text-[28px] mb-1  relative z-10">
                  <span className="bg-gradient-to-br from-paradigm-accent to-paradigm-ink bg-clip-text text-transparent">
                    {t("newStat")}
                  </span>
                </p>
                <p className="paradigm-eyebrow text-paradigm-accent text-[10px] relative z-10">
                  {t("newStatLabel")}
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-40" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("processEyebrow")}</p>
            <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15]  text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-ink to-paradigm-accent bg-clip-text text-transparent">
                {t("processHeading")}
              </span>
            </h2>
          </FadeIn>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <FadeIn key={s.step} delay={i * 0.08} as="li" className="paradigm-glass rounded-lg p-5 grid grid-cols-1 md:grid-cols-[60px_1fr] gap-3 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500">
                  <span className="font-display text-[24px] md:text-[28px] leading-none bg-gradient-to-br from-paradigm-accent to-paradigm-ink bg-clip-text text-transparent">{s.step}</span>
                  <div>
                    <h3 className="font-display text-[16px] md:text-[18px] leading-[1.2] text-paradigm-ink mb-1 ">{s.title}</h3>
                    <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.7]">{s.desc}</p>
                  </div>
              </FadeIn>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Pricing</p>
            <h2 className="font-display text-[26px] md:text-[36px] leading-[1.15]  text-paradigm-ink">
              {t("plansTitle")}
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {PLANS.map((p, idx) => (
              <FadeIn key={p.name} delay={idx * 0.08}>
                <div className={`paradigm-glass rounded-lg p-6 paradigm-glow-sm hover:paradigm-glow-lg  transition-all duration-500 flex flex-col h-full ${idx === 1 ? "border border-paradigm-accent/40" : ""}`}>
                  <h3 className="font-display text-[20px] text-paradigm-ink mb-1">{p.name}</h3>
                  <p className="text-[12px] text-paradigm-ink-soft mb-4">{p.desc}</p>
                  <p className="font-display text-[28px] text-paradigm-ink mb-1">
                    ¥{p.price}<span className="text-[12px] font-sans text-paradigm-ink-soft ml-1">{p.period}</span>
                  </p>
                  <ul className="border-t border-paradigm-line/60 mt-4 mb-5 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="border-b border-paradigm-line/60 py-2 text-[12px] text-paradigm-ink-soft">{f}</li>
                    ))}
                  </ul>
                  <Link href="/contact" className="inline-flex w-full justify-center items-center gap-2 bg-paradigm-ink text-paradigm-paper rounded-lg py-2.5 text-[11px] tracking-wider uppercase font-semibold hover:bg-paradigm-accent transition-colors">
                    お問い合わせ
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildServiceSchema({ name: t("metaTitle"), description: t("metaDescription"), url: `https://paradigmjp.com/${locale}/lp/seo`, locale, serviceType: "SEO/GEO" })) }} />
    </>
  )
}
