import { getTranslations } from "next-intl/server"
import { CheckCircle2, Eye, Layers3, ShieldCheck } from "lucide-react"

type LocaleVariant = "en" | "ja"

type TrustCard = {
  kicker: string
  value: string
  title: string
  body: string
}

const CARD_ICONS = [Eye, Layers3, CheckCircle2, ShieldCheck] as const
const CARD_TONES = [
  "from-blue-600 to-cyan-500",
  "from-zinc-950 to-blue-700",
  "from-emerald-700 to-cyan-600",
  "from-violet-700 to-blue-600",
] as const

export default async function JapanEntryTrustPanel({ locale }: { locale: LocaleVariant }) {
  const t = await getTranslations({ locale, namespace: "home" })
  const cards = t.raw("trustPanel.cards") as TrustCard[]

  return (
    <section className="relative overflow-hidden bg-zinc-950 px-6 py-16 text-white sm:px-8 sm:py-20 lg:px-12" aria-labelledby="trust-panel-title">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,0.22),transparent_36%),radial-gradient(circle_at_85%_85%,rgba(16,185,129,0.16),transparent_34%)]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {t("trustPanel.eyebrow")}
          </p>
          <h2 id="trust-panel-title" className="mt-5 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{t("trustPanel.title")}</h2>
          <p className="mt-5 text-sm leading-7 text-zinc-300 sm:text-base">{t("trustPanel.desc")}</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, index) => {
            const Icon = CARD_ICONS[index] ?? Eye
            const tone = CARD_TONES[index] ?? CARD_TONES[0]
            return (
              <article key={card.title} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm">
                <div className={`relative h-28 bg-gradient-to-br ${tone} p-5`}>
                  <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:18px_18px]" />
                  <div className="relative flex items-start justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75">{card.kicker}</span>
                    <Icon className="h-5 w-5 text-white/85" aria-hidden />
                  </div>
                  <p className="relative mt-4 text-2xl font-semibold tracking-tight text-white">{card.value}</p>
                </div>
                <div className="p-5">
                  <h3 className="text-base font-semibold text-white">{card.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">{card.body}</p>
                </div>
              </article>
            )
          })}
        </div>

        <p className="mt-6 max-w-4xl text-xs leading-6 text-zinc-400">{t("trustPanel.note")}</p>
      </div>
    </section>
  )
}
