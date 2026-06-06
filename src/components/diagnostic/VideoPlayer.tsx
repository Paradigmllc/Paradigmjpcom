"use client"

import { BarChart3, CheckCircle2, ExternalLink, FileText, MonitorPlay, Pause, Play, RotateCcw } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import type { NarrationScript } from "@/lib/sales/video-generator"
import { themeForIndustry } from "@/lib/sales/render-quality"

interface Props {
  data: DiagnosticReportData
  script: NarrationScript
  trackingSlug: string
}

interface Scene {
  id: string
  start: number
  end: number
  kicker: string
  title: string
  body: string
  metricLabel: string
  metricValue: string
  visual: "dashboard" | "evidence" | "loss" | "demo" | "pipeline" | "cta"
}

const TOTAL = 60

const CORRUPT_TEXT = /縺|繝|譁|蜑|荳|譛|谿|險|螟|豕|邨|髻|蠕|蝠|逕|莠|陦|蛻|諡|蜷|荳|繧|�/

function cleanText(value: string | null | undefined, fallback: string, max = 160): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim()
  if (!text || CORRUPT_TEXT.test(text)) return fallback
  return text.length > max ? `${text.slice(0, max - 1)}...` : text
}

function isJapanese(locale: string): boolean {
  return locale === "ja"
}

function moneyNumber(value: string): number {
  const match = value.match(/[\d,]+/)
  return match ? Number.parseInt(match[0].replaceAll(",", ""), 10) || 0 : 0
}

function formatMoney(value: number, locale: string): string {
  if (locale === "ja") return `¥${value.toLocaleString("ja-JP")}`
  return `$${Math.max(1, Math.round(value / 150)).toLocaleString("en-US")}`
}

function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return value
  return null
}

