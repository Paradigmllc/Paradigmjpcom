import { ClipboardCheck, FileText, Mail, Rocket, TrendingUp } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/routing"

type JourneyStep = {
  title: string
  timing: string
  body: string
}

const STEP_ICONS = [Mail, FileText, ClipboardCheck, Rocket, TrendingUp] as const

/**
 * The decision-maker path from first contact to an operating Japan channel.
 * Rendered only on the international Japan Entry surface; the Japanese site
 * intentionally keeps its domestic general-service positioning separate.
 */
export default async function JapanEntryJourney({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "home" })
  const steps = t.raw("journey.steps") as JourneyStep[]

  if (!Array.isArray(steps) || steps.length === 0) return null

  return (
    <section
      id="japan-entry-journey"
      className="relative overflow-hidden border-y border-zinc-200 bg-slate-50 px-5 py-16 sm:px-8 sm:py-20 lg:px-12"
      aria-labelledby="japan-entry-journey-title"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(37,99,235,0.08),transparent_32%),radial-gradient(circle_at_90%_85%,rgba(16,185,129,0.08),transparent_30%)]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{t("journey.eyebrow")}</p>
          <h2 id="japan-entry-journey-title" className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-zinc-950 sm:text-5xl">
            {t("journey.title")}
          </h2>
          <p className="mt-5 text-sm leading-7 text-zinc-600 sm:text-base">{t("journey.description")}</p>
        </div>

        <ol className="relative mt-10 grid gap-4 lg:grid-cols-5 lg:gap-0">
          <div className="pointer-events-none absolute left-[10%] right-[10%] top-7 hidden h-px bg-zinc-300 lg:block" aria-hidden />
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? Mail
            return (
              <li key={step.title} className="relative lg:px-2">
                <div className="relative z-10 flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm lg:min-h-[290px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-slate-50 bg-zinc-950 text-white shadow-sm" aria-hidden>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">{step.timing}</span>
                  </div>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{String(index + 1).padStart(2, "0")}</p>
                  <h3 className="mt-2 text-lg font-semibold leading-tight text-zinc-950">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-600">{step.body}</p>
                </div>
              </li>
            )
          })}
        </ol>

        <div className="mt-8 grid gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <p className="text-xs leading-6 text-zinc-500">{t("journey.note")}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/pricing#package-modules" className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-semibold text-zinc-800 transition hover:border-zinc-950 hover:bg-zinc-50">
              {t("journey.scopeCta")}
            </Link>
            <Link href="/contact?intent=japan-entry" className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-blue-700">
              {t("journey.contactCta")}
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm sm:p-6" aria-labelledby="japan-entry-workspace-title">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{t("journey.workspace.eyebrow")}</p>
              <h3 id="japan-entry-workspace-title" className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
                {t("journey.workspace.title")}
              </h3>
              <p className="mt-3 text-sm leading-7 text-zinc-700">{t("journey.workspace.description")}</p>
            </div>
            <div className="shrink-0 rounded-xl border border-blue-200 bg-white px-4 py-3 lg:max-w-xs">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{t("journey.workspace.slaLabel")}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-zinc-950">{t("journey.workspace.slaTitle")}</p>
              <p className="mt-1 text-xs leading-6 text-zinc-600">{t("journey.workspace.slaBody")}</p>
            </div>
          </div>
          <ul className="mt-6 grid gap-3 md:grid-cols-3">
            {(t.raw("journey.workspace.items") as Array<{ title: string; body: string }>).map((item) => (
              <li key={item.title} className="rounded-xl border border-blue-100 bg-white p-4">
                <h4 className="text-sm font-semibold text-zinc-950">{item.title}</h4>
                <p className="mt-2 text-xs leading-6 text-zinc-600">{item.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-6 text-zinc-600">{t("journey.workspace.note")}</p>
        </div>
      </div>
    </section>
  )
}
