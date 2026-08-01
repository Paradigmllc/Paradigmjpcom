import { ArrowRight, CheckCircle2, ShieldCheck, ShoppingBag, Sparkles, Workflow } from "lucide-react"
import FadeIn from "@/components/aesop/FadeIn"

type UseCaseStage = {
  label: string
  detail: string
}

export type ProfessionalUseCase = {
  sector: string
  title: string
  scenario: string
  accent: "cyan" | "violet" | "amber"
  stages: UseCaseStage[]
  deliverables: string[]
  boundary: string
}

type ProfessionalUseCasesProps = {
  eyebrow: string
  title: string
  description: string
  items: ProfessionalUseCase[]
}

const ACCENTS = {
  cyan: {
    border: "border-cyan-300/70",
    icon: "bg-cyan-500 text-white",
    wash: "from-cyan-500/20 via-cyan-300/5 to-transparent",
    step: "bg-cyan-50 text-cyan-800 border-cyan-200",
    dot: "bg-cyan-500",
  },
  violet: {
    border: "border-violet-300/70",
    icon: "bg-violet-500 text-white",
    wash: "from-violet-500/20 via-violet-300/5 to-transparent",
    step: "bg-violet-50 text-violet-800 border-violet-200",
    dot: "bg-violet-500",
  },
  amber: {
    border: "border-amber-300/80",
    icon: "bg-amber-500 text-white",
    wash: "from-amber-500/25 via-amber-300/5 to-transparent",
    step: "bg-amber-50 text-amber-900 border-amber-200",
    dot: "bg-amber-500",
  },
} as const

const SECTOR_ICONS = {
  "E-COMMERCE": ShoppingBag,
  SAAS: Workflow,
  "WEB3.0": Sparkles,
} as const

export default function ProfessionalUseCases({
  eyebrow,
  title,
  description,
  items,
}: ProfessionalUseCasesProps) {
  return (
    <section
      className="relative overflow-hidden border-y border-zinc-200 bg-white px-5 py-16 sm:px-8 sm:py-20 lg:px-12"
      aria-labelledby="professional-use-cases-title"
    >
      <div className="mx-auto max-w-6xl">
        <FadeIn className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{eyebrow}</p>
          <h2 id="professional-use-cases-title" className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-zinc-950 sm:text-5xl">
            {title}
          </h2>
          <p className="mt-5 text-sm leading-7 text-zinc-600 sm:text-base">{description}</p>
        </FadeIn>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {items.map((item, index) => {
            const accent = ACCENTS[item.accent]
            const SectorIcon = SECTOR_ICONS[item.sector as keyof typeof SECTOR_ICONS] ?? ShieldCheck
            return (
              <FadeIn key={item.sector} delay={index * 0.06}>
                <article className={`relative h-full overflow-hidden rounded-3xl border bg-zinc-50 shadow-sm ${accent.border}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${accent.wash}`} aria-hidden="true" />
                  <div className="relative p-6 sm:p-7">
                    <div className="flex items-center justify-between gap-4">
                      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${accent.icon}`}>
                        <SectorIcon size={21} aria-hidden="true" />
                      </div>
                      <span className="text-[11px] font-bold tracking-[0.18em] text-zinc-500">{item.sector}</span>
                    </div>
                    <h3 className="mt-6 text-xl font-semibold leading-tight text-zinc-950">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-zinc-600">{item.scenario}</p>

                    <div className="mt-7 space-y-2" aria-label={`${item.sector} delivery sequence`}>
                      {item.stages.map((stage, stageIndex) => (
                        <div key={stage.label} className="flex items-stretch gap-2">
                          <div className="flex w-5 flex-col items-center" aria-hidden="true">
                            <span className={`mt-2 h-2.5 w-2.5 rounded-full ${accent.dot}`} />
                            {stageIndex < item.stages.length - 1 && <span className="mt-1 w-px flex-1 bg-zinc-300" />}
                          </div>
                          <div className={`flex-1 rounded-xl border px-3 py-3 ${accent.step}`}>
                            <p className="text-xs font-semibold">{stage.label}</p>
                            <p className="mt-1 text-xs leading-6 opacity-80">{stage.detail}</p>
                          </div>
                          {stageIndex < item.stages.length - 1 && (
                            <ArrowRight className="mt-4 hidden shrink-0 text-zinc-400 sm:block" size={15} aria-hidden="true" />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-7 border-t border-zinc-200 pt-5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Included delivery artifacts</p>
                      <ul className="mt-3 space-y-2">
                        {item.deliverables.map((deliverable) => (
                          <li key={deliverable} className="flex gap-2 text-xs leading-6 text-zinc-700">
                            <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={14} aria-hidden="true" />
                            <span>{deliverable}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <p className="mt-6 rounded-xl border border-zinc-200 bg-white/70 px-3 py-3 text-xs leading-6 text-zinc-500">
                      <span className="font-semibold text-zinc-700">Professional boundary: </span>
                      {item.boundary}
                    </p>
                  </div>
                </article>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}
