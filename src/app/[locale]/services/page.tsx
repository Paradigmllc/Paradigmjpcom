import type { Metadata } from "next"
import { getPayload } from "payload"
import config from "@payload-config"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
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

const CARD_GRADIENTS = [
  "from-pink-400 via-paradigm-accent to-paradigm-tech",
  "from-paradigm-tech via-paradigm-glow to-violet-400",
  "from-paradigm-glow via-violet-400 to-paradigm-accent",
  "from-paradigm-accent via-pink-400 to-orange-300",
]

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
        badge="Services"
        title={isJa ? "デジタル技術で事業を加速する。" : "Productized services that move Japan."}
        highlight={isJa ? "事業を加速" : "move Japan"}
        desc={
          isJa
            ? "Web 制作・MEO 対策・SEO/GEO 対策・AI 導入支援を一貫してご提供します。"
            : "Productized engagements that help foreign SMBs enter and scale in Japan."
        }
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          {services.length === 0 ? (
            <FadeIn className="text-center py-12 max-w-xl mx-auto paradigm-glass rounded-2xl p-8 paradigm-glow-md">
              <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85] mb-7">
                {isJa
                  ? "現在、公開中のサービスはありません。詳細は直接お問い合わせください。"
                  : "No services are currently published. Please contact us for a tailored engagement."}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-7 py-3.5 rounded-xl text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors"
              >
                {isJa ? "お問い合わせ" : "Contact us"}
              </Link>
            </FadeIn>
          ) : (
            <div className="space-y-12 md:space-y-16">
              {services.map((s, i) => {
                const features = (s.features ?? []).map((f) => f.feature).filter(Boolean) as string[]
                const reversed = i % 2 === 1
                const gradient = CARD_GRADIENTS[i % CARD_GRADIENTS.length]
                return (
                  <FadeIn key={String(s.id)} delay={i * 0.05}>
                    <article
                      className={`grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-stretch ${reversed ? "md:[direction:rtl]" : ""}`}
                    >
                      <div className={`relative rounded-2xl bg-gradient-to-br ${gradient} aspect-[4/3] flex items-center justify-center text-paradigm-paper paradigm-glow-lg ${reversed ? "md:[direction:ltr]" : ""}`}>
                        <div className="absolute inset-0 paradigm-mesh opacity-30 rounded-2xl" />
                        <div className="relative z-10 text-center px-6">
                          {s.icon && <span aria-hidden className="block mb-3 text-[44px] leading-none opacity-90">{s.icon}</span>}
                          {s.tagline && (
                            <p className="font-display text-[20px] md:text-[26px] leading-[1.2] tracking-[-0.015em] paradigm-glow-text">
                              {s.tagline}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className={`flex flex-col justify-center ${reversed ? "md:[direction:ltr]" : ""}`}>
                        <p className="paradigm-eyebrow text-paradigm-accent mb-3">{String(i + 1).padStart(2, "0")}</p>
                        <h2 className="font-display text-[24px] md:text-[34px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink mb-4">
                          {s.name ?? "—"}
                        </h2>
                        {features.length > 0 && (
                          <ul className="paradigm-glass rounded-xl divide-y divide-paradigm-line/60 mb-6 paradigm-glow-sm">
                            {features.map((f, idx) => (
                              <li
                                key={idx}
                                className="px-4 py-2.5 text-[13px] md:text-[14px] text-paradigm-ink-soft leading-[1.6]"
                              >
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          {s.slug && (
                            <Link
                              href={`/services/${s.slug}`}
                              className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-6 py-3 rounded-xl text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors"
                            >
                              {isJa ? "詳しく見る" : "Learn more"}
                            </Link>
                          )}
                          <Link
                            href="/contact"
                            className="inline-flex items-center gap-2 paradigm-glass text-paradigm-ink-soft hover:text-paradigm-ink px-6 py-3 rounded-xl text-[12px] tracking-[0.14em] uppercase font-medium transition-colors"
                          >
                            {isJa ? "相談する" : "Get in touch"}
                          </Link>
                        </div>
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
        title={isJa ? "どのサービスが最適かわからない？" : "Not sure which service fits?"}
        highlight={isJa ? "最適" : "fits"}
        desc={isJa ? "無料相談で御社に最適なプランをご提案します。" : "Book a free consultation and we'll scope the right engagement for you."}
        buttonLabel={isJa ? "無料相談を予約する" : "Book a free consultation"}
      />
    </>
  )
}
