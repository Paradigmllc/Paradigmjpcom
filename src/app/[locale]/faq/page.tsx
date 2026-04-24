import type { Metadata } from "next"
import Link from "next/link"
import PageHero from "@/components/PageHero"
import { FAQS } from "@/lib/data"
import { FAQ_JSONLD } from "@/lib/jsonld"

export const metadata: Metadata = {
  title: "よくあるご質問",
  description: "Web制作・MEO対策・SEO/GEO対策・AI導入支援に関するよくあるご質問と回答をまとめました。",
}

export default function FaqPage() {
  return (
    <>
      <PageHero badge="FAQ" title="よくあるご質問" desc="お客様からよくいただくご質問にお答えします。" accent="emerald" />

      {/* FAQ List */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group rounded-2xl border border-gray-100 bg-white hover:border-accent/20 transition-all">
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
                  <p className="text-text-muted leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD(FAQS)) }} />

      {/* CTA */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-primary mb-4">解決しない疑問がありますか？</h2>
          <p className="text-text-muted mb-8">お気軽にお問い合わせください。担当者が丁寧にお答えします。</p>
          <Link href="/contact" className="inline-flex bg-accent text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-accent/90 transition-colors shadow-lg shadow-accent/25">
            お問い合わせ
          </Link>
        </div>
      </section>
    </>
  )
}
