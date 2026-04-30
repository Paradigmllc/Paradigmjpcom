import type { Metadata } from "next"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"

/**
 * /[locale]/about — paradigm corporate "about" page in Aesop voice.
 *
 * P18-D-2 rewrite. Sections: PageHero → Mission → Values 3-up →
 * Company info table → CTA closing band (paradigm-ink reverse).
 * Hairline dividers replace card shadows; serif headings replace bold
 * sans; paradigm-eyebrow replaces accent-violet pill chrome.
 *
 * Note: visible strings are still hardcoded JP here (legacy from pre-P17
 * pages). Full messages migration will land in P18-D-3 / a follow-up
 * AE-PHP-2 sweep so we can iterate the visual structure first without
 * blocking on 12-locale translations.
 */

export const metadata: Metadata = {
  title: "会社概要",
  description:
    "Paradigm合同会社の会社概要。デジタル技術で中小企業の成長を支援するパートナーです。",
}

const VALUES = [
  {
    title: "成果にコミットする",
    desc: "「納品して終わり」ではなく、数字で成果が出るまで伴走します。KPIを共有し、データに基づく改善を継続します。",
  },
  {
    title: "ワンストップで安心",
    desc: "Web制作・集客・AIを一貫して提供。複数業者への発注コストと管理の手間をなくします。",
  },
  {
    title: "最新技術を、わかりやすく",
    desc: "AI・GEO等の最先端技術も、お客様にわかりやすくお伝えし、無理のない形で導入を支援します。",
  },
] as const

const COMPANY_INFO: ReadonlyArray<readonly [string, string]> = [
  ["会社名", "Paradigm合同会社（パラダイム）"],
  ["設立", "2025年"],
  ["代表", "代表社員"],
  ["所在地", "日本"],
  ["事業内容", "Web制作 / MEO対策 / SEO・GEO対策 / AI導入支援"],
  ["メール", "contact@paradigmjp.com"],
  ["Webサイト", "https://paradigmjp.com"],
]

export default function AboutPage() {
  return (
    <>
      <PageHero
        badge="About"
        title="テクノロジーで、ビジネスの常識を変える。"
        desc="Web制作・MEO対策・SEO/GEO対策・AI導入支援を一貫してご提供し、中小企業のデジタルトランスフォーメーションを包括的に支援するパートナーです。"
      />

      {/* Mission band */}
      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <p className="paradigm-eyebrow mb-6">Mission</p>
          <h2 className="font-display text-[32px] md:text-[52px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink mb-10">
            デジタルで、事業を加速する。
          </h2>
          <p className="text-[15px] md:text-[17px] text-paradigm-ink-soft leading-[1.9] max-w-2xl">
            私たちParadigm合同会社は、Web制作・MEO対策・SEO/GEO対策・AI導入支援を通じて、中小企業のデジタルトランスフォーメーションを包括的にサポートします。最新のAI技術とデジタルマーケティングの知見を組み合わせ、お客様のビジネスが持続的に成長できる基盤を構築します。
          </p>
        </div>
      </section>

      {/* Values band — paper-deep contrast */}
      <section className="bg-paradigm-paper-deep paradigm-section">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="mb-16 max-w-2xl">
            <p className="paradigm-eyebrow mb-5">Values</p>
            <h2 className="font-display text-[32px] md:text-[48px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              大切にしている価値観
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-paradigm-line">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-paradigm-paper-deep p-9 md:p-10">
                <h3 className="font-display text-[24px] md:text-[26px] leading-[1.25] text-paradigm-ink mb-4">
                  {v.title}
                </h3>
                <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85]">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company info table */}
      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <div className="mb-12">
            <p className="paradigm-eyebrow mb-5">Company</p>
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              基本情報
            </h2>
          </div>
          <dl className="border-t border-paradigm-line">
            {COMPANY_INFO.map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-1 md:grid-cols-[200px_1fr] border-b border-paradigm-line py-5"
              >
                <dt className="paradigm-eyebrow text-paradigm-ink-soft md:pt-0.5">
                  {label}
                </dt>
                <dd className="text-[14px] md:text-[15px] text-paradigm-ink leading-[1.7] mt-2 md:mt-0">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA closing — ink reverse */}
      <section className="bg-paradigm-ink text-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">Together</p>
          <h2 className="font-display text-[32px] md:text-[52px] leading-[1.1] tracking-[-0.015em] text-paradigm-paper mb-6">
            一緒にデジタルを活用しませんか？
          </h2>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/65 max-w-xl mx-auto mb-10 leading-[1.85]">
            御社のデジタル課題、お気軽にご相談ください。
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 border border-paradigm-paper text-paradigm-paper px-10 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-paper hover:text-paradigm-ink transition-colors"
          >
            無料相談を予約する
          </Link>
        </div>
      </section>
    </>
  )
}
