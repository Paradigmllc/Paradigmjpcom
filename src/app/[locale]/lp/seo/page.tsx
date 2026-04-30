import type { Metadata } from "next"
import { Link } from "@/i18n/routing"

/**
 * /[locale]/lp/seo — SEO/GEO 対策 LP (Aesop voice). AE-PHP-1: 90 lines.
 */

export const metadata: Metadata = {
  title: "【無料診断】SEO/GEO対策 | Paradigm合同会社",
  description: "従来のSEO+AI検索対応(GEO)の二刀流。オーガニック流入を平均2.5倍に。月額49,800円〜。無料サイト診断実施中。",
}

export default function SeoLP() {
  return (
    <div className="bg-paradigm-paper">
      <section className="bg-paradigm-ink text-paradigm-paper paradigm-section pt-44">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">SEO / GEO 対策サービス</p>
          <h1 className="font-display text-[44px] md:text-[72px] leading-[1.05] tracking-[-0.015em] text-paradigm-paper mb-8">
            検索される仕組みを、<span className="italic text-paradigm-paper/80">つくる。</span>
          </h1>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/65 max-w-2xl mx-auto mb-8 leading-[1.85]">
            Google 検索 + AI 検索（ChatGPT/Gemini）の二刀流対策。オーガニック流入を平均2.5倍に。
          </p>
          <p className="font-display text-[36px] md:text-[44px] text-paradigm-paper mb-10">
            月額 ¥49,800<span className="text-[15px] font-sans text-paradigm-paper/55 ml-2">〜（税別）</span>
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 border border-paradigm-paper text-paradigm-paper px-10 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-paper hover:text-paradigm-ink transition-colors"
          >
            無料サイト診断を受ける
          </Link>
        </div>
      </section>

      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="mb-16 max-w-2xl">
            <p className="paradigm-eyebrow mb-5">Comparison</p>
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              SEO だけでは、もう足りない
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-paradigm-line">
            <div className="bg-paradigm-paper p-9 md:p-10">
              <p className="paradigm-eyebrow mb-4">Conventional</p>
              <h3 className="font-display text-[24px] md:text-[28px] leading-[1.2] text-paradigm-ink mb-4">
                従来の SEO
              </h3>
              <p className="text-[14px] text-paradigm-ink-soft mb-6 leading-[1.85]">
                Google / Yahoo 検索での上位表示
              </p>
              <p className="font-display text-[32px] text-paradigm-ink mb-1">平均 2.5 倍</p>
              <p className="paradigm-eyebrow text-paradigm-ink-mute">オーガニック流入増加</p>
            </div>
            <div className="bg-paradigm-paper-deep p-9 md:p-10">
              <p className="paradigm-eyebrow text-paradigm-accent mb-4">New</p>
              <h3 className="font-display text-[24px] md:text-[28px] leading-[1.2] text-paradigm-ink mb-4">
                GEO（AI 検索対策）
              </h3>
              <p className="text-[14px] text-paradigm-ink-soft mb-6 leading-[1.85]">
                ChatGPT / Gemini / Perplexity での推薦
              </p>
              <p className="font-display text-[32px] text-paradigm-ink mb-1">業界初</p>
              <p className="paradigm-eyebrow text-paradigm-accent">AI 検索最適化サービス</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paradigm-ink text-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">Future</p>
          <h2 className="font-display text-[32px] md:text-[52px] leading-[1.1] tracking-[-0.015em] text-paradigm-paper mb-6">
            AI 時代の検索対策、始めませんか？
          </h2>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/65 max-w-xl mx-auto mb-10 leading-[1.85]">
            無料の SEO / GEO 診断レポートをお送りします。
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 border border-paradigm-paper text-paradigm-paper px-12 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-paper hover:text-paradigm-ink transition-colors"
          >
            無料診断を受ける
          </Link>
        </div>
      </section>
    </div>
  )
}
