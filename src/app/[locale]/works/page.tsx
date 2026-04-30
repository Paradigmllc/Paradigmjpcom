import type { Metadata } from "next"
import { getPayload } from "payload"
import config from "@payload-config"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import { filterByLocale, coerceLocale, localeFindOptions } from "@/lib/cms/filters"

export const dynamic = "force-dynamic"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "制作実績" : "Case Studies",
    description: isJa
      ? "Paradigm合同会社の制作実績・事例。Web制作・MEO・SEO/GEO・AI導入の成果事例。"
      : "Case studies from Paradigm LLC.",
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
        title={isJa ? "お客様の事業を加速した事例。" : "Real results we've shipped together."}
        highlight={isJa ? "事業を加速" : "shipped together"}
        desc={isJa ? "実績数字+ストーリーでご紹介します。" : "Real results from productized engagements with foreign SMBs entering Japan."}
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          {works.length === 0 ? (
            <FadeIn className="text-center max-w-xl mx-auto paradigm-glass rounded-2xl p-8 paradigm-glow-md">
              <p className="text-[14px] text-paradigm-ink-soft leading-[1.85] mb-7">
                {isJa ? "現在、公開中の実績はありません。詳細は直接お問い合わせください。" : "No case studies are published yet."}
              </p>
              <Link href="/contact" className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-7 py-3.5 rounded-xl text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors">
                {isJa ? "お問い合わせ" : "Contact us"}
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
        eyebrow="Together"
        title={isJa ? "御社の事例を一緒に作りましょう" : "Let's build your next case study together"}
        highlight={isJa ? "一緒に" : "together"}
        desc={isJa ? "無料相談で最適なプランをご提案します。" : "Book a free consultation to scope your Japan entry."}
        buttonLabel={isJa ? "無料相談を予約する" : "Book a free consultation"}
      />
    </>
  )
}
