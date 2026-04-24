import type { Metadata } from "next"
import { getPayload } from "payload"
import config from "@payload-config"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import { filterByLocale, coerceLocale, localeFindOptions } from "@/lib/cms/filters"
import { FAQ_JSONLD } from "@/lib/jsonld"

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
        accent="emerald"
      />

      <section className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          {faqPairs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg text-text-muted mb-6">
                {isJa
                  ? "現在、公開中のFAQはありません。ご質問は直接お問い合わせください。"
                  : "No FAQs are published yet. Please reach out directly with your questions."}
              </p>
              <Link
                href="/contact"
                className="inline-flex bg-accent text-white px-8 py-3 rounded-xl font-semibold hover:bg-accent/90 transition-colors"
              >
                {isJa ? "お問い合わせ" : "Contact Us"}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {faqPairs.map((faq, i) => (
                <details
                  key={i}
                  className="group rounded-2xl border border-gray-100 bg-white hover:border-accent/20 transition-all"
                >
                  <summary className="flex items-start gap-4 p-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <span className="shrink-0 h-7 w-7 rounded-full bg-accent/10 text-accent text-sm font-bold flex items-center justify-center mt-0.5">
                      Q
                    </span>
                    <span className="font-semibold text-primary flex-1 pr-8">{faq.q}</span>
                    <span className="shrink-0 text-text-muted group-open:rotate-180 transition-transform mt-1">
                      &#9660;
                    </span>
                  </summary>
                  <div className="px-6 pb-6 pl-[4.25rem]">
                    <p className="text-text-muted leading-relaxed whitespace-pre-line">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </section>

      {faqPairs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD(faqPairs)) }}
        />
      )}

      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-primary mb-4">
            {isJa ? "解決しない疑問がありますか？" : "Still have questions?"}
          </h2>
          <p className="text-text-muted mb-8">
            {isJa
              ? "お気軽にお問い合わせください。担当者が丁寧にお答えします。"
              : "Reach out anytime — we'll get back to you within one business day."}
          </p>
          <Link
            href="/contact"
            className="inline-flex bg-accent text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-accent/90 transition-colors shadow-lg shadow-accent/25"
          >
            {isJa ? "お問い合わせ" : "Contact Us"}
          </Link>
        </div>
      </section>
    </>
  )
}
