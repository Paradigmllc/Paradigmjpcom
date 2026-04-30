import type { Metadata } from "next"
import { Link } from "@/i18n/routing"

/**
 * /[locale]/lp/ai — AI 導入支援 LP (Aesop voice). AE-PHP-1: 105 lines.
 */

export const metadata: Metadata = {
  title: "【無料相談】AI導入支援 | Paradigm合同会社",
  description: "ChatGPT/Geminiを業務に導入。チャットボット構築、業務自動化、データ分析で業務時間を平均40%削減。198,000円〜。",
}

const STATS = [
  { num: "40%", label: "業務時間削減", desc: "繰り返し作業を AI が自動化。人間はクリエイティブな業務に集中。" },
  { num: "80%", label: "問い合わせ自動化", desc: "AI チャットボットが24時間対応。人件費を大幅に削減。" },
  { num: "1/5", label: "レポート作成時間", desc: "データ収集 → 分析 → 作成を AI が自動化。意思決定を加速。" },
] as const

const FAQS = [
  {
    q: "プログラミング知識がなくても大丈夫？",
    a: "はい。導入から運用まで全てサポートします。操作マニュアルと社内研修もセットです。",
  },
  {
    q: "どのくらいの期間で導入できる？",
    a: "チャットボットなら最短2週間。業務自動化は1〜2ヶ月が目安です。",
  },
  {
    q: "既存のシステムと連携できる？",
    a: "はい。Google Workspace、Slack、各種 CRM 等との連携が可能です。",
  },
] as const

export default function AiLP() {
  return (
    <div className="bg-paradigm-paper">
      <section className="bg-paradigm-ink text-paradigm-paper paradigm-section pt-44">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">AI 導入支援サービス</p>
          <h1 className="font-display text-[44px] md:text-[72px] leading-[1.05] tracking-[-0.015em] text-paradigm-paper mb-8">
            AI を、<span className="italic text-paradigm-paper/80">ビジネスの武器に。</span>
          </h1>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/65 max-w-2xl mx-auto mb-8 leading-[1.85]">
            チャットボット構築・業務自動化・データ分析。最新 AI で業務時間を平均40%削減。
          </p>
          <p className="font-display text-[36px] md:text-[44px] text-paradigm-paper mb-10">
            ¥198,000<span className="text-[15px] font-sans text-paradigm-paper/55 ml-2">〜（税別）</span>
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 border border-paradigm-paper text-paradigm-paper px-10 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-paper hover:text-paradigm-ink transition-colors"
          >
            無料相談を予約する
          </Link>
        </div>
      </section>

      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="mb-16 max-w-2xl">
            <p className="paradigm-eyebrow mb-5">Outcomes</p>
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              AI 導入で変わる3つの数字
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-paradigm-line">
            {STATS.map((s) => (
              <div key={s.label} className="bg-paradigm-paper p-9 md:p-10">
                <p className="font-display text-[44px] md:text-[56px] leading-[1.05] text-paradigm-ink mb-3">
                  {s.num}
                </p>
                <p className="paradigm-eyebrow mb-3">{s.label}</p>
                <p className="text-[14px] text-paradigm-ink-soft leading-[1.85]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paradigm-paper-deep paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <div className="mb-12 max-w-2xl">
            <p className="paradigm-eyebrow mb-5">FAQ</p>
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              専門知識は不要です
            </h2>
          </div>
          <ul className="border-t border-paradigm-line">
            {FAQS.map((f) => (
              <li key={f.q} className="border-b border-paradigm-line py-7">
                <p className="font-display text-[20px] md:text-[22px] leading-[1.3] text-paradigm-ink mb-3">
                  {f.q}
                </p>
                <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85]">
                  {f.a}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-paradigm-ink text-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">Begin</p>
          <h2 className="font-display text-[32px] md:text-[52px] leading-[1.1] tracking-[-0.015em] text-paradigm-paper mb-6">
            AI 導入の第一歩を踏み出しませんか？
          </h2>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/65 max-w-xl mx-auto mb-10 leading-[1.85]">
            無料相談で御社に最適な AI 活用プランをご提案します。
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 border border-paradigm-paper text-paradigm-paper px-12 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-paper hover:text-paradigm-ink transition-colors"
          >
            無料相談を予約する（30分）
          </Link>
        </div>
      </section>
    </div>
  )
}
