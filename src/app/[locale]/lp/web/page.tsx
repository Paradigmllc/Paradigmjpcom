/**
 * /[locale]/lp/web — Web 制作専用 LP (リード獲得導線)
 *
 * 役割:   Web 制作専用 LP (リード獲得導線)
 * 入力:   params.locale
 * 出力:   Pain → Solution → Plans → FAQ → CTA Band
 *
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { X, Check } from "lucide-react"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import { BorderBeam } from "@/components/magicui/border-beam"
import { Link } from "@/i18n/routing"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "【無料相談】Web制作 | Paradigm合同会社" : "Web development free consultation | Paradigm",
    description: isJa
      ? "Next.js/WordPressによる高速・SEO最適化サイトを298,000円〜。Lighthouse 95+の高品質サイトを制作。初回相談無料。"
      : "High-performance Next.js / WordPress sites from $2,000+. Lighthouse 95+ quality. Free first consultation.",
  }
}

const PAINS_JA = ["サイトの表示が遅くてユーザーが離脱している", "スマホで見ると崩れる・読みにくい", "作ったまま放置で問い合わせが来ない", "制作会社に頼んだが修正対応が遅い", "SEO が弱くて検索から見つけてもらえない", "自分で更新できない（CMS 未導入）"] as const
const PAINS_EN = ["Slow page loads driving users away", "Layout breaks on mobile", "Set-and-forget site getting zero leads", "Slow turnaround from your current agency", "Weak SEO — invisible in search", "Can't update content yourself (no CMS)"] as const

const SOLUTIONS_JA = [
  { gradient: "from-pink-400 via-paradigm-accent to-paradigm-tech", title: "表示速度 95+", desc: "Next.js / WordPress で高速化。Core Web Vitals を最適化し、SEO にも好影響。" },
  { gradient: "from-paradigm-tech via-paradigm-glow to-violet-400", title: "モバイルファースト", desc: "スマホでの操作性を最優先にデザイン。全デバイスで美しく表示。" },
  { gradient: "from-paradigm-glow via-violet-400 to-pink-400", title: "SEO 標準装備", desc: "構造化データ・メタタグ・サイトマップ等、SEO 内部対策を標準で実施。" },
] as const

const SOLUTIONS_EN = [
  { gradient: "from-pink-400 via-paradigm-accent to-paradigm-tech", title: "Lighthouse 95+", desc: "Next.js / WordPress optimised for Core Web Vitals. SEO benefits as a bonus." },
  { gradient: "from-paradigm-tech via-paradigm-glow to-violet-400", title: "Mobile-first", desc: "Designed for mobile UX first. Renders beautifully across every device." },
  { gradient: "from-paradigm-glow via-violet-400 to-pink-400", title: "SEO included", desc: "Structured data, meta tags, sitemap — on-page SEO baseline included." },
] as const

type Plan = { name: string; price: string; desc: string; features: readonly string[]; popular?: boolean }
const PLANS_JA: readonly Plan[] = [
  { name: "ライト", price: "298,000", desc: "5 ページ以内", features: ["トップ+4 ページ", "レスポンシブ", "SEO 基本", "1 ヶ月サポート"] },
  { name: "スタンダード", price: "598,000", desc: "10 ページ以内", features: ["トップ+9 ページ", "CMS 導入", "SEO 内部対策", "アニメーション", "3 ヶ月サポート"], popular: true },
  { name: "プレミアム", price: "980,000", desc: "ページ数無制限", features: ["Next.js カスタム", "多言語対応", "デザイン 3 案", "6 ヶ月サポート"] },
]
const PLANS_EN: readonly Plan[] = [
  { name: "Light", price: "298,000", desc: "Up to 5 pages", features: ["Home + 4 pages", "Responsive", "SEO basics", "1 month support"] },
  { name: "Standard", price: "598,000", desc: "Up to 10 pages", features: ["Home + 9 pages", "CMS", "On-page SEO", "Animations", "3 month support"], popular: true },
  { name: "Premium", price: "980,000", desc: "Unlimited pages", features: ["Next.js custom", "i18n", "3 design variants", "6 month support"] },
]

export default async function WebLP({ params }: Props) {
  const { locale } = await params
  const isJa = locale === "ja"
  const PAINS = isJa ? PAINS_JA : PAINS_EN
  const SOLUTIONS = isJa ? SOLUTIONS_JA : SOLUTIONS_EN
  const PLANS = isJa ? PLANS_JA : PLANS_EN

  return (
    <>
      <PageHero
        badge={isJa ? "Web 制作 Landing" : "Web Development Landing"}
        title={isJa ? "売れるサイトを、最新技術で。" : "Sites that sell, on modern stacks."}
        highlight={isJa ? "売れるサイト" : "sell"}
        desc={isJa ? "Lighthouse 95+ の高速サイトを 298,000 円〜。デザイン → コーディング → SEO → 公開後運用まで一貫対応。初回 30 分のオンライン相談は完全無料。" : "Lighthouse 95+ sites from $2,000+. Design → code → SEO → ops, end-to-end. First 30-minute call free."}
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Pains</p>
            <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-pink-400 to-paradigm-accent bg-clip-text text-transparent">
                {isJa ? "こんなお悩みありませんか？" : "Any of these sound familiar?"}
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
            {PAINS.map((p, i) => (
              <FadeIn key={p} delay={i * 0.05}>
                <div className="paradigm-glass rounded-xl p-4 paradigm-glow-sm flex items-start gap-3 hover:paradigm-glow-md transition-all duration-500">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-paradigm-accent text-paradigm-paper flex-shrink-0">
                    <X size={12} strokeWidth={2.5} />
                  </span>
                  <span className="text-[13px] md:text-[14px] text-paradigm-ink leading-[1.6]">{p}</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-50" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-10 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Solution</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1] tracking-[-0.025em] text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-tech bg-clip-text text-transparent">
                {isJa ? "Paradigm が全て解決します" : "Paradigm solves all of these."}
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {SOLUTIONS.map((s, i) => (
              <FadeIn key={s.title} delay={i * 0.08}>
                <article className="paradigm-glass rounded-2xl p-5 md:p-6 paradigm-glow-sm hover:paradigm-glow-lg hover:-translate-y-1 transition-all duration-500 h-full">
                  <p className={`paradigm-eyebrow inline-block bg-gradient-to-br ${s.gradient} bg-clip-text text-transparent text-[10px] mb-3`}>0{i + 1}</p>
                  <h3 className="font-display text-[18px] md:text-[22px] leading-[1.2] text-paradigm-ink mb-2 tracking-[-0.015em]">{s.title}</h3>
                  <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.7]">{s.desc}</p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Pricing</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1] tracking-[-0.025em] text-paradigm-ink">
              {isJa ? "明確な料金体系" : "Transparent pricing"}
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {PLANS.map((p, i) => (
              <FadeIn key={p.name} delay={i * 0.08}>
                <div className={`relative paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 flex flex-col h-full ${p.popular ? "border border-paradigm-accent/40 paradigm-glow-lg" : ""}`}>
                  {p.popular && <BorderBeam size={180} duration={9} colorFrom="rgb(244 114 182)" colorTo="rgb(14 165 233)" borderWidth={1.5} />}
                  {p.popular && (
                    <p className="absolute top-4 right-4 paradigm-eyebrow text-paradigm-accent paradigm-glass rounded-full px-2.5 py-1 text-[10px] paradigm-glow-sm">
                      {isJa ? "人気No.1" : "Most popular"}
                    </p>
                  )}
                  <h3 className="font-display text-[20px] leading-[1.15] text-paradigm-ink mb-1 tracking-[-0.015em] relative z-10">{p.name}</h3>
                  <p className="text-[12px] text-paradigm-ink-soft mb-4 leading-[1.65] relative z-10">{p.desc}</p>
                  <p className="font-display text-[28px] md:text-[34px] leading-none mb-1 relative z-10">
                    <span className="bg-gradient-to-br from-paradigm-accent via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">¥{p.price}</span>
                    <span className="text-[12px] font-sans text-paradigm-ink-soft ml-1">{isJa ? "〜" : "+"}</span>
                  </p>
                  <ul className="border-t border-paradigm-line/60 mt-4 mb-5 flex-1 relative z-10">
                    {p.features.map((f) => (
                      <li key={f} className="border-b border-paradigm-line/60 py-2 text-[12px] text-paradigm-ink-soft leading-[1.6] flex items-center gap-2">
                        <Check size={11} className="text-paradigm-accent flex-shrink-0" strokeWidth={2.5} />{f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/contact" className={`relative z-10 mt-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[11px] tracking-[0.14em] uppercase font-semibold transition-colors ${p.popular ? "bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent" : "paradigm-glass text-paradigm-ink-soft hover:text-paradigm-ink"}`}>
                    {isJa ? "相談する" : "Get in touch"}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <RichCtaBand
        eyebrow="Begin"
        title={isJa ? "まずは無料相談から" : "Start with a free consultation"}
        highlight={isJa ? "無料相談" : "free consultation"}
        desc={isJa ? "御社の Web サイトを最短 2 週間で刷新します。" : "Rebuild your site in as little as 2 weeks."}
        buttonLabel={isJa ? "無料相談を予約する（30 分）" : "Book a free 30-min call"}
      />
    </>
  )
}
