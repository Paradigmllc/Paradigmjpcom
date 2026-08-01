/**
 * /[locale]/not-found.tsx — Aesop-style 404 page
 *
 * 役割: 存在しない slug や route が叩かれた際に表示される luxury 404。
 * 入力: なし (Next.js が直接 render)
 * 出力: 404 画面 + 主要 navigation links + contact CTA
 *
 * 注意: not-found.tsx は client component にせず Server Component のまま
 *       (next-intl の useLocale() を server で安全に使うため getLocale() を使う)。
 *
 * H ルール (3 状態): not-found 状態 — 必須実装。
 */

import Link from "next/link"
import { getLocale, getTranslations } from "next-intl/server"

export default async function NotFound() {
  const locale = await getLocale()
  const t = await getTranslations({ locale, namespace: "notFoundPage" })
  const isEnglish = locale === "en"

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-paradigm-paper paradigm-section overflow-hidden relative">
      <div className="paradigm-mesh opacity-30" />
      <div className="relative z-10 max-w-xl mx-auto px-6 md:px-8 text-center">
        <p className="font-display text-[80px] md:text-[120px] leading-[1] tracking-[-0.03em] mb-2">
          <span className="bg-gradient-to-br from-paradigm-accent via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
            {t("eyebrow")}
          </span>
        </p>
        <h1 className="font-display text-[24px] md:text-[34px] leading-[1.2] tracking-[-0.02em] text-paradigm-ink mb-4">
          {t("title")}
        </h1>
        <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.7] mb-8">{t("desc")}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/${locale}`}
            className="bg-paradigm-ink text-paradigm-paper rounded-xl px-6 py-3 paradigm-glow-md hover:paradigm-glow-lg transition-all text-[13px] tracking-[0.06em] uppercase font-semibold"
          >
            {t("home")}
          </Link>
          <Link
            href={isEnglish ? "/en/pricing" : `/${locale}/services`}
            className="paradigm-glass rounded-xl px-6 py-3 paradigm-glow-sm hover:paradigm-glow-md transition-all text-[13px] tracking-[0.06em] uppercase font-semibold text-paradigm-ink"
          >
            {isEnglish ? "Fixed offer" : t("services")}
          </Link>
          <Link
            href={isEnglish ? "/en/contact?intent=japan-entry" : `/${locale}/contact`}
            className="paradigm-glass rounded-xl px-6 py-3 paradigm-glow-sm hover:paradigm-glow-md transition-all text-[13px] tracking-[0.06em] uppercase font-semibold text-paradigm-ink"
          >
            {t("contact")}
          </Link>
        </div>
      </div>
    </div>
  )
}
