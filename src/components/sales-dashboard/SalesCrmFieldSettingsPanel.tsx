"use client"

import { useMemo, useState } from "react"
import { Plus, Save, Settings2 } from "lucide-react"
import { toast } from "sonner"
import type { SalesCrmSelectOption, SalesCrmViewField } from "@/lib/sales/crm-field-config"

const MASTER_LABELS: Record<string, string> = {
  country: "国名",
  region: "地域名",
  industry: "業種名",
  source: "ソース元",
  sales_status: "営業ステータス",
}

const COLOR_OPTIONS = ["gray", "blue", "green", "yellow", "orange", "red", "pink", "purple", "cyan", "teal"] as const

function normalizeFields(fields: SalesCrmViewField[]) {
  return fields
    .map((field) => ({ ...field, position: Number(field.position) }))
    .sort((a, b) => a.position - b.position)
}

function normalizeOptions(options: SalesCrmSelectOption[]) {
  return options
    .map((option) => ({ ...option, position: Number(option.position), countryCode: option.countryCode ?? null }))
    .sort((a, b) => {
      if (a.fieldKey !== b.fieldKey) return a.fieldKey.localeCompare(b.fieldKey)
      return a.position - b.position
    })
}

export function SalesCrmFieldSettingsPanel({
  fields: initialFields,
  options: initialOptions,
  fallbackUsed,
  error,
}: {
  fields: SalesCrmViewField[]
  options: SalesCrmSelectOption[]
  fallbackUsed: boolean
  error: string | null
}) {
  const [fields, setFields] = useState(() => normalizeFields(initialFields))
  const [options, setOptions] = useState(() => normalizeOptions(initialOptions))
  const [master, setMaster] = useState("country")
  const [saving, setSaving] = useState(false)

  const visibleMasterOptions = useMemo(
    () => options.filter((option) => option.fieldKey === master).sort((a, b) => a.position - b.position),
    [master, options],
  )

  function updateField(fieldKey: string, patch: Partial<SalesCrmViewField>) {
    setFields((current) => current.map((field) => (field.fieldKey === fieldKey ? { ...field, ...patch } : field)))
  }

  function updateOption(index: number, patch: Partial<SalesCrmSelectOption>) {
    setOptions((current) => current.map((option, itemIndex) => (itemIndex === index ? { ...option, ...patch } : option)))
  }

  function addOption() {
    const nextPosition = visibleMasterOptions.reduce((max, option) => Math.max(max, option.position), -1) + 1
    setOptions((current) => [
      ...current,
      {
        fieldKey: master,
        value: `${master}_${Date.now()}`,
        label: "新しい選択肢",
        countryCode: master === "region" ? "JP" : null,
        position: nextPosition,
        isActive: true,
        color: "gray",
      },
    ])
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch("/api/sales/crm-field-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, options }),
      })
      const body = (await res.json()) as {
        ok?: boolean
        error?: string
        fields?: SalesCrmViewField[]
        options?: SalesCrmSelectOption[]
        twenty?: { configured?: boolean; error?: string | null; appliedFields?: number; selectFields?: number }
      }
      if (!res.ok || !body.ok || !body.fields || !body.options) {
        toast.error(body.error ?? "CRM表示設定の保存に失敗しました")
        return
      }
      setFields(normalizeFields(body.fields))
      setOptions(normalizeOptions(body.options))
      if (body.twenty?.configured && !body.twenty.error) {
        toast.success(`CRM表示設定を保存し、Twentyへ反映しました（${body.twenty.appliedFields ?? 0}項目）`)
      } else if (body.twenty?.error) {
        toast.warning(`Supabaseには保存しました。Twenty反映は未完了: ${body.twenty.error}`)
      } else {
        toast.success("CRM表示設定と選択肢マスタを保存しました")
      }
    } catch (caught) {
      console.error("[sales-crm-field-settings] save failed:", caught)
      toast.error(caught instanceof Error ? caught.message : "CRM表示設定の保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm lg:col-span-2">
      <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <Settings2 size={14} aria-hidden />
            Twenty / SSOT
          </div>
          <h2 className="mt-2 text-lg font-semibold text-zinc-950">営業リスト表示列・選択肢マスタ</h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500">
            列の表記名、順番、表示状態と、国名・地域名・業種名などの選択肢をSupabase SSOTで管理します。
          </p>
          {fallbackUsed || error ? (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
              {error ? `DB設定の取得に失敗したためfallbackを表示中: ${error}` : "DB設定が未構築のためfallbackを表示中です。"}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          aria-label="CRM表示設定を保存"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={16} aria-hidden />
          {saving ? "保存中" : "保存"}
        </button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-lg border border-zinc-200">
          <div className="border-b border-zinc-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-950">Twenty表示列</h3>
            <p className="mt-1 text-xs text-zinc-500">順番は数値で管理します。小さい順に左から表示されます。</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="px-3 py-2">順番</th>
                  <th className="px-3 py-2">表記名</th>
                  <th className="px-3 py-2">Twentyフィールド</th>
                  <th className="px-3 py-2">種別</th>
                  <th className="px-3 py-2">表示</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {fields.map((field) => (
                  <tr key={field.fieldKey}>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={field.position}
                        onChange={(event) => updateField(field.fieldKey, { position: Number(event.target.value) })}
                        aria-label={`${field.label}の表示順`}
                        className="h-9 w-20 rounded-md border border-zinc-200 px-2 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={field.label}
                        onChange={(event) => updateField(field.fieldKey, { label: event.target.value })}
                        aria-label={`${field.fieldKey}の表記名`}
                        className="h-9 w-full rounded-md border border-zinc-200 px-2 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-500">{field.twentyFieldName}</td>
                    <td className="px-3 py-2 text-xs text-zinc-500">{field.fieldType}</td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={field.isVisible}
                        onChange={(event) => updateField(field.fieldKey, { isVisible: event.target.checked })}
                        aria-label={`${field.label}を表示`}
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200">
          <div className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">選択肢マスタ</h3>
              <p className="mt-1 text-xs text-zinc-500">地域名はcountry_codeで国別に分離します。</p>
            </div>
            <div className="flex gap-2">
              <select
                value={master}
                onChange={(event) => setMaster(event.target.value)}
                aria-label="編集する選択肢マスタ"
                className="h-9 rounded-md border border-zinc-200 px-2 text-sm"
              >
                {Object.entries(MASTER_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addOption}
                aria-label="選択肢を追加"
                className="inline-flex h-9 items-center gap-1 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-800 hover:border-zinc-400"
              >
                <Plus size={15} aria-hidden />
                追加
              </button>
            </div>
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="px-3 py-2">順番</th>
                  <th className="px-3 py-2">表示名</th>
                  <th className="px-3 py-2">値</th>
                  <th className="px-3 py-2">国コード</th>
                  <th className="px-3 py-2">色</th>
                  <th className="px-3 py-2">有効</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {visibleMasterOptions.map((option) => {
                  const sourceIndex = options.findIndex((item) => item === option)
                  return (
                    <tr key={`${option.fieldKey}:${option.value}:${sourceIndex}`}>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={option.position}
                          onChange={(event) => updateOption(sourceIndex, { position: Number(event.target.value) })}
                          aria-label={`${option.label}の表示順`}
                          className="h-9 w-20 rounded-md border border-zinc-200 px-2 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={option.label}
                          onChange={(event) => updateOption(sourceIndex, { label: event.target.value })}
                          aria-label={`${option.value}の表示名`}
                          className="h-9 w-full rounded-md border border-zinc-200 px-2 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={option.value}
                          onChange={(event) => updateOption(sourceIndex, { value: event.target.value })}
                          aria-label={`${option.label}の値`}
                          className="h-9 w-full rounded-md border border-zinc-200 px-2 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={option.countryCode ?? ""}
                          onChange={(event) => updateOption(sourceIndex, { countryCode: event.target.value.trim() || null })}
                          aria-label={`${option.label}の国コード`}
                          className="h-9 w-24 rounded-md border border-zinc-200 px-2 text-sm uppercase"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={option.color}
                          onChange={(event) => updateOption(sourceIndex, { color: event.target.value })}
                          aria-label={`${option.label}の色`}
                          className="h-9 rounded-md border border-zinc-200 px-2 text-sm"
                        >
                          {COLOR_OPTIONS.map((color) => (
                            <option key={color} value={color}>
                              {color}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={option.isActive}
                          onChange={(event) => updateOption(sourceIndex, { isActive: event.target.checked })}
                          aria-label={`${option.label}を有効化`}
                          className="h-4 w-4 rounded border-zinc-300"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
