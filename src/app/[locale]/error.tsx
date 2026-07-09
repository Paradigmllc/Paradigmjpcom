"use client"

/**
 * /[locale]/error.tsx — route-level Error Boundary
 *
 * 役割: Server Component / Client Component で発生した未捕捉エラーを
 *       luxury な UI で表示し、reset() で復旧を試みる。
 * 入力: { error: Error & { digest?: string }; reset: () => void } (Next.js 規約)
 * 出力: 「申し訳ありません」画面 + 復旧ボタン + ホームへ戻るリンク
 *
 * H ルール (3 状態): エラー状態 — 必須実装。
 * BB ルール: error.digest を console.error に出すことでサイレント失敗を防ぐ。
 */

import { useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import { captureException } from "@/lib/error-monitor"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const locale = useLocale()
  const t = useTranslations("errorPage")

  useEffect(() => {
    captureException(error, {
      source: "[locale]/error.tsx",
      severity: "error",
      context: { digest: error.digest, locale },
    })
  }, [error, locale])

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-paradigm-paper paradigm-section overflow-hidden relative">
      <div className="paradigm-mesh opacity-30" />
      <div className="relative z-10 max-w-xl mx-auto px-6 md:px-8 text-center">
        <p className="paradigm-eyebrow text-pink-500 mb-3">{t("eyebrow")}</p>
        <h1 className="font-display text-[28px] md:text-[40px] leading-[1.15] tracking-[-0.025em] text-paradigm-ink mb-4">
          <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-tech bg-clip-text text-transparent">
            {t("title")}
          </span>
        </h1>
        <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.7] mb-8">
          {t("desc")}
          <br />
          <span className="text-[11px] text-red-400 mt-2 block break-all">
            Debug: {error?.message || "No message"} {error?.digest ? `[digest: ${error.digest}]` : ""}
          </span>
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button
            onClick={() => reset()}
            className="paradigm-glass rounded-xl px-6 py-3 paradigm-glow-sm hover:paradigm-glow-md transition-all text-[13px] tracking-[0.06em] uppercase font-semibold text-paradigm-ink"
          >
            {t("retry")}
          </button>
          <Link
            href={`/${locale}`}
            className="bg-paradigm-ink text-paradigm-paper rounded-xl px-6 py-3 paradigm-glow-md hover:paradigm-glow-lg transition-all text-[13px] tracking-[0.06em] uppercase font-semibold"
          >
            {t("home")}
          </Link>
        </div>

        <p className="text-[11px] text-paradigm-ink-mute">{t("contact")}</p>
      </div>
    </div>
  )
}
