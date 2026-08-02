import { BookOpenCheck } from "lucide-react"
import type { InvestorBriefPayload } from "@/lib/investor-briefs/repository"

interface Props {
  chapters: NonNullable<InvestorBriefPayload["chapters"]>
}

export function InvestorBriefNarrative({ chapters }: Props) {
  return (
    <section aria-labelledby="market-analysis" className="border-t border-paradigm-line py-16 md:py-20">
      <div className="flex items-center gap-3 text-paradigm-accent"><BookOpenCheck size={22} aria-hidden="true" /><p className="paradigm-eyebrow">MARKET ANALYSIS</p></div>
      <h2 id="market-analysis" className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-4xl">The evidence behind the screen</h2>
      <div className="mt-10 space-y-12">
        {chapters.map((chapter, index) => (
          <article key={chapter.title} className="grid gap-5 md:grid-cols-[4rem_1fr]">
            <div className="font-display text-4xl font-semibold text-paradigm-accent/35">{String(index + 1).padStart(2, "0")}</div>
            <div className="max-w-3xl">
              <h3 className="font-display text-2xl font-semibold tracking-[-0.02em] text-paradigm-ink md:text-3xl">{chapter.title}</h3>
              <p className="mt-3 border-l-2 border-paradigm-accent pl-4 text-base font-medium leading-8 text-paradigm-ink">{chapter.lede}</p>
              <div className="mt-5 space-y-5 text-sm leading-8 text-paradigm-ink-soft">
                {chapter.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {chapter.sourceIds.map((sourceId) => <a key={sourceId} href={`#source-${sourceId}`} className="rounded-full bg-paradigm-accent/10 px-3 py-1 text-xs font-semibold text-paradigm-accent hover:bg-paradigm-accent/20">Source: {sourceId}</a>)}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
