/**
 * /[locale]/faq — よくあるご質問 (FAQPage 構造化データ + Q&A list)
 *
 * 役割:   よくあるご質問 (FAQPage 構造化データ + Q&A list)
 * 入力:   params.locale
 * 出力:   PageHero + FAQ accordion + JSON-LD FAQPage schema
 *
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import { filterByLocale, assertLocale, localeFindOptions } from "@/lib/cms/filters"
import { FAQ_JSONLD } from "@/lib/jsonld"
import { withPayloadReadFallback } from "@/lib/payload-availability"

export const revalidate = 300

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "faqPage" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/faq"),
  }
}

type FaqDoc = { id: string | number; question?: string; answer?: unknown }
type LexicalNode = { type?: string; text?: string; children?: LexicalNode[] }

function lexicalToPlainText(node: unknown): string {
  if (!node || typeof node !== "object") return ""
  const n = node as { root?: LexicalNode } & LexicalNode
  const walk = (x: LexicalNode | undefined): string => {
    if (!x) return ""
    if (x.type === "text" && typeof x.text === "string") return x.text
    if (Array.isArray(x.children)) return x.children.map(walk).join(x.type === "paragraph" || x.type === "heading" ? "\n" : "")
    return ""
  }
  if (n.root) return walk(n.root).trim()
  return walk(n as LexicalNode).trim()
}

export default async function FaqPage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = assertLocale(rawLocale)            // 実 locale（UI + CMS 12-locale 配信）
  const t = await getTranslations({ locale, namespace: "faqPage" })

  const faqs = await withPayloadReadFallback<FaqDoc[]>("faq.payload.find", async () => {
      const [{ getPayload }, { default: config }] = await Promise.all([
        import("payload"),
        import("@payload-config"),
      ])
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: "faqs",
        where: filterByLocale(locale),
        sort: "sortOrder",
        limit: 100,
        depth: 0,
        ...localeFindOptions(locale),
      })
      return (res.docs as unknown as FaqDoc[]) ?? []
  }, [])

  const faqPairs = faqs.map((f) => ({ q: f.question ?? "", a: lexicalToPlainText(f.answer) }))

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
        <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
          {faqPairs.length === 0 ? (
            <FadeIn className="text-center paradigm-glass rounded-lg p-8 paradigm-glow-md">
              <p className="text-[14px] text-paradigm-ink-soft leading-[1.85] mb-7">
                {t("emptyMessage")}
              </p>
              <Link href="/contact" className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-7 py-3.5 rounded-lg text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors">
                {t("emptyCta")}
              </Link>
            </FadeIn>
          ) : (
            <ul className="space-y-3">
              {faqPairs.map((faq, i) => (
                <FadeIn key={i} delay={i * 0.04}>
                  <li className="paradigm-glass rounded-lg paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 overflow-hidden">
                    <details className="group">
                      <summary className="cursor-pointer flex items-start gap-4 p-5 list-none [&::-webkit-details-marker]:hidden">
                        <span className="font-display text-[18px] leading-none text-paradigm-accent mt-1 flex-shrink-0">
                          Q.
                        </span>
                        <span className="font-display text-[15px] md:text-[18px] leading-[1.4] text-paradigm-ink flex-1 pr-4">
                          {faq.q}
                        </span>
                        <span aria-hidden className="shrink-0 text-paradigm-ink-mute mt-1 group-open:rotate-45 transition-transform text-[20px] leading-none">+</span>
                      </summary>
                      <div className="px-5 pb-5 pl-12 -mt-1">
                        <p className="text-[13px] md:text-[14px] text-paradigm-ink-soft leading-[1.85] whitespace-pre-line">{faq.a}</p>
                      </div>
                    </details>
                  </li>
                </FadeIn>
              ))}
            </ul>
          )}
        </div>
      </section>

      {faqPairs.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD(faqPairs)) }} />
      )}

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
