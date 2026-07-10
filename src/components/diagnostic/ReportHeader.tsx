"use client"

import { motion } from "framer-motion"
import { ChevronDown, MessageCircle, Moon, Sun } from "lucide-react"
import type { ReportCopy, ReportLang } from "./report-copy"
import { ShareReport } from "./report-ui-enhancements"

export function ReportHeader({
  isDark,
  setIsDark,
  actionOpen,
  setActionOpen,
  onRequestOpen,
  copy,
  offerCopy,
  lang,
  calHref,
}: {
  isDark: boolean
  setIsDark: (v: boolean) => void
  actionOpen: boolean
  setActionOpen: (v: boolean) => void
  onRequestOpen: () => void
  copy: ReportCopy
  offerCopy: { reportLabel: string }
  lang: ReportLang
  calHref: string
}) {
  return (
    <header className={`sticky top-0 z-30 border-b px-3 py-2 backdrop-blur ${isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-[#fbfaf7]/90 border-zinc-200"}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white"
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >P</motion.div>
          <div>
            <div className={`text-xs font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>{copy.brand}</div>
            <div className={`text-[10px] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>{offerCopy.reportLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDark(!isDark)}
            aria-label={isDark ? (lang === "ja" ? "ライトモードに切り替え" : "Switch to light mode") : (lang === "ja" ? "ダークモードに切り替え" : "Switch to dark mode")}
            aria-pressed={isDark}
            className={`p-1.5 rounded-md ${isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"}`}
            title={isDark ? "ライト" : "ダーク"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <ShareReport url="" title="" lang={lang} />
          <div className="relative">
            <button onClick={() => setActionOpen(!actionOpen)}
              aria-haspopup="menu"
              aria-expanded={actionOpen}
              aria-label={lang === "ja" ? "お問い合わせメニュー" : "Contact menu"}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors ${isDark ? "bg-zinc-800 text-white hover:bg-zinc-700" : "bg-zinc-900 text-white hover:bg-zinc-800"}`}>
              <MessageCircle className="h-3 w-3" />{lang === "ja" ? "お問い合わせ" : "Contact"}
              <ChevronDown className={`h-3 w-3 transition-transform ${actionOpen ? "rotate-180" : ""}`} />
            </button>
            {actionOpen && (
              <div role="menu" aria-label={lang === "ja" ? "お問い合わせメニュー" : "Contact menu"} className={`absolute right-0 top-full mt-1 w-48 rounded-lg border py-1 shadow-lg z-50 ${isDark ? "bg-zinc-800 border-zinc-700" : "bg-white border-zinc-200"}`}>
                <a href={calHref} {...(calHref.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})} onClick={() => setActionOpen(false)}
                  data-umami-event="diagnostic-report-apply" data-umami-event-source="header"
                  className={`flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-50 ${isDark ? "text-zinc-200 hover:bg-zinc-700" : "text-zinc-700"}`}>
                  📅 {lang === "ja" ? "相談を予約" : "Apply — $12K fixed"}
                </a>
                <a href="https://chatwoot.paradigmjp.com" target="_blank" rel="noopener noreferrer" onClick={() => setActionOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-50 ${isDark ? "text-zinc-200 hover:bg-zinc-700" : "text-zinc-700"}`}>
                  💬 {lang === "ja" ? "チャットで質問" : "Chat with us"}
                </a>
                <button onClick={() => { setActionOpen(false); onRequestOpen() }}
                  className={`flex items-center gap-2 px-3 py-2 text-xs w-full text-left hover:bg-zinc-50 ${isDark ? "text-zinc-200 hover:bg-zinc-700" : "text-zinc-700"}`}>
              📄 {lang === "ja" ? "資料請求" : "Request Info"}
            </button>
            <button onClick={() => window.print()}
              className={`flex items-center gap-2 px-3 py-2 text-xs w-full text-left hover:bg-zinc-50 ${isDark ? "text-zinc-200 hover:bg-zinc-700" : "text-zinc-700"}`}>
              🖨️ {lang === "ja" ? "PDF印刷" : "Print PDF"}
            </button>
              </div>
            )}
          </div>
          <a href={`/${lang === "ja" ? "ja" : "en"}`} className={`text-[10px] hidden sm:inline ${isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-600 hover:text-zinc-900"}`}>Paradigm HP</a>
        </div>
      </div>
    </header>
  )
}
