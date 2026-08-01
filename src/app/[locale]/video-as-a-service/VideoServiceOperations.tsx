import {
  ArrowRight,
  Clapperboard,
  Clock3,
  FileCheck2,
  Files,
  Layers3,
  MessageSquareText,
  PauseCircle,
  PlaySquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Subtitles,
  Workflow,
} from "lucide-react"
import { Link } from "@/i18n/routing"
import FadeIn from "@/components/aesop/FadeIn"
import {
  getVideoServiceFaqs,
  getVideoServiceSteps,
  type VideoServiceLocale,
} from "@/lib/video-service-content"

const STATUS_ITEMS = [
  ["Backlog", "依頼候補 / queued ideas"],
  ["Ready", "ブリーフ・素材完了 / complete inputs"],
  ["Active Production", "制作中 / in production"],
  ["Internal QA", "社内確認 / quality review"],
  ["Client Review", "顧客確認 / customer feedback"],
  ["Blocked", "素材・判断待ち / waiting on dependency"],
  ["Approved", "承認済み / approved"],
  ["Delivered", "納品完了 / delivered"],
] as const

export default function VideoServiceOperations({
  locale,
}: {
  locale: VideoServiceLocale
}) {
  const isJa = locale === "ja"
  const steps = getVideoServiceSteps(locale)
  const faqs = getVideoServiceFaqs(locale)

  return (
    <>
      <section
        className="bg-paradigm-paper paradigm-section"
        aria-labelledby="application-flow-heading"
      >
        <div className="mx-auto max-w-[1180px] px-5 md:px-8 lg:px-10">
          <FadeIn className="mb-10 max-w-3xl md:mb-14">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">
              FROM APPLICATION TO DELIVERY
            </p>
            <h2
              id="application-flow-heading"
              className="font-display text-[28px] leading-[1.12] text-paradigm-ink md:text-[42px]"
            >
              {isJa
                ? "申し込み後、そのまま制作運用へ。"
                : "A complete path from application to recurring delivery."}
            </h2>
          </FadeIn>

          <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, index) => {
              const icons = [
                MessageSquareText,
                FileCheck2,
                ShieldCheck,
                Workflow,
                PlaySquare,
                RefreshCw,
              ] as const
              const Icon = icons[index] ?? Workflow
              return (
                <FadeIn
                  key={step.title}
                  delay={index * 0.04}
                  as="li"
                  className="border border-paradigm-line bg-paradigm-paper-deep p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-[24px] text-paradigm-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <Icon size={21} aria-hidden className="text-paradigm-ink-mute" />
                  </div>
                  <h3 className="mt-6 font-display text-[19px] leading-[1.25] text-paradigm-ink">
                    {step.title}
                  </h3>
                  <p className="mt-4 text-[13px] leading-[1.8] text-paradigm-ink-soft">
                    {step.body}
                  </p>
                </FadeIn>
              )
            })}
          </ol>
        </div>
      </section>

      <section
        className="border-y border-paradigm-line bg-paradigm-paper-deep paradigm-section"
        aria-labelledby="queue-heading"
      >
        <div className="mx-auto grid max-w-[1180px] gap-10 px-5 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
          <FadeIn>
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">
              OPERATING SYSTEM
            </p>
            <h2
              id="queue-heading"
              className="font-display text-[28px] leading-[1.12] text-paradigm-ink md:text-[42px]"
            >
              {isJa
                ? "確認待ちで、制作全体を止めない。"
                : "Client review does not have to stop the queue."}
            </h2>
            <p className="mt-5 text-[14px] leading-[1.9] text-paradigm-ink-soft">
              {isJa
                ? "制作中・社内QAだけを同時進行枠として数えます。確認待ちや素材待ちは別状態へ移し、次のReady依頼へ進めます。"
                : "Only active production and internal QA consume active slots. Review or asset waits can move aside so another Ready request proceeds."}
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {[
                {
                  icon: Clock3,
                  title: isJa
                    ? "2営業日以内に着手"
                    : "Start within two business days",
                  body: isJa
                    ? "Readyになった標準依頼が対象。完成保証ではありません。"
                    : "Applies to a standard Ready request, not final completion.",
                },
                {
                  icon: Layers3,
                  title: isJa ? "明確な同時進行枠" : "Explicit active slots",
                  body: isJa
                    ? "1本または2本の制作枠で、優先順位と責任を可視化。"
                    : "One or two active slots keep priority and ownership visible.",
                },
                {
                  icon: PauseCircle,
                  title: isJa
                    ? "確認待ちは枠を解放"
                    : "Review waits release capacity",
                  body: isJa
                    ? "返答後はプラン優先度と現在の進行状況に応じて復帰。"
                    : "Feedback returns according to plan priority and current work.",
                },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-4 border border-paradigm-line bg-paradigm-paper p-5"
                  >
                    <Icon
                      size={20}
                      aria-hidden
                      className="mt-0.5 shrink-0 text-paradigm-accent"
                    />
                    <div>
                      <h3 className="font-display text-[17px] text-paradigm-ink">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-[12px] leading-[1.75] text-paradigm-ink-soft">
                        {item.body}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </FadeIn>

          <FadeIn
            delay={0.08}
            className="border border-paradigm-line bg-paradigm-paper p-5 md:p-7"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {STATUS_ITEMS.map(([status, description], index) => (
                <div
                  key={status}
                  className={`border p-4 ${
                    status === "Active Production" || status === "Internal QA"
                      ? "border-paradigm-accent/50 bg-paradigm-accent/5"
                      : "border-paradigm-line bg-paradigm-paper-deep"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-[16px] text-paradigm-ink">
                      {status}
                    </span>
                    <span className="font-display text-[15px] text-paradigm-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-[1.6] text-paradigm-ink-mute">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <section
        className="bg-paradigm-paper paradigm-section"
        aria-labelledby="boundaries-heading"
      >
        <div className="mx-auto max-w-[1180px] px-5 md:px-8 lg:px-10">
          <FadeIn className="mb-10 max-w-3xl">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">
              SERVICE BOUNDARIES
            </p>
            <h2
              id="boundaries-heading"
              className="font-display text-[28px] leading-[1.12] text-paradigm-ink md:text-[42px]"
            >
              {isJa
                ? "リモート完結を標準に、例外は事前合意。"
                : "Remote-first by default, exceptions agreed before work."}
            </h2>
          </FadeIn>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Clapperboard,
                title: isJa ? "最終書き出しを納品" : "Final exports included",
                body: isJa
                  ? "編集プロジェクトや再利用テンプレートはService Orderへ明記した場合のみ。"
                  : "Editable projects and reusable templates are included only when written into the Service Order.",
              },
              {
                icon: Subtitles,
                title: isJa ? "日英展開に対応" : "English and Japanese",
                body: isJa
                  ? "別言語や大幅な別構成は独立した依頼として扱う場合があります。"
                  : "A different language or materially different structure may be a separate request.",
              },
              {
                icon: Sparkles,
                title: isJa ? "AI支援を利用可能" : "AI-assisted workflow",
                body: isJa
                  ? "利用禁止・特定ベンダー禁止・機密要件は契約前に記録します。"
                  : "No-AI, vendor, and confidentiality restrictions must be documented before contracting.",
              },
              {
                icon: Files,
                title: isJa ? "撮影等は別見積もり" : "Production extras scoped separately",
                body: isJa
                  ? "撮影、出演者、高額素材、本格3D、特急対応は事前承認が必要です。"
                  : "Filming, talent, premium media, advanced 3D, and rush work require prior approval.",
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <FadeIn
                  key={item.title}
                  className="border border-paradigm-line bg-paradigm-paper-deep p-6"
                >
                  <Icon size={22} aria-hidden className="text-paradigm-accent" />
                  <h3 className="mt-5 font-display text-[19px] text-paradigm-ink">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-[13px] leading-[1.8] text-paradigm-ink-soft">
                    {item.body}
                  </p>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      <section
        className="border-y border-paradigm-line bg-paradigm-paper-deep paradigm-section"
        aria-labelledby="faq-heading"
      >
        <div className="mx-auto max-w-[920px] px-5 md:px-8">
          <FadeIn className="mb-10 text-center">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">FAQ</p>
            <h2
              id="faq-heading"
              className="font-display text-[28px] leading-[1.12] text-paradigm-ink md:text-[42px]"
            >
              {isJa ? "契約前によくある質問" : "Questions before you subscribe"}
            </h2>
          </FadeIn>

          <div className="divide-y divide-paradigm-line border-y border-paradigm-line">
            {faqs.map((faq, index) => (
              <details
                key={faq.question}
                className="group bg-paradigm-paper px-5 py-1 md:px-7"
              >
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 text-left [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start gap-4">
                    <span className="font-display text-[17px] text-paradigm-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-[17px] leading-[1.4] text-paradigm-ink md:text-[19px]">
                      {faq.question}
                    </span>
                  </span>
                  <span
                    className="text-[22px] text-paradigm-accent transition-transform group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="pb-6 pl-10 pr-4 text-[13px] leading-[1.9] text-paradigm-ink-soft md:text-[14px]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>

          <FadeIn className="mt-7 text-center">
            <Link
              href="/video-as-a-service/terms"
              className="inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.08em] text-paradigm-accent underline decoration-paradigm-accent/40 underline-offset-4"
            >
              {isJa ? "共通利用規約を読む" : "Read the full service terms"}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </FadeIn>
        </div>
      </section>
    </>
  )
}
