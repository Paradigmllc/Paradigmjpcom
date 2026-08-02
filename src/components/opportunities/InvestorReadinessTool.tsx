"use client"

import { useMemo, useState } from "react"
import { Check, CircleAlert, RotateCcw } from "lucide-react"
import type { InvestorBriefPayload } from "@/lib/investor-briefs/repository"

interface Props {
  checklist: InvestorBriefPayload["checklist"]
  decisionGates: InvestorBriefPayload["decisionGates"]
  risks: InvestorBriefPayload["risks"]
}

function percent(complete: number, total: number): number {
  return total === 0 ? 0 : complete / total
}

export function InvestorReadinessTool({ checklist, decisionGates, risks }: Props) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => new Set())
  const [passedGates, setPassedGates] = useState<Set<string>>(() => new Set())
  const [mitigatedRisks, setMitigatedRisks] = useState<Set<string>>(() => new Set())

  const score = useMemo(() => {
    const checklistScore = percent(checkedItems.size, checklist.length) * 45
    const gateScore = percent(passedGates.size, decisionGates.length) * 35
    const riskScore = percent(mitigatedRisks.size, risks.length) * 20
    return Math.round(checklistScore + gateScore + riskScore)
  }, [checkedItems.size, checklist.length, decisionGates.length, mitigatedRisks.size, passedGates.size, risks.length])

  const outcome = score >= 80
    ? { label: "Ready for an advance decision", detail: "Document the evidence trail and obtain the required professional sign-offs before commitment.", tone: "text-emerald-300" }
    : score >= 55
      ? { label: "Continue diligence", detail: "Material evidence remains open. Assign owners and dates before repricing or advancing.", tone: "text-amber-300" }
      : { label: "Hold the investment", detail: "The current evidence set is not sufficient for a defensible commitment decision.", tone: "text-red-300" }

  function toggle(current: Set<string>, value: string, update: (next: Set<string>) => void) {
    const next = new Set(current)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    update(next)
  }

  function reset() {
    setCheckedItems(new Set())
    setPassedGates(new Set())
    setMitigatedRisks(new Set())
  }

  return (
    <section aria-labelledby="readiness-tool" className="my-16 overflow-hidden rounded-3xl bg-paradigm-ink text-paradigm-paper shadow-xl md:my-20">
      <div className="grid gap-8 border-b border-white/10 p-7 md:grid-cols-[1fr_auto] md:items-end md:p-10">
        <div className="max-w-3xl">
          <p className="paradigm-eyebrow text-paradigm-accent-soft">INTERACTIVE DECISION TOOL</p>
          <h2 id="readiness-tool" className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] md:text-4xl">Evidence readiness score</h2>
          <p className="mt-4 text-sm leading-7 text-paradigm-paper/70">Mark only evidence already obtained and verified. The score runs in your browser, is not saved and is not a return forecast.</p>
        </div>
        <div className="min-w-48 rounded-2xl border border-white/15 bg-white/5 p-5 text-center">
          <p className="font-display text-5xl font-semibold tabular-nums">{score}<span className="text-xl text-paradigm-paper/50">/100</span></p>
          <p aria-live="polite" className={`mt-2 text-xs font-semibold uppercase tracking-[0.12em] ${outcome.tone}`}>{outcome.label}</p>
        </div>
      </div>

      <div className="h-2 bg-white/10" aria-hidden="true">
        <div className="h-full bg-paradigm-accent transition-[width] duration-500" style={{ width: `${score}%` }} />
      </div>

      <div className="grid gap-8 p-7 md:p-10 lg:grid-cols-3">
        <EvidenceGroup
          title="Evidence obtained"
          items={checklist}
          selected={checkedItems}
          onToggle={(value) => toggle(checkedItems, value, setCheckedItems)}
        />
        <EvidenceGroup
          title="Decision gates passed"
          items={decisionGates.map((gate) => gate.title)}
          selected={passedGates}
          onToggle={(value) => toggle(passedGates, value, setPassedGates)}
        />
        <EvidenceGroup
          title="Risks mitigated"
          items={risks.map((risk) => risk.title)}
          selected={mitigatedRisks}
          onToggle={(value) => toggle(mitigatedRisks, value, setMitigatedRisks)}
        />
      </div>

      <div className="flex flex-col gap-4 border-t border-white/10 px-7 py-6 sm:flex-row sm:items-center sm:justify-between md:px-10">
        <p className="flex max-w-3xl items-start gap-2 text-xs leading-6 text-paradigm-paper/65"><CircleAlert className="mt-1 shrink-0" size={15} aria-hidden="true" />{outcome.detail}</p>
        <button type="button" onClick={reset} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-white/10" aria-label="Reset evidence readiness score">
          <RotateCcw size={15} aria-hidden="true" />Reset
        </button>
      </div>
    </section>
  )
}

function EvidenceGroup({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string
  items: readonly string[]
  selected: Set<string>
  onToggle: (value: string) => void
}) {
  return (
    <fieldset>
      <legend className="font-display text-xl font-semibold">{title}</legend>
      <div className="mt-5 space-y-3">
        {items.map((item) => {
          const checked = selected.has(item)
          return (
            <label key={item} className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm leading-6 transition hover:border-paradigm-accent/60">
              <input type="checkbox" checked={checked} onChange={() => onToggle(item)} className="sr-only" />
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? "border-paradigm-accent bg-paradigm-accent" : "border-white/30"}`} aria-hidden="true">
                {checked ? <Check size={13} /> : null}
              </span>
              <span className={checked ? "text-paradigm-paper" : "text-paradigm-paper/70"}>{item}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
