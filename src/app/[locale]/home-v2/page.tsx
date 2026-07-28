import type { Metadata } from "next"
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clapperboard,
  Code2,
  Globe2,
  Layers3,
  Sparkles,
  Workflow,
} from "lucide-react"
import { notFound } from "next/navigation"
import { Link } from "@/i18n/routing"
import FadeIn from "@/components/aesop/FadeIn"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import { pageAlternates } from "@/lib/page-metadata"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params

  if (locale === "ja") {
    return {
      title: "動画・Web・AI制作支援 | Paradigm合同会社",
      description:
        "定額制Video as a Serviceを中心に、Web制作とAI制作・導入支援まで。国内企業のクリエイティブ制作と実装を支援します。",
      alternates: pageAlternates("ja"),
      openGraph: {
        type: "website",
        url: "https://paradigmjp.com/ja",
        title: "動画・Web・AI制作支援 | Paradigm合同会社",
        description:
          "定額制動画制作を中心に、Web制作とAI制作・導入支援まで。必要な制作力を外部チームとして提供します。",
      },
    }
  }

  if (locale === "en") {
    return {
      title: "Japan Market Partner & Video as a Service | Paradigm LLC",
      description:
        "Paradigm helps global companies enter Japan and scale video production through two focused execution services.",
      alternates: pageAlternates("en"),
      openGraph: {
        type: "website",
        url: "https://paradigmjp.com/en",
        title: "Japan Market Partner & Video as a Service | Paradigm LLC",
        description:
          "A Japan-based execution partner for market entry and recurring video production.",
      },
    }
  }

  return {}
}

const JA_SERVICES = [
  {
    eyebrow: "PRIMARY SERVICE",
    title: "Video as a Service",
    description:
      "広告、SNS、採用、サービス紹介などの動画を、継続的な制作キューで納品します。動画担当者を採用せず、必要な制作力を外部チームとして確保できます。",
    href: "/video-as-a-service",
    cta: "サービス詳細を見る",
    icon: Clapperboard,
    highlighted: true,
    bullets: [
      "月額・継続型の動画制作",
      "一つの優先リクエストを制作しながら次をキュー管理",
      "ショート動画、広告、デモ、モーショングラフィックス",
      "非同期レビューと修正・納品管理",
    ],
  },
  {
    eyebrow: "WEB PRODUCTION",
    title: "Web制作",
    description:
      "企業サイト、採用サイト、サービスサイト、LPを、情報設計から実装・公開後の改善まで一貫して制作します。",
    href: "/services/web",
    cta: "Web制作を見る",
    icon: Code2,
    highlighted: false,
    bullets: [
      "コーポレート・採用・サービスサイト",
      "LP・キャンペーンページ",
      "WordPress / Next.js",
      "SEO、計測、運用基盤",
    ],
  },
  {
    eyebrow: "AI PRODUCTION & ENABLEMENT",
    title: "AI制作・導入支援",
    description:
      "生成AIを活用した制作と、社内業務へ組み込むためのワークフロー・自動化・AIエージェント導入を支援します。",
    href: "/services/ai",
    cta: "AI導入支援を見る",
    icon: Bot,
    highlighted: false,
    bullets: [
      "AI動画・画像・文章制作",
      "制作フローのAI化",
      "業務自動化・ツール連携",
      "AIエージェント・社内活用設計",
    ],
  },
] as const

const EN_SERVICES = [
  {
    eyebrow: "SERVICE 01",
    title: "Japan Market Partner",
    description:
      "An outsourced Japan execution team for localization, sales-channel setup, Japanese customer support, local operations, and market launch delivery.",
    href: "/japan-market-partner",
    cta: "Explore Japan Market Partner",
    icon: Globe2,
    highlighted: true,
    bullets: [
      "$15,000 fixed Japan Market Setup",
      "Localized buyer path, launch assets, and channel setup",
      "Japan-facing support and operating handover",
      "Clear scope, dependencies, and acceptance criteria",
    ],
  },
  {
    eyebrow: "SERVICE 02",
    title: "Video as a Service",
    description:
      "A recurring video production queue for ads, social content, product demos, explainers, motion graphics, localization, and campaign variants.",
    href: "/video-as-a-service",
    cta: "Explore Video as a Service",
    icon: Clapperboard,
    highlighted: false,
    bullets: [
      "Subscription-style production capacity",
      "One active priority request at a time",
      "Async review, revisions, and organized handoff",
      "Built for continuous content demand",
    ],
  },
] as const

const JA_MODEL = [
  {
    icon: Clapperboard,
    title: "動画は継続契約",
    body: "制作リクエストをキュー化し、優先順位を明確にして継続的に納品します。",
  },
  {
    icon: Layers3,
    title: "Webはプロジェクト単位",
    body: "要件、ページ、機能、素材、運用範囲を決めて、見積もりと納品条件を明記します。",
  },
  {
    icon: Workflow,
    title: "AIは業務に合わせて導入",
    body: "ツールを入れるだけでなく、対象業務、入力、確認、責任者まで含めて設計します。",
  },
] as const

