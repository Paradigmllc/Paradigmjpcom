import type { Metadata } from "next"
import { getPayload } from "payload"
import config from "@payload-config"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import { filterByLocale, coerceLocale, localeFindOptions } from "@/lib/cms/filters"

/**
 * /[locale]/services — Productized service catalogue, Aesop voice.
 *
 * P18-D-2 rewrite. PageHero already paper-bg + serif (handled by the
 * shared PageHero rewrite). Card grid switches from gradient illustration
 * tiles to hairline alternating rows: image-tile (paper-deep) on one side,
 * editorial copy on the other. CTA closing band is paradigm-ink reverse.
 *
 * Empty state: minimal message + outline CTA (no accent pill chrome).
 *
 * AE-PHP-1: 130 lines.
 */

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
        title={isJa ? "サービス一覧" : "Productized Services"}
        desc={
          isJa
            ? "デジタル技術で事業を加速する、ソリューション一覧。"
            : "Productized engagements that help foreign SMBs enter and scale in Japan."
        }
      />

      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          {services.length === 0 ? (
            <div className="text-center py-16 max-w-xl mx-auto">
              <p className="text-[15px] text-paradigm-ink-soft leading-[1.85] mb-10">
                {isJa
                  ? "現在、公開中のサービスはありません。詳細は直接お問い合わせください。"
                  : "No services are currently published. Please contact us for a tailored engagement."}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border border-paradigm-ink text-paradigm-ink px-8 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-ink hover:text-paradigm-paper transition-colors"
              >
                {isJa ? "お問い合わせ" : "Contact us"}
              </Link>
            </div>
          ) : (
            <div className="space-y-24 md:space-y-32">
              {services.map((s, i) => {
                const features = (s.features ?? []).map((f) => f.feature).filter(Boolean) as string[]
                const reversed = i % 2 === 1
                return (
                  <article
                    key={String(s.id)}
                    className={`flex flex-col ${reversed ? "md:flex-row-reverse" : "md:flex-row"} gap-10 md:gap-16 items-stretch`}
                  >
                    {/* Image tile — paper-deep editorial card, no gradient */}
                    <div className="flex-1 w-full">
                      <div className="relative bg-paradigm-paper-deep aspect-[4/3] flex items-center justify-center border border-paradigm-line">
                        <div className="text-center px-8">
                          {s.icon && (
                            <span aria-hidden className="block mb-4 text-[44px] leading-none opacity-70">
                              {s.icon}
                            </span>
                          )}
                          {s.tagline && (
                            <p className="font-display text-[24px] md:text-[28px] leading-[1.2] text-paradigm-ink">
                              {s.tagline}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Editorial copy column */}
                    <div className="flex-1 flex flex-col justify-center">
                      <p className="paradigm-eyebrow mb-5">
                        {String(i + 1).padStart(2, "0")}
                      </p>
                      <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink mb-6">
                        {s.name ?? "—"}
                      </h2>
                      {features.length > 0 && (
                        <ul className="border-t border-paradigm-line mb-10">
                          {features.map((f, idx) => (
                            <li
                              key={idx}
                              className="border-b border-paradigm-line py-3 text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.7]"
                            >
                              {f}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex gap-3 flex-wrap">
                        {s.slug && (
                          <Link
                            href={`/services/${s.slug}`}
                            className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-7 py-3 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-accent transition-colors"
                          >
                            {isJa ? "詳しく見る" : "Learn more"}
                          </Link>
                        )}
                        <Link
                          href="/contact"
                          className="inline-flex items-center gap-2 border border-paradigm-line text-paradigm-ink-soft hover:border-paradigm-ink hover:text-paradigm-ink px-7 py-3 text-[12px] tracking-[0.18em] uppercase transition-colors"
                        >
                          {isJa ? "相談する" : "Get in touch"}
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA closing — ink reverse */}
      <section className="bg-paradigm-ink text-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">Together</p>
          <h2 className="font-display text-[32px] md:text-[52px] leading-[1.1] tracking-[-0.015em] text-paradigm-paper mb-6">
            {isJa
              ? "どのサービスが最適かわからない？"
              : "Not sure which service fits?"}
          </h2>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/65 max-w-xl mx-auto mb-10 leading-[1.85]">
            {isJa
              ? "無料相談で御社に最適なプランをご提案します。"
              : "Book a free consultation and we'll scope the right engagement for you."}
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
