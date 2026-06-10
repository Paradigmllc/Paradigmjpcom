"use client"

import { Gauge, Maximize2, Pause, Play, RotateCcw } from "lucide-react"
import { createElement, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { ReportLang } from "./report-copy"

type HyperframesPlayerElement = HTMLElement & {
  play: () => Promise<void> | void
  pause: () => void
  seek: (time: number) => void
  currentTime: number
  duration: number
  paused: boolean
  ready: boolean
  playbackRate: number
}

type GsapTimeline = {
  play: (from?: number) => void
  pause: () => void
  paused: () => boolean
  time: (value?: number) => number | GsapTimeline
  duration: () => number
  timeScale: (value?: number) => number | GsapTimeline
}

const SPEEDS = [1, 1.25, 1.5, 2] as const
const CHAPTERS = [
  { start: 0, key: "intro", ja: "要点", en: "Brief" },
  { start: 7, key: "evidence", ja: "根拠", en: "Evidence" },
  { start: 14, key: "loss", ja: "損失", en: "Leakage" },
  { start: 21, key: "demo", ja: "改善像", en: "Demo" },
  { start: 28, key: "next", ja: "次アクション", en: "Next" },
] as const

function formatTime(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0
  const minutes = Math.floor(safe / 60)
  const seconds = Math.floor(safe % 60).toString().padStart(2, "0")
  return `${minutes}:${seconds}`
}

function activeChapterIndex(currentTime: number): number {
  let active = 0
  CHAPTERS.forEach((chapter, index) => {
    if (currentTime >= chapter.start) active = index
  })
  return active
}

export default function ReportHyperFramesPlayer({
  src,
  lang,
}: {
  src: string
  lang: ReportLang
}) {
  const playerRef = useRef<HyperframesPlayerElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [playerLoadFailed, setPlayerLoadFailed] = useState(false)
  const [runtimeReady, setRuntimeReady] = useState(false)
  const [ready, setReady] = useState(false)
  const [paused, setPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(36)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)

  const copy = {
    play: lang === "ja" ? "再生" : "Play",
    pause: lang === "ja" ? "一時停止" : "Pause",
    replay: lang === "ja" ? "最初から" : "Replay",
    speed: lang === "ja" ? "倍速" : "Speed",
    fullscreen: lang === "ja" ? "拡大" : "Fullscreen",
    timeline: lang === "ja" ? "再生位置" : "Timeline",
    chapters: lang === "ja" ? "目次" : "Chapters",
    now: lang === "ja" ? "再生中" : "Now",
    skipTo: lang === "ja" ? "へスキップ" : "Skip to",
    loadError: lang === "ja" ? "動画プレイヤーの読み込みに失敗しました" : "Video player failed to load",
  }
  const activeIndex = activeChapterIndex(currentTime)

  useEffect(() => {
    let active = true
    async function loadRuntime() {
      try {
        if (!customElements.get("hyperframes-player")) {
          await import("@hyperframes/player")
        }
        if (!customElements.get("hyperframes-player")) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector<HTMLScriptElement>('script[data-hyperframes-player="cdn"]')
            if (existing) {
              existing.addEventListener("load", () => resolve(), { once: true })
              existing.addEventListener("error", () => reject(new Error("HyperFrames player CDN failed")), { once: true })
              return
            }
            const script = document.createElement("script")
            script.src = "https://cdn.jsdelivr.net/npm/@hyperframes/player@0.6.87/dist/hyperframes-player.global.js"
            script.async = true
            script.dataset.hyperframesPlayer = "cdn"
            script.onload = () => resolve()
            script.onerror = () => reject(new Error("HyperFrames player CDN failed"))
            document.head.appendChild(script)
          })
        }
        if (active) setRuntimeReady(Boolean(customElements.get("hyperframes-player")))
      } catch (error) {
        console.error("[diagnostic-report] HyperFrames player failed to load:", error)
        if (active) {
          setPlayerLoadFailed(true)
          toast.error(copy.loadError)
        }
      }
    }
    void loadRuntime()
    return () => {
      active = false
    }
  }, [copy.loadError])

  useEffect(() => {
    const getFallbackTimeline = (): GsapTimeline | null => {
      const timelines = (iframeRef.current?.contentWindow as { __timelines?: Record<string, GsapTimeline> } | null)?.__timelines
      return timelines?.["diagnostic-report-video"] ?? null
    }

    const syncState = () => {
      const player = playerRef.current
      if (player) {
        setReady(Boolean(player.ready))
        setPaused(Boolean(player.paused))
        setCurrentTime(Number(player.currentTime || 0))
        const nextDuration = Number(player.duration || 0)
        if (nextDuration > 0) setDuration(nextDuration)
        return
      }
      const timeline = getFallbackTimeline()
      if (!timeline) return
      setReady(true)
      setPaused(timeline.paused())
      setCurrentTime(Number(timeline.time() || 0))
      const nextDuration = Number(timeline.duration() || 0)
      if (nextDuration > 0) setDuration(nextDuration)
    }
    const handleError = (event: Event) => {
      console.error("[diagnostic-report] HyperFrames playback error:", event)
      toast.error(copy.loadError)
    }

    const player = playerRef.current
    player?.addEventListener("ready", syncState)
    player?.addEventListener("timeupdate", syncState)
    player?.addEventListener("play", syncState)
    player?.addEventListener("pause", syncState)
    player?.addEventListener("ended", syncState)
    player?.addEventListener("error", handleError)

    const interval = window.setInterval(syncState, 250)
    syncState()
    return () => {
      window.clearInterval(interval)
      player?.removeEventListener("ready", syncState)
      player?.removeEventListener("timeupdate", syncState)
      player?.removeEventListener("play", syncState)
      player?.removeEventListener("pause", syncState)
      player?.removeEventListener("ended", syncState)
      player?.removeEventListener("error", handleError)
    }
  }, [copy.loadError, playerLoadFailed, runtimeReady])

  function fallbackTimeline(): GsapTimeline | null {
    const timelines = (iframeRef.current?.contentWindow as { __timelines?: Record<string, GsapTimeline> } | null)?.__timelines
    return timelines?.["diagnostic-report-video"] ?? null
  }

  function postIframeCommand(command: Record<string, unknown>) {
    iframeRef.current?.contentWindow?.postMessage({ source: "diagnostic-report-player", ...command }, "*")
  }

  async function togglePlayback() {
    const player = playerRef.current
    const timeline = fallbackTimeline()
    try {
      if (player) {
        if (player.paused) {
          await player.play()
        } else {
          player.pause()
        }
      } else if (timeline) {
        if (timeline.paused()) {
          timeline.play()
          postIframeCommand({ type: "play" })
        } else {
          timeline.pause()
          postIframeCommand({ type: "pause" })
        }
      }
    } catch (error) {
      console.error("[diagnostic-report] play toggle failed:", error)
      toast.error(copy.loadError)
    }
  }

  function seekTo(value: number) {
    const player = playerRef.current
    const timeline = fallbackTimeline()
    if (player) {
      player.seek(value)
    } else if (timeline) {
      timeline.time(value)
      postIframeCommand({ type: "seek", time: value })
    } else {
      postIframeCommand({ type: "seek", time: value })
    }
    setCurrentTime(value)
  }

  function jumpToChapter(start: number) {
    seekTo(start)
    const player = playerRef.current
    const timeline = fallbackTimeline()
    if (player?.paused) void player.play()
    if (!player) {
      if (timeline?.paused()) timeline.play()
      postIframeCommand({ type: "play" })
    }
  }

  function replay() {
    const player = playerRef.current
    const timeline = fallbackTimeline()
    if (player) {
      player.seek(0)
      void player.play()
    } else if (timeline) {
      timeline.time(0)
      timeline.play()
      postIframeCommand({ type: "replay" })
    } else {
      postIframeCommand({ type: "replay" })
    }
  }

  function changeSpeed() {
    const player = playerRef.current
    const currentIndex = SPEEDS.indexOf(speed)
    const next = SPEEDS[(currentIndex + 1) % SPEEDS.length]
    const timeline = fallbackTimeline()
    if (player) {
      player.playbackRate = next
    } else if (timeline) {
      timeline.timeScale(next)
      postIframeCommand({ type: "speed", speed: next })
    } else {
      postIframeCommand({ type: "speed", speed: next })
    }
    setSpeed(next)
  }

  async function openFullscreen() {
    try {
      await frameRef.current?.requestFullscreen()
    } catch (error) {
      console.error("[diagnostic-report] fullscreen failed:", error)
      toast.error(copy.loadError)
    }
  }

  useEffect(() => {
    const root = frameRef.current
    if (!root) return

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-hf-control],[data-chapter-start]") : null
      if (!target) return
      const chapterStart = target.dataset.chapterStart
      if (chapterStart) {
        jumpToChapter(Number(chapterStart))
        return
      }
      const control = target.dataset.hfControl
      if (control === "toggle") void togglePlayback()
      if (control === "replay") replay()
      if (control === "speed") changeSpeed()
      if (control === "fullscreen") void openFullscreen()
    }
    const handleInput = (event: Event) => {
      const target = event.target instanceof HTMLInputElement ? event.target : null
      if (target?.dataset.hfControl === "timeline") seekTo(Number(target.value))
    }

    root.addEventListener("click", handleClick)
    root.addEventListener("input", handleInput)
    return () => {
      root.removeEventListener("click", handleClick)
      root.removeEventListener("input", handleInput)
    }
  }, [currentTime, duration, speed])

  return (
    <div
      ref={frameRef}
      data-diagnostic-hf-root
      className="diagnostic-hf-player relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 shadow-lg"
    >
      {playerLoadFailed || !runtimeReady ? (
        <iframe
          ref={iframeRef}
          src={`${src}?autoplay=1`}
          className="block w-full aspect-video bg-zinc-950"
          title={lang === "ja" ? "診断動画" : "Diagnostic video"}
          allow="autoplay; fullscreen"
        />
      ) : createElement("hyperframes-player", {
        ref: playerRef,
        src,
        autoplay: true,
        muted: true,
        width: "1920",
        height: "1080",
        "playback-rate": String(speed),
        "shader-capture-scale": "1",
        "shader-loading": "player",
        className: "block w-full aspect-video bg-zinc-950",
        style: { width: "100%", aspectRatio: "16 / 9", display: "block" },
      } as Record<string, unknown>)}

      <div className="absolute inset-x-3 top-3 z-20 rounded-2xl border border-white/15 bg-zinc-950/78 px-3 py-3 text-white shadow-2xl backdrop-blur sm:px-4">
        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300">
          <span>{copy.chapters}</span>
          <span className="truncate text-sky-200">
            {copy.now}: {lang === "ja" ? CHAPTERS[activeIndex].ja : CHAPTERS[activeIndex].en}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {CHAPTERS.map((chapter, index) => {
            const active = index === activeIndex
            const label = lang === "ja" ? chapter.ja : chapter.en
            return (
              <button
                key={chapter.key}
                type="button"
                data-chapter-start={chapter.start}
                className={[
                  "group grid min-w-0 gap-1 rounded-xl border px-2 py-2 text-left transition",
                  active
                    ? "border-sky-300 bg-sky-300 text-zinc-950"
                    : "border-white/10 bg-white/8 text-zinc-200 hover:border-sky-200 hover:bg-white/16",
                ].join(" ")}
                aria-label={`${label}${copy.skipTo}`}
              >
                <span className="truncate text-[10px] font-black uppercase tracking-[0.12em] opacity-70">
                  {formatTime(chapter.start)}
                </span>
                <span className="truncate text-xs font-black sm:text-sm">{label}</span>
                <span className={active ? "h-1 rounded-full bg-zinc-950" : "h-1 rounded-full bg-white/18 group-hover:bg-sky-200"} />
              </button>
            )
          })}
        </div>
      </div>

      <div className="absolute inset-x-3 bottom-3 z-20 grid gap-3 rounded-2xl border border-white/15 bg-zinc-950/88 px-3 py-3 text-white shadow-2xl backdrop-blur sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-hf-control="toggle"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-950 transition hover:bg-sky-100"
            aria-label={paused ? copy.play : copy.pause}
            title={paused ? copy.play : copy.pause}
          >
            {paused ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />}
          </button>
          <button
            type="button"
            data-hf-control="replay"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition hover:bg-white/14"
            aria-label={copy.replay}
            title={copy.replay}
          >
            <RotateCcw size={17} aria-hidden />
          </button>
        </div>

        <label className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-xs font-semibold text-zinc-300">
          <span data-hf-current-time>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(1, duration)}
            step={0.1}
            value={Math.min(currentTime, duration)}
            onChange={(event) => seekTo(Number(event.currentTarget.value))}
            data-hf-control="timeline"
            className="h-2 w-full accent-sky-400"
            aria-label={copy.timeline}
          />
          <span data-hf-duration>{formatTime(duration)}</span>
        </label>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            data-hf-control="speed"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 text-sm font-bold text-white transition hover:bg-white/14"
            aria-label={copy.speed}
            title={copy.speed}
          >
            <Gauge size={16} aria-hidden />
            <span data-hf-speed-label>{speed}x</span>
          </button>
          <button
            type="button"
            data-hf-control="fullscreen"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 text-sm font-bold text-white transition hover:bg-white/14"
            aria-label={copy.fullscreen}
            title={copy.fullscreen}
          >
            <Maximize2 size={16} aria-hidden />
            {copy.fullscreen}
          </button>
        </div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
