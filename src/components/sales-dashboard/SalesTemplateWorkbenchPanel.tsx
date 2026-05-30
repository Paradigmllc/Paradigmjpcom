"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Eye, FilePenLine, RefreshCw, Save, SlidersHorizontal, WandSparkles } from "lucide-react"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"

type TemplateRow = {
  id?: string
  report_locale: string
  target_country: string
  industry: string
  offer_code: string
  asset_type: string
  appeal_angle: string
  template_variant: string
  title: string
  purpose: string
  quality_bar: string
  dify_selection_rule: string
  prompt_template: string
  sample_copy: string
  is_active: boolean
  version: number
}

const LOCALES = ["ja", "en"] as const
const INDUSTRIES = [
  ["beauty_salon", "美容サロン"],
  ["dental", "歯科医院"],
  ["restaurant", "飲食店"],
  ["construction", "建設・工務店"],
  ["accounting", "会計事務所"],
  ["retail", "小売・店舗"],
  ["cleaning", "清掃・メンテナンス"],
  ["consulting", "コンサルティング"],
] as const
const ASSETS = [
  ["diagnostic_report", "診断レポート"],
  ["astro_demo_site", "Astroデモ"],
  ["sales_deck", "営業資料"],
  ["sales_video", "営業動画"],
] as const
const ANGLES = [
  ["revenue_recovery", "売上機会の回復"],
  ["trust_authority", "信頼・権威づけ"],
  ["speed_conversion", "速度・CV改善"],
  ["automation_dx", "DX・自動化"],
  ["japan_entry", "日本市場参入"],
  ["video_retention", "動画継続納品"],
] as const

function labelOf(entries: readonly (readonly [string, string])[], value: string): string {
  return entries.find(([key]) => key === value)?.[1] ?? value
}

function fieldValue(row: TemplateRow | null, key: keyof TemplateRow): string {
  const value = row?.[key]
  return typeof value === "string" ? value : ""
}

function TemplateSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[] | readonly (readonly [string, string])[]
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-zinc-600">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-950 outline-none focus:border-zinc-500"
      >
        {options.map((option) => {
          const valueText = Array.isArray(option) ? option[0] : option
          const labelText = Array.isArray(option) ? option[1] : option
          return (
            <option key={valueText} value={valueText}>
              {labelText}
            </option>
          )
        })}
      </select>
    </label>
  )
}

