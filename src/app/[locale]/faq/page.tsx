import type { Metadata } from "next"
import { getPayload } from "payload"
import config from "@payload-config"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import { filterByLocale, coerceLocale, localeFindOptions } from "@/lib/cms/filters"
import { FAQ_JSONLD } from "@/lib/jsonld"

/**
 * /[locale]/faq — accordion FAQ list (Aesop voice).
 *
 * P18-D-3 rewrite. <details>/<summary> remain (native disclosure
 * = best a11y), but card chrome → hairline divider list. The Q
 * pill drops in favour of a serif "Q." prefix typographic mark.
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
    title: isJa ? "よくあるご質問" : "Frequently Asked Questions",
    description: isJa
      ? "Web制作・MEO対策・SEO/GEO対策・AI導入支援に関するよくあるご質問と回答をまとめました。"
      : "Common questions about Paradigm LLC's productized services, contract terms, and engagement timelines.",
  }
}

type FaqDoc = {
  id: string | number
  question?: string
  answer?: unknown
  category?: string
  sortOrder?: number
}

type LexicalNode = {
  type?: string
  text?: string
  children?: LexicalNode[]
}

function lexicalToPlainText(node: unknown): string {
  if (!node || typeof node !== "object") return ""
  const n = node as { root?: LexicalNode } & LexicalNode
  const walk = (x: LexicalNode | undefined): string => {
    if (!x) return ""
    if (x.type === "text" && typeof x.text === "string") return x.text
    if (Array.isArray(x.children)) {
      return x.children
        .map((c) => walk(c))
        .join(x.type === "paragraph" || x.type === "heading" ? "\n" : "")
    }
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

  const faqPairs = faqs.map((f) => ({
    q: f.question ?? "",
    a: lexicalToPlainText(f.answer),
  }))

  return (
    <>
      <PageHero
        badge="FAQ"
        title={isJa ? "よくあるご質問" : "Frequently Asked Questions"}
        desc={
          isJa
            ? "お客様からよくいただくご質問にお答えします。"
            : "Answers to the questions we hear most from foreign SMBs entering Japan."
        }
      />

      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          {faqPairs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[15px] text-paradigm-ink-soft leading-[1.85] mb-10 max-w-md mx-auto">
                {isJa
                  ? "現在、公開中のFAQはありません。ご質問は直接お問い合わせください。"
                  : "No FAQs are published yet. Please reach out directly with your questions."}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border border-paradigm-ink text-paradigm-ink px-8 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-ink hover:text-paradigm-paper transition-colors"
              >
                {isJa ? "お問い合わせ" : "Contact us"}
              </Link>
            </div>
          ) : (
            <ul className="border-t border-paradigm-line">
              {faqPairs.map((faq, i) => (
                <li key={i} className="border-b border-paradigm-line">
                  <details className="group">
                    <summary className="flex items-start gap-5 py-7 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <span className="font-display text-[20px] text-paradigm-ink-mute mt-0.5 leading-none italic">
                        Q.
                      </span>
                      <span className="font-display text-[18px] md:text-[22px] leading-[1.4] text-paradigm-ink flex-1 pr-8">
                        {faq.q}
                      </span>
                      <span
                        aria-hidden
                        className="shrink-0 text-paradigm-ink-mute mt-2 group-open:rotate-45 transition-transform text-[18px] leading-none"
                      >
                        +
                      </span>
                    </summary>
                    <div className="pl-10 pr-8 pb-8 -mt-2">
                      <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85] whitespace-pre-line">
                        {faq.a}
                      </p>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {faqPairs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD(faqPairs)) }}
        />
      )}

      <section className="bg-paradigm-ink text-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">Still curious</p>
          <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-paper mb-6">
            {isJa ? "解決しない疑問がありますか？" : "Still have questions?"}
          </h2>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/65 max-w-xl mx-auto mb-10 leading-[1.85]">
            {isJa
              ? "お気軽にお問い合わせください。担当者が丁寧にお答えします。"
              : "Reach out anytime — we'll get back to you within one business day."}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 border border-paradigm-paper text-paradigm-paper px-10 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-paper hover:text-paradigm-ink transition-colors"
          >
            {isJa ? "お問い合わせ" : "Contact us"}
          </Link>
        </div>
      </section>
    </>
  )
}