const EN_MODEL = [
  {
    icon: Globe2,
    title: "Fixed Japan setup",
    body: "Start with a written $15,000 Japan Market Setup scope before ongoing operation begins.",
  },
  {
    icon: Clapperboard,
    title: "Recurring video queue",
    body: "Submit ongoing video requests and keep one priority item in active production at a time.",
  },
  {
    icon: Workflow,
    title: "Async-first execution",
    body: "Owners, priorities, approvals, files, and handoff remain visible without unnecessary status meetings.",
  },
] as const

export default async function BusinessHomePage({ params }: Props) {
  const { locale } = await params
  if (locale !== "ja" && locale !== "en") notFound()

  const isJa = locale === "ja"
  const services = isJa ? JA_SERVICES : EN_SERVICES
  const model = isJa ? JA_MODEL : EN_MODEL

  return (
    <>
      <PageHero
        badge={isJa ? "PARADIGM LLC · CREATIVE EXECUTION PARTNER" : "PARADIGM LLC · TWO EXECUTION SERVICES"}
        title={
          isJa
            ? "動画・Web・AIを、必要なときに動かせる制作体制へ。"
            : "Enter Japan. Scale video production."
        }
        highlight={isJa ? "必要なときに動かせる" : "Enter Japan."}
        desc={
          isJa
            ? "Paradigm合同会社は、定額制Video as a Serviceを主力に、Web制作とAI制作・導入支援を提供します。単発の制作物ではなく、事業を前へ進める実行体制をつくります。"
            : "Paradigm is a Japan-based execution partner with two focused services: Japan Market Partner for entering and operating in Japan, and Video as a Service for recurring creative production."
        }
        asideText={
          isJa
            ? "国内企業向けには、動画制作を中心にWebとAIを組み合わせた制作・導入支援を提供します。"
            : "Global companies can use Paradigm as an outsourced Japan team, a recurring video production partner, or both."
        }
        asideCta={
          isJa
            ? { label: "Video as a Serviceを見る", href: "/video-as-a-service" }
            : { label: "Apply for a Japan Partnership — $15K", href: "/contact?intent=japan-entry" }
        }
      />

      <section className="relative overflow-hidden bg-paradigm-paper paradigm-section" aria-labelledby="services-heading">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 mx-auto max-w-[1180px] px-5 md:px-8 lg:px-10">
          <FadeIn className="mb-10 max-w-3xl md:mb-14">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">
              {isJa ? "SERVICES" : "TWO WAYS TO WORK WITH PARADIGM"}
            </p>
            <h2 id="services-heading" className="font-display text-[28px] leading-[1.12] text-paradigm-ink md:text-[44px]">
              {isJa
                ? "主力は動画。WebとAIで実行範囲を広げる。"
                : "Choose the execution layer your company needs now."}
            </h2>
            <p className="mt-5 max-w-2xl text-[14px] leading-[1.9] text-paradigm-ink-soft md:text-[16px]">
              {isJa
                ? "三つを同格の総合制作メニューとして並べるのではなく、Video as a Serviceを中心に、Web制作とAI導入を必要な場面で組み合わせます。"
                : "The services share one operating philosophy: clear scope, visible ownership, async collaboration, and practical delivery instead of strategy-only advice."}
            </p>
          </FadeIn>

          <div className={`grid gap-6 ${services.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
            {services.map((service, index) => {
              const Icon = service.icon
              return (
                <FadeIn key={service.title} delay={index * 0.06}>
                  <article
                    className={`flex h-full flex-col border p-6 md:p-8 ${
                      service.highlighted
                        ? "border-paradigm-accent bg-paradigm-ink text-paradigm-paper paradigm-glow-md"
                        : "border-paradigm-line bg-paradigm-paper-deep text-paradigm-ink"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className={`paradigm-eyebrow ${service.highlighted ? "text-paradigm-paper/60" : "text-paradigm-accent"}`}>
                        {service.eyebrow}
                      </p>
                      <Icon size={24} aria-hidden className={service.highlighted ? "text-paradigm-glow" : "text-paradigm-accent"} />
                    </div>
                    <h3 className="mt-7 font-display text-[26px] leading-[1.12] md:text-[34px]">{service.title}</h3>
                    <p className={`mt-5 text-[14px] leading-[1.85] ${service.highlighted ? "text-paradigm-paper/72" : "text-paradigm-ink-soft"}`}>
                      {service.description}
                    </p>
                    <ul className="mt-7 space-y-3">
                      {service.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3 text-[13px] leading-[1.7]">
                          <CheckCircle2 size={16} aria-hidden className={`mt-0.5 shrink-0 ${service.highlighted ? "text-paradigm-glow" : "text-paradigm-accent"}`} />
                          <span className={service.highlighted ? "text-paradigm-paper/78" : "text-paradigm-ink-soft"}>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={service.href}
                      className={`mt-8 inline-flex items-center gap-2 self-start text-[12px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                        service.highlighted
                          ? "text-paradigm-paper hover:text-paradigm-glow"
                          : "text-paradigm-ink hover:text-paradigm-accent"
                      }`}
                    >
                      {service.cta}
                      <ArrowRight size={14} aria-hidden />
                    </Link>
                  </article>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-paradigm-line bg-paradigm-paper-deep paradigm-section" aria-labelledby="model-heading">
        <div className="mx-auto max-w-[1180px] px-5 md:px-8 lg:px-10">
          <FadeIn className="mb-10 max-w-3xl">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">
              {isJa ? "ENGAGEMENT MODEL" : "HOW THE MODEL STAYS CLEAR"}
            </p>
            <h2 id="model-heading" className="font-display text-[28px] leading-[1.12] text-paradigm-ink md:text-[42px]">
              {isJa ? "サービスごとに、契約と進め方を分ける。" : "Different services, one accountable workflow."}
            </h2>
          </FadeIn>

          <div className="grid gap-px overflow-hidden border border-paradigm-line bg-paradigm-line md:grid-cols-3">
            {model.map((item, index) => {
              const Icon = item.icon
              return (
                <FadeIn key={item.title} delay={index * 0.05} className="bg-paradigm-paper p-6 md:p-8">
                  <Icon size={24} aria-hidden className="text-paradigm-accent" />
                  <h3 className="mt-6 font-display text-[21px] leading-[1.2] text-paradigm-ink">{item.title}</h3>
                  <p className="mt-4 text-[13px] leading-[1.85] text-paradigm-ink-soft">{item.body}</p>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-paradigm-paper paradigm-section" aria-labelledby="principles-heading">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-5 md:grid-cols-[0.9fr_1.1fr] md:px-8 lg:px-10">
          <FadeIn>
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">
              {isJa ? "WHY PARADIGM" : "OPERATING PRINCIPLES"}
            </p>
            <h2 id="principles-heading" className="font-display text-[28px] leading-[1.12] text-paradigm-ink md:text-[42px]">
              {isJa ? "制作物ではなく、動かせる体制を納品する。" : "Execution should remain visible and usable."}
            </h2>
          </FadeIn>

          <FadeIn className="grid gap-4 sm:grid-cols-2" delay={0.08}>
            {[
              {
                icon: Workflow,
                title: isJa ? "優先順位が見える" : "Visible priorities",
                body: isJa ? "依頼、担当、進行状況、確認待ちを一つの場所で管理します。" : "Requests, owners, approvals, blockers, and the next action stay in one shared workflow.",
              },
              {
                icon: Sparkles,
                title: isJa ? "AIを品質管理の外に置かない" : "Human-reviewed AI use",
                body: isJa ? "AIを活用しても、公開物と重要判断は人が確認できる工程にします。" : "Automation can accelerate production, while material outputs remain reviewable and accountable.",
              },
              {
                icon: Layers3,
                title: isJa ? "範囲を文章で固定" : "Written scope boundaries",
                body: isJa ? "含むもの、含まないもの、素材、修正、納期条件を契約前に明確にします。" : "Inclusions, exclusions, dependencies, revisions, and acceptance criteria are written before work starts.",
              },
              {
                icon: Globe2,
                title: isJa ? "日本と海外の両方に対応" : "Japan-based execution",
                body: isJa ? "国内制作に加え、海外企業の日本展開を実務面から支援します。" : "Paradigm operates from Japan and connects global teams with Japan-facing execution.",
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="border border-paradigm-line bg-paradigm-paper-deep p-5 md:p-6">
                  <Icon size={21} aria-hidden className="text-paradigm-accent" />
                  <h3 className="mt-4 font-display text-[18px] text-paradigm-ink">{item.title}</h3>
                  <p className="mt-3 text-[13px] leading-[1.8] text-paradigm-ink-soft">{item.body}</p>
                </div>
              )
            })}
          </FadeIn>
        </div>
      </section>

      <RichCtaBand
        eyebrow={isJa ? "START A CONVERSATION" : "CHOOSE YOUR NEXT EXECUTION LAYER"}
        title={
          isJa
            ? "まず必要な制作体制から始める。"
            : "Enter Japan, scale video, or combine both."
        }
        highlight={isJa ? "必要な制作体制" : "combine both"}
        desc={
          isJa
            ? "継続的な動画制作、Webサイトの新規制作・刷新、AIを使った制作や業務導入について、現在の課題と必要な範囲をお知らせください。"
            : "Tell us whether the immediate need is Japan market execution, recurring video production, or a coordinated combination of the two."
        }
        buttonLabel={isJa ? "相談内容を送る" : "Apply for a Japan Partnership — $15K"}
        buttonHref={isJa ? "/contact" : "/contact?intent=japan-entry"}
        bullets={
          isJa
            ? ["Video as a Serviceを第一主力として提案", "Web・AIは必要な範囲だけ組み合わせ", "契約前に範囲と進行方法を明記"]
            : ["$15,000 fixed Japan Market Setup", "Video production available as a separate recurring service", "Written scope before kickoff"]
        }
        analyticsSource="business-home-v2"
      />
    </>
  )
}
