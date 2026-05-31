"use client"

import { useMemo, useState } from "react"
import { Clapperboard, FileText, Mail, Monitor, PanelsTopLeft, Presentation } from "lucide-react"
import type { TemplateRow } from "./template-workbench-types"

type PreviewMode = "report" | "message" | "deck" | "video" | "demo"

const PREVIEW_MODES: { id: PreviewMode; label: string; icon: typeof FileText }[] = [
  { id: "report", label: "診断レポート", icon: FileText },
  { id: "message", label: "フォーム文面", icon: Mail },
  { id: "deck", label: "営業資料", icon: Presentation },
  { id: "video", label: "動画", icon: Clapperboard },
  { id: "demo", label: "Astroデモ", icon: PanelsTopLeft },
]

function splitSample(value: string): string[] {
  return value
    .split(/\n{2,}|\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
}

function metricFor(template: TemplateRow): { label: string; value: string }[] {
  return [
    { label: "対象国", value: template.target_country || "JP" },
    { label: "訴求軸", value: template.appeal_angle },
    { label: "成果物", value: template.asset_type },
  ]
}

function ReportPreview({ template, sampleLines }: { template: TemplateRow; sampleLines: string[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
      <div className="bg-zinc-950 px-5 py-5 text-white">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Paradigm Diagnostic Intelligence</div>
        <h3 className="mt-3 text-2xl font-semibold leading-tight">{template.title}</h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">{template.purpose}</p>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-3">
        {metricFor(template).map((metric) => (
          <div key={metric.label} className="rounded-md border border-zinc-200 bg-white p-3">
            <div className="text-[11px] text-zinc-500">{metric.label}</div>
            <div className="mt-1 truncate text-sm font-semibold text-zinc-950">{metric.value}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 border-t border-zinc-200 bg-white p-4 lg:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          <div>
            <div className="text-xs font-semibold text-zinc-500">専門家所見</div>
            <p className="mt-2 text-sm leading-7 text-zinc-800">{sampleLines[0] ?? template.purpose}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {["見えている事実", "事業上の意味", "最初の一手"].map((label, index) => (
              <div key={label} className="rounded-md bg-zinc-50 p-3">
                <div className="text-[11px] font-semibold text-zinc-500">{label}</div>
                <p className="mt-2 text-xs leading-6 text-zinc-700">{sampleLines[index + 1] ?? template.quality_bar}</p>
              </div>
            ))}
          </div>
        </div>
        <aside className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-xs font-semibold text-zinc-500">品質基準</div>
          <p className="mt-2 text-xs leading-6 text-zinc-700">{template.quality_bar}</p>
        </aside>
      </div>
    </div>
  )
}

function MessagePreview({ template, sampleLines }: { template: TemplateRow; sampleLines: string[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="rounded-md border border-zinc-200">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="text-[11px] font-semibold text-zinc-500">フォーム送信プレビュー</div>
          <div className="mt-1 text-sm font-semibold text-zinc-950">件名: {template.title}</div>
        </div>
        <div className="space-y-3 p-4 text-sm leading-7 text-zinc-700">
          {(sampleLines.length ? sampleLines : [template.sample_copy || template.purpose]).slice(0, 5).map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
        </div>
        <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
          Difyはこの文面を企業カルテの実測値、業界、言語、フォーム制約に合わせて差し替えます。
        </div>
      </div>
    </div>
  )
}

function DeckPreview({ template, sampleLines }: { template: TemplateRow; sampleLines: string[] }) {
  const slides = [
    { title: "1. 結論", body: template.purpose },
    { title: "2. 根拠", body: sampleLines[0] ?? template.quality_bar },
    { title: "3. 改善案", body: sampleLines[1] ?? template.dify_selection_rule },
    { title: "4. 次アクション", body: sampleLines[2] ?? template.sample_copy },
  ]
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {slides.map((slide) => (
        <div key={slide.title} className="aspect-[16/9] rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-zinc-500">{slide.title}</div>
          <div className="mt-4 h-1.5 w-16 rounded-full bg-zinc-950" />
          <p className="mt-4 line-clamp-5 text-sm font-medium leading-7 text-zinc-800">{slide.body}</p>
        </div>
      ))}
    </div>
  )
}

function VideoPreview({ template, sampleLines }: { template: TemplateRow; sampleLines: string[] }) {
  const scenes = [
    { label: "Hook", body: template.title },
    { label: "Problem", body: sampleLines[0] ?? template.purpose },
    { label: "Evidence", body: sampleLines[1] ?? template.quality_bar },
    { label: "Offer", body: sampleLines[2] ?? template.sample_copy },
  ]
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-950 p-4 text-white">
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
        <Monitor size={15} aria-hidden />
        HyperFrames / Remotion 構成プレビュー
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {scenes.map((scene, index) => (
          <div key={scene.label} className="min-h-40 rounded-md border border-white/10 bg-white/8 p-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-zinc-950">{index + 1}</div>
            <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">{scene.label}</div>
            <p className="mt-2 line-clamp-5 text-xs leading-6 text-zinc-200">{scene.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DemoPreview({ template, sampleLines }: { template: TemplateRow; sampleLines: string[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="grid gap-5 bg-zinc-950 p-6 text-white md:grid-cols-[1fr_280px]">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Astro replacement demo</div>
          <h3 className="mt-4 text-3xl font-semibold leading-tight">{template.title}</h3>
          <p className="mt-4 text-sm leading-7 text-zinc-300">{sampleLines[0] ?? template.purpose}</p>
        </div>
        <div className="rounded-md bg-white p-4 text-zinc-950">
          <div className="text-xs font-semibold text-zinc-500">CTA</div>
          <p className="mt-2 text-sm font-semibold leading-7">{sampleLines[1] ?? template.quality_bar}</p>
        </div>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-3">
        {["Proof bar", "Service path", "Booking CTA"].map((label, index) => (
          <div key={label} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs font-semibold text-zinc-950">{label}</div>
            <p className="mt-2 text-xs leading-6 text-zinc-600">{sampleLines[index + 2] ?? template.purpose}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SalesTemplatePreviewPanel({
  template,
  industryLabel,
  assetLabel,
  angleLabel,
}: {
  template: TemplateRow | null
  industryLabel: string
  assetLabel: string
  angleLabel: string
}) {
  const [mode, setMode] = useState<PreviewMode>("report")
  const sampleLines = useMemo(() => splitSample(template?.sample_copy ?? ""), [template?.sample_copy])

  if (!template) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
        テンプレートを選択すると、実際のレポート、文面、資料、動画、デモサイトの見え方をここで確認できます。
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-col gap-3 border-b border-zinc-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold text-zinc-500">ライブプレビュー</div>
          <h3 className="mt-1 text-lg font-semibold text-zinc-950">実際の構成・デザイン・文面を確認</h3>
          <p className="mt-2 text-xs leading-6 text-zinc-600">
            {template.report_locale} / {industryLabel} / {assetLabel} / {angleLabel} / v{template.version}
          </p>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {PREVIEW_MODES.map((item) => {
            const Icon = item.icon
            const active = mode === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-semibold ${
                  active ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-700"
                }`}
                aria-pressed={active}
              >
                <Icon size={14} aria-hidden />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="mt-4">
        {mode === "report" && <ReportPreview template={template} sampleLines={sampleLines} />}
        {mode === "message" && <MessagePreview template={template} sampleLines={sampleLines} />}
        {mode === "deck" && <DeckPreview template={template} sampleLines={sampleLines} />}
        {mode === "video" && <VideoPreview template={template} sampleLines={sampleLines} />}
        {mode === "demo" && <DemoPreview template={template} sampleLines={sampleLines} />}
      </div>
    </section>
  )
}
