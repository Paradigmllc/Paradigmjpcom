"use client"

import { useLocale } from "next-intl"
import { usePathname, useRouter } from "@/i18n/routing"
import { useTransition, useState, useRef, useEffect } from "react"
import { ChevronDown, Globe } from "lucide-react"
import {
  LOCALES,
  LOCALE_DISPLAY_NAME,
  LOCALE_FLAG,
  type Locale,
} from "@/lib/locale-map"

/**
 * Locale Switcher — 12 言語 dropdown（P17 2026-04-27 拡張）
 *
 * next-intl v4 `createNavigation` 由来の usePathname / useRouter を使い、
 * 現在パスを locale だけ付け替えて遷移する（query-string も保持）。
 *
 * AE-10 URL-state supremacy: locale は URL が正。このコンポーネントが
 * 唯一の locale 切替UI であり、子ページが独自の locale selector を持つことは禁止。
 */
export default function LocaleSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // クリック外で閉じる
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [open])

  function selectLocale(next: Locale) {
    setOpen(false)
    if (next === locale) return
    startTransition(() => {
      router.replace(pathname, { locale: next })
    })
  }

  const currentFlag = LOCALE_FLAG[locale]
  const currentName = LOCALE_DISPLAY_NAME[locale]

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-label="Switch language"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border border-current/30 hover:bg-current/10 transition-colors disabled:opacity-50"
      >
        <Globe size={12} className="opacity-60" />
        <span aria-hidden>{currentFlag}</span>
        <span className="hidden sm:inline">{currentName}</span>
        <ChevronDown size={12} className={`opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Languages"
          className="absolute right-0 mt-1.5 min-w-[180px] max-h-[60vh] overflow-y-auto rounded-lg border border-black/10 bg-white shadow-xl ring-1 ring-black/5 z-50 py-1"
        >
          {LOCALES.map((l) => {
            const active = l === locale
            return (
              <button
                key={l}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => selectLocale(l)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  active
                    ? "bg-violet-50 text-violet-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span aria-hidden className="text-base leading-none">
                  {LOCALE_FLAG[l]}
                </span>
                <span className="flex-1">{LOCALE_DISPLAY_NAME[l]}</span>
                {active && <span className="text-violet-600 text-xs">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
