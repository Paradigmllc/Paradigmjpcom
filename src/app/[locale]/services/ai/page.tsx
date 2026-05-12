/**
 * /[locale]/services/ai — AI 導入支援サービス詳細
 *
 * 役割:   AI 導入支援サービス詳細
 * 入力:   params.locale
 * 出力:   ServiceDetailLayout + UseCasesBand (4 業界別事例)
 *
 * AE-PHP-2 (P18-D 2026-05-08): 全 visible text を messages/{locale}.json:serviceDetail.ai 経由に統一.
 *   USE_CASES 配列も serviceDetail.ai.useCases[] で構造化 (12 locale で個別翻訳可能).
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import PageHero from "@/components/PageHero"
import ServiceDetailLayout from "@/components/aesop/ServiceDetailLayout"
import FadeIn from "@/components/aesop/FadeIn"
import { getServiceByKey, getPricingFor } from "@/lib/data"
import { buildServiceSchema, buildBreadcrumbSchema } from "@/lib/seo/schemas"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "serviceDetail" })
  return {
    title: t("ai.metaTitle"),
    description: t("ai.metaDescription"),
    alternates: pageAlternates(locale, "/services/ai"),
  }
}

interface UseCase { tag: string; gradient: string; title: string; desc: string }

async function UseCasesBand({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "serviceDetail" })
  const CASES = t.raw("ai.useCases") as UseCase[]
  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-40" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
        <FadeIn className="mb-8 max-w-2xl">
          <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("ai.useCasesEyebrow")}</p>
          <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-pink-400 bg-clip-text text-transparent">
              {t("ai.useCasesTitle")}
            </span>
          </h2>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {CASES.map((c, i) => (
            <FadeIn key={c.title} delay={i * 0.08}>
              <article className="paradigm-glass rounded-2xl p-5 md:p-6 paradigm-glow-sm hover:paradigm-glow-md hover:-translate-y-1 transition-all duration-500 h-full">
                <span className={`inline-block paradigm-eyebrow rounded-full px-2.5 py-1 text-[10px] bg-gradient-to-br ${c.gradient} text-paradigm-paper paradigm-glow-sm mb-3`}>{c.tag}</span>
                <h3 className="font-display text-[16px] md:text-[20px] leading-[1.2] text-paradigm-ink mb-2 tracking-[-0.015em]">{c.title}</h3>
                <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.7]">{c.desc}</p>
              </article>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

export default async function AiServicePage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "serviceDetail" })
  const service = getServiceByKey(locale, "ai")
  const pricing = getPricingFor(locale, "ai")
  const serviceSchema = buildServiceSchema({
    name: service.title,
    description: service.desc,
    url: `https://paradigmjp.com/${locale}/services/ai`,
    locale,
    serviceType: "AI Integration",
  })
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t("breadcrumbHome"), url: `https://paradigmjp.com/${locale}` },
    { name: t("breadcrumbServices"), url: `https://paradigmjp.com/${locale}/services` },
    { name: service.title, url: `https://paradigmjp.com/${locale}/services/ai` },
  ])
  return (
    <>
      <PageHero badge={t("ai.heroBadge")} title={service.title} desc={service.tagline} />
      <ServiceDetailLayout
        badge={t("ai.heroBadgeShort")}
        title={service.title}
        desc={service.desc}
        features={service.features}
        results={service.results}
        plans={pricing.plans}
        pricingFootnote={pricing.monthly}
        iconBg="from-paradigm-accent via-pink-400 to-orange-300"
        beamFrom="rgb(79 70 229)"
        beamTo="rgb(251 146 60)"
        middleBand={<UseCasesBand locale={locale} />}
        ctaTitle={t("ai.ctaTitle")}
        ctaHighlight={t("ai.ctaHighlight")}
        ctaDesc={t("ai.ctaDesc")}
        ctaLabel={t("ai.ctaLabel")}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  )
}
