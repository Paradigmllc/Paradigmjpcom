/**
 * /[locale]/works — 制作実績一覧 (PayloadCMS Works collection 連動)
 *
 * 役割:   制作実績一覧 (PayloadCMS Works collection 連動)
 * 入力:   params.locale
 * 出力:   PageHero + before/after grid + RichCtaBand
 *
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import { buildArticleSchema } from "@/lib/seo/schemas"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import { filterByLocale, assertLocale, localeFindOptions } from "@/lib/cms/filters"
import { withPayloadReadFallback } from "@/lib/payload-availability"
import { WORKS, WORKS_EN } from "@/lib/data"

export const revalidate = 300

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "worksPage" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/works"),
  }
}

type WorkDoc = {
  id: string | number
  title?: string
  industry?: string
  description?: string
  metrics?: string
  tags?: Array<{ tag?: string }>
}

type ProcessStep = { step: string; title: string; desc: string }

const TILE_GRADIENTS = [
  "from-zinc-950 via-zinc-800 to-blue-700",
  "from-zinc-900 via-blue-800 to-emerald-700",
  "from-zinc-900 via-emerald-800 to-blue-700",
  "from-zinc-950 via-blue-800 to-amber-600",
]

export default async function WorksPage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = assertLocale(rawLocale)            // 実 locale（UI + CMS 12-locale 配信）
  const t = await getTranslations({ locale, namespace: "worksPage" })
  const STEPS = t.raw("process") as ProcessStep[]

  let works = await withPayloadReadFallback<WorkDoc[]>("works.payload.find", async () => {
      const [{ getPayload }, { default: config }] = await Promise.all([
        import("payload"),
        import("@payload-config"),
      ])
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: "works",
        where: filterByLocale(locale, { isPublished: { equals: true } }),
        sort: "sortOrder",
        limit: 100,
        depth: 1,
        ...localeFindOptions(locale),
      })
      return (res.docs as unknown as WorkDoc[]) ?? []
  }, [])
  if (works.length === 0) {
    const fallback = locale === "ja" ? WORKS : WORKS_EN
    works = fallback.map((work, index) => ({
      id: `fallback-${index}`,
      title: work.title,
      industry: work.industry,
      description: work.desc,
      metrics: work.metrics,
      tags: work.tags.map((tag) => ({ tag })),
    }))
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
          {works.length === 0 ? (
            <FadeIn className="text-center max-w-xl mx-auto paradigm-glass rounded-lg p-8 paradigm-glow-md">
              <p className="text-[14px] text-paradigm-ink-soft leading-[1.85] mb-7">
                {t("emptyMessage")}
              </p>
              <Link href="/contact" className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-7 py-3.5 rounded-lg text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors">
                {t("emptyCta")}
              </Link>
            </FadeIn>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {works.map((w, i) => {
                const tags = (w.tags ?? []).map((t) => t.tag).filter(Boolean) as string[]
                const gradient = TILE_GRADIENTS[i % TILE_GRADIENTS.length]
                return (
                  <FadeIn key={String(w.id)} delay={i * 0.05}>
                    <article className="group paradigm-glass rounded-lg overflow-hidden paradigm-glow-sm hover:paradigm-glow-lg  transition-all duration-500 h-full flex flex-col">
                      <div className={`relative aspect-[4/3] bg-gradient-to-br ${gradient} p-5 md:p-6 flex flex-col justify-between text-paradigm-paper`}>
                        <div className="absolute inset-0 paradigm-mesh opacity-30" />
                        <p className="relative z-10 paradigm-eyebrow text-paradigm-paper/85">{w.industry ?? "—"}</p>
                        <div className="relative z-10">
                          <p className="font-display text-[18px] md:text-[22px] leading-[1.15]  mb-2 paradigm-glow-text">{w.title ?? ""}</p>
                          {w.metrics && (
                            <p className="paradigm-eyebrow paradigm-glass rounded-full inline-block px-2.5 py-1 text-paradigm-paper text-[10px]">
                              {w.metrics}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="p-5 md:p-6 flex-1 flex flex-col">
                        {w.description && (
                          <p className="text-[13px] text-paradigm-ink-soft leading-[1.7] line-clamp-3 mb-4 flex-1">
                            {w.description}
                          </p>
                        )}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-auto">
                            {tags.slice(0, 4).map((t) => (
                              <span key={t} className="paradigm-eyebrow text-paradigm-ink-mute text-[10px]">#{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  </FadeIn>
                )
              })}
            </div>
          )}
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
                {t("processTitle")}
              </span>
            </h2>
          </FadeIn>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <FadeIn key={s.step} delay={i * 0.08}>
                <li className="paradigm-glass rounded-lg p-5 grid grid-cols-1 md:grid-cols-[60px_1fr] gap-3 paradigm-glow-sm hover:paradigm-glow-md  transition-all duration-500">
                  <span className="font-display text-[24px] md:text-[28px] leading-none bg-gradient-to-br from-paradigm-accent to-paradigm-ink bg-clip-text text-transparent">{s.step}</span>
                  <div>
                    <h3 className="font-display text-[16px] md:text-[18px] leading-[1.2] text-paradigm-ink mb-1 ">{s.title}</h3>
                    <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.7]">{s.desc}</p>
                  </div>
                </li>
              </FadeIn>
            ))}
          </ol>
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
            buildArticleSchema({
              title: t("heroTitle"),
              description: t("heroDesc"),
              url: `https://paradigmjp.com/${locale}/works`,
              locale,
            })
          ),
        }}
      />
    </>
  )
}
