"use client"

import { useLocale, useTranslations } from "next-intl"
import { usePathname, useRouter } from "@/i18n/routing"
import { useTransition } from "react"

/**
 * Locale Switcher — ja ⇔ en
 *
 * next-intl v4 `createNavigation` 由来の usePathname / useRouter を使い、
 * 現在パスを locale だけ付け替えて遷移する（query-string も保持）。
 *
 * AE-10 URL-state supremacy: locale は URL が正。このコンポーネントが
 * 唯一の locale 切替UI であり、子ページが独自の locale selector を持つことは禁止。
 */
export default function LocaleSwitcher() {
  const t = useTranslations("locale")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const nextLocale = locale === "ja" ? "en" : "ja"

  function onToggle() {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale })
    })
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isPending}
      aria-label={`Switch to ${t("switchTo")}`}
      className="text-xs font-semibold px-2.5 py-1 rounded-md border border-current/30 hover:bg-current/10 transition-colors disabled:opacity-50"
    >
      {t("switchTo")}
    </button>
  )
}
