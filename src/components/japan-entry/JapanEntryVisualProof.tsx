import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/routing"

type LocaleVariant = "en" | "ja"

type VisualProofCard = {
  title: string
  body: string
  alt: string
}

const VISUALS = [
  { src: "/japan-entry/package-scope.svg", width: 900, height: 560 },
  { src: "/japan-entry/signal-check.svg", width: 900, height: 560 },
  { src: "/japan-entry/application-handover.svg", width: 900, height: 560 },
] as const

export default async function JapanEntryVisualProof({ locale }: { locale: LocaleVariant }) {
  const t = await getTranslations({ locale, namespace: "home" })
  const cards = t.raw("visualProof.cards") as VisualProofCard[]

  return (
    <section className="relative overflow-hidden border-y border-zinc-200 bg-zinc-50 px-5 py-16 sm:px-8 sm:py-20 lg:px-12" aria-labelledby="visual-proof-title">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{t("visualProof.eyebrow")}</p>
          <h2 id="visual-proof-title" className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-zinc-950 sm:text-5xl">{t("visualProof.title")}</h2>
          <p className="mt-5 text-sm leading-7 text-zinc-600 sm:text-base">{t("visualProof.desc")}</p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {cards.map((card, index) => {
            const visual = VISUALS[index] ?? VISUALS[0]
            return (
              <article key={card.title} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-200 bg-zinc-100">
                  <Image src={visual.src} width={visual.width} height={visual.height} alt={card.alt} className="h-auto w-full" />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-zinc-950">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-600">{card.body}</p>
                </div>
              </article>
            )
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/tools/japan-entry-score" className="inline-flex h-11 items-center rounded-lg bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-blue-700">
            {t("visualProof.utilityCta")}
          </Link>
          <span className="text-xs leading-6 text-zinc-500">
            {locale === "ja" ? "公開情報と自己申告を分け、非公開の売上やアクセスを推定しません。" : "Public evidence and self-reported answers stay separate; private traffic and revenue are not inferred."}
          </span>
        </div>
      </div>
    </section>
  )
}
