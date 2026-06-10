"use client"

import { useState } from "react"
import { FileText, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"
import type { DashboardCompany } from "@/lib/sales/dashboard-types"

function formatDate(iso: string | null): string {
  if (!iso) return "-"
  return new Date(iso).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function FormMessageCell({ company }: { company: DashboardCompany }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState(company.formMessage ?? "")
  const [engine, setEngine] = useState(company.formMessageEngine ?? "")
  const [generatedAt, setGeneratedAt] = useState(company.formMessageGeneratedAt ?? "")
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch("/api/sales/generate-form-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": "5c86e128f1d668be10240c024873960dae765357f83d9f59bebdd8de71b4452a",
        },
        body: JSON.stringify({ company_id: company.id }),
      })
      const json = (await res.json()) as { ok?: boolean; message?: string; engine?: string; error?: string }
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Generation failed")
      setMessage(json.message ?? "")
      setEngine(json.engine ?? "unknown")
      setGeneratedAt(new Date().toISOString())
      toast.success("文面を生成しました")
    } catch (error) {
      console.error("[form-message-cell] generate failed:", error)
      toast.error(error instanceof Error ? error.message : "生成に失敗しました")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={message
          ? "inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition"
          : "inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-200 transition"}
      >
        <FileText size={12} aria-hidden />
        {message ? "文面あり" : "未生成"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="relative mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-zinc-950">{company.companyName}</h3>
                <p className="mt-0.5 text-xs text-zinc-400">{company.domain}</p>
              </div>
              <button onClick={() => setOpen(false)} className="ml-2 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" aria-label="閉じる">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-4">
              {message ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-800 font-sans">{message}</pre>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles size={12} />
                      {engine === "dify" ? "Dify Cloud" : engine === "deepseek_fallback" ? "DeepSeek V3" : engine || "未生成"}
                    </span>
                    <span>{formatDate(generatedAt)}</span>
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-zinc-400">まだ文面が生成されていません。「生成」ボタンを押して作成してください。</p>
              )}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 transition"
              >
                {generating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {message ? "再生成" : "Dify で生成"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
