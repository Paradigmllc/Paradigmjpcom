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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "サービス一覧" : "Services",
    description: isJa
      ? "Web制作・MEO対策・SEO/GEO対策・AI導入支援。Paradigm合同会社が提供する4つのデジタル支援サービスをご紹介します。"
      : "Web development, MEO (local SEO), SEO/GEO, and AI integration — Paradigm LLC's productized service suite for foreign SMBs entering Japan.",
  }
}

type ServiceDoc = {
  id: string | number
  name?: string
  slug?: string
  tagline?: string
  icon?: string
  features?: Array<{ feature?: string }>
  sortOrder?: number
}

const COLOR_CYCLE = ["indigo", "emerald", "amber", "purple"] as const
const COLOR_MAP: Record<string, string> = {
  indigo: "from-indigo-500 to-indigo-600",
  emerald: "from-emerald-500 to-emerald-600",
  amber: "from-amber-500 to-amber-600",
  purple: "from-purple-500 to-purple-600",
}

export default async function ServicesPage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = coerceLocale(rawLocale)
  const isJa = locale === "ja"

  let services: ServiceDoc[] = []
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: "services",
      where: filterByLocale(locale, { isActive: { equals: true } }),
      sort: "sortOrder",
      limit: 100,
      depth: 0,
      ...localeFindOptions(locale),
    })
    services = (res.docs as unknown as ServiceDoc[]) ?? []
  } catch (e) {
    console.error("[services] payload.find failed:", e)
  }

  return (
    <>
      <PageHero
        badge={isJa ? "Services" : "Services"}
        title={isJa ? "サービス一覧" : "Productized Services"}
        desc={
          isJa
            ? "デジタル技術で事業を加速する、ソリューション一覧。"
            : "Productized engagements that help foreign SMBs enter and scale in Japan."
        }
        accent="indigo"
      />

      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          {services.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg text-text-muted mb-6">
                {isJa
                  ? "現在、公開中のサービスはありません。詳細は直接お問い合わせください。"
                  : "No services are currently published. Please contact us for a tailored engagement."}
              </p>
              <Link
                href="/contact"
                className="inline-flex bg-accent text-white px-8 py-3 rounded-xl font-semibold hover:bg-accent/90 transition-colors"
              >
                {isJa ? "お問い合わせ" : "Contact Us"}
              </Link>
            </div>
          ) : (
            <div className="space-y-20">
              {services.map((s, i) => {
                const color = COLOR_CYCLE[i % COLOR_CYCLE.length]
                const features = (s.features ?? []).map((f) => f.feature).filter(Boolean) as string[]
                return (
                  <div
                    key={String(s.id)}
                    className={`flex flex-col ${i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-12`}
                  >
                    <div className="flex-1 w-full">
                      <div
                        className={`relative rounded-3xl bg-gradient-to-br ${COLOR_MAP[color]} p-12 text-white aspect-[4/3] flex items-center justify-center`}
                      >
                        <div className="text-center">
                          <span className="text-7xl block mb-4">{s.icon ?? "✨"}</span>
                          {s.tagline && <p className="text-2xl font-bold">{s.tagline}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-primary mb-4">{s.name ?? "—"}</h2>
                      {features.length > 0 && (
                        <ul className="space-y-2 mb-8">
                          {features.map((f, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <span className="text-accent mt-0.5">&#10003;</span>
                              <span className="text-text-muted">{f}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex gap-3">
                        {s.slug && (
                          <Link
                            href={`/services/${s.slug}`}
                            className="px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors text-sm"
                          >
                            {isJa ? "詳しく見る" : "Learn More"}
                          </Link>
                        )}
                        <Link
                          href="/contact"
                          className="px-6 py-3 border border-gray-200 text-text-muted rounded-xl font-semibold hover:border-accent hover:text-accent transition-colors text-sm"
                        >
                          {isJa ? "相談する" : "Get in Touch"}
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-r from-accent to-indigo-600">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            {isJa ? "どのサービスが最適かわからない？" : "Not sure which service fits?"}
          </h2>
          <p className="text-lg text-white/80 mb-8">
            {isJa
              ? "無料相談で御社に最適なプランをご提案します。"
              : "Book a free consultation and we'll scope the right engagement for you."}
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
