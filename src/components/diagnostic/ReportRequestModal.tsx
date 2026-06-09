"use client"

import { motion } from "framer-motion"
import { X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import type { ReportLang } from "./report-copy"

interface RequestFormData {
  company: string
  name: string
  email: string
  interests: string[]
  reportUrl: string
  reportName: string
}

export default function ReportRequestModal({
  isOpen,
  onClose,
  lang,
  data,
}: {
  isOpen: boolean
  onClose: () => void
  lang: ReportLang
  data: { report_url: string; company_name: string }
}) {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ company: "", name: "", email: "", interests: [] as string[] })

  async function submitRequest() {
    try {
      await fetch("/api/sales/request-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: form.company,
          name: form.name,
          email: form.email,
          interests: form.interests,
          reportUrl: data.report_url,
          reportName: data.company_name,
        }),
      })
      setSent(true)
    } catch (e) {
      console.error("[ReportRequestModal] submitRequest failed:", e)
      toast.error(lang === "ja" ? "送信に失敗しました。後ほどお試しください。" : "Failed to send. Please try again later.")
    }
  }

  if (!isOpen) return null

  const interestOptions = [
    { ja: "Webサイト改善のプランと費用", en: "Website improvement plan & pricing" },
    { ja: "SEO/MEO対策の具体案", en: "SEO/MEO strategy details" },
    { ja: "AI/DX導入の事例と費用感", en: "AI/DX case studies & cost" },
    { ja: "その他・相談したい", en: "Other (free consultation)" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        {sent ? (
          <div className="text-center py-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xl">✓</div>
            <h3 className="mt-4 text-lg font-bold text-zinc-900">{lang === "ja" ? "送信完了" : "Sent!"}</h3>
            <p className="mt-2 text-sm text-zinc-500">{lang === "ja" ? "資料をお送りします。今しばらくお待ちください。" : "We'll send the materials shortly."}</p>
            <button onClick={onClose} className="mt-6 text-sm text-violet-600 hover:underline">{lang === "ja" ? "閉じる" : "Close"}</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-zinc-900">{lang === "ja" ? "資料請求" : "Request Info"}</h3>
              <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder={lang === "ja" ? "会社名" : "Company name"} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-violet-500" />
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder={lang === "ja" ? "お名前" : "Your name"} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-violet-500" />
              <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} type="email" placeholder="Email" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-violet-500" />
              <div className="pt-2">
                <p className="text-xs font-bold text-zinc-600 mb-2">{lang === "ja" ? "知りたいこと（複数選択可）" : "What would you like to know?"} <span className="text-rose-500">*</span></p>
                {interestOptions.map(opt => (
                  <label key={opt.ja} className="flex items-center gap-2 py-1.5 cursor-pointer">
                    <input type="checkbox" checked={form.interests.includes(opt.ja)}
                      onChange={e => {
                        const next = e.target.checked
                          ? [...form.interests, opt.ja]
                          : form.interests.filter(i => i !== opt.ja)
                        setForm({...form, interests: next})
                      }}
                      className="h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500" />
                    <span className="text-sm text-zinc-700">{lang === "ja" ? opt.ja : opt.en}</span>
                  </label>
                ))}
              </div>
              <button onClick={submitRequest} disabled={!form.email || form.interests.length === 0}
                className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {lang === "ja" ? "送信する" : "Send Request"}
              </button>
              <p className="text-[10px] text-zinc-400 text-center">{lang === "ja" ? "送信先: contact@paradigmjp.com" : "Sent to: contact@paradigmjp.com"}</p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
