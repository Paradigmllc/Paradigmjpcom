import type { Metadata } from "next"
import {
  CheckCircle2,
  Clapperboard,
  Clock3,
  Files,
  MessageSquareText,
  PlaySquare,
  RefreshCw,
  Subtitles,
} from "lucide-react"
import { notFound } from "next/navigation"
import FadeIn from "@/components/aesop/FadeIn"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import { pageAlternates } from "@/lib/page-metadata"

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params

  if (locale === "ja") {
    return {
      title: "Video as a Service | 定額制・継続型動画制作",
      description:
        "広告、SNS、採用、サービス紹介、プロダクトデモなどを継続的に制作するVideo as a Service。制作リクエストをキュー化し、優先順位を明確にして納品します。",
      alternates: pageAlternates("ja", "/video-as-a-service"),
    }
  }

  if (locale === "en") {
    return {
      title: "Video as a Service | Recurring Video Production",
      description:
        "Recurring video production for ads, social content, product demos, explainers, motion graphics, subtitles, and campaign variants.",
      alternates: pageAlternates("en", "/video-as-a-service"),
    }
  }

  return {}
}

const JA_DELIVERABLES = [
  "SNSショート動画・縦型動画",
  "広告クリエイティブ・複数バリエーション",
  "サービス紹介・プロダクトデモ",
  "採用・会社紹介・オンボーディング動画",
  "モーショングラフィックス・図解アニメーション",
  "字幕、翻訳、リサイズ、既存素材の再編集",
] as const

const EN_DELIVERABLES = [
  "Short-form and vertical social video",
  "Performance ads and campaign variants",
  "Product demos and service explainers",
  "Recruiting, company, and onboarding video",
  "Motion graphics and animated diagrams",
  "Subtitles, localization, resizing, and repurposing",
] as const

const JA_STEPS = [
  {
    icon: MessageSquareText,
    label: "01",
    title: "リクエストを追加",
    body: "目的、掲載先、尺、参考、素材、希望時期を共有ワークスペースへ登録します。",
  },
  {
    icon: Files,
    label: "02",
    title: "優先順位を決定",
    body: "依頼数を人工的に制限せず、優先度の高い一件をアクティブ制作に置きます。",
  },
  {
    icon: PlaySquare,
    label: "03",
    title: "制作・レビュー",
    body: "構成、初稿、確認事項を共有し、必要な修正を記録しながら進めます。",
  },
  {
    icon: RefreshCw,
    label: "04",
    title: "納品して次へ",
    body: "承認済みファイル、編集データの扱い、利用上の注意を整理して次の依頼へ移ります。",
  },
] as const

const EN_STEPS = [
  {
    icon: MessageSquareText,
    label: "01",
    title: "Submit the request",
    body: "Share the objective, channel, duration, references, source assets, and target timing in the client workspace.",
  },
  {
    icon: Files,
    label: "02",
    title: "Set the priority",
    body: "Keep requests in a visible queue while one primary item remains in active production at a time.",
  },
  {
    icon: PlaySquare,
    label: "03",
    title: "Produce and review",
    body: "Review the structure, draft, open questions, and revisions asynchronously with a written decision trail.",
  },
  {
    icon: RefreshCw,
    label: "04",
    title: "Deliver and continue",
    body: "Receive organized final files and move the next priority request into active production.",
  },
] as const

