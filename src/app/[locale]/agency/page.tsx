/**
 * /[locale]/agency — 代理店向けホワイトラベル LP (Sprint 9-C)
 *
 * 役割:   動画制作 WL パッケージの LP。代理店 CEO / 創業者向け.
 * 入力:   params.locale
 * 出力:   PageHero + ROI Calc + WL Pricing + 機能比較 + CTA
 *
 * 戦略原典:
 *   - product-strategy.jsx: WL は単価高・解約率低・pMoat
 *   - Notion 営業MVP壁打ち②: 「損失訴求 > 欲望訴求」(プロスペクト理論 2.5x)
 *
 * 想定顧客: 5-50 名規模の代理店 CEO・「Video Editor 求人中」シグナル
 * 訴求軸:   新収益源 (損失フレーミング: 「年 $X 消えている」)
 *
 * AE-PHP-4 準拠.
 */

import type { Metadata } from "next"
import { pageAlternates } from "@/lib/page-metadata"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import RoiCalculator from "@/components/agency/RoiCalculator"

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: "Agency White-Label | 動画案件を断らずに済む唯一の方法",
    description:
      "AI 動画制作パイプラインを御社ブランドで提供。クライアント数無制限・粗利率 85%+。Paradigm が裏方として全自動レンダリング。",
    alternates: pageAlternates(locale, "/agency"),
  }
}

const WL_PLANS = [
  {
    name: "Agency",
    price: "$8,000",
    period: "/月",
    videos: "月 100 本まで",
    desc: "中規模代理店向け・クライアント数無制限",
    features: [
      "WL 納品 (Paradigm の名前一切なし)",
      "Notion クライアント別 DB",
      "n8n リクエスト自動処理",
      "Slack 連携 / Webhook",
      "月次 MTG (オプション)",
    ],
    popular: false,
  },
  {
    name: "White",
    price: "$15,000",
    period: "/月",
    videos: "月 300 本まで",
    desc: "大規模代理店・自社ブランドダッシュボード付",
    features: [
      "自社ブランド管理画面 (custom domain)",
      "クライアント別納品レポート (WL)",
      "AI アバター動画 (Wan2.2 + MuseTalk)",
      "専任 Slack チャンネル + Engineer 1 名 attached",
      "年払い 25% OFF",
    ],
    popular: true,
  },
] as const

const COMPARISON_WL = [
  { item: "1 本仕入れ値", paradigm: "$80", outsourcing: "$300-800" },
  { item: "1 本クライアント請求", paradigm: "$150-400", outsourcing: "$500-1,500" },
  { item: "粗利率", paradigm: "85% 以上", outsourcing: "30-50%" },
  { item: "納期", paradigm: "24-48 時間", outsourcing: "1-3 週間" },
  { item: "スケール", paradigm: "月 300 本まで定額", outsourcing: "1 案件ごと交渉" },
  { item: "リスク", paradigm: "Paradigm が品質保証", outsourcing: "外注先がブラック化" },
] as const

const FAQ_ITEMS = [
  {
    q: "クライアントに Paradigm の名前が出てしまうことはありますか?",
    a: "ありません。納品物・メール・請求書すべて御社ブランドで発行されます。技術的にも DNS / メール送信元 / 動画ファイル名すべて御社設定です。",
  },
  {
    q: "クライアント数に上限はありますか?",
    a: "Agency / White プラン共にクライアント数は無制限です。月の合計納品本数 (100 本 or 300 本) が課金軸です。",
  },
  {
    q: "うちのデザイナーが既にいます。被りませんか?",
    a: "むしろ補完関係です。クリエイティブ判断 (色 / 構成) は御社デザイナー、量産 (テンプレ展開 / 字幕 / 音声合成) は Paradigm という分担が最も粗利が出ます。",
  },
  {
    q: "解約は自由ですか?",
    a: "月額プランは月単位解約自由です。年払い 25% OFF を選んだ場合のみ 12 ヶ月コミットです。",
  },
] as const

