/**
 * /[locale]/video — 動画サブスク LP (Sprint 9-B)
 *
 * 役割:   月額動画サブスク商材の LP (LTV 6.2x エンジン)・Stripe 直購入導線.
 * 入力:   params.locale
 * 出力:   PageHero + 3-Tier pricing + 比較表 + Process + CTA
 *
 * 戦略原典: product-strategy.jsx (5 商材) + Notion 営業MVP壁打ち② (動画サブスク = LTV エンジン)
 *
 * 想定顧客: SMB CMO / マーケター / スタートアップ創業者
 * 訴求軸:   コスト削減 (「制作会社に 1 本 30 万払うより、月 30 万で使い放題」)
 *
 * AE-PHP-4 準拠 (役割/入力/出力 明示).
 */

import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: "月額動画サブスク | 制作会社に頼むより安く、月20本納品",
    description:
      "ComfyUI + Remotion + DeepSeek V3 で動画制作を自動化。月額¥30万から、24-48 時間納品。Web/LP/SNS 用動画を月 20-100 本量産。",
    alternates: pageAlternates(locale, "/video"),
  }
}

const PLANS = [
  {
    name: "Basic",
    price: "¥300,000",
    period: "/月",
    videos: "月 20 本",
    features: [
      "24-48 時間納品",
      "Notion ボードでリクエスト管理",
      "縦/横/正方形 全フォーマット対応",
      "字幕自動生成",
      "Cloudflare R2 で永久配信",
    ],
    popular: false,
  },
  {
    name: "Pro",
    price: "¥500,000",
    period: "/月",
    videos: "月 50 本",
    features: [
      "24 時間納品 (優先キュー)",
      "AI 音声ナレーション (ElevenLabs)",
      "ロゴ/テロップ/エンドカード自動合成",
      "月次レポート動画自動生成",
      "Slack 連携でリクエスト",
    ],
    popular: true,
  },
  {
    name: "Scale",
    price: "¥800,000",
    period: "/月",
    videos: "月 100 本",
    features: [
      "12 時間納品 (高速キュー)",
      "AI アバター動画 (Wan2.2 + MuseTalk)",
      "カスタムテンプレ作成支援",
      "専任 Slack チャンネル",
      "月次戦略 MTG 込み",
    ],
    popular: false,
  },
] as const

const COMPARISON = [
  {
    item: "1 本あたりコスト",
    paradigm: "¥15,000 (Pro 換算)",
    traditional: "¥80,000-300,000",
  },
  { item: "納期", paradigm: "24-48 時間", traditional: "1-3 週間" },
  {
    item: "修正回数",
    paradigm: "無制限 (キュー再投入)",
    traditional: "2-3 回まで",
  },
  {
    item: "スケール",
    paradigm: "月 100 本まで定額",
    traditional: "1 本ごとに追加見積",
  },
  {
    item: "支払い",
    paradigm: "月額サブスク・解約自由",
    traditional: "都度契約・最低発注額",
  },
] as const

const PROCESS = [
  {
    step: "01",
    title: "Notion でリクエスト投入",
    desc: "タイトル / ジャンル / 素材 (任意) を Notion ボードに書くだけ",
  },
  {
    step: "02",
    title: "n8n が自動でパイプライン起動",
    desc: "DeepSeek V3 でスクリプト生成 → HyperFrames でレンダリング",
  },
  {
    step: "03",
    title: "24-48 時間で MP4 納品",
    desc: "Notion に納品 URL 自動書き込み・Slack 通知",
  },
  {
    step: "04",
    title: "修正は無制限",
    desc: "気に入らなければキュー再投入。月の本数は変わらない",
  },
] as const

