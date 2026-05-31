"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Eye, FilePenLine, RefreshCw, Save, Search, SlidersHorizontal, WandSparkles } from "lucide-react"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import { countryForLocale, isReportLocale, type ReportLocale } from "@/lib/sales/routing"
import {
  CONTENT_APPEAL_ANGLES,
  CONTENT_APPEAL_LABELS,
  CONTENT_ASSET_LABELS,
  CONTENT_ASSET_TYPES,
  CONTENT_TEMPLATE_VARIANT_LABELS,
  INDUSTRY_LABELS,
  REPORT_LOCALES,
} from "@/lib/sales/content-templates"
import { SalesTemplatePreviewPanel } from "./SalesTemplatePreviewPanel"
import type { TemplateRow } from "./template-workbench-types"

const INDUSTRY_OPTIONS = Object.entries(INDUSTRY_LABELS).map(([value, label]) => [value, label.ja] as const)
const ASSET_OPTIONS = CONTENT_ASSET_TYPES.map((value) => [value, CONTENT_ASSET_LABELS[value].ja] as const)
const ANGLE_OPTIONS = CONTENT_APPEAL_ANGLES.map((value) => [value, CONTENT_APPEAL_LABELS[value].ja] as const)
const VARIANT_OPTIONS = Object.entries(CONTENT_TEMPLATE_VARIANT_LABELS).map(([value, label]) => [value, label] as const)
const LOCALE_OPTIONS = REPORT_LOCALES.map((value) => [value, value] as const)

function labelOf(entries: readonly (readonly [string, string])[], value: string): string {
  return entries.find(([key]) => key === value)?.[1] ?? value
}

function fieldValue(row: TemplateRow | null, key: keyof TemplateRow): string {
  const value = row?.[key]
  return typeof value === "string" ? value : ""
}

function countryForWorkbenchLocale(locale: string): string {
  return countryForLocale(isReportLocale(locale) ? locale : "ja")
}

function TemplateSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly (readonly [string, string])[]
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
        {options.map(([valueText, labelText]) => (
          <option key={valueText} value={valueText}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  )
}

function TextField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  rows?: number
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-700">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          className="resize-y rounded-md border border-zinc-200 px-3 py-2 text-sm leading-6 text-zinc-950 outline-none focus:border-zinc-500"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 rounded-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none focus:border-zinc-500"
        />
      )}
    </label>
  )
}

