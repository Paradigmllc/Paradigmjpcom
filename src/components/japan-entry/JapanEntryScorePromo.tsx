import { ArrowRight, BarChart3 } from "lucide-react"
import { Link } from "@/i18n/routing"

export default function JapanEntryScorePromo({ locale }: { locale: "en" | "ja" }) {
  const isJapanese = locale === "ja"
  return (
    <section className="border-y border-zinc-200 bg-zinc-950 px-5 py-14 text-white sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex max-w-3xl gap-4">
          <BarChart3 className="mt-1 h-6 w-6 shrink-0 text-emerald-300" aria-hidden />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
              {isJapanese ? "申込前の公開シグナル確認" : "Before you apply"}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              {isJapanese ? "日本進出に向けた現在地を、先に可視化する。" : "See your Japan-entry signals before you commit."}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              {isJapanese
                ? "Webサイトと運用情報から、公開根拠・自己申告・未知項目を分けて確認できます。"
                : "A short utility separates public evidence, your operating answers, and the unknowns that still need proof."}
            </p>
          </div>
        </div>
        <Link href="/tools/japan-entry-score" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300">
          {isJapanese ? "無料で日本進出度を確認" : "Run the free signal check"}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
