import type { Metadata } from "next"
import { getPayload } from "payload"
import config from "@payload-config"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import { filterByLocale, coerceLocale, localeFindOptions } from "@/lib/cms/filters"
import { FAQ_JSONLD } from "@/lib/jsonld"

export const dynamic = "force-dynamic"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "よくあるご質問" : "Frequently Asked Questions",
    description: isJa
      ? "Web制作・MEO・SEO/GEO・AI導入支援のよくあるご質問と回答。"
      : "Common questions about Paradigm LLC's productized services.",
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
  const locale = coerceLocale(rawLocale)
  const isJa = locale === "ja"

  let faqs: FaqDoc[] = []
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: "faqs",
      where: filterByLocale(locale),
      sort: "sortOrder",
      limit: 100,
      depth: 0,
      ...localeFindOptions(locale),
    })
    faqs = (res.docs as unknown as FaqDoc[]) ?? []
  } catch (e) {
    console.error("[faq] payload.find failed:", e)
  }

  const faqPairs = faqs.map((f) => ({ q: f.question ?? "", a: lexicalToPlainText(f.answer) }))

  return (
    <>
      <PageHero
        badge="FAQ"
        title={isJa ? "よくあるご質問にお答えします。" : "Answers to common questions."}
        highlight={isJa ? "よくあるご質問" : "common questions"}
        desc={isJa ? "お客様からよくいただくご質問をまとめました。" : "Answers to the questions we hear most from foreign SMBs entering Japan."}
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
          {faqPairs.length === 0 ? (
            <FadeIn className="text-center paradigm-glass rounded-2xl p-8 paradigm-glow-md">
              <p className="text-[14px] text-paradigm-ink-soft leading-[1.85] mb-7">
                {isJa ? "現在、公開中の FAQ はありません。" : "No FAQs are published yet."}
              </p>
              <Link href="/contact" className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-7 py-3.5 rounded-xl text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors">
                {isJa ? "お問い合わせ" : "Contact us"}
              </Link>
            </FadeIn>
          ) : (
            <ul className="space-y-3">
              {faqPairs.map((faq, i) => (
                <FadeIn key={i} delay={i * 0.04}>
                  <li className="paradigm-glass rounded-2xl paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 overflow-hidden">
                    <details className="group">
                      <summary className="cursor-pointer flex items-start gap-4 p-5 list-none [&::-webkit-details-marker]:hidden">
                        <span className="font-display text-[18px] leading-none text-paradigm-accent mt-1 flex-shrink-0">
                          Q.
                        </span>
                        <span className="font-display text-[15px] md:text-[18px] leading-[1.4] text-paradigm-ink flex-1 pr-4 tracking-[-0.005em]">
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
        eyebrow="Still curious"
        title={isJa ? "解決しない疑問がありますか？" : "Still have questions?"}
        highlight={isJa ? "解決しない疑問" : "questions"}
        desc={isJa ? "お気軽にお問い合わせください。担当者が丁寧にお答えします。" : "Reach out anytime — we'll get back within one business day."}
        buttonLabel={isJa ? "お問い合わせ" : "Contact us"}
      />
    </>
  )
}
