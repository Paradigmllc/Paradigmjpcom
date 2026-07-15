import Image from "next/image"
import { getTranslations } from "next-intl/server"

type LocaleVariant = "en" | "ja"

type AtmosphereItem = {
  label: string
  body: string
}

const PETAL_POSITIONS = [
  [8, 18], [16, 72], [24, 34], [32, 82], [42, 24], [51, 67], [61, 12],
  [69, 78], [78, 31], [88, 64], [94, 16], [97, 84],
] as const

export default async function JapanAtmosphereBanner({ locale }: { locale: LocaleVariant }) {
  const t = await getTranslations({ locale, namespace: "home" })
  const items = t.raw("atmosphere.items") as AtmosphereItem[]

  return (
    <section
      className="relative isolate overflow-hidden border-y border-[#2d4264] bg-[#0d1833] px-5 py-16 text-white sm:px-8 sm:py-20 lg:px-12"
      aria-labelledby="japan-atmosphere-title"
    >
      <Image
        src="/japan-entry/tokyo-sakura-panorama.svg"
        alt=""
        fill
        sizes="100vw"
        className="pointer-events-none object-cover opacity-75"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,24,51,0.96)_0%,rgba(13,24,51,0.78)_45%,rgba(13,24,51,0.35)_100%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {PETAL_POSITIONS.map(([left, top], index) => (
          <span
            key={`${left}-${top}`}
            className="japan-petal"
            style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${index * -1.15}s` }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl items-end gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-200">{t("atmosphere.eyebrow")}</p>
          <h2 id="japan-atmosphere-title" className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {t("atmosphere.title")}
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-blue-50/80 sm:text-base">{t("atmosphere.description")}</p>
          <div className="mt-7 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-pink-50 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-pink-200 shadow-[0_0_18px_rgba(251,182,206,0.9)]" />
            {t("atmosphere.caption")}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {items.map((item) => (
            <article key={item.label} className="rounded-2xl border border-white/15 bg-[#132444]/75 p-4 backdrop-blur-md transition hover:-translate-y-1 hover:border-pink-200/60">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pink-100">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-blue-50/75">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
