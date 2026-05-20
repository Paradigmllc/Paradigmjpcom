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
import { getPayload } from "payload"
import config from "@payload-config"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import { filterByLocale, coerceLocale, assertLocale, localeFindOptions } from "@/lib/cms/filters"

export const dynamic = "force-dynamic"

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

const TILE_GRADIENTS = [
  "from-pink-400 via-paradigm-accent to-paradigm-tech",
  "from-paradigm-tech via-paradigm-glow to-violet-400",
  "from-paradigm-glow via-violet-400 to-paradigm-accent",
  "from-paradigm-accent via-pink-400 to-orange-300",
]

export default async function WorksPage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = assertLocale(rawLocale)            // 実 locale（静的 UI）
  const contentLocale = coerceLocale(rawLocale)     // ja/en（CMS 配信・英語フォールバック）
  const t = await getTranslations({ locale, namespace: "worksPage" })

  let works: WorkDoc[] = []
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: "works",
      where: filterByLocale(contentLocale, { isPublished: { equals: true } }),
      sort: "sortOrder",
      limit: 100,
      depth: 1,
      ...localeFindOptions(contentLocale),
    })
    works = (res.docs as unknown as WorkDoc[]) ?? []
  } catch (e) {
    console.error("[works] payload.find failed:", e)
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
            <FadeIn className="text-center max-w-xl mx-auto paradigm-glass rounded-2xl p-8 paradigm-glow-md">
              <p className="text-[14px] text-paradigm-ink-soft leading-[1.85] mb-7">
                {t("emptyMessage")}
              </p>
              <Link href="/contact" className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-7 py-3.5 rounded-xl text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors">
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
                    <article className="group paradigm-glass rounded-2xl overflow-hidden paradigm-glow-sm hover:paradigm-glow-lg hover:-translate-y-1 transition-all duration-500 h-full flex flex-col">
                      <div className={`relative aspect-[4/3] bg-gradient-to-br ${gradient} p-5 md:p-6 flex flex-col justify-between text-paradigm-paper`}>
                        <div className="absolute inset-0 paradigm-mesh opacity-30" />
                        <p className="relative z-10 paradigm-eyebrow text-paradigm-paper/85">{w.industry ?? "—"}</p>
                        <div className="relative z-10">
                          <p className="font-display text-[18px] md:text-[22px] leading-[1.15] tracking-[-0.015em] mb-2 paradigm-glow-text">{w.title ?? ""}</p>
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

      <RichCtaBand
        eyebrow={t("ctaEyebrow")}
        title={t("ctaTitle")}
        highlight={t("ctaHighlight")}
        desc={t("ctaDesc")}
        buttonLabel={t("ctaButton")}
      />
    </>
  )
}
