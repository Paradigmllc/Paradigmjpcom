"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink, Loader2, Pencil, RotateCcw, Save, X } from "lucide-react"
import { Toaster, toast } from "sonner"
import type { DemoAdminEditFields, ReportAdminEditFields } from "@/lib/sales/artifact-admin-overrides"

type EditorKind = "report" | "demo"
type EditFields = ReportAdminEditFields & DemoAdminEditFields

type FieldConfig = {
  key: keyof EditFields
  label: string
  rows?: number
}

type Props = {
  kind: EditorKind
  slug: string
  locale: string
  title: string
  initialFields: EditFields
  salesOsHref?: string
  generatedMessageReview?: {
    message: string
    model: string
    qualityScore: number | null
    wordCount: number | null
    attempts: number | null
  } | null
}

const REPORT_FIELDS: FieldConfig[] = [
  { key: "hook", label: "冒頭フック", rows: 3 },
  { key: "pain", label: "診断本文 1", rows: 4 },
  { key: "fear", label: "診断本文 2", rows: 4 },
  { key: "loss", label: "診断本文 3", rows: 4 },
  { key: "cta", label: "最終CTA", rows: 3 },
]

const DEMO_FIELDS: FieldConfig[] = [
  { key: "metaTitle", label: "SEOタイトル" },
  { key: "metaDescription", label: "SEO説明", rows: 2 },
  { key: "homeTitle", label: "ホーム見出し", rows: 2 },
  { key: "homeSubtitle", label: "ホーム本文", rows: 3 },
  { key: "homeCtaTitle", label: "CTA見出し" },
  { key: "homeCtaSubtitle", label: "CTA本文", rows: 2 },
  { key: "aboutTitle", label: "会社概要見出し" },
  { key: "aboutSubtitle", label: "会社概要リード", rows: 2 },
  { key: "aboutStory", label: "会社概要本文", rows: 4 },
  { key: "servicesTitle", label: "サービス見出し" },
  { key: "servicesSubtitle", label: "サービス本文", rows: 3 },
  { key: "contactTitle", label: "お問い合わせ見出し" },
  { key: "contactSubtitle", label: "お問い合わせ本文", rows: 2 },
  { key: "contactEmail", label: "メール" },
  { key: "contactAddress", label: "住所", rows: 2 },
]

function toText(value: unknown): string {
  return typeof value === "string" ? value : ""
}

export function ArtifactInlineEditor({
  kind,
  slug,
  locale,
  title,
  initialFields,
  salesOsHref,
  generatedMessageReview,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fields, setFields] = useState<EditFields>(initialFields)
  const fieldConfigs = kind === "report" ? REPORT_FIELDS : DEMO_FIELDS
  const endpoint = `/api/sales/artifact-edits/${kind}/${encodeURIComponent(slug)}`
  const heading = kind === "report" ? "診断レポート編集" : "デモサイト編集"

  function updateField(key: keyof EditFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }))
  }

  async function save(reset = false) {
    setSaving(true)
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reset ? { reset: true, locale } : { locale, fields }),
      })
      const body = await response.json().catch((error: unknown) => {
        console.error("[artifact-inline-editor] response parse failed:", error)
        return {}
      }) as { ok?: boolean; error?: string }
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "保存に失敗しました")
      }
      if (reset) setFields({})
      toast.success(reset ? "手動編集をリセットしました" : "手動編集を保存しました")
      router.refresh()
    } catch (error) {
      console.error("[artifact-inline-editor] save failed:", error)
      toast.error(error instanceof Error ? error.message : "保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void save(false)
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      {!open && (
        <button
          type="button"
          aria-label={`${heading}を開く`}
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[80] inline-flex h-11 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-lg transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          編集
        </button>
      )}

      {open && (
        <aside className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-h-[82dvh] max-w-3xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-950">{heading}</p>
              <p className="truncate text-xs text-zinc-500">{title}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {salesOsHref && (
                <a
                  href={salesOsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  営業OS
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              )}
              <button
                type="button"
                aria-label="編集パネルを閉じる"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <form onSubmit={onSubmit} className="max-h-[calc(82dvh-118px)] overflow-y-auto px-4 py-4">
            {generatedMessageReview && (
              <section className="mb-4 rounded-md border border-zinc-200 bg-zinc-50 p-3" aria-label="問い合わせフォーム文面レビュー">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                  <span className="font-semibold text-zinc-950">フォーム文面（送信停止中）</span>
                  <span>model: {generatedMessageReview.model}</span>
                  <span>quality: {generatedMessageReview.qualityScore ?? "未採点"}</span>
                  <span>words: {generatedMessageReview.wordCount ?? "未計測"}</span>
                  <span>attempts: {generatedMessageReview.attempts ?? "不明"}</span>
                </div>
                <textarea
                  readOnly
                  aria-label="DeepSeek V4 Pro生成文面"
                  value={generatedMessageReview.message}
                  rows={6}
                  className="mt-3 block w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed text-zinc-950 outline-none"
                />
                <p className="mt-2 text-xs text-amber-700">この画面は品質確認専用です。フォーム送信処理には接続されていません。</p>
              </section>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {fieldConfigs.map((field) => (
                <label key={String(field.key)} className={field.rows && field.rows > 2 ? "sm:col-span-2" : undefined}>
                  <span className="mb-1 block text-xs font-semibold text-zinc-700">{field.label}</span>
                  <textarea
                    value={toText(fields[field.key])}
                    rows={field.rows ?? 1}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    className="block w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed text-zinc-950 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  />
                </label>
              ))}
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-3">
            <button
              type="button"
              onClick={() => void save(true)}
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden />}
              自動生成に戻す
            </button>
            <button
              type="button"
              onClick={() => void save(false)}
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-4 text-xs font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Save className="h-3.5 w-3.5" aria-hidden />}
              保存
            </button>
          </div>
        </aside>
      )}
    </>
  )
}
