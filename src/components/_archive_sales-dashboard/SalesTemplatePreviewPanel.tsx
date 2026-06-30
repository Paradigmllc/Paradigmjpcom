"use client";

import { useEffect, useMemo, useState } from "react";
import { Clapperboard, Expand, FileText, Mail, Monitor, PanelsTopLeft, Presentation, Smartphone, X } from "lucide-react";
import type { TemplateRow } from "./template-workbench-types";

type PreviewMode = "report" | "message" | "deck" | "video" | "demo";
type ViewportMode = "desktop" | "mobile";

const previewModes: { id: PreviewMode; label: string; icon: typeof FileText }[] = [
  { id: "report", label: "診断レポート", icon: FileText },
  { id: "message", label: "フォーム文面", icon: Mail },
  { id: "deck", label: "営業資料", icon: Presentation },
  { id: "video", label: "動画", icon: Clapperboard },
  { id: "demo", label: "Astroデモ", icon: PanelsTopLeft },
];

function modeForAsset(assetType: string): PreviewMode {
  if (assetType === "astro_demo_site") return "demo";
  if (assetType === "sales_deck") return "deck";
  if (assetType === "sales_video") return "video";
  return "report";
}

function splitSample(value: string): string[] {
  return value
    .split(/\n{2,}|\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function metricFor(template: TemplateRow): { label: string; value: string }[] {
  return [
    { label: "対象国", value: template.target_country || "JP" },
    { label: "訴求軸", value: template.appeal_angle },
    { label: "成果物", value: template.asset_type },
  ];
}

function ReportPreview({ template, sampleLines }: { template: TemplateRow; sampleLines: string[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
      <div className="bg-zinc-950 px-4 py-5 text-white sm:px-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Paradigm Diagnostic Intelligence
        </div>
        <h3 className="mt-3 text-balance text-xl font-semibold leading-tight sm:text-2xl">{template.title}</h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">{template.purpose}</p>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {metricFor(template).map((metric) => (
          <div key={metric.label} className="min-w-0 rounded-md border border-zinc-200 bg-white p-3">
            <div className="text-[11px] text-zinc-500">{metric.label}</div>
            <div className="mt-1 truncate text-sm font-semibold text-zinc-950">{metric.value}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 border-t border-zinc-200 bg-white p-4 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0 space-y-3">
          <div>
            <div className="text-xs font-semibold text-zinc-500">専門家所見</div>
            <p className="mt-2 text-sm leading-7 text-zinc-800">{sampleLines[0] ?? template.purpose}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {["見えている事実", "事業上の意味", "最初の一手"].map((label, index) => (
              <div key={label} className="min-w-0 rounded-md bg-zinc-50 p-3">
                <div className="text-[11px] font-semibold text-zinc-500">{label}</div>
                <p className="mt-2 text-xs leading-6 text-zinc-700">
                  {sampleLines[index + 1] ?? template.quality_bar}
                </p>
              </div>
            ))}
          </div>
        </div>
        <aside className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-xs font-semibold text-zinc-500">品質基準</div>
          <p className="mt-2 text-xs leading-6 text-zinc-700">{template.quality_bar}</p>
        </aside>
      </div>
    </div>
  );
}

function MessagePreview({ template, sampleLines }: { template: TemplateRow; sampleLines: string[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 sm:p-4">
      <div className="overflow-hidden rounded-md border border-zinc-200">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="text-[11px] font-semibold text-zinc-500">フォーム送信プレビュー</div>
          <div className="mt-1 break-words text-sm font-semibold text-zinc-950">件名: {template.title}</div>
        </div>
        <div className="space-y-3 p-4 text-sm leading-7 text-zinc-700">
          {(sampleLines.length ? sampleLines : [template.sample_copy || template.purpose]).slice(0, 5).map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
        </div>
        <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 text-xs leading-6 text-zinc-500">
          Difyは企業カルテの実測値、業界、言語、フォーム制約に合わせて、この文面を差し替えます。
        </div>
      </div>
    </div>
  );
}

function DeckPreview({ template, sampleLines }: { template: TemplateRow; sampleLines: string[] }) {
  const slides = [
    { title: "1. 結論", body: template.purpose },
    { title: "2. 根拠", body: sampleLines[0] ?? template.quality_bar },
    { title: "3. 改善案", body: sampleLines[1] ?? template.dify_selection_rule },
    { title: "4. 次アクション", body: sampleLines[2] ?? template.sample_copy },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {slides.map((slide) => (
        <div key={slide.title} className="aspect-[16/10] min-w-0 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-zinc-500">{slide.title}</div>
          <div className="mt-4 h-1.5 w-16 rounded-full bg-zinc-950" />
          <p className="mt-4 line-clamp-5 text-sm font-medium leading-7 text-zinc-800">{slide.body}</p>
        </div>
      ))}
    </div>
  );
}

function VideoPreview({ template, sampleLines }: { template: TemplateRow; sampleLines: string[] }) {
  const scenes = [
    { label: "Hook", body: template.title },
    { label: "Problem", body: sampleLines[0] ?? template.purpose },
    { label: "Evidence", body: sampleLines[1] ?? template.quality_bar },
    { label: "Offer", body: sampleLines[2] ?? template.sample_copy },
  ];

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-950 p-4 text-white">
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
        <Monitor size={15} aria-hidden />
        HyperFrames / Remotion 構成プレビュー
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {scenes.map((scene, index) => (
          <div key={scene.label} className="min-h-36 min-w-0 rounded-md border border-white/10 bg-white/8 p-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-zinc-950">
              {index + 1}
            </div>
            <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
              {scene.label}
            </div>
            <p className="mt-2 line-clamp-5 text-xs leading-6 text-zinc-200">{scene.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoPreview({ template, sampleLines }: { template: TemplateRow; sampleLines: string[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="grid gap-5 bg-zinc-950 p-5 text-white md:grid-cols-[1fr_280px] md:p-6">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Astro replacement demo
          </div>
          <h3 className="mt-4 text-balance text-2xl font-semibold leading-tight sm:text-3xl">{template.title}</h3>
          <p className="mt-4 text-sm leading-7 text-zinc-300">{sampleLines[0] ?? template.purpose}</p>
        </div>
        <div className="min-w-0 rounded-md bg-white p-4 text-zinc-950">
          <div className="text-xs font-semibold text-zinc-500">CTA</div>
          <p className="mt-2 text-sm font-semibold leading-7">{sampleLines[1] ?? template.quality_bar}</p>
        </div>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {["Proof bar", "Service path", "Booking CTA"].map((label, index) => (
          <div key={label} className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs font-semibold text-zinc-950">{label}</div>
            <p className="mt-2 text-xs leading-6 text-zinc-600">{sampleLines[index + 2] ?? template.purpose}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewCanvas({
  mode,
  template,
  sampleLines,
  viewport,
}: {
  mode: PreviewMode;
  template: TemplateRow;
  sampleLines: string[];
  viewport: ViewportMode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg bg-zinc-100 p-2 sm:p-3">
      <div className={viewport === "mobile" ? "mx-auto w-[360px] max-w-full" : "min-w-[760px]"}>
        {mode === "report" && <ReportPreview template={template} sampleLines={sampleLines} />}
        {mode === "message" && <MessagePreview template={template} sampleLines={sampleLines} />}
        {mode === "deck" && <DeckPreview template={template} sampleLines={sampleLines} />}
        {mode === "video" && <VideoPreview template={template} sampleLines={sampleLines} />}
        {mode === "demo" && <DemoPreview template={template} sampleLines={sampleLines} />}
      </div>
    </div>
  );
}

export function SalesTemplatePreviewPanel({
  template,
  industryLabel,
  assetLabel,
  angleLabel,
}: {
  template: TemplateRow | null;
  industryLabel: string;
  assetLabel: string;
  angleLabel: string;
}) {
  const [mode, setMode] = useState<PreviewMode>(modeForAsset(template?.asset_type ?? ""));
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [expanded, setExpanded] = useState(false);
  const sampleLines = useMemo(() => splitSample(template?.sample_copy ?? ""), [template?.sample_copy]);

  useEffect(() => {
    if (!template) return;
    setMode(modeForAsset(template.asset_type));
  }, [template?.asset_type, template?.id]);

  if (!template) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm leading-7 text-zinc-500">
        テンプレートを選択すると、実際のレポート、フォーム文面、営業資料、動画、Astroデモサイトの見え方をここで確認できます。
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:p-4">
      <div className="flex flex-col gap-3 border-b border-zinc-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-zinc-500">実画面プレビュー</div>
          <h3 className="mt-1 text-lg font-semibold text-zinc-950">構成・デザイン・文面を見ながら編集</h3>
          <p className="mt-2 text-xs leading-6 text-zinc-600">
            {template.report_locale} / {industryLabel} / {assetLabel} / {angleLabel} / v{template.version}
          </p>
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {previewModes.map((item) => {
              const Icon = item.icon;
              const active = mode === item.id;
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
              );
            })}
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-semibold ${
                viewport === "desktop" ? "border-zinc-950 bg-white text-zinc-950" : "border-zinc-200 bg-white text-zinc-600"
              }`}
              aria-pressed={viewport === "desktop"}
            >
              <Monitor size={14} aria-hidden />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-semibold ${
                viewport === "mobile" ? "border-zinc-950 bg-white text-zinc-950" : "border-zinc-200 bg-white text-zinc-600"
              }`}
              aria-pressed={viewport === "mobile"}
            >
              <Smartphone size={14} aria-hidden />
              Mobile
            </button>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-700"
            >
              <Expand size={14} aria-hidden />
              拡大
            </button>
          </div>
        </div>
      </div>
      <div className="mt-4 min-w-0">
        <PreviewCanvas mode={mode} template={template} sampleLines={sampleLines} viewport={viewport} />
      </div>
      {expanded && (
        <div className="fixed inset-0 z-50 bg-zinc-950/70 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="テンプレート拡大プレビュー">
          <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-500">拡大プレビュー</div>
                <h3 className="mt-1 truncate text-base font-semibold text-zinc-950">{template.title}</h3>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setViewport(viewport === "desktop" ? "mobile" : "desktop")}
                  className="inline-flex h-9 items-center gap-1 rounded-md border border-zinc-200 px-3 text-xs font-semibold text-zinc-700"
                >
                  {viewport === "desktop" ? <Smartphone size={14} aria-hidden /> : <Monitor size={14} aria-hidden />}
                  {viewport === "desktop" ? "Mobile" : "Desktop"}
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-zinc-950 text-white"
                  aria-label="拡大プレビューを閉じる"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
              <PreviewCanvas mode={mode} template={template} sampleLines={sampleLines} viewport={viewport} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
