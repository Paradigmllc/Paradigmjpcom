"use client"

import { useMemo, useState, type ReactNode } from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Plus, Save, Settings2 } from "lucide-react"
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
const DEFAULT_REGION_COUNTRY = "JP"

function fieldKey(field: SalesCrmViewField) {
  return field.fieldKey
}

function optionKey(option: SalesCrmSelectOption) {
  return option.id ?? `${option.fieldKey}:${option.value}`
}

function normalizeFields(fields: SalesCrmViewField[]) {
  return fields.map((field) => ({ ...field, position: Number(field.position) })).sort((a, b) => a.position - b.position)
}

function normalizeOptions(options: SalesCrmSelectOption[]) {
  return options
    .map((option) => ({ ...option, position: Number(option.position), countryCode: option.countryCode ?? null }))
    .sort((a, b) => (a.fieldKey === b.fieldKey ? a.position - b.position : a.fieldKey.localeCompare(b.fieldKey)))
}

function SortableShell({
  id,
  label,
  children,
  columns,
}: {
  id: string
  label: string
  children: ReactNode
  columns: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`grid items-center gap-3 border-t border-zinc-100 px-3 py-2 text-sm ${columns} ${isDragging ? "relative z-10 rounded-md bg-white shadow-lg ring-1 ring-zinc-200" : "bg-white"}`}
    >
      <button
        type="button"
        aria-label={`${label}をドラッグして並び替え`}
        className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-md border border-zinc-200 text-zinc-500 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} aria-hidden />
      </button>
      {children}
    </div>
  )
}

function FieldRow({
  field,
  onChange,
}: {
  field: SalesCrmViewField
  onChange: (patch: Partial<SalesCrmViewField>) => void
}) {
  return (
    <SortableShell
      id={fieldKey(field)}
      label={field.label}
      columns="grid-cols-[32px_minmax(150px,1.25fr)_minmax(150px,1fr)_88px_72px]"
    >
      <input
        value={field.label}
        onChange={(event) => onChange({ label: event.target.value })}
        aria-label={`${field.fieldKey}の表記名`}
        className="h-9 rounded-md border border-zinc-200 px-2 text-sm"
      />
      <div className="truncate text-xs text-zinc-500">{field.twentyFieldName}</div>
      <div className="text-xs text-zinc-500">{field.fieldType}</div>
      <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
        <input
          type="checkbox"
          checked={field.isVisible}
          onChange={(event) => onChange({ isVisible: event.target.checked })}
          aria-label={`${field.label}を表示`}
          className="h-4 w-4 rounded border-zinc-300"
        />
        表示
      </label>
    </SortableShell>
  )
}