export default async function VideoSubscriptionPage({ params }: Props) {
  const { locale } = await params

  return (
    <>
      <PageHero
        badge="月額動画サブスク"
        title="制作会社に頼むより、安く・速く・量を量産する"
        highlight="月額 ¥30 万から"
        desc="ComfyUI + Remotion + DeepSeek V3 のフル自動化パイプラインで、Web / LP / SNS 用動画を月 20-100 本納品。24-48 時間で 1 本完了。"
      />

      {/* 比較表 — 損失訴求 (制作会社との対比) */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8">
          <FadeIn>
            <p className="paradigm-eyebrow text-paradigm-accent mb-3 text-center">Comparison</p>
            <h2 className="font-display text-[28px] md:text-[36px] leading-tight tracking-tight text-paradigm-ink text-center mb-10">
              制作会社の限界と、Paradigm の解
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="paradigm-glass rounded-2xl paradigm-glow-md overflow-hidden">
              <div className="grid grid-cols-3 bg-paradigm-paper-card border-b border-paradigm-line p-5">
                <div className="text-[12px] paradigm-eyebrow text-paradigm-ink-soft">項目</div>
                <div className="text-[12px] paradigm-eyebrow text-paradigm-accent text-center">
                  Paradigm
                </div>
                <div className="text-[12px] paradigm-eyebrow text-paradigm-ink-mute text-center">
                  制作会社
                </div>
              </div>
              {COMPARISON.map((row, i) => (
                <div
                  key={row.item}
                  className={`grid grid-cols-3 p-5 ${
                    i < COMPARISON.length - 1 ? "border-b border-paradigm-line/60" : ""
                  }`}
                >
                  <div className="text-[13px] font-semibold text-paradigm-ink">{row.item}</div>
                  <div className="text-[13px] text-paradigm-accent font-semibold text-center">
                    ✓ {row.paradigm}
                  </div>
                  <div className="text-[13px] text-paradigm-ink-mute text-center">
                    {row.traditional}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Pricing — 3 Tier */}
      <section className="bg-paradigm-paper-deep paradigm-section">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <FadeIn>
            <p className="paradigm-eyebrow text-paradigm-accent mb-3 text-center">Pricing</p>
            <h2 className="font-display text-[28px] md:text-[36px] leading-tight tracking-tight text-paradigm-ink text-center mb-3">
              月額定額・本数で選ぶ 3 プラン
            </h2>
            <p className="text-[14px] text-paradigm-ink-soft text-center mb-12 max-w-2xl mx-auto leading-relaxed">
              超過課金あり (1 本 +¥10,000)。年払い 20% OFF。
              <br />
              全プラン解約自由・最低契約期間なし。
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan, idx) => (
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
                      Most popular
                    </span>
                  )}
                  <h3 className="font-display text-[22px] text-paradigm-ink mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="font-display text-[36px] text-paradigm-ink">
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
                    href="mailto:info@paradigmjp.com?subject=動画サブスクの相談"
                    className="inline-flex w-full justify-center items-center gap-2 bg-paradigm-ink text-paradigm-paper rounded-xl py-3 text-[12px] tracking-wider uppercase font-semibold hover:bg-paradigm-accent transition-colors"
                  >
                    まず話を聞く
                  </a>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Process — 4 step */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-20" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn>
            <p className="paradigm-eyebrow text-paradigm-accent mb-3 text-center">Process</p>
            <h2 className="font-display text-[28px] md:text-[36px] leading-tight tracking-tight text-paradigm-ink text-center mb-12">
              発注から納品まで、全自動 4 ステップ
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {PROCESS.map((step, idx) => (
              <FadeIn key={step.step} delay={idx * 0.1}>
                <div className="paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 h-full">
                  <div className="paradigm-eyebrow text-paradigm-accent mb-3">{step.step}</div>
                  <h3 className="font-display text-[18px] text-paradigm-ink mb-2 leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-[12.5px] text-paradigm-ink-soft leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <RichCtaBand
        eyebrow="Start now"
        title="まず 30 分、御社の動画運用を診断します"
        desc="費用の話は一切しません。月何本必要か、どんな用途で使うか、を 30 分で診断 → 最適プランを提案します。"
        buttonLabel="無料診断を予約する"
        buttonHref="/contact"
      />
    </>
  )
}
