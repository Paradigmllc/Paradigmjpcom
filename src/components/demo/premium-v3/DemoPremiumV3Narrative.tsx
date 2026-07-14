"use client"

import { Check } from "lucide-react"
import type { DemoDesignRecipe, DemoNarrativeModule } from "@/lib/sales/demo-site-types"
import { demoHeadlineClass } from "@/lib/sales/demo-art-direction"
import { PremiumV3Reveal } from "./PremiumV3Motion"

export function DemoPremiumV3Narrative({
  modules,
  label,
  title,
  introduction,
  motionStyle,
  variant = "editorial",
}: {
  modules: DemoNarrativeModule[] | undefined
  label: string
  title: string
  introduction: string
  motionStyle?: DemoDesignRecipe["motionVariant"]
  variant?: "editorial" | "index" | "contrast"
}) {
  if (!modules || modules.length < 1) return null
  const contrast = variant === "contrast"

  return (
    <section className={contrast ? "bg-[var(--demo-ink)] text-white" : "bg-[var(--demo-surface)] text-[var(--demo-ink)]"}>
      <div className="mx-auto max-w-[1500px] px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-36">
        <PremiumV3Reveal motionStyle={motionStyle} className={`grid gap-8 border-b pb-10 lg:grid-cols-[1fr_.62fr] lg:items-end ${contrast ? "border-white/16" : "border-[var(--demo-line)]"}`}>
          <div>
            <p className={`text-xs font-bold tracking-[.24em] ${contrast ? "text-white/48" : "text-[var(--demo-accent)]"}`}>{label}</p>
            <h2 className={`${demoHeadlineClass(title)} mt-6 max-w-[16em] font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{title}</h2>
          </div>
          <p className={`text-base leading-9 ${contrast ? "text-white/62" : "text-[var(--demo-muted)]"}`}>{introduction}</p>
        </PremiumV3Reveal>

        <div className={variant === "index" ? "divide-y divide-[var(--demo-line)]" : `grid ${contrast ? "divide-y divide-white/16 lg:grid-cols-3 lg:divide-x lg:divide-y-0" : "gap-px bg-[var(--demo-line)] lg:grid-cols-3"}`}>
          {modules.map((module, index) => (
            <PremiumV3Reveal
              key={`${module.title}-${index}`}
              motionStyle={motionStyle}
              delay={index * 0.04}
              className={variant === "index"
                ? "grid gap-6 py-10 md:grid-cols-[90px_.72fr_1.28fr] md:gap-10"
                : contrast
                  ? "px-0 py-10 lg:px-9 lg:py-12"
                  : "bg-[var(--demo-surface)] p-7 sm:p-9"}
            >
              <div className={variant === "index" ? "text-sm text-[var(--demo-muted)]" : "flex items-center justify-between"}>
                <span className={contrast ? "text-xs text-white/35" : "text-xs text-[var(--demo-muted)]"}>{String(index + 1).padStart(2, "0")}</span>
                {variant !== "index" && <span className={`text-[10px] font-bold tracking-[.22em] ${contrast ? "text-white/42" : "text-[var(--demo-accent)]"}`}>{module.eyebrow}</span>}
              </div>
              <div>
                {variant === "index" && <p className="mb-4 text-[10px] font-bold tracking-[.22em] text-[var(--demo-accent)]">{module.eyebrow}</p>}
                <h3 className={`${demoHeadlineClass(module.title, "card")} ${variant === "index" ? "" : "mt-8"} font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{module.title}</h3>
              </div>
              <div>
                <div className={`whitespace-pre-line text-sm leading-8 ${contrast ? "text-white/62" : "text-[var(--demo-muted)]"}`}>{module.body}</div>
                {module.points.length > 0 && <ul className={`mt-7 border-t pt-5 ${contrast ? "border-white/16" : "border-[var(--demo-line)]"}`}>
                  {module.points.map((point) => <li key={point} className="flex items-start gap-3 py-2 text-xs leading-6"><Check className={`mt-1 h-3.5 w-3.5 shrink-0 ${contrast ? "text-white/55" : "text-[var(--demo-accent)]"}`} />{point}</li>)}
                </ul>}
              </div>
            </PremiumV3Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
