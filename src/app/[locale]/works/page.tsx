import type { Metadata } from "next"
import { getPayload } from "payload"
import config from "@payload-config"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import { filterByLocale, coerceLocale, localeFindOptions } from "@/lib/cms/filters"

/**
 * /[locale]/works — case studies grid (Aesop voice).
 *
 * P18-D-3 rewrite. Cards drop the gradient illustration tile +
 * shadow chrome in favour of bg-paradigm-paper-deep editorial tile
 * with hairline borders. Industry/metric labels become caps eyebrow.
 *
 * AE-PHP-1: 145 lines.
 */

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "制作実績" : "Case Studies",
    description: isJa
      ? "Paradigm合同会社の制作実績・事例をご紹介します。Web制作・MEO対策・SEO/GEO対策・AI導入の具体的な成果事例。"
      : "Case studies from Paradigm LLC — productized services that helped foreign SMBs enter and grow in Japan.",
  }
}

type WorkDoc = {
  id: string | number
  title?: string
  industry?: string
  description?: string
  challenge?: string
  solution?: string
  metrics?: string
  color?: string
  tags?: Array<{ tag?: string }>
  sortOrder?: number
}

export default async function WorksPage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = coerceLocale(rawLocale)
  const isJa = locale === "ja"

  let works: WorkDoc[] = []
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: "works",
      where: filterByLocale(locale, { isPublished: { equals: true } }),
      sort: "sortOrder",
      limit: 100,
      depth: 1,
      ...localeFindOptions(locale),
    })
    works = (res.docs as unknown as WorkDoc[]) ?? []
  } catch (e) {
    console.error("[works] payload.find failed:", e)
  }

  return (
    <>
      <PageHero
        badge={isJa ? "Works" : "Case studies"}
        title={isJa ? "制作実績" : "Case studies"}
        desc={
          isJa
            ? "お客様の事業を加速した事例をご紹介します。"
            : "Real results from productized engagements with foreign SMBs entering Japan."
        }
      />

      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          {works.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[15px] text-paradigm-ink-soft leading-[1.85] mb-10 max-w-md mx-auto">
                {isJa
                  ? "現在、公開中の実績はありません。詳細は直接お問い合わせください。"
                  : "No case studies are published yet. Please contact us for references."}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border border-paradigm-ink text-paradigm-ink px-8 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-ink hover:text-paradigm-paper transition-colors"
              >
                {isJa ? "お問い合わせ" : "Contact us"}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-paradigm-line">
              {works.map((w) => {
                const tags = (w.tags ?? [])
                  .map((t) => t.tag)
                  .filter(Boolean) as string[]
                return (
                  <article
                    key={String(w.id)}
                    className="bg-paradigm-paper flex flex-col"
                  >
                    {/* Editorial tile (replaces gradient image) */}
                    <div className="aspect-[4/3] bg-paradigm-paper-deep p-8 md:p-10 flex flex-col justify-between border-b border-paradigm-line">
                      {w.industry && (
                        <p className="paradigm-eyebrow text-paradigm-ink-soft">
                          {w.industry}
                        </p>
                      )}
                      <div>
                        <p className="font-display text-[22px] md:text-[26px] leading-[1.2] text-paradigm-ink mb-3">
                          {w.title ?? ""}
                        </p>
                        {w.metrics && (
                          <p className="paradigm-eyebrow text-paradigm-accent">
                            {w.metrics}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="p-7 md:p-8 flex-1 flex flex-col">
                      {w.description && (
                        <p className="text-[14px] text-paradigm-ink-soft leading-[1.85] line-clamp-3 mb-5 flex-1">
                          {w.description}
                        </p>
                      )}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-auto">
                          {tags.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="paradigm-eyebrow text-paradigm-ink-mute"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section className="bg-paradigm-ink text-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">Together</p>
          <h2 className="font-display text-[32px] md:text-[52px] leading-[1.1] tracking-[-0.015em] text-paradigm-paper mb-6">
            {isJa
              ? "御社の事例を一緒に作りましょう"
              : "Let's build your next case study together"}
          </h2>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/65 max-w-xl mx-auto mb-10 leading-[1.85]">
            {isJa
              ? "無料相談で最適なプランをご提案します。"
              : "Book a free consultation to scope your Japan entry."}
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