export default async function VideoAsAServicePage({ params }: Props) {
  const { locale } = await params
  if (locale !== "ja" && locale !== "en") notFound()

  const isJa = locale === "ja"
  const deliverables = isJa ? JA_DELIVERABLES : EN_DELIVERABLES
  const steps = isJa ? JA_STEPS : EN_STEPS

  return (
    <>
      <PageHero
        badge="VIDEO AS A SERVICE"
        title={
          isJa
            ? "動画制作を、単発発注から継続できる制作体制へ。"
            : "Turn video production into a reliable recurring workflow."
        }
        highlight={isJa ? "継続できる制作体制" : "reliable recurring workflow"}
        desc={
          isJa
            ? "DesignJoy型のリクエストキューを動画制作へ応用。広告、SNS、採用、サービス紹介、デモ、モーショングラフィックスを、優先順位の見える非同期ワークフローで制作します。"
            : "A DesignJoy-style request queue adapted for video: ads, social content, recruiting, explainers, demos, motion graphics, localization, and recurring campaign variants."
        }
        asideText={
          isJa
            ? "社内で動画担当者を採用・管理せず、必要な制作力を継続的に確保するためのサービスです。"
            : "Use an external video production team without building and managing a full in-house function."
        }
        asideCta={{
          label: isJa ? "導入相談を送る" : "Discuss a founding plan",
          href: "/contact?intent=video-as-a-service",
        }}
      />

      <section className="bg-paradigm-paper paradigm-section" aria-labelledby="deliverables-heading">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-5 md:grid-cols-[0.9fr_1.1fr] md:px-8 lg:px-10">
          <FadeIn>
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">
              {isJa ? "DELIVERABLES" : "WHAT YOU CAN REQUEST"}
            </p>
            <h2 id="deliverables-heading" className="font-display text-[28px] leading-[1.12] text-paradigm-ink md:text-[42px]">
              {isJa ? "日常的に必要になる動画を、一つの制作窓口へ。" : "One production queue for recurring video demand."}
            </h2>
            <p className="mt-5 text-[14px] leading-[1.9] text-paradigm-ink-soft md:text-[16px]">
              {isJa
                ? "企画の粒度や素材の状態は依頼ごとに異なります。着手前に目的、尺、制作範囲、必要素材、納期目安を確認します。"
                : "Each request is scoped before production so the objective, duration, source assets, review points, and expected delivery range remain explicit."}
            </p>
          </FadeIn>

          <FadeIn delay={0.08} className="grid gap-px overflow-hidden border border-paradigm-line bg-paradigm-line sm:grid-cols-2">
            {deliverables.map((item) => (
              <div key={item} className="flex items-start gap-3 bg-paradigm-paper-deep p-5">
                <CheckCircle2 size={17} aria-hidden className="mt-0.5 shrink-0 text-paradigm-accent" />
                <span className="text-[13px] leading-[1.75] text-paradigm-ink-soft">{item}</span>
              </div>
            ))}
          </FadeIn>
        </div>
      </section>

      <section className="border-y border-paradigm-line bg-paradigm-paper-deep paradigm-section" aria-labelledby="workflow-heading">
        <div className="mx-auto max-w-[1180px] px-5 md:px-8 lg:px-10">
          <FadeIn className="mb-10 max-w-3xl">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">
              {isJa ? "WORKFLOW" : "THE REQUEST-QUEUE MODEL"}
            </p>
            <h2 id="workflow-heading" className="font-display text-[28px] leading-[1.12] text-paradigm-ink md:text-[42px]">
              {isJa ? "依頼を増やしても、制作中の優先順位は一つ。" : "Queue the work without hiding the active priority."}
            </h2>
          </FadeIn>

          <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <FadeIn key={step.label} delay={index * 0.05} as="li" className="border border-paradigm-line bg-paradigm-paper p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-[22px] text-paradigm-accent">{step.label}</span>
                    <Icon size={21} aria-hidden className="text-paradigm-ink-mute" />
                  </div>
                  <h3 className="mt-6 font-display text-[19px] leading-[1.2] text-paradigm-ink">{step.title}</h3>
                  <p className="mt-4 text-[13px] leading-[1.8] text-paradigm-ink-soft">{step.body}</p>
                </FadeIn>
              )
            })}
          </ol>
        </div>
      </section>

      <section className="bg-paradigm-paper paradigm-section" aria-labelledby="principles-heading">
        <div className="mx-auto max-w-[1180px] px-5 md:px-8 lg:px-10">
          <FadeIn className="mb-10 max-w-3xl">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">
              {isJa ? "SERVICE PRINCIPLES" : "SERVICE BOUNDARIES"}
            </p>
            <h2 id="principles-heading" className="font-display text-[28px] leading-[1.12] text-paradigm-ink md:text-[42px]">
              {isJa ? "「無制限」ではなく、止まらない制作フロー。" : "A continuous workflow, not a fake unlimited promise."}
            </h2>
          </FadeIn>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Clapperboard,
                title: isJa ? "一件ずつ制作" : "One active request",
                body: isJa ? "一つの優先依頼を制作し、確認待ちや完了後に次へ進みます。" : "One primary request stays active so production ownership and priority remain clear.",
              },
              {
                icon: Clock3,
                title: isJa ? "納期は依頼ごとに確認" : "Request-level timing",
                body: isJa ? "尺、素材、表現、修正、外部確認を踏まえて着手時に目安を共有します。" : "Delivery ranges reflect duration, source assets, complexity, revision scope, and dependencies.",
              },
              {
                icon: Subtitles,
                title: isJa ? "派生制作を効率化" : "Efficient repurposing",
                body: isJa ? "字幕、翻訳、比率変更、短尺化など、既存素材の展開にも対応します。" : "Turn approved source material into subtitles, localizations, aspect ratios, cutdowns, and variants.",
              },
              {
                icon: RefreshCw,
                title: isJa ? "修正履歴を残す" : "Traceable revisions",
                body: isJa ? "指示と判断をワークスペースへ残し、認識違いと手戻りを減らします。" : "Keep feedback, decisions, files, and approved direction in one visible review trail.",
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <FadeIn key={item.title} className="border border-paradigm-line bg-paradigm-paper-deep p-6">
                  <Icon size={22} aria-hidden className="text-paradigm-accent" />
                  <h3 className="mt-5 font-display text-[19px] text-paradigm-ink">{item.title}</h3>
                  <p className="mt-3 text-[13px] leading-[1.8] text-paradigm-ink-soft">{item.body}</p>
                </FadeIn>
              )
            })}
          </div>

          <FadeIn className="mt-10 border border-paradigm-line bg-paradigm-paper-deep p-6 md:p-8">
            <h3 className="font-display text-[22px] text-paradigm-ink">
              {isJa ? "別途確認・見積もりとなる主な内容" : "Common items that require separate scope"}
            </h3>
            <p className="mt-4 text-[13px] leading-[1.85] text-paradigm-ink-soft">
              {isJa
                ? "現地撮影、出演者・ナレーター手配、スタジオ・旅費、高額な素材ライセンス、本格3DCG、同時並行の大量制作、当日対応、元データの完全譲渡などは、依頼内容に応じて別途範囲を確認します。"
                : "Location filming, talent or voiceover sourcing, studio and travel costs, premium media licenses, advanced 3D, large simultaneous production, same-day delivery, and full transfer of editable source projects require separate written scope."
              }
            </p>
          </FadeIn>
        </div>
      </section>

      <RichCtaBand
        eyebrow={isJa ? "FOUNDING CLIENTS" : "FOUNDING CAPACITY"}
        title={isJa ? "継続的な動画需要を、制作キューへ移す。" : "Move recurring video demand into one visible queue."}
        highlight={isJa ? "制作キュー" : "one visible queue"}
        desc={
          isJa
            ? "現在必要な動画の種類、月間の本数感、素材の有無、社内の確認体制を共有してください。適切な契約範囲と進め方を整理します。"
            : "Share the video types, expected monthly demand, available source assets, review process, and current bottleneck. We will propose a clear founding scope."
        }
        buttonLabel={isJa ? "Video as a Serviceを相談" : "Discuss a founding plan"}
        buttonHref="/contact?intent=video-as-a-service"
        bullets={
          isJa
            ? ["月額・継続契約を前提", "一つの優先リクエストを制作", "価格と制作範囲は契約前に明記"]
            : ["Recurring engagement", "One active priority request", "Written scope and pricing before kickoff"]
        }
        analyticsSource="video-as-a-service"
      />
    </>
  )
}
