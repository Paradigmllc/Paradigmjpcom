import type { Metadata } from "next"
import { Link } from "@/i18n/routing"

/**
 * /[locale]/lp/meo — MEO 対策 LP (Aesop voice). AE-PHP-1: 80 lines.
 */

export const metadata: Metadata = {
  title: "【無料診断】MEO対策 | Paradigm合同会社",
  description: "Googleマップで地域No.1へ。平均3ヶ月でTOP3表示を実現するMEO対策サービス。月額29,800円〜。初回無料診断実施中。",
}

const STATS = [
  { num: "TOP 3", label: "Google Maps 表示", desc: "地域検索で上位3位以内に表示。クリック率が大幅に向上します。" },
  { num: "+30 件", label: "月間来店増加", desc: "実績平均。MEO 対策後3ヶ月で月間来店数が30件以上増加。" },
  { num: "3 ヶ月", label: "効果が出る目安", desc: "早い場合は1ヶ月。平均3ヶ月でTOP3表示が見込めます。" },
] as const

const TARGETS = [
  "飲食店・カフェ", "美容室・サロン", "クリニック・歯科", "不動産",
  "整骨院・整体", "学習塾", "士業事務所", "ホテル・旅館",
] as const

export default function MeoLP() {
  return (
    <div className="bg-paradigm-paper">
      <section className="bg-paradigm-ink text-paradigm-paper paradigm-section pt-44">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">MEO 対策サービス</p>
          <h1 className="font-display text-[44px] md:text-[72px] leading-[1.05] tracking-[-0.015em] text-paradigm-paper mb-8">
            地域 No.1 を、<span className="italic text-paradigm-paper/80">Google マップで。</span>
          </h1>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/65 max-w-2xl mx-auto mb-8 leading-[1.85]">
            平均3ヶ月で Google マップ TOP3 表示を実現。来店型ビジネスの集客を最大化します。
          </p>
          <p className="font-display text-[36px] md:text-[44px] text-paradigm-paper mb-10">
            月額 ¥29,800<span className="text-[15px] font-sans text-paradigm-paper/55 ml-2">〜（税別）</span>
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 border border-paradigm-paper text-paradigm-paper px-10 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-paper hover:text-paradigm-ink transition-colors"
          >
            無料診断を受ける
          </Link>
        </div>
      </section>

      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="mb-16 max-w-2xl">
            <p className="paradigm-eyebrow mb-5">Outcomes</p>
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              MEO 対策で実現できること
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-paradigm-line">
            {STATS.map((s) => (
              <div key={s.label} className="bg-paradigm-paper p-9 md:p-10">
                <p className="font-display text-[36px] md:text-[44px] leading-[1.1] text-paradigm-ink mb-3">
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
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="mb-16 max-w-2xl">
            <p className="paradigm-eyebrow mb-5">Best Fit</p>
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              こんな業種に最適です
            </h2>
          </div>
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-px bg-paradigm-line">
            {TARGETS.map((i) => (
              <li key={i} className="bg-paradigm-paper-deep px-5 py-6 text-center text-[14px] text-paradigm-ink leading-[1.6]">
                {i}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-paradigm-ink text-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">Begin</p>
          <h2 className="font-display text-[32px] md:text-[52px] leading-[1.1] tracking-[-0.015em] text-paradigm-paper mb-6">
            まずは無料診断から
          </h2>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/65 max-w-xl mx-auto mb-10 leading-[1.85]">
            御社の Google ビジネスプロフィールを無料で診断します。
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