export function SalesTemplateWorkbenchPanel({ data }: { data: SalesDashboardData }) {
  const [locale, setLocale] = useState("ja")
  const [industry, setIndustry] = useState("restaurant")
  const [assetType, setAssetType] = useState("diagnostic_report")
  const [appealAngle, setAppealAngle] = useState("revenue_recovery")
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TemplateRow | null>(null)
  const [matched, setMatched] = useState<TemplateRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const selected = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? templates[0] ?? null,
    [selectedId, templates],
  )

  async function loadTemplates() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        report_locale: locale,
        industry,
        asset_type: assetType,
        appeal_angle: appealAngle,
        limit: "80",
      })
      const res = await fetch(`/api/sales/content-templates?${params.toString()}`)
      const json = (await res.json()) as { ok?: boolean; rows?: TemplateRow[]; error?: string }
      if (!res.ok || !json.ok) throw new Error(json.error ?? "テンプレート一覧を取得できませんでした")
      setTemplates(json.rows ?? [])
      setSelectedId(json.rows?.[0]?.id ?? null)
      setDraft(json.rows?.[0] ?? null)
    } catch (error) {
      console.error("[sales-template-workbench] load failed:", error)
      toast.error(error instanceof Error ? error.message : "テンプレート取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  async function previewMatch() {
    try {
      const res = await fetch("/api/sales/content-templates/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_locale: locale,
          target_country: locale === "ja" ? "JP" : "US",
          industry,
          asset_type: assetType,
          appeal_angle: appealAngle,
        }),
      })
      const json = (await res.json()) as { ok?: boolean; template?: TemplateRow; error?: string }
      if (!res.ok || !json.ok || !json.template) throw new Error(json.error ?? "選定プレビューに失敗しました")
      setMatched(json.template)
      toast.success("Dify選定ロジックのプレビューを更新しました")
    } catch (error) {
      console.error("[sales-template-workbench] match failed:", error)
      toast.error(error instanceof Error ? error.message : "選定プレビューに失敗しました")
    }
  }

  async function saveDraft() {
    if (!draft?.id) {
      toast.error("Supabaseに保存済みのテンプレートを選択してください")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/sales/content-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          title: draft.title,
          purpose: draft.purpose,
          quality_bar: draft.quality_bar,
          dify_selection_rule: draft.dify_selection_rule,
          prompt_template: draft.prompt_template,
          sample_copy: draft.sample_copy,
          is_active: draft.is_active,
        }),
      })
      const json = (await res.json()) as { ok?: boolean; template?: TemplateRow; error?: string }
      if (!res.ok || !json.ok || !json.template) throw new Error(json.error ?? "保存できませんでした")
      const saved = json.template
      setTemplates((rows) => rows.map((row) => (row.id === saved.id ? saved : row)))
      setDraft(saved)
      toast.success("テンプレートをSupabase SSOTへ保存しました")
    } catch (error) {
      console.error("[sales-template-workbench] save failed:", error)
      toast.error(error instanceof Error ? error.message : "保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    void loadTemplates()
  }, [locale, industry, assetType, appealAngle])

  useEffect(() => {
    setDraft(selected)
  }, [selected])

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
              <SlidersHorizontal size={15} aria-hidden />
              テンプレート管理
            </div>
            <h2 className="mt-2 text-lg font-semibold text-zinc-950">選定条件と一覧</h2>
            <p className="mt-2 text-xs leading-6 text-zinc-600">
              ここでDify/n8nが使う条件、品質基準、プロンプト、サンプル文を確認・編集します。
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadTemplates()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 hover:border-zinc-400"
            aria-label="テンプレートを再読み込み"
          >
            <RefreshCw size={16} aria-hidden />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <TemplateSelect label="言語" value={locale} options={LOCALES} onChange={setLocale} />
          <TemplateSelect label="業界" value={industry} options={INDUSTRIES} onChange={setIndustry} />
          <TemplateSelect label="成果物" value={assetType} options={ASSETS} onChange={setAssetType} />
          <TemplateSelect label="訴求" value={appealAngle} options={ANGLES} onChange={setAppealAngle} />
          <button
            type="button"
            onClick={() => void previewMatch()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white"
          >
            <Eye size={16} aria-hidden />
            選定ロジックをテスト
          </button>
        </div>

        <div className="mt-5 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
          <div className="font-semibold text-zinc-950">現在のSSOT</div>
          <div className="mt-2">総数: {data.contentTemplates.total}</div>
          <div>状態: {data.contentTemplates.fallbackUsed ? "アプリ内蔵fallback" : "Supabase sales_content_templates"}</div>
        </div>

        <div className="mt-4 space-y-2">
          {loading && <div className="rounded-md border border-zinc-200 p-3 text-sm text-zinc-500">読み込み中です。</div>}
          {!loading && templates.length === 0 && (
            <div className="rounded-md border border-dashed border-zinc-300 p-3 text-sm text-zinc-500">該当テンプレートがありません。</div>
          )}
          {templates.map((template) => (
            <button
              key={template.id ?? `${template.title}-${template.version}`}
              type="button"
              onClick={() => setSelectedId(template.id ?? null)}
              className={`w-full rounded-md border p-3 text-left transition ${
                selected?.id === template.id ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
              }`}
            >
              <div className="text-sm font-semibold">{template.title}</div>
              <div className={`mt-1 text-xs ${selected?.id === template.id ? "text-zinc-300" : "text-zinc-500"}`}>
                {labelOf(ASSETS, template.asset_type)} / {labelOf(ANGLES, template.appeal_angle)} / v{template.version}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 border-b border-zinc-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
              <FilePenLine size={15} aria-hidden />
              品質編集
            </div>
            <h2 className="mt-2 text-lg font-semibold text-zinc-950">{draft?.title ?? "テンプレート未選択"}</h2>
            <p className="mt-2 text-xs leading-6 text-zinc-600">
              まずは日本語・英語の主要テンプレートを実戦投入できる水準へ上げます。品質基準と選定ルールを変えると、Difyの採用判断も変わります。
            </p>
          </div>
          <button
            type="button"
            onClick={() => void saveDraft()}
            disabled={!draft || saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            <Save size={16} aria-hidden />
            {saving ? "保存中" : "保存"}
          </button>
        </div>

        {matched && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 size={16} aria-hidden />
              選定結果: {matched.title}
            </div>
            <p className="mt-1 text-xs leading-6">{matched.dify_selection_rule}</p>
          </div>
        )}

        {draft ? (
          <div className="mt-4 grid gap-4">
            {([
              ["title", "テンプレ名", "input"],
              ["purpose", "目的", "textarea"],
              ["quality_bar", "品質基準", "textarea"],
              ["dify_selection_rule", "Dify選定条件", "textarea"],
              ["prompt_template", "生成プロンプト", "textarea"],
              ["sample_copy", "サンプル文", "textarea"],
            ] as const).map(([key, label, kind]) => (
              <label key={key} className="grid gap-2 text-sm font-medium text-zinc-700">
                <span>{label}</span>
                {kind === "input" ? (
                  <input
                    value={fieldValue(draft, key)}
                    onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                    className="h-10 rounded-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none focus:border-zinc-500"
                  />
                ) : (
                  <textarea
                    value={fieldValue(draft, key)}
                    onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                    rows={key === "prompt_template" ? 8 : 4}
                    className="resize-y rounded-md border border-zinc-200 px-3 py-2 text-sm leading-6 text-zinc-950 outline-none focus:border-zinc-500"
                  />
                )}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Difyの選定対象に含める
            </label>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            <WandSparkles className="mx-auto mb-2" size={22} aria-hidden />
            左の条件からテンプレートを選択してください。
          </div>
        )}
      </section>
    </div>
  )
}