export default async function AgencyPage({ params }: Props) {
  const { locale } = await params

  return (
    <>
      <PageHero
        badge="Agency White-Label"
        title="動画案件を断るたびに、御社の利益が他社へ流れています"
        highlight="WL で取り返す"
        desc="月 2-3 件の動画案件を断っているなら、年 $72,000-$288,000 が素通りしています。Paradigm の AI パイプラインを御社ブランドで提供すれば、断らずに済みます。"
      />

      {/* ROI Calculator */}
      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-5xl mx-auto px-6 md:px-8">
          <RoiCalculator />
        </div>
      </section>

      {/* 構造説明 */}
      <section className="bg-paradigm-paper-deep paradigm-section">
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          <FadeIn>
            <p className="paradigm-eyebrow text-paradigm-accent mb-3 text-center">How it works</p>
            <h2 className="font-display text-[28px] md:text-[36px] leading-tight tracking-tight text-paradigm-ink text-center mb-10">
              御社が表・Paradigm が裏方
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: "01",
                title: "クライアントが御社に発注",
                desc: "クライアントは御社ブランドのみ認識。Paradigm の存在は知らない。",
              },
              {
                step: "02",
                title: "御社が Notion でリクエスト",
                desc: "Notion DB にタイトル + 素材を投入。n8n が裏で全自動処理。",
              },
              {
                step: "03",
                title: "御社ブランドで納品",
                desc: "24-48h で MP4 完成。御社ロゴ・御社ドメインで配信。",
              },
            ].map((s, i) => (
              <FadeIn key={s.step} delay={i * 0.1}>
                <div className="paradigm-glass rounded-2xl p-6 h-full">
                  <div className="paradigm-eyebrow text-paradigm-accent mb-3">{s.step}</div>
                  <h3 className="font-display text-[18px] text-paradigm-ink mb-2 leading-tight">
                    {s.title}
                  </h3>
                  <p className="text-[12.5px] text-paradigm-ink-soft leading-relaxed">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-20" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn>
            <p className="paradigm-eyebrow text-paradigm-accent mb-3 text-center">Pricing</p>
            <h2 className="font-display text-[28px] md:text-[36px] leading-tight tracking-tight text-paradigm-ink text-center mb-3">
              WL 専用 2 プラン
            </h2>
            <p className="text-[14px] text-paradigm-ink-soft text-center mb-12 max-w-2xl mx-auto leading-relaxed">
              超過課金: 1 本あたり $80。年払いで Agency 20%・White 25% OFF。
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {WL_PLANS.map((plan, idx) => (
              <FadeIn key={plan.name} delay={idx * 0.1}>
                <div
                  className={`paradigm-glass rounded-2xl p-7 flex flex-col h-full transition-all duration-500 ${
                    plan.popular
                      ? "border border-paradigm-accent/40 paradigm-glow-lg"
                      : "paradigm-glow-sm hover:paradigm-glow-md hover:-translate-y-1"
                  }`}
                >
                  {plan.popular && (
                    <span className="self-start paradigm-eyebrow text-paradigm-accent bg-paradigm-accent/10 px-3 py-1 rounded-full text-[10px] mb-3">
                      Recommended
                    </span>
                  )}
                  <h3 className="font-display text-[24px] text-paradigm-ink mb-1">{plan.name}</h3>
                  <p className="text-[12px] text-paradigm-ink-mute mb-3">{plan.desc}</p>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="font-display text-[40px] text-paradigm-ink">
                      {plan.price}
                    </span>
                    <span className="text-[14px] text-paradigm-ink-mute">{plan.period}</span>
                  </div>
                  <div className="paradigm-eyebrow text-paradigm-accent mb-5">{plan.videos}</div>
                  <ul className="flex-1 space-y-2.5 text-[13px] text-paradigm-ink-soft leading-relaxed mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="text-paradigm-accent mt-0.5">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="mailto:info@paradigmjp.com?subject=代理店WLパッケージの相談"
                    className="inline-flex w-full justify-center items-center gap-2 bg-paradigm-ink text-paradigm-paper rounded-xl py-3 text-[12px] tracking-wider uppercase font-semibold hover:bg-paradigm-accent transition-colors"
                  >
                    Start WL Partnership
                  </a>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 比較表 */}
      <section className="bg-paradigm-paper-deep paradigm-section">
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          <FadeIn>
            <p className="paradigm-eyebrow text-paradigm-accent mb-3 text-center">Why WL</p>
            <h2 className="font-display text-[28px] md:text-[36px] leading-tight tracking-tight text-paradigm-ink text-center mb-10">
              外注の限界 vs WL の構造優位
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="paradigm-glass rounded-2xl paradigm-glow-md overflow-hidden">
              <div className="grid grid-cols-3 bg-paradigm-paper-card border-b border-paradigm-line p-5">
                <div className="text-[12px] paradigm-eyebrow text-paradigm-ink-soft">項目</div>
                <div className="text-[12px] paradigm-eyebrow text-paradigm-accent text-center">
                  Paradigm WL
                </div>
                <div className="text-[12px] paradigm-eyebrow text-paradigm-ink-mute text-center">
                  外注
                </div>
              </div>
              {COMPARISON_WL.map((row, i) => (
                <div
                  key={row.item}
                  className={`grid grid-cols-3 p-5 ${
                    i < COMPARISON_WL.length - 1 ? "border-b border-paradigm-line/60" : ""
                  }`}
                >
                  <div className="text-[13px] font-semibold text-paradigm-ink">{row.item}</div>
                  <div className="text-[13px] text-paradigm-accent font-semibold text-center">
                    ✓ {row.paradigm}
                  </div>
                  <div className="text-[13px] text-paradigm-ink-mute text-center">
                    {row.outsourcing}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-8">
          <FadeIn>
            <p className="paradigm-eyebrow text-paradigm-accent mb-3 text-center">FAQ</p>
            <h2 className="font-display text-[28px] md:text-[36px] leading-tight tracking-tight text-paradigm-ink text-center mb-10">
              よくある質問
            </h2>
          </FadeIn>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <FadeIn key={i} delay={i * 0.05}>
                <details className="paradigm-glass rounded-xl px-6 py-5 group">
                  <summary className="cursor-pointer flex items-start gap-4 list-none [&::-webkit-details-marker]:hidden">
                    <span className="font-display text-[15px] md:text-[17px] text-paradigm-ink flex-1 leading-tight">
                      {item.q}
                    </span>
                    <span
                      aria-hidden
                      className="shrink-0 text-paradigm-ink-mute mt-1 group-open:rotate-45 transition-transform text-[16px] leading-none"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-4 text-[13px] text-paradigm-ink-soft leading-relaxed">
                    {item.a}
                  </p>
                </details>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <RichCtaBand
        eyebrow="Partnership"
        title="まず 15 分、御社の動画パイプラインを診断します"
        desc="現在の動画案件処理フロー・断っている件数・粗利率を 15 分で把握 → WL で年いくら回収できるか試算します。"
        buttonLabel="無料診断を予約する"
        buttonHref="/contact"
      />
    </>
  )
}
