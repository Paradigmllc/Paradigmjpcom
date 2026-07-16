import { ArrowRight, CheckCircle2 } from "lucide-react"
import FadeIn from "@/components/aesop/FadeIn"

export type CampaignStep = {
  label: string
  title: string
  price: string
  period: string
  body: string
}

export type CampaignCopy = {
  eyebrow: string
  badge: string
  title: string
  highlight: string
  desc: string
  availability: string
  steps: CampaignStep[]
  footnote: string
}

type Props = {
  copy: CampaignCopy
  source: "pricing" | "package"
}

export default function JapanEntryCampaign({ copy, source }: Props) {
  const headingId = `launch-partner-campaign-${source}`

  return (
    <section
      id="launch-partner-campaign"
      className="relative overflow-hidden border-y border-emerald-300/30 bg-zinc-950 px-5 py-14 text-white sm:px-8 sm:py-20 lg:px-12"
      aria-labelledby={headingId}
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.25),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(37,99,235,0.22),transparent_38%)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-6xl">
        <FadeIn className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              {copy.eyebrow}
            </span>
            <span className="rounded-full border border-emerald-300/60 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">
              {copy.badge}
            </span>
          </div>
          <h2 id={headingId} className="mt-5 max-w-4xl font-display text-[32px] leading-[1.08] sm:text-[46px] lg:text-[58px]">
            {copy.title} <span className="text-emerald-300">{copy.highlight}</span>
          </h2>
          <p className="mt-5 max-w-3xl text-[14px] leading-[1.85] text-zinc-300 sm:text-[16px]">
            {copy.desc}
          </p>
        </FadeIn>

        <ol className="relative mt-10 grid gap-4 md:grid-cols-3" aria-label="Campaign pricing steps">
          {copy.steps.map((step, index) => (
            <FadeIn key={step.label} delay={index * 0.06} as="li" className="relative h-full rounded-xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-sm sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <span className="font-display text-3xl text-emerald-300">{step.label}</span>
                {index < copy.steps.length - 1 && <ArrowRight className="mt-2 hidden h-5 w-5 text-emerald-300/70 md:block" aria-hidden />}
              </div>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">{step.period}</p>
              <h3 className="mt-2 font-display text-[22px] leading-[1.15] text-white">{step.title}</h3>
              <p className="mt-4 font-display text-[30px] leading-none text-emerald-300 sm:text-[36px]">{step.price}</p>
              <p className="mt-4 text-[13px] leading-[1.75] text-zinc-300">{step.body}</p>
            </FadeIn>
          ))}
        </ol>

        <FadeIn className="mt-7 flex items-start gap-3 rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-4 text-[13px] leading-[1.7] text-emerald-50 sm:p-5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
          <p>{copy.availability}</p>
        </FadeIn>
        <p className="mt-5 max-w-4xl text-[11px] leading-[1.7] text-zinc-400">{copy.footnote}</p>
      </div>
    </section>
  )
}
