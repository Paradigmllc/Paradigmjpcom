import { ArrowRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/routing"

interface PageHeroProps {
  badge: string
  title: string
  desc?: string
  /** @deprecated kept for callsite compatibility */
  icon?: string
  /** @deprecated accent variant ignored in unified voice */
  accent?: "violet" | "indigo" | "emerald" | "rose" | "amber"
  highlight?: string
}

function splitTitle(title: string, highlight?: string) {
  if (!highlight || !title.includes(highlight)) {
    return { before: title, match: "", after: "" }
  }
  const [before, after = ""] = title.split(highlight)
  return { before, match: highlight, after }
}

export default async function PageHero({ badge, title, desc, highlight }: PageHeroProps) {
  const tCta = await getTranslations("cta")
  const tFooter = await getTranslations("footer")
  const parts = splitTitle(title, highlight)

  return (
    <section className="relative border-b border-paradigm-line bg-paradigm-paper pt-28 pb-14 md:pt-36 md:pb-20">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-paradigm-accent/30 to-transparent" />
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-10 px-5 md:grid-cols-[minmax(0,1fr)_320px] md:px-8 lg:px-10">
        <div>
          <p className="paradigm-eyebrow mb-5 text-paradigm-accent">{badge}</p>
          <h1 className="max-w-4xl font-display text-[34px] leading-[1.1] text-paradigm-ink md:text-[54px]">
            {parts.match ? (
              <>
                {parts.before}
                <span className="text-paradigm-accent">{parts.match}</span>
                {parts.after}
              </>
            ) : (
              title
            )}
          </h1>
          {desc && (
            <p className="mt-6 max-w-2xl text-[14px] leading-[1.9] text-paradigm-ink-soft md:text-[16px]">
              {desc}
            </p>
          )}
        </div>

        <aside className="self-end border-l border-paradigm-line pl-6">
          <p className="text-[12px] leading-[1.8] text-paradigm-ink-mute">
            {tFooter("companyTagline")}
          </p>
          <Link
            href="/contact"
            className="mt-5 inline-flex items-center gap-2 text-[12px] font-semibold text-paradigm-ink transition-colors hover:text-paradigm-accent"
          >
            {tCta("primary")}
            <ArrowRight size={14} aria-hidden />
          </Link>
        </aside>
      </div>
    </section>
  )
}