function OptionRow({
  option,
  onChange,
}: {
  option: SalesCrmSelectOption
  onChange: (patch: Partial<SalesCrmSelectOption>) => void
}) {
  return (
    <SortableShell
      id={optionKey(option)}
      label={option.label}
      columns="grid-cols-[32px_minmax(150px,1fr)_minmax(150px,1fr)_96px_112px_72px]"
    >
      <input
        value={option.label}
        onChange={(event) => onChange({ label: event.target.value })}
        aria-label={`${option.value}の表示名`}
        className="h-9 rounded-md border border-zinc-200 px-2 text-sm"
      />
      <input
        value={option.value}
        onChange={(event) => onChange({ value: event.target.value })}
        aria-label={`${option.label}の値`}
        className="h-9 rounded-md border border-zinc-200 px-2 text-sm"
      />
      <input
        value={option.countryCode ?? ""}
        onChange={(event) => onChange({ countryCode: event.target.value.trim() || null })}
        aria-label={`${option.label}の国コード`}
        className="h-9 rounded-md border border-zinc-200 px-2 text-sm uppercase"
      />
      <select
        value={option.color}
        onChange={(event) => onChange({ color: event.target.value })}
        aria-label={`${option.label}の色`}
        className="h-9 rounded-md border border-zinc-200 px-2 text-sm"
      >
        {COLOR_OPTIONS.map((color) => (
          <option key={color} value={color}>
            {color}
          </option>
        ))}
      </select>
      <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
        <input
          type="checkbox"
          checked={option.isActive}
          onChange={(event) => onChange({ isActive: event.target.checked })}
          aria-label={`${option.label}を有効化`}
          className="h-4 w-4 rounded border-zinc-300"
        />
        有効
      </label>
    </SortableShell>
  )
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
  const [regionCountry, setRegionCountry] = useState(DEFAULT_REGION_COUNTRY)
  const [saving, setSaving] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const visibleMasterOptions = useMemo(
    () =>
      options
        .filter((option) => option.fieldKey === master)
        .filter((option) => master !== "region" || option.countryCode === regionCountry)
        .sort((a, b) => a.position - b.position),
    [master, options, regionCountry],
  )

  const countryOptions = useMemo(
    () =>
      options
        .filter((option) => option.fieldKey === "country" && option.isActive)
        .sort((a, b) => a.position - b.position),
    [options],
  )

  function updateField(targetKey: string, patch: Partial<SalesCrmViewField>) {
    setFields((current) => current.map((field) => (fieldKey(field) === targetKey ? { ...field, ...patch } : field)))
  }

  function updateOption(targetKey: string, patch: Partial<SalesCrmSelectOption>) {
    setOptions((current) => current.map((option) => (optionKey(option) === targetKey ? { ...option, ...patch } : option)))
  }

  function reorderFields(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    if (!overId || activeId === overId) return
    setFields((current) => {
      const oldIndex = current.findIndex((field) => fieldKey(field) === activeId)
      const newIndex = current.findIndex((field) => fieldKey(field) === overId)
      if (oldIndex < 0 || newIndex < 0) return current
      return arrayMove(current, oldIndex, newIndex).map((field, position) => ({ ...field, position }))
    })
  }

  function reorderOptions(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    if (!overId || activeId === overId) return
    const oldIndex = visibleMasterOptions.findIndex((option) => optionKey(option) === activeId)
    const newIndex = visibleMasterOptions.findIndex((option) => optionKey(option) === overId)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(visibleMasterOptions, oldIndex, newIndex).map((option, position) => ({ ...option, position }))
    const reorderedByKey = new Map(reordered.map((option) => [optionKey(option), option]))
    setOptions((current) => current.map((option) => reorderedByKey.get(optionKey(option)) ?? option))
  }

  function addOption() {
    const nextPosition = visibleMasterOptions.reduce((max, option) => Math.max(max, option.position), -1) + 1
    setOptions((current) => [
      ...current,
      {
        fieldKey: master,
        value: `${master}_${Date.now()}`,
        label: "新しい選択肢",
        countryCode: master === "region" ? regionCountry : null,
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
        twenty?: { configured?: boolean; error?: string | null; appliedFields?: number }
      }
      if (!res.ok || !body.ok || !body.fields || !body.options) {
        toast.error(body.error ?? "CRM表示設定の保存に失敗しました")
        return
      }
      setFields(normalizeFields(body.fields))
      setOptions(normalizeOptions(body.options))
      if (body.twenty?.configured && !body.twenty.error) {
        toast.success(
          `保存し、Twentyのmetadata APIへ反映しました（${body.twenty.appliedFields ?? 0}項目）。既に開いているTwentyタブは再読み込みで更新されます。`,
        )
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
            ハンドルをドラッグして並び替え、Twentyに同期する表示名と選択肢を管理します。
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
            <p className="mt-1 text-xs text-zinc-500">
              左端のハンドルをドラッグすると、その順番がTwenty Companiesに反映されます。保存後はTwentyの既存タブを再読み込みしてください。
            </p>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[32px_minmax(150px,1.25fr)_minmax(150px,1fr)_88px_72px] gap-3 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-500">
                <span />
                <span>表記名</span>
                <span>Twentyフィールド</span>
                <span>種別</span>
                <span>表示</span>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderFields}>
                <SortableContext items={fields.map(fieldKey)} strategy={verticalListSortingStrategy}>
                  {fields.map((field) => (
                    <FieldRow key={fieldKey(field)} field={field} onChange={(patch) => updateField(fieldKey(field), patch)} />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200">
          <div className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">選択肢マスタ</h3>
              <p className="mt-1 text-xs text-zinc-500">
                地域名は国別に分離します。Twentyには確定した地域名だけを表示し、国ごとの候補管理はここを正本にします。
              </p>
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
              {master === "region" ? (
                <select
                  value={regionCountry}
                  onChange={(event) => setRegionCountry(event.target.value)}
                  aria-label="地域候補を編集する国"
                  className="h-9 rounded-md border border-zinc-200 px-2 text-sm"
                >
                  {countryOptions.map((option) => (
                    <option key={option.countryCode ?? option.value} value={option.countryCode ?? option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : null}
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
            <div className="min-w-[820px]">
              <div className="sticky top-0 z-10 grid grid-cols-[32px_minmax(150px,1fr)_minmax(150px,1fr)_96px_112px_72px] gap-3 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-500">
                <span />
                <span>表示名</span>
                <span>値</span>
                <span>国コード</span>
                <span>色</span>
                <span>有効</span>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderOptions}>
                <SortableContext items={visibleMasterOptions.map(optionKey)} strategy={verticalListSortingStrategy}>
                  {visibleMasterOptions.map((option) => (
                    <OptionRow
                      key={optionKey(option)}
                      option={option}
                      onChange={(patch) => updateOption(optionKey(option), patch)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
