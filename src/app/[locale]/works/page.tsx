import type { Metadata } from "next"
import { getPayload } from "payload"
import config from "@payload-config"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import { filterByLocale, coerceLocale, localeFindOptions } from "@/lib/cms/filters"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ locale: string }>
}

const COLOR_MAP: Record<string, string> = {
  indigo: "from-indigo-500 to-indigo-600",
  emerald: "from-emerald-500 to-emerald-600",
  rose: "from-rose-500 to-rose-600",
  amber: "from-amber-500 to-amber-600",
  violet: "from-violet-500 to-violet-600",
  teal: "from-teal-500 to-teal-600",
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
        badge={isJa ? "Works" : "Case Studies"}
        title={isJa ? "制作実績" : "Case Studies"}
        desc={
          isJa
            ? "お客様の事業を加速した事例をご紹介します。"
            : "Real results from productized engagements with foreign SMBs entering Japan."
        }
        accent="violet"
      />

      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          {works.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg text-text-muted mb-6">
                {isJa
                  ? "現在、公開中の実績はありません。詳細は直接お問い合わせください。"
                  : "No case studies are published yet. Please contact us for references."}
              </p>
              <Link
                href="/contact"
                className="inline-flex bg-accent text-white px-8 py-3 rounded-xl font-semibold hover:bg-accent/90 transition-colors"
              >
                {isJa ? "お問い合わせ" : "Contact Us"}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {works.map((w) => (
                <div
                  key={String(w.id)}
                  className="group rounded-2xl border border-gray-100 overflow-hidden hover:border-accent/30 hover:shadow-xl transition-all duration-300"
                >
                  <div
                    className={`aspect-[4/3] bg-gradient-to-br ${COLOR_MAP[w.color ?? "indigo"]} p-8 flex items-center justify-center text-white`}
                  >
                    <div className="text-center">
                      <p className="text-xs font-bold tracking-widest uppercase opacity-80 mb-2">
                        {w.industry ?? "—"}
                      </p>
                      <p className="text-xl font-bold leading-tight">{w.title ?? ""}</p>
                      {w.metrics && (
                        <p className="mt-4 text-xs font-semibold bg-white/20 inline-block px-3 py-1.5 rounded-full">
                          {w.metrics}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="p-6">
                    {w.description && (
                      <p className="text-sm text-text-muted leading-relaxed mb-4 line-clamp-3">
                        {w.description}
                      </p>
                    )}
                    {w.tags && w.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {w.tags.slice(0, 4).map((t, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-text-muted"
                          >
                            #{t.tag ?? ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-r from-accent to-indigo-600">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            {isJa ? "御社の事例を一緒に作りましょう" : "Let's build your next case study together"}
          </h2>
          <p className="text-lg text-white/80 mb-8">
            {isJa
              ? "無料相談で最適なプランをご提案します。"
              : "Book a free consultation to scope your Japan entry."}
          </p>
          <Link
            href="/contact"
            className="inline-flex bg-white text-accent px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg"
          >
            {isJa ? "無料相談を予約する" : "Book a Free Consultation"}
          </Link>
        </div>
      </section>
    </>
  )
}