export default function VideoPlayer({ data, script, trackingSlug }: Props) {
  const theme = themeForIndustry(data.industry)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(true)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)
  const ja = isJapanese(data.report_locale)
  const reportPath = `/${data.report_locale}/report/${trackingSlug}`
  const demoUrl = safeUrl(data.demo_url)
  const loss = moneyNumber(data.total_loss)
  const sourceScore = data.source_coverage.score
  const firstAct = data.acts[0]
  const secondAct = data.acts[1]
  const thirdAct = data.acts[2]

  const copy = useMemo(
    () => ({
      openingTitle: ja
        ? `${data.company_name}の機会損失を、公開データから60秒で可視化します。`
        : `A 60-second evidence brief for ${data.company_name}.`,
      openingBody: ja
        ? "数字を並べるのではなく、なぜ今改善すべきかを意思決定者向けに整理します。"
        : "Not a pile of scores. A decision-ready view of what is leaking and why it matters now.",
      evidenceTitle: cleanText(
        firstAct?.headline,
        ja ? "最初の接点で信頼を取りこぼしている可能性があります。" : "The first touchpoint is likely leaking trust.",
      ),
      evidenceBody: cleanText(
        firstAct?.body,
        ja
          ? "検索、SNS共有、フォーム導線、技術スタックの公開シグナルを組み合わせて、改善余地を特定しました。"
          : "Public signals across search, social previews, forms, and stack evidence reveal a practical improvement path.",
        210,
      ),
      lossTitle: cleanText(
        secondAct?.headline,
        ja ? "現状維持のコストは、見えないまま積み上がります。" : "The cost of standing still compounds quietly.",
      ),
      lossBody: cleanText(
        secondAct?.body,
        ja
          ? "表示速度、訴求、信頼材料、問い合わせ導線の弱さは、毎月の機会損失として残り続けます。"
          : "Weak speed, unclear proof, and form friction keep showing up as monthly opportunity loss.",
        210,
      ),
      demoTitle: cleanText(
        thirdAct?.headline,
        ja ? "診断結果を、すぐ見せられる改善デモに変換します。" : "The audit becomes a concrete replacement demo.",
      ),
      demoBody: cleanText(
        thirdAct?.body,
        ja
          ? "Astroで軽量な差し替えデモを作り、ファーストビュー、CTA、信頼材料の見え方を実物で確認できます。"
          : "An Astro-style replacement demo shows the improved first view, CTA, and proof architecture in context.",
        210,
      ),
      pipelineTitle: ja ? "制作ラインはTrigger.devが交通整理し、重い生成だけを専用レンダーへ渡します。" : "Trigger.dev coordinates the line; renderers only do renderer work.",
      pipelineBody: ja
        ? "Dify Cloudが文面とテンプレ判定、HyperFrames/Remotionが営業動画、ComfyUI/Vast.aiは必要な素材生成、R2が配信を担当します。"
        : "Dify Cloud handles copy and template selection, HyperFrames/Remotion create the sales video, ComfyUI/Vast.ai handle heavy assets, and R2 serves delivery.",
      ctaTitle: cleanText(script.cta, ja ? "詳細レポートとデモを見ながら、次の30分で優先順位を決めましょう。" : "Review the report and demo, then decide priorities in one short call.", 180),
    }),
    [data.company_name, firstAct, ja, script.cta, secondAct, thirdAct],
  )

  const scenes: Scene[] = useMemo(
    () => [
      {
        id: "opening",
        start: 0,
        end: 8,
        kicker: "01 / EXECUTIVE BRIEF",
        title: copy.openingTitle,
        body: copy.openingBody,
        metricLabel: ja ? "推定機会損失" : "Estimated leakage",
        metricValue: data.total_loss,
        visual: "dashboard",
      },
      {
        id: "evidence",
        start: 8,
        end: 20,
        kicker: "02 / PUBLIC EVIDENCE",
        title: copy.evidenceTitle,
        body: copy.evidenceBody,
        metricLabel: firstAct?.metric_label && !CORRUPT_TEXT.test(firstAct.metric_label) ? firstAct.metric_label : "Evidence signal",
        metricValue: firstAct?.metric_value ?? `${sourceScore}%`,
        visual: "evidence",
      },
      {
        id: "loss",
        start: 20,
        end: 32,
        kicker: "03 / HIDDEN COST",
        title: copy.lossTitle,
        body: copy.lossBody,
        metricLabel: ja ? "年間換算の目安" : "Annualized estimate",
        metricValue: formatMoney(loss * 12, data.report_locale),
        visual: "loss",
      },
      {
        id: "demo",
        start: 32,
        end: 44,
        kicker: "04 / ASTRO DEMO",
        title: copy.demoTitle,
        body: copy.demoBody,
        metricLabel: ja ? "差し替えデモ" : "Replacement demo",
        metricValue: demoUrl ? "ready" : "queued",
        visual: "demo",
      },
      {
        id: "pipeline",
        start: 44,
        end: 54,
        kicker: "05 / PRODUCTION LINE",
        title: copy.pipelineTitle,
        body: copy.pipelineBody,
        metricLabel: "Dify / Trigger.dev / HyperFrames / Remotion / R2",
        metricValue: ja ? "用途別に分担" : "role-separated",
        visual: "pipeline",
      },
      {
        id: "cta",
        start: 54,
        end: 60,
        kicker: "06 / NEXT ACTION",
        title: copy.ctaTitle,
        body: ja
          ? "この動画、診断レポート、Astroデモを同じURL群で確認し、送付前に人間が最終承認できます。"
          : "The video, report, and Astro demo stay connected so a human can approve before outreach.",
        metricLabel: ja ? "次の確認物" : "Next assets",
        metricValue: ja ? "レポート / デモ / 商談予約" : "Report / demo / booking",
        visual: "cta",
      },
    ],
    [copy, data.report_locale, data.total_loss, demoUrl, firstAct, ja, loss, sourceScore],
  )

  const currentScene = scenes.find((scene) => time >= scene.start && time < scene.end) ?? scenes[scenes.length - 1]
  const sceneProgress = Math.max(0, Math.min(1, (time - currentScene.start) / (currentScene.end - currentScene.start)))
  const totalProgress = Math.min(1, time / TOTAL)

  useEffect(() => {
    if (!playing) return
    startRef.current = performance.now() - time * 1000
    const tick = (now: number) => {
      const next = (now - startRef.current) / 1000
      if (next >= TOTAL) {
        setTime(TOTAL)
        setPlaying(false)
        return
      }
      setTime(next)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, time])

  const jumpTo = (start: number) => {
    setTime(start)
    setPlaying(true)
  }

  const replay = () => {
    setTime(0)
    setPlaying(true)
  }

  return (
    <div className="min-h-screen bg-[#080b12] text-white">
      <main className="grid min-h-screen grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_430px]">
        <section className="relative flex min-h-[68vh] flex-col justify-between overflow-hidden p-5 sm:p-8 lg:min-h-screen lg:p-10">
          <div
            className="absolute inset-0 opacity-90"
            style={{
              background: `linear-gradient(135deg, #080b12 0%, ${theme.accentDark} 44%, #101827 100%)`,
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />
          <div className="relative z-10 flex items-center justify-between gap-4 text-xs font-semibold uppercase text-white/64">
            <span>Paradigm Revenue Film</span>
            <span>{data.company_name}</span>
          </div>

          <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div
              key={currentScene.id}
              className="max-w-5xl"
              style={{
                opacity: Math.min(1, sceneProgress * 2.2),
                transform: `translateY(${Math.max(0, (1 - sceneProgress * 2.2) * 22)}px)`,
              }}
            >
              <div className="mb-5 inline-flex rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/72">
                {currentScene.kicker}
              </div>
              <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-normal text-white sm:text-6xl lg:text-7xl">
                {currentScene.title}
              </h1>
              <p className="mt-6 max-w-3xl text-pretty text-base leading-8 text-white/72 sm:text-xl">{currentScene.body}</p>
            </div>
            <VisualPanel data={data} scene={currentScene} sourceScore={sourceScore} loss={loss} locale={data.report_locale} />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/14">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${totalProgress * 100}%` }} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-mono text-xs text-white/60">{Math.floor(time)}s / 60s</div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-label={playing ? "Pause video preview" : "Play video preview"}
                  onClick={() => setPlaying((value) => !value)}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-zinc-950"
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {playing ? (ja ? "一時停止" : "Pause") : ja ? "再生" : "Play"}
                </button>
                <button
                  type="button"
                  aria-label="Replay video preview"
                  onClick={replay}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-white/18 bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/16"
                >
                  <RotateCcw className="h-4 w-4" />
                  {ja ? "最初から" : "Replay"}
                </button>
                <a
                  href={reportPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-zinc-950"
                  style={{ background: theme.signal }}
                >
                  <FileText className="h-4 w-4" />
                  {ja ? "詳細レポート" : "Report"}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {demoUrl ? (
                  <a
                    href={demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-white/18 bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/16"
                  >
                    <MonitorPlay className="h-4 w-4" />
                    {ja ? "デモ" : "Demo"}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <aside className="border-t border-white/10 bg-white p-5 text-zinc-950 lg:border-l lg:border-t-0 lg:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Scene Navigator</p>
            <h2 className="mt-2 text-2xl font-semibold">{ja ? "送付前プレビュー" : "Client-ready preview"}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {ja
                ? "HyperFrames/RemotionでMP4化する前に、同じ構成をブラウザで確認できます。"
                : "Review the same story arc before rendering to MP4 with HyperFrames or Remotion."}
            </p>
          </div>
          <div className="space-y-2">
            {scenes.map((scene) => {
              const active = currentScene.id === scene.id
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => jumpTo(scene.start)}
                  className={`w-full rounded-md border p-3 text-left transition-colors ${
                    active ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white hover:border-zinc-400"
                  }`}
                >
                  <span className={`text-[11px] font-semibold uppercase ${active ? "text-white/60" : "text-zinc-500"}`}>
                    {scene.kicker}
                  </span>
                  <span className="mt-1 block text-sm font-semibold leading-5">{scene.title}</span>
                </button>
              )
            })}
          </div>
        </aside>
      </main>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/sales/track-view?slug=${encodeURIComponent(trackingSlug)}`}
        alt=""
        width={1}
        height={1}
        className="pointer-events-none absolute left-0 top-0 opacity-0"
        aria-hidden
      />
    </div>
  )
}

function VisualPanel({
  data,
  scene,
  sourceScore,
  loss,
  locale,
}: {
  data: DiagnosticReportData
  scene: Scene
  sourceScore: number
  loss: number
  locale: string
}) {
  const annualLoss = Math.max(loss * 12, loss)
  const bars = [
    { label: locale === "ja" ? "現状維持" : "Status quo", value: 92 },
    { label: locale === "ja" ? "内製採用" : "Internal hire", value: 68 },
    { label: locale === "ja" ? "改善ライン" : "Paradigm line", value: 28 },
  ]
  const signals = data.intelligence.signals.slice(0, 5)
  const steps = ["Dify Cloud", "Trigger.dev", "HyperFrames", "Remotion", "R2"]

  return (
    <div className="rounded-lg border border-white/14 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
      <div className="rounded-md bg-white p-4 text-zinc-950">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">{scene.metricLabel}</p>
            <p className="mt-1 text-2xl font-semibold">{scene.metricValue}</p>
          </div>
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>

        {scene.visual === "loss" ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">{locale === "ja" ? "改善しない場合の年間インパクト目安" : "Annual impact estimate"}</p>
            <p className="text-4xl font-semibold">{formatMoney(annualLoss, locale)}</p>
            {bars.map((bar) => (
              <div key={bar.label}>
                <div className="mb-1 flex justify-between text-xs text-zinc-500">
                  <span>{bar.label}</span>
                  <span>{bar.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100">
                  <div className="h-2 rounded-full bg-zinc-950" style={{ width: `${bar.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : scene.visual === "pipeline" ? (
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-md border border-zinc-200 p-3">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-zinc-950 text-xs font-semibold text-white">{index + 1}</span>
                <span className="font-semibold">{step}</span>
              </div>
            ))}
          </div>
        ) : scene.visual === "demo" ? (
          <div className="overflow-hidden rounded-md border border-zinc-200">
            <div className="flex h-9 items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="grid gap-4 p-4">
              <div className="h-8 w-2/3 rounded bg-zinc-950" />
              <div className="h-3 w-full rounded bg-zinc-200" />
              <div className="h-3 w-5/6 rounded bg-zinc-200" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-16 rounded bg-zinc-100" />
                <div className="h-16 rounded bg-zinc-100" />
                <div className="h-16 rounded bg-zinc-100" />
              </div>
            </div>
          </div>
        ) : scene.visual === "evidence" ? (
          <div className="space-y-2">
            {signals.length > 0 ? (
              signals.map((signal) => (
                <div key={signal.id} className="rounded-md border border-zinc-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{signal.label}</span>
                    <span className="rounded bg-zinc-100 px-2 py-1 text-xs">{signal.value}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{signal.source}</p>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-zinc-200 p-4 text-sm text-zinc-600">Evidence is queued.</div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-zinc-200 p-4">
              <BarChart3 className="mb-4 h-6 w-6" />
              <p className="text-xs text-zinc-500">Coverage</p>
              <p className="text-3xl font-semibold">{sourceScore}%</p>
            </div>
            <div className="rounded-md border border-zinc-200 p-4">
              <MonitorPlay className="mb-4 h-6 w-6" />
              <p className="text-xs text-zinc-500">Assets</p>
              <p className="text-3xl font-semibold">3</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
