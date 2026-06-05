"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Bot, Save, AlertCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import type { SalesAiPrompt } from "@/lib/sales/ai-prompts"
import type { SalesDashboardData } from "@/lib/sales/dashboard"

type AiPromptsPanelProps = {
  data: SalesDashboardData
}

export function AiPromptsPanel({ data }: AiPromptsPanelProps) {
  const [prompts, setPrompts] = useState<SalesAiPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchPrompts = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/sales/ai-prompts")
      if (!res.ok) throw new Error("Failed to fetch prompts")
      const data = await res.json()
      setPrompts(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error("プロンプトの読み込みに失敗しました")
      console.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrompts()
  }, [])

  const handleEdit = (prompt: SalesAiPrompt) => {
    setEditingId(prompt.id)
    setEditText(prompt.prompt_text)
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditText("")
  }

  const handleSave = async (id: string, description: string | null) => {
    try {
      setSaving(true)
      const res = await fetch("/api/sales/ai-prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          prompt_text: editText,
          description,
        }),
      })
      if (!res.ok) throw new Error("Failed to save prompt")
      const updated = await res.json()
      setPrompts((prev) => prev.map((p) => (p.id === id ? updated : p)))
      setEditingId(null)
      toast.success("プロンプトを保存しました", { description: "次回の実行から自動的に反映されます" })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error("保存に失敗しました")
      console.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="p-6 sm:p-8">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50">
            <Bot className="h-5 w-5 text-zinc-900" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">AI PROMPTS</p>
            <h2 className="text-xl font-bold tracking-tight text-zinc-950">プロンプト管理</h2>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600">
          DifyやDeepSeek等のAIエージェントに渡されるシステムプロンプトを管理します。ここで変更したプロンプトは、次回のパイプライン実行時からリアルタイムに反映されます。
        </p>
      </header>

      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50">
          <RefreshCw className="h-5 w-5 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="grid gap-6">
          {prompts.map((prompt) => (
            <motion.div
              key={prompt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
            >
              <div className="border-b border-zinc-100 bg-zinc-50/50 px-5 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-sm font-bold text-zinc-900">{prompt.id}</h3>
                  <span className="text-xs font-medium text-zinc-500">
                    Last updated: {new Date(prompt.updated_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                {prompt.description && <p className="mt-2 text-xs text-zinc-600">{prompt.description}</p>}
                {prompt.id === "sales_form_message_system" && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200/50 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>プレースホルダ <code className="font-semibold">{"{{report_url}}"}</code> を必ず含めてください。</span>
                  </div>
                )}
              </div>

              <div className="p-5">
                {editingId === prompt.id ? (
                  <div className="space-y-4">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="h-64 w-full rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 font-mono text-sm leading-relaxed text-zinc-800 shadow-inner focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      spellCheck={false}
                    />
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={saving}
                        className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSave(prompt.id, prompt.description)}
                        disabled={saving || !editText.trim()}
                        className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        保存して適用
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative">
                    <pre className="custom-scrollbar max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-zinc-100 bg-zinc-50 p-4 font-mono text-[13px] leading-relaxed text-zinc-700">
                      {prompt.prompt_text}
                    </pre>
                    <button
                      type="button"
                      onClick={() => handleEdit(prompt)}
                      className="absolute right-4 top-4 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-50"
                    >
                      編集する
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  )
}
