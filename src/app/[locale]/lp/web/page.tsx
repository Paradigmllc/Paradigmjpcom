import type { Metadata } from "next"
import { Link } from "@/i18n/routing"

/**
 * /[locale]/lp/web — Web 制作 landing page (Aesop voice).
 * 4-band: ink reverse hero / pains hairline grid / solutions paper-deep / pricing / CTA
 * AE-PHP-1: 110 lines.
 */

export const metadata: Metadata = {
  title: "【無料相談】Web制作 | Paradigm合同会社",
  description: "Next.js/WordPressによる高速・SEO最適化サイトを298,000円〜。Lighthouse 95+の高品質サイトを制作します。初回相談無料。",
}

const PAINS = [
  "サイトの表示が遅くてユーザーが離脱している",
  "スマホで見ると崩れる・読みにくい",
  "作ったまま放置で問い合わせが来ない",
  "制作会社に頼んだが修正対応が遅い",
  "SEOが弱くて検索から見つけてもらえない",
  "自分で更新できない（CMS未導入）",
] as const

const SOLUTIONS = [
  { title: "表示速度 95+", desc: "Next.js/WordPress で高速化。Core Web Vitals を最適化し、SEO にも好影響。" },
  { title: "モバイルファースト", desc: "スマホでの操作性を最優先にデザイン。全デバイスで美しく表示。" },
  { title: "SEO 標準装備", desc: "構造化データ・メタタグ・サイトマップ等、SEO 内部対策を標準で実施。" },
] as const

type Plan = {
  name: string
  price: string
  desc: string
  features: readonly string[]
  popular?: boolean
}

const PLANS: readonly Plan[] = [
  { name: "ライト", price: "298,000", desc: "5 ページ以内", features: ["トップ+4ページ", "レスポンシブ", "SEO 基本", "1ヶ月サポート"] },
  { name: "スタンダード", price: "598,000", desc: "10 ページ以内", features: ["トップ+9ページ", "CMS 導入", "SEO 内部対策", "アニメーション", "3ヶ月サポート"], popular: true },
  { name: "プレミアム", price: "980,000", desc: "ページ数無制限", features: ["Next.js カスタム", "多言語対応", "デザイン3案", "6ヶ月サポート"] },
]

export default function WebLP() {
  return (
    <div className="bg-paradigm-paper">
      <section className="bg-paradigm-ink text-paradigm-paper paradigm-section pt-44">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">Web 制作サービス</p>
          <h1 className="font-display text-[44px] md:text-[72px] leading-[1.05] tracking-[-0.015em] text-paradigm-paper mb-8">
            売れるサイトを、<span className="italic text-paradigm-paper/80">最新技術で。</span>
          </h1>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/65 max-w-2xl mx-auto mb-8 leading-[1.85]">
            Lighthouse 95+ の高速サイトを制作。デザイン → コーディング → SEO → 公開後運用まで一貫対応。
          </p>
          <p className="font-display text-[36px] md:text-[44px] text-paradigm-paper mb-10">
            ¥298,000<span className="text-[15px] font-sans text-paradigm-paper/55 ml-2">〜（税別）</span>
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 border border-paradigm-paper text-paradigm-paper px-10 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-paper hover:text-paradigm-ink transition-colors"
          >
            無料相談を予約する
          </Link>
          <p className="paradigm-eyebrow text-paradigm-paper/40 mt-6">
            初回30分のオンライン相談は完全無料
          </p>
        </div>
      </section>

      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-4xl mx-auto px-6 md:px-12">
          <div className="mb-16 max-w-2xl">
            <p className="paradigm-eyebrow mb-5">Pains</p>
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              こんなお悩みありませんか？
            </h2>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-paradigm-line">
            {PAINS.map((p) => (
              <li key={p} className="bg-paradigm-paper px-6 py-6 text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.7]">
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-paradigm-paper-deep paradigm-section">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="mb-16 max-w-2xl">
            <p className="paradigm-eyebrow mb-5">Solution</p>
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              Paradigm が全て解決します
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-paradigm-line">
            {SOLUTIONS.map((s, i) => (
              <article key={s.title} className="bg-paradigm-paper-deep p-9 md:p-10">
                <p className="paradigm-eyebrow mb-4">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="font-display text-[24px] md:text-[26px] leading-[1.25] text-paradigm-ink mb-3">
                  {s.title}
                </h3>
                <p className="text-[14px] text-paradigm-ink-soft leading-[1.85]">{s.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="mb-16 max-w-2xl">
            <p className="paradigm-eyebrow mb-5">Pricing</p>
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              明確な料金体系
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-paradigm-line">
            {PLANS.map((p) => (
              <div key={p.name} className="bg-paradigm-paper p-8 md:p-10 flex flex-col">
                {p.popular && <p className="paradigm-eyebrow text-paradigm-accent mb-4">人気No.1</p>}
                <h3 className="font-display text-[24px] md:text-[28px] leading-[1.2] text-paradigm-ink mb-1">
                  {p.name}
                </h3>
                <p className="text-[13px] text-paradigm-ink-soft mb-6">{p.desc}</p>
                <p className="font-display text-[36px] text-paradigm-ink mb-1">
                  ¥{p.price}
                  <span className="text-[14px] font-sans text-paradigm-ink-soft ml-1">〜</span>
                </p>
                <ul className="border-t border-paradigm-line mt-6 mb-8 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="border-b border-paradigm-line py-3 text-[13px] text-paradigm-ink-soft leading-[1.7]">
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/contact"
                  className={`mt-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-[12px] tracking-[0.18em] uppercase transition-colors ${
                    p.popular
                      ? "bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent"
                      : "border border-paradigm-line text-paradigm-ink-soft hover:border-paradigm-ink hover:text-paradigm-ink"
                  }`}
                >
                  相談する
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paradigm-ink text-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">Begin</p>
          <h2 className="font-display text-[32px] md:text-[52px] leading-[1.1] tracking-[-0.015em] text-paradigm-paper mb-6">
            まずは無料相談から
          </h2>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/65 max-w-xl mx-auto mb-10 leading-[1.85]">
            御社の Web サイトを最短2週間で刷新します。
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
