/**
 * /[locale]/lp/ai — AI 導入支援専用 LP
 *
 * 役割:   AI 導入支援専用 LP
 * 入力:   params.locale
 * 出力:   Pain → Solution → Plans → FAQ → CTA Band
 *
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "【無料相談】AI導入支援 | Paradigm合同会社" : "AI Integration free consultation | Paradigm",
    description: isJa
      ? "ChatGPT/Geminiを業務に導入。チャットボット構築、業務自動化、データ分析で業務時間を平均40%削減。198,000円〜。"
      : "Bring ChatGPT / Gemini into operations. Chatbots, automation, analytics. Reduce ops time by ~40%. From ¥198,000+.",
  }
}

const STATS_JA = [
  { num: "40%", label: "業務時間削減", desc: "繰り返し作業を AI が自動化。人間はクリエイティブな業務に集中。", gradient: "from-pink-400 via-paradigm-accent to-paradigm-tech" },
  { num: "80%", label: "問い合わせ自動化", desc: "AI チャットボットが 24 時間対応。人件費を大幅に削減。", gradient: "from-paradigm-tech via-paradigm-glow to-violet-400" },
  { num: "1/5", label: "レポート作成時間", desc: "データ収集 → 分析 → 作成を AI が自動化。意思決定を加速。", gradient: "from-paradigm-glow via-violet-400 to-paradigm-accent" },
] as const
const STATS_EN = [
  { num: "-40%", label: "Operating time", desc: "AI automates repetitive work. Humans focus on creative tasks.", gradient: "from-pink-400 via-paradigm-accent to-paradigm-tech" },
  { num: "80%", label: "CS auto-handled", desc: "AI chatbot answers 24/7. Major labour cost reduction.", gradient: "from-paradigm-tech via-paradigm-glow to-violet-400" },
  { num: "1/5", label: "Reporting time", desc: "Collect → analyse → write — all automated. Faster decisions.", gradient: "from-paradigm-glow via-violet-400 to-paradigm-accent" },
] as const

const FAQS_JA = [
  { q: "プログラミング知識がなくても大丈夫？", a: "はい。導入から運用まで全てサポートします。操作マニュアルと社内研修もセットです。" },
  { q: "どのくらいの期間で導入できる？", a: "チャットボットなら最短 2 週間。業務自動化は 1〜2 ヶ月が目安です。" },
  { q: "既存のシステムと連携できる？", a: "はい。Google Workspace、Slack、各種 CRM 等との連携が可能です。" },
] as const
const FAQS_EN = [
  { q: "No coding knowledge — am I OK?", a: "Yes. We support deployment through operations end-to-end. Manuals and in-house training included." },
  { q: "How long does deployment take?", a: "Chatbots: ~2 weeks. Workflow automation: 1-2 months typically." },
  { q: "Will it integrate with our existing tools?", a: "Yes. Google Workspace, Slack, and major CRMs are supported." },
] as const

export default async function AiLP({ params }: Props) {
  const { locale } = await params
  const isJa = locale === "ja"
  const STATS = isJa ? STATS_JA : STATS_EN
  const FAQS = isJa ? FAQS_JA : FAQS_EN
  return (
    <>
      <PageHero
        badge={isJa ? "AI 導入支援 Landing" : "AI Integration Landing"}
        title={isJa ? "AI を、ビジネスの武器に。" : "Turn AI into a business weapon."}
        highlight={isJa ? "ビジネスの武器" : "business weapon"}
        desc={isJa ? "チャットボット構築・業務自動化・データ分析。最新 AI で業務時間を平均 40% 削減。198,000 円〜・初回相談無料。" : "Chatbots, automation, analytics. Latest AI cuts ops time by ~40%. From ¥198,000+, free first consultation."}
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-10 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Outcomes</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1] tracking-[-0.025em] text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-pink-400 bg-clip-text text-transparent">
                {isJa ? "AI 導入で変わる 3 つの数字" : "Three numbers AI changes"}
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {STATS.map((s, i) => (
              <FadeIn key={s.label} delay={i * 0.1}>
                <div className="paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-lg hover:-translate-y-1 transition-all duration-500 h-full">
                  <p className="font-display text-[40px] md:text-[56px] leading-[0.95] tracking-[-0.03em] mb-3">
                    <span className={`bg-gradient-to-br ${s.gradient} bg-clip-text text-transparent`}>{s.num}</span>
                  </p>
                  <p className="paradigm-eyebrow text-paradigm-accent mb-2">{s.label}</p>
                  <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.7]">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-50" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">FAQ</p>
            <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink">
              {isJa ? "専門知識は不要です" : "No expert knowledge required"}
            </h2>
          </FadeIn>
          <ul className="space-y-3">
            {FAQS.map((f, i) => (
              <FadeIn key={f.q} delay={i * 0.08}>
                <li className="paradigm-glass rounded-2xl p-5 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500">
                  <p className="font-display text-[16px] md:text-[18px] leading-[1.3] text-paradigm-ink mb-2 tracking-[-0.01em]">{f.q}</p>
                  <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.75]">{f.a}</p>
                </li>
              </FadeIn>
            ))}
          </ul>
        </div>
      </section>

      <RichCtaBand
        eyebrow="Begin"
        title={isJa ? "AI 導入の第一歩を踏み出しませんか？" : "Take the first step into AI"}
        highlight={isJa ? "AI 導入" : "AI"}
        desc={isJa ? "無料相談で御社に最適な AI 活用プランをご提案します。" : "Free consultation to scope your AI roadmap."}
        buttonLabel={isJa ? "無料相談を予約する" : "Book a free consultation"}
      />
    </>
  )
}
