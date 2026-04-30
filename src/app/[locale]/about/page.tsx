/**
 * /[locale]/about — 会社概要・チーム・思想 (locale 別 metadata + section composition)
 *
 * 役割:   会社概要・チーム・思想 (locale 別 metadata + section composition)
 * 入力:   params.locale
 * 出力:   PageHero + content sections + RichCtaBand
 *
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { Rocket, Handshake, Lightbulb } from "lucide-react"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "会社概要" : "About",
    description: isJa
      ? "Paradigm合同会社の会社概要。デジタル技術で中小企業の成長を支援するパートナーです。"
      : "About Paradigm LLC. We help SMBs grow through digital technology.",
  }
}

const VALUES_JA = [
  { icon: Rocket, gradient: "from-pink-400 via-paradigm-accent to-paradigm-tech", title: "成果にコミットする", desc: "「納品して終わり」ではなく、数字で成果が出るまで伴走します。KPI を共有し、データに基づく改善を継続します。" },
  { icon: Handshake, gradient: "from-paradigm-tech via-paradigm-glow to-violet-400", title: "ワンストップで安心", desc: "Web 制作・集客・AI を一貫して提供。複数業者への発注コストと管理の手間をなくします。" },
  { icon: Lightbulb, gradient: "from-paradigm-glow via-violet-400 to-pink-400", title: "最新技術を、わかりやすく", desc: "AI・GEO 等の最先端技術も、お客様にわかりやすくお伝えし、無理のない形で導入を支援します。" },
] as const
const VALUES_EN = [
  { icon: Rocket, gradient: "from-pink-400 via-paradigm-accent to-paradigm-tech", title: "Outcomes over deliverables", desc: "Not 'ship and forget' — we partner until the numbers move. Shared KPIs, data-driven iteration." },
  { icon: Handshake, gradient: "from-paradigm-tech via-paradigm-glow to-violet-400", title: "One-stop confidence", desc: "Web build + traffic + AI under one roof. No fragmented vendors to coordinate." },
  { icon: Lightbulb, gradient: "from-paradigm-glow via-violet-400 to-pink-400", title: "Plain-spoken modern tech", desc: "AI / GEO and other frontier tech, explained clearly. Adopted at a sustainable pace." },
] as const

const COMPANY_INFO_JA: ReadonlyArray<readonly [string, string]> = [
  ["会社名", "Paradigm 合同会社（パラダイム）"],
  ["設立", "2025 年"],
  ["代表", "代表社員"],
  ["所在地", "日本"],
  ["事業内容", "Web 制作 / MEO 対策 / SEO・GEO 対策 / AI 導入支援"],
  ["メール", "contact@paradigmjp.com"],
  ["Webサイト", "https://paradigmjp.com"],
]
const COMPANY_INFO_EN: ReadonlyArray<readonly [string, string]> = [
  ["Company", "Paradigm LLC (Paradigm 合同会社)"],
  ["Founded", "2025"],
  ["Representative", "Managing Member"],
  ["Location", "Japan"],
  ["Services", "Web development / MEO / SEO+GEO / AI integration"],
  ["Email", "contact@paradigmjp.com"],
  ["Website", "https://paradigmjp.com"],
]

export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  const isJa = locale === "ja"
  const VALUES = isJa ? VALUES_JA : VALUES_EN
  const COMPANY_INFO = isJa ? COMPANY_INFO_JA : COMPANY_INFO_EN

  return (
    <>
      <PageHero
        badge="About"
        title={isJa ? "テクノロジーで、ビジネスの常識を変える。" : "Reframe what business does with technology."}
        highlight={isJa ? "ビジネスの常識" : "what business does"}
        desc={isJa ? "Web 制作・MEO 対策・SEO/GEO 対策・AI 導入支援を一貫してご提供し、中小企業のデジタルトランスフォーメーションを包括的に支援するパートナーです。" : "End-to-end web, MEO, SEO/GEO, and AI integration. We are your partner for SMB digital transformation."}
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-40" />
        <FadeIn className="relative z-10 max-w-3xl mx-auto px-6 md:px-8 text-center">
          <p className="paradigm-eyebrow mb-3 text-paradigm-accent">Mission</p>
          <h2 className="font-display text-[28px] md:text-[44px] leading-[1.1] tracking-[-0.025em] text-paradigm-ink mb-6">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-tech bg-clip-text text-transparent">
              {isJa ? "デジタルで、事業を加速する。" : "Accelerate business with digital."}
            </span>
          </h2>
          <p className="text-[14px] md:text-[16px] text-paradigm-ink-soft leading-[1.85] max-w-2xl mx-auto">
            {isJa
              ? "私たち Paradigm 合同会社は、Web 制作・MEO 対策・SEO/GEO 対策・AI 導入支援を通じて、中小企業のデジタルトランスフォーメーションを包括的にサポートします。最新の AI 技術とデジタルマーケティングの知見を組み合わせ、お客様のビジネスが持続的に成長できる基盤を構築します。"
              : "Paradigm LLC supports SMB digital transformation through web development, MEO, SEO/GEO, and AI integration. We combine state-of-the-art AI with proven digital marketing expertise to build foundations for sustained growth."}
          </p>
        </FadeIn>
      </section>

      <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-50" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-10 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Values</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1] tracking-[-0.025em] text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
                {isJa ? "大切にしている価値観" : "What we stand for"}
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {VALUES.map((v, idx) => {
              const Icon = v.icon
              return (
                <FadeIn key={v.title} delay={idx * 0.1}>
                  <div className="paradigm-glass rounded-2xl p-6 md:p-7 paradigm-glow-sm hover:paradigm-glow-lg hover:-translate-y-1 transition-all duration-500 h-full">
                    <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${v.gradient} text-paradigm-paper mb-4 paradigm-glow-sm`}>
                      <Icon size={20} strokeWidth={1.5} />
                    </div>
                    <h3 className="font-display text-[18px] md:text-[20px] leading-[1.2] text-paradigm-ink mb-2 tracking-[-0.015em]">{v.title}</h3>
                    <p className="text-[13px] text-paradigm-ink-soft leading-[1.75]">{v.desc}</p>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Company</p>
            <h2 className="font-display text-[26px] md:text-[36px] leading-[1.15] tracking-[-0.025em] text-paradigm-ink">
              {isJa ? "基本情報" : "Company information"}
            </h2>
          </FadeIn>
          <FadeIn>
            <div className="paradigm-glass rounded-2xl overflow-hidden border border-paradigm-line paradigm-glow-sm">
              <dl>
                {COMPANY_INFO.map(([label, value], i) => (
                  <div key={label} className={`grid grid-cols-1 md:grid-cols-[180px_1fr] py-4 px-6 ${i < COMPANY_INFO.length - 1 ? "border-b border-paradigm-line/60" : ""}`}>
                    <dt className="paradigm-eyebrow text-paradigm-accent md:pt-0.5">{label}</dt>
                    <dd className="text-[13px] md:text-[14px] text-paradigm-ink leading-[1.7] mt-1.5 md:mt-0">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </FadeIn>
        </div>
      </section>

      <RichCtaBand
        eyebrow="Together"
        title={isJa ? "一緒にデジタルを活用しませんか？" : "Let's go digital together"}
        highlight={isJa ? "デジタル" : "digital"}
        desc={isJa ? "御社のデジタル課題、お気軽にご相談ください。" : "Tell us about your digital challenges — we'd love to help."}
        buttonLabel={isJa ? "無料相談を予約する" : "Book a free consultation"}
      />
    </>
  )
}
