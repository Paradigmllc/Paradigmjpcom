"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { AlertCircle, Bot, RefreshCw, Save } from "lucide-react"
import { toast } from "sonner"
import type { SalesAiPrompt } from "@/lib/sales/ai-prompts"
import type { SalesDashboardData } from "@/lib/sales/dashboard"

type AiPromptsPanelProps = {
  data: SalesDashboardData
}

type PromptListResponse =
  | SalesAiPrompt[]
  | {
      ok?: boolean
      prompts?: SalesAiPrompt[]
      error?: string
      warning?: string
    }

type PromptSaveResponse =
  | SalesAiPrompt
  | {
      ok?: boolean
      prompt?: SalesAiPrompt
      error?: string
    }

function parsePromptList(body: PromptListResponse): SalesAiPrompt[] {
  if (Array.isArray(body)) return body
  if (Array.isArray(body.prompts)) return body.prompts
  return []
}

function parseSavedPrompt(body: PromptSaveResponse): SalesAiPrompt | null {
  if (typeof body !== "object" || body === null) return null
  if ("prompt" in body && body.prompt) return body.prompt
  if ("id" in body && "prompt_text" in body && typeof body.id === "string" && typeof body.prompt_text === "string") {
    return body as SalesAiPrompt
  }
  return null
}

function responseFailed(body: PromptListResponse | PromptSaveResponse): boolean {
  return !Array.isArray(body) && typeof body === "object" && body !== null && "ok" in body && body.ok === false
}

function responseError(body: PromptListResponse | PromptSaveResponse, fallback: string): string {
  if (!Array.isArray(body) && typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
    return body.error
  }
  return fallback
}

export function AiPromptsPanel({ data: _data }: AiPromptsPanelProps) {
  const [prompts, setPrompts] = useState<SalesAiPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchPrompts = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/sales/ai-prompts", { credentials: "include" })
      const body = (await res.json()) as PromptListResponse
      if (!res.ok || responseFailed(body)) {
        throw new Error(responseError(body, "プロンプトの読み込みに失敗しました"))
      }

      if (!Array.isArray(body) && body.warning) {
        toast.warning("既定プロンプトを表示しています", { description: body.warning })
      }

      setPrompts(parsePromptList(body))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error("プロンプトの読み込みに失敗しました")
      console.error("[AiPromptsPanel] prompt load failed:", msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchPrompts()
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
        credentials: "include",
        body: JSON.stringify({
          id,
          prompt_text: editText,
          description,
        }),
      })
      const body = (await res.json()) as PromptSaveResponse
      if (!res.ok || responseFailed(body)) {
        throw new Error(responseError(body, "プロンプトの保存に失敗しました"))
      }

      const updated = parseSavedPrompt(body)
      if (!updated) {
        throw new Error("保存結果の形式が不正です")
      }

      setPrompts((prev) => prev.map((p) => (p.id === id ? updated : p)))
      setEditingId(null)
      toast.success("プロンプトを保存しました", { description: "次回の Sales OS 実行から反映されます。" })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error("プロンプトの保存に失敗しました")
      console.error("[AiPromptsPanel] prompt save failed:", msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="p-6 sm:p-8">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
            <Bot className="h-5 w-5 text-zinc-900" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">AI PROMPTS</p>
            <h2 className="text-xl font-bold tracking-tight text-zinc-950">プロンプト管理</h2>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600">
          Dify 診断とアウトバウンド文面生成に渡す system prompt を補助DBで管理します。保存した内容は次回の Twenty Sales OS 連携実行から反映されます。
        </p>
      </header>

      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50">
          <RefreshCw className="h-5 w-5 animate-spin text-zinc-400" />
        </div>
      ) : prompts.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <p className="text-sm font-semibold text-zinc-900">表示できるプロンプトがありません。</p>
          <button
            type="button"
            onClick={() => void fetchPrompts()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            aria-label="プロンプトを再読み込み"
          >
            <RefreshCw className="h-4 w-4" />
            再読み込み
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {prompts.map((prompt) => (
            <motion.div
              key={prompt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
            >
              <div className="border-b border-zinc-100 bg-zinc-50/50 px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-mono text-sm font-bold text-zinc-900">{prompt.id}</h3>
                  <span className="text-xs font-medium text-zinc-500">
                    更新日: {new Date(prompt.updated_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                {prompt.description && <p className="mt-2 text-xs leading-5 text-zinc-600">{prompt.description}</p>}
                {prompt.id === "sales_form_message_system" && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200/50 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>
                      プレースホルダー <code className="font-semibold">{"{{report_url}}"}</code> を必ず含めてください。
                    </span>
                  </div>
                )}
              </div>

              <div className="p-5">
                {editingId === prompt.id ? (
                  <div className="space-y-4">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="h-64 w-full rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 font-mono text-sm leading-relaxed text-zinc-800 shadow-inner focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                      spellCheck={false}
                      aria-label={`${prompt.id} のプロンプト本文`}
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
                      className="absolute right-4 top-4 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-50"
                      aria-label={`${prompt.id} を編集`}
                    >
                      編集
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
