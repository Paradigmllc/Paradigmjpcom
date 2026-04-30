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
import { useLocale } from "next-intl"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const locale = useLocale()
  const isJa = locale === "ja"

  useEffect(() => {
    console.error("[route-error]", { message: error.message, digest: error.digest, stack: error.stack })
  }, [error])

  const T = isJa
    ? {
        eyebrow: "Error",
        title: "申し訳ありません",
        desc: "予期しないエラーが発生しました。お手数ですが、もう一度お試しください。",
        retry: "もう一度試す",
        home: "ホームへ戻る",
        contact: "問題が続く場合はお問い合わせください",
      }
    : {
        eyebrow: "Error",
        title: "Something went wrong",
        desc: "An unexpected error occurred. Please try again, or return to the home page.",
        retry: "Try again",
        home: "Back to home",
        contact: "Contact us if the problem persists",
      }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-paradigm-paper paradigm-section overflow-hidden relative">
      <div className="paradigm-mesh opacity-30" />
      <div className="relative z-10 max-w-xl mx-auto px-6 md:px-8 text-center">
        <p className="paradigm-eyebrow text-pink-500 mb-3">{T.eyebrow}</p>
        <h1 className="font-display text-[28px] md:text-[40px] leading-[1.15] tracking-[-0.025em] text-paradigm-ink mb-4">
          <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-tech bg-clip-text text-transparent">
            {T.title}
          </span>
        </h1>
        <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.7] mb-8">{T.desc}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button
            onClick={() => reset()}
            className="paradigm-glass rounded-xl px-6 py-3 paradigm-glow-sm hover:paradigm-glow-md transition-all text-[13px] tracking-[0.06em] uppercase font-semibold text-paradigm-ink"
          >
            {T.retry}
          </button>
          <Link
            href={`/${locale}`}
            className="bg-paradigm-ink text-paradigm-paper rounded-xl px-6 py-3 paradigm-glow-md hover:paradigm-glow-lg transition-all text-[13px] tracking-[0.06em] uppercase font-semibold"
          >
            {T.home}
          </Link>
        </div>

        <p className="text-[11px] text-paradigm-ink-mute">{T.contact}</p>
      </div>
    </div>
  )
}