(() => {
  if (window.__diagnosticHfDomControls) return;
  window.__diagnosticHfDomControls = true;
  const speeds = [1, 1.25, 1.5, 2];
  const formatTime = (value) => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
    return Math.floor(safe / 60) + ":" + String(Math.floor(safe % 60)).padStart(2, "0");
  };
  const getTimeline = (root) => {
    const iframe = root.querySelector("iframe");
    try {
      return iframe?.contentWindow?.__timelines?.["diagnostic-report-video"] || null;
    } catch (error) {
      console.error("[diagnostic-report] iframe timeline access failed:", error);
      return null;
    }
  };
  const send = (root, payload) => {
    const iframe = root.querySelector("iframe");
    iframe?.contentWindow?.postMessage({ source: "diagnostic-report-player", ...payload }, "*");
  };
  const sync = (root) => {
    const timeline = getTimeline(root);
    if (!timeline) return;
    const time = Number(timeline.time?.() || 0);
    const duration = Number(timeline.duration?.() || 36);
    const active = Math.max(0, Math.min(4, Math.floor(time / 7)));
    root.querySelector("[data-hf-current-time]").textContent = formatTime(time);
    root.querySelector("[data-hf-duration]").textContent = formatTime(duration);
    const slider = root.querySelector('[data-hf-control="timeline"]');
    if (slider) {
      slider.max = String(duration);
      slider.value = String(Math.min(time, duration));
    }
    root.querySelectorAll("[data-chapter-start]").forEach((button, index) => {
      const isActive = index === active;
      button.classList.toggle("border-sky-300", isActive);
      button.classList.toggle("bg-sky-300", isActive);
      button.classList.toggle("text-zinc-950", isActive);
      button.classList.toggle("border-white/10", !isActive);
      button.classList.toggle("bg-white/8", !isActive);
      button.classList.toggle("text-zinc-200", !isActive);
    });
  };
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-hf-control],[data-chapter-start]") : null;
    if (!target) return;
    const root = target.closest("[data-diagnostic-hf-root]");
    if (!root) return;
    const timeline = getTimeline(root);
    const chapterStart = target.getAttribute("data-chapter-start");
    if (chapterStart !== null) {
      const time = Number(chapterStart);
      timeline?.time?.(time);
      timeline?.play?.();
      send(root, { type: "seek", time });
      send(root, { type: "play" });
      sync(root);
      return;
    }
    const control = target.getAttribute("data-hf-control");
    if (control === "toggle") {
      send(root, { type: "toggle" });
      if (timeline?.paused?.()) timeline.play(); else timeline?.pause?.();
    }
    if (control === "replay") {
      timeline?.time?.(0);
      timeline?.play?.();
      send(root, { type: "replay" });
    }
    if (control === "speed") {
      const current = Number(root.getAttribute("data-hf-speed") || "1");
      const next = speeds[(Math.max(0, speeds.indexOf(current)) + 1) % speeds.length];
      root.setAttribute("data-hf-speed", String(next));
      root.querySelector("[data-hf-speed-label]").textContent = next + "x";
      timeline?.timeScale?.(next);
      send(root, { type: "speed", speed: next });
    }
    sync(root);
  }, true);
  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.getAttribute("data-hf-control") !== "timeline") return;
    const root = target.closest("[data-diagnostic-hf-root]");
    if (!root) return;
    const time = Number(target.value);
    getTimeline(root)?.time?.(time);
    send(root, { type: "seek", time });
    sync(root);
  }, true);
  window.setInterval(() => {
    document.querySelectorAll("[data-diagnostic-hf-root]").forEach(sync);
  }, 250);
})();`,
        }}
      />
    </div>
  )
}
