"use client"

import { useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import { captureException } from "@/lib/error-monitor"

export default function PricingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const locale = useLocale()
  const t = useTranslations("errorPage")

  useEffect(() => {
    void captureException(error, {
      source: "[locale]/pricing/error.tsx",
      severity: "error",
      context: { digest: error.digest, locale },
    })
  }, [error, locale])

  return (
    <div className="min-h-dvh bg-[#fbfaf7] flex items-center justify-center p-8" role="alert">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100" aria-hidden>
          <span className="text-rose-600 text-lg font-bold">!</span>
        </div>
        <p className="mt-4 paradigm-eyebrow text-rose-600">{t("eyebrow")}</p>
        <h2 className="mt-2 text-lg font-semibold text-zinc-900">{t("title")}</h2>
        <p className="mt-2 text-sm text-zinc-500">{t("desc")}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-6 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          {t("retry")}
        </button>
      </div>
    </div>
  )
}
