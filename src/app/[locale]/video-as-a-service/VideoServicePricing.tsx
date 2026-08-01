import { ArrowRight, CheckCircle2 } from "lucide-react"
import { Link } from "@/i18n/routing"
import FadeIn from "@/components/aesop/FadeIn"
import {
  getVideoServicePlans,
  type VideoServiceLocale,
} from "@/lib/video-service-content"

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

export default function VideoServicePricing({
  locale,
}: {
  locale: VideoServiceLocale
}) {
  const isJa = locale === "ja"
  const plans = getVideoServicePlans(locale)
  const deliverables = isJa ? JA_DELIVERABLES : EN_DELIVERABLES

  return (
    <>
      <section
        id="pricing"
        className="relative overflow-hidden bg-paradigm-paper paradigm-section"
        aria-labelledby="pricing-heading"
      >
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 mx-auto max-w-[1180px] px-5 md:px-8 lg:px-10">
          <FadeIn className="mx-auto mb-10 max-w-3xl text-center md:mb-14">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">
              {isJa ? "MONTHLY PLANS" : "MONTHLY PRODUCTION CAPACITY"}
            </p>
            <h2
              id="pricing-heading"
              className="font-display text-[30px] leading-[1.1] text-paradigm-ink md:text-[46px]"
            >
              {isJa
                ? "必要な制作量に合わせた3プラン。"
                : "Three clear ways to scale production."}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[14px] leading-[1.85] text-paradigm-ink-soft md:text-[16px]">
              {isJa
                ? "Unlimitedを標準プランとして、ショート編集から複数キャンペーンの並行制作まで対応します。長期契約は不要です。"
                : "Unlimited is the core plan, with a defined short-form entry tier and a two-slot priority tier for parallel campaigns. No long-term commitment."}
            </p>
          </FadeIn>

          <div className="grid gap-5 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <FadeIn
                key={plan.id}
                delay={index * 0.06}
                className={`relative flex h-full flex-col border p-6 md:p-7 ${
                  plan.featured
                    ? "border-paradigm-accent bg-paradigm-paper-deep paradigm-glow-md"
                    : "border-paradigm-line bg-paradigm-paper-deep"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="paradigm-eyebrow text-paradigm-accent">
                    {plan.label}
                  </p>
                  {plan.featured && (
                    <span className="border border-paradigm-accent/40 bg-paradigm-accent/8 px-3 py-1 text-[10px] font-semibold tracking-[0.12em] text-paradigm-accent">
                      {isJa ? "推奨" : "RECOMMENDED"}
                    </span>
                  )}
                </div>
                <h3 className="mt-5 font-display text-[29px] text-paradigm-ink">
                  {plan.name}
                </h3>
                <div className="mt-4 flex items-end gap-2">
                  <span className="font-display text-[38px] leading-none text-paradigm-ink md:text-[43px]">
                    {plan.price}
                  </span>
                  <span className="pb-1 text-[12px] text-paradigm-ink-mute">
                    {plan.cadence}
                  </span>
                </div>
                <p className="mt-5 min-h-[54px] text-[13px] leading-[1.75] text-paradigm-ink-soft">
                  {plan.summary}
                </p>

                <dl className="mt-7 grid gap-px overflow-hidden border border-paradigm-line bg-paradigm-line">
                  {[
                    [isJa ? "依頼枠" : "Capacity", plan.capacity],
                    [isJa ? "同時進行" : "Active work", plan.activeRequests],
                    [isJa ? "着手" : "Start", plan.start],
                    [isJa ? "修正" : "Revisions", plan.revisions],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-paradigm-paper px-4 py-3">
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-paradigm-ink-mute">
                        {label}
                      </dt>
                      <dd className="mt-1.5 text-[12px] leading-[1.6] text-paradigm-ink">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <ul className="mt-7 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle2
                        size={16}
                        aria-hidden
                        className="mt-0.5 shrink-0 text-paradigm-accent"
                      />
                      <span className="text-[12px] leading-[1.7] text-paradigm-ink-soft">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="mt-7 border-t border-paradigm-line pt-5 text-[11px] leading-[1.75] text-paradigm-ink-mute">
                  {plan.boundary}
                </p>

                <Link
                  href={`/contact?intent=video-as-a-service&plan=${plan.id}`}
                  data-umami-event="video-service-plan-apply"
                  data-umami-event-plan={plan.id}
                  className={`mt-7 inline-flex min-h-12 items-center justify-center gap-2 px-5 text-[11px] font-semibold uppercase tracking-[0.13em] transition-colors ${
                    plan.featured
                      ? "bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent"
                      : "border border-paradigm-ink text-paradigm-ink hover:bg-paradigm-ink hover:text-paradigm-paper"
                  }`}
                >
                  {isJa ? `${plan.name}に申し込む` : `Apply for ${plan.name}`}
                  <ArrowRight size={15} aria-hidden />
                </Link>
              </FadeIn>
            ))}
          </div>

          <FadeIn className="mt-8 flex flex-col items-start justify-between gap-4 border border-paradigm-line bg-paradigm-paper-deep p-5 md:flex-row md:items-center md:p-6">
            <p className="max-w-3xl text-[12px] leading-[1.8] text-paradigm-ink-soft">
              {isJa
                ? "表示価格は標準月額です。税、送金手数料、撮影、出演者、高額素材、特急対応などは別途となる場合があります。契約前にService Orderで範囲と請求条件を確定します。"
                : "Prices are standard monthly fees. Taxes, transfer fees, filming, talent, premium media, and rush work may be additional. Scope and billing are fixed in the Service Order before contracting."}
            </p>
            <Link
              href="/video-as-a-service/terms"
              className="inline-flex shrink-0 items-center gap-2 text-[11px] font-semibold tracking-[0.1em] text-paradigm-accent underline decoration-paradigm-accent/40 underline-offset-4"
            >
              {isJa ? "利用規約を確認" : "Review service terms"}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </FadeIn>
        </div>
      </section>

      <section
        className="border-y border-paradigm-line bg-paradigm-paper-deep paradigm-section"
        aria-labelledby="deliverables-heading"
      >
        <div className="mx-auto grid max-w-[1180px] gap-10 px-5 md:grid-cols-[0.9fr_1.1fr] md:px-8 lg:px-10">
          <FadeIn>
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">
              WHAT YOU CAN REQUEST
            </p>
            <h2
              id="deliverables-heading"
              className="font-display text-[28px] leading-[1.12] text-paradigm-ink md:text-[42px]"
            >
              {isJa
                ? "日常的に必要な動画を、一つの制作窓口へ。"
                : "One production queue for recurring video demand."}
            </h2>
            <p className="mt-5 text-[14px] leading-[1.9] text-paradigm-ink-soft md:text-[16px]">
              {isJa
                ? "編集だけでなく、企画・構成・モーション・AI支援素材・日英展開まで依頼できます。各依頼は着手前に範囲と納期目安を確認します。"
                : "Request editing, concept, structure, motion, AI-assisted elements, and EN/JA adaptations. Each request is scoped before production begins."}
            </p>
          </FadeIn>

          <FadeIn
            delay={0.08}
            className="grid gap-px overflow-hidden border border-paradigm-line bg-paradigm-line sm:grid-cols-2"
          >
            {deliverables.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 bg-paradigm-paper p-5"
              >
                <CheckCircle2
                  size={17}
                  aria-hidden
                  className="mt-0.5 shrink-0 text-paradigm-accent"
                />
                <span className="text-[13px] leading-[1.75] text-paradigm-ink-soft">
                  {item}
                </span>
              </div>
            ))}
          </FadeIn>
        </div>
      </section>
    </>
  )
}
