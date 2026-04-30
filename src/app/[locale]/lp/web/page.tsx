import type { Metadata } from "next"
import { X, Check } from "lucide-react"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import { BorderBeam } from "@/components/magicui/border-beam"
import { Link } from "@/i18n/routing"

export const metadata: Metadata = {
  title: "【無料相談】Web制作 | Paradigm合同会社",
  description: "Next.js/WordPressによる高速・SEO最適化サイトを298,000円〜。Lighthouse 95+の高品質サイトを制作します。初回相談無料。",
}

const PAINS = [
  "サイトの表示が遅くてユーザーが離脱している",
  "スマホで見ると崩れる・読みにくい",
  "作ったまま放置で問い合わせが来ない",
  "制作会社に頼んだが修正対応が遅い",
  "SEO が弱くて検索から見つけてもらえない",
  "自分で更新できない（CMS 未導入）",
] as const

const SOLUTIONS = [
  { gradient: "from-pink-400 via-paradigm-accent to-paradigm-tech", title: "表示速度 95+", desc: "Next.js / WordPress で高速化。Core Web Vitals を最適化し、SEO にも好影響。" },
  { gradient: "from-paradigm-tech via-paradigm-glow to-violet-400", title: "モバイルファースト", desc: "スマホでの操作性を最優先にデザイン。全デバイスで美しく表示。" },
  { gradient: "from-paradigm-glow via-violet-400 to-pink-400", title: "SEO 標準装備", desc: "構造化データ・メタタグ・サイトマップ等、SEO 内部対策を標準で実施。" },
] as const

type Plan = { name: string; price: string; desc: string; features: readonly string[]; popular?: boolean }
const PLANS: readonly Plan[] = [
  { name: "ライト", price: "298,000", desc: "5 ページ以内", features: ["トップ+4 ページ", "レスポンシブ", "SEO 基本", "1 ヶ月サポート"] },
  { name: "スタンダード", price: "598,000", desc: "10 ページ以内", features: ["トップ+9 ページ", "CMS 導入", "SEO 内部対策", "アニメーション", "3 ヶ月サポート"], popular: true },
  { name: "プレミアム", price: "980,000", desc: "ページ数無制限", features: ["Next.js カスタム", "多言語対応", "デザイン 3 案", "6 ヶ月サポート"] },
]

export default function WebLP() {
  return (
    <>
      <PageHero
        badge="Web 制作 Landing"
        title="売れるサイトを、最新技術で。"
        highlight="売れるサイト"
        desc="Lighthouse 95+ の高速サイトを 298,000 円〜。デザイン → コーディング → SEO → 公開後運用まで一貫対応。初回 30 分のオンライン相談は完全無料。"
      />

      {/* Pains */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Pains</p>
            <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-pink-400 to-paradigm-accent bg-clip-text text-transparent">
                こんなお悩みありませんか？
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

      {/* Solutions */}
      <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-50" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-10 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Solution</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1] tracking-[-0.025em] text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-tech bg-clip-text text-transparent">
                Paradigm が全て解決します
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {SOLUTIONS.map((s, i) => (
              <FadeIn key={s.title} delay={i * 0.08}>
                <article className="paradigm-glass rounded-2xl p-5 md:p-6 paradigm-glow-sm hover:paradigm-glow-lg hover:-translate-y-1 transition-all duration-500 h-full">
                  <p className={`paradigm-eyebrow inline-block bg-gradient-to-br ${s.gradient} bg-clip-text text-transparent text-[10px] mb-3`}>
                    0{i + 1}
                  </p>
                  <h3 className="font-display text-[18px] md:text-[22px] leading-[1.2] text-paradigm-ink mb-2 tracking-[-0.015em]">{s.title}</h3>
                  <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.7]">{s.desc}</p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Pricing</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1] tracking-[-0.025em] text-paradigm-ink">明確な料金体系</h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {PLANS.map((p, i) => (
              <FadeIn key={p.name} delay={i * 0.08}>
                <div className={`relative paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 flex flex-col h-full ${p.popular ? "border border-paradigm-accent/40 paradigm-glow-lg" : ""}`}>
                  {p.popular && <BorderBeam size={180} duration={9} colorFrom="rgb(244 114 182)" colorTo="rgb(14 165 233)" borderWidth={1.5} />}
                  {p.popular && (
                    <p className="absolute top-4 right-4 paradigm-eyebrow text-paradigm-accent paradigm-glass rounded-full px-2.5 py-1 text-[10px] paradigm-glow-sm">人気No.1</p>
                  )}
                  <h3 className="font-display text-[20px] leading-[1.15] text-paradigm-ink mb-1 tracking-[-0.015em] relative z-10">{p.name}</h3>
                  <p className="text-[12px] text-paradigm-ink-soft mb-4 leading-[1.65] relative z-10">{p.desc}</p>
                  <p className="font-display text-[28px] md:text-[34px] leading-none mb-1 relative z-10">
                    <span className="bg-gradient-to-br from-paradigm-accent via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">¥{p.price}</span>
                    <span className="text-[12px] font-sans text-paradigm-ink-soft ml-1">〜</span>
                  </p>
                  <ul className="border-t border-paradigm-line/60 mt-4 mb-5 flex-1 relative z-10">
                    {p.features.map((f) => (
                      <li key={f} className="border-b border-paradigm-line/60 py-2 text-[12px] text-paradigm-ink-soft leading-[1.6] flex items-center gap-2">
                        <Check size={11} className="text-paradigm-accent flex-shrink-0" strokeWidth={2.5} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/contact"
                    className={`relative z-10 mt-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[11px] tracking-[0.14em] uppercase font-semibold transition-colors ${p.popular ? "bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent" : "paradigm-glass text-paradigm-ink-soft hover:text-paradigm-ink"}`}
                  >
                    相談する
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <RichCtaBand
        eyebrow="Begin"
        title="まずは無料相談から"
        highlight="無料相談"
        desc="御社の Web サイトを最短 2 週間で刷新します。"
        buttonLabel="無料相談を予約する（30 分）"
      />
    </>
  )
}