export function SalesTemplateWorkbenchPanel({ data }: { data: SalesDashboardData }) {
  const [locale, setLocale] = useState<ReportLocale>(data.scope.reportLocale)
  const [industry, setIndustry] = useState("restaurant")
  const [assetType, setAssetType] = useState("diagnostic_report")
  const [appealAngle, setAppealAngle] = useState("revenue_recovery")
  const [query, setQuery] = useState("")
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
        q: query,
        limit: "120",
      })
      const res = await fetch(`/api/sales/content-templates?${params.toString()}`)
      const json = (await res.json()) as { ok?: boolean; rows?: TemplateRow[]; error?: string }
      if (!res.ok || !json.ok) throw new Error(json.error ?? "テンプレート一覧を取得できませんでした")
      const rows = json.rows ?? []
      setTemplates(rows)
      setSelectedId(rows[0]?.id ?? null)
      setDraft(rows[0] ?? null)
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
          target_country: countryForWorkbenchLocale(locale),
          industry,
          asset_type: assetType,
          appeal_angle: appealAngle,
          template_variant: draft?.template_variant ?? undefined,
        }),
      })
      const json = (await res.json()) as { ok?: boolean; template?: TemplateRow; error?: string }
      if (!res.ok || !json.ok || !json.template) throw new Error(json.error ?? "選定ロジックのプレビューに失敗しました")
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
          report_locale: draft.report_locale,
          target_country: draft.target_country,
          industry: draft.industry,
          offer_code: draft.offer_code,
          asset_type: draft.asset_type,
          appeal_angle: draft.appeal_angle,
          template_variant: draft.template_variant,
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
    setLocale(data.scope.reportLocale)
  }, [data.scope.reportLocale])

  useEffect(() => {
    setDraft(selected)
  }, [selected])

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
              <SlidersHorizontal size={15} aria-hidden />
              テンプレート管理
            </div>
            <h2 className="mt-2 text-lg font-semibold text-zinc-950">確認・検索・選定テスト</h2>
            <p className="mt-2 text-xs leading-6 text-zinc-600">
              言語、業界、成果物、訴求軸ごとのテンプレートを確認し、Dify/n8nが使う選定条件と生成プロンプトをGUIで編集します。
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
          <TemplateSelect
            label="言語"
            value={locale}
            options={LOCALE_OPTIONS}
            onChange={(value) => {
              if (isReportLocale(value)) setLocale(value)
            }}
          />
          <TemplateSelect label="業界" value={industry} options={INDUSTRY_OPTIONS} onChange={setIndustry} />
          <TemplateSelect label="成果物" value={assetType} options={ASSET_OPTIONS} onChange={setAssetType} />
          <TemplateSelect label="訴求軸" value={appealAngle} options={ANGLE_OPTIONS} onChange={setAppealAngle} />
          <label className="grid gap-1 text-xs font-medium text-zinc-600">
            <span>検索</span>
            <div className="flex h-9 items-center rounded-md border border-zinc-200 bg-white px-2 focus-within:border-zinc-500">
              <Search size={14} className="text-zinc-400" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void loadTemplates()
                }}
                placeholder="タイトル・目的・品質基準で検索"
                className="ml-2 min-w-0 flex-1 bg-transparent text-sm text-zinc-950 outline-none"
              />
            </div>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void loadTemplates()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-semibold text-zinc-700"
            >
              <Search size={16} aria-hidden />
              検索
            </button>
            <button
              type="button"
              onClick={() => void previewMatch()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white"
            >
              <Eye size={16} aria-hidden />
              選定テスト
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
          <div className="font-semibold text-zinc-950">現在のSSOT</div>
          <div className="mt-2">総数: {data.contentTemplates.total}</div>
          <div>状態: {data.contentTemplates.fallbackUsed ? "アプリ内fallback" : "Supabase sales_content_templates"}</div>
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
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">{template.title}</div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${template.is_active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"}`}>
                  {template.is_active ? "有効" : "停止"}
                </span>
              </div>
              <div className={`mt-1 text-xs ${selected?.id === template.id ? "text-zinc-300" : "text-zinc-500"}`}>
                {labelOf(ASSET_OPTIONS, template.asset_type)} / {labelOf(ANGLE_OPTIONS, template.appeal_angle)} / v{template.version}
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
              テンプレート編集
            </div>
            <h2 className="mt-2 text-lg font-semibold text-zinc-950">{draft?.title ?? "テンプレート未選択"}</h2>
            <p className="mt-2 text-xs leading-6 text-zinc-600">
              選定条件、品質基準、Difyプロンプト、サンプル文面を編集できます。保存するとSupabase SSOTに反映され、Dify/n8nの次回選定に使われます。
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

        <div className="mt-4">
          <SalesTemplatePreviewPanel
            template={draft}
            industryLabel={labelOf(INDUSTRY_OPTIONS, draft?.industry ?? industry)}
            assetLabel={labelOf(ASSET_OPTIONS, draft?.asset_type ?? assetType)}
            angleLabel={labelOf(ANGLE_OPTIONS, draft?.appeal_angle ?? appealAngle)}
          />
        </div>

        {draft ? (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <TemplateSelect
                label="言語"
                value={draft.report_locale}
                options={LOCALE_OPTIONS}
                onChange={(value) =>
                  setDraft({
                    ...draft,
                    report_locale: value,
                    target_country: countryForWorkbenchLocale(value),
                  })
                }
              />
              <TemplateSelect label="業界" value={draft.industry} options={INDUSTRY_OPTIONS} onChange={(value) => setDraft({ ...draft, industry: value })} />
              <TemplateSelect label="成果物" value={draft.asset_type} options={ASSET_OPTIONS} onChange={(value) => setDraft({ ...draft, asset_type: value })} />
              <TemplateSelect label="訴求軸" value={draft.appeal_angle} options={ANGLE_OPTIONS} onChange={(value) => setDraft({ ...draft, appeal_angle: value })} />
              <TemplateSelect label="テンプレ種別" value={draft.template_variant} options={VARIANT_OPTIONS} onChange={(value) => setDraft({ ...draft, template_variant: value })} />
              <TextField label="対象国" value={fieldValue(draft, "target_country")} onChange={(value) => setDraft({ ...draft, target_country: value.toUpperCase() })} />
            </div>
            <TextField label="商材コード" value={fieldValue(draft, "offer_code")} onChange={(value) => setDraft({ ...draft, offer_code: value })} />
            <TextField label="テンプレ名" value={fieldValue(draft, "title")} onChange={(value) => setDraft({ ...draft, title: value })} />
            <TextField label="目的" value={fieldValue(draft, "purpose")} onChange={(value) => setDraft({ ...draft, purpose: value })} multiline />
            <TextField label="品質基準" value={fieldValue(draft, "quality_bar")} onChange={(value) => setDraft({ ...draft, quality_bar: value })} multiline />
            <TextField label="Dify選定条件" value={fieldValue(draft, "dify_selection_rule")} onChange={(value) => setDraft({ ...draft, dify_selection_rule: value })} multiline />
            <TextField label="生成プロンプト" value={fieldValue(draft, "prompt_template")} onChange={(value) => setDraft({ ...draft, prompt_template: value })} multiline rows={9} />
            <TextField label="サンプル文面" value={fieldValue(draft, "sample_copy")} onChange={(value) => setDraft({ ...draft, sample_copy: value })} multiline />
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
