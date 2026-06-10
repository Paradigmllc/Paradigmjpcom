"use client"

import { Gauge, Maximize2, Pause, Play, RotateCcw } from "lucide-react"
import { createElement, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { ReportLang } from "./report-copy"

type HyperframesPlayerElement = HTMLElement & {
  iframeElement?: HTMLIFrameElement
  play: () => Promise<void> | void
  pause: () => void
  seek: (time: number) => void
  currentTime: number
  duration: number
  paused: boolean
  playbackRate: number
}

type GsapTimeline = {
  play: () => void
  pause: () => void
  paused: () => boolean
  time: (value?: number) => number | GsapTimeline
  duration: () => number
  timeScale: (value?: number) => number | GsapTimeline
}

type HyperframesPlayerModule = {
  defineCustomElement?: () => void
}

const SPEEDS = [1, 1.25, 1.5, 2] as const
const CHAPTERS = [
  { start: 0, key: "brief", ja: "要点", en: "Brief" },
  { start: 7, key: "evidence", ja: "根拠", en: "Evidence" },
  { start: 14, key: "loss", ja: "損失", en: "Leakage" },
  { start: 21, key: "future", ja: "改善像", en: "Future" },
  { start: 28, key: "action", ja: "次アクション", en: "Action" },
] as const

function formatTime(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0
  return `${Math.floor(safe / 60)}:${Math.floor(safe % 60).toString().padStart(2, "0")}`
}

function chapterIndex(time: number): number {
  let active = 0
  CHAPTERS.forEach((chapter, index) => {
    if (time >= chapter.start) active = index
  })
  return active
}

function withVideoParams(src: string, params: Record<string, string>): string {
  const [withoutHash, hash = ""] = src.split("#")
  const [path, query = ""] = withoutHash.split("?")
  const search = new URLSearchParams(query)
  Object.entries(params).forEach(([key, value]) => search.set(key, value))
  const suffix = search.toString()
  return `${path}${suffix ? `?${suffix}` : ""}${hash ? `#${hash}` : ""}`
}

export default function ReportHyperFramesPlayer({ src, lang }: { src: string; lang: ReportLang }) {
  const playerRef = useRef<HyperframesPlayerElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const mobileIframeRef = useRef<HTMLIFrameElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [runtimeReady, setRuntimeReady] = useState(false)
  const [runtimeFailed, setRuntimeFailed] = useState(false)
  const [paused, setPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(36)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const [playerPresent, setPlayerPresent] = useState(false)

  const copy = {
    play: lang === "ja" ? "再生" : "Play",
    pause: lang === "ja" ? "一時停止" : "Pause",
    replay: lang === "ja" ? "最初から" : "Replay",
    speed: lang === "ja" ? "倍速" : "Speed",
    fullscreen: lang === "ja" ? "拡大" : "Fullscreen",
    timeline: lang === "ja" ? "再生位置" : "Timeline",
    chapters: lang === "ja" ? "目次" : "Chapters",
    now: lang === "ja" ? "再生中" : "Now",
    loadError: lang === "ja" ? "動画プレイヤーの読み込みに失敗しました" : "Video player failed to load",
  }

  useEffect(() => {
    let active = true
    async function loadRuntime() {
      try {
        if (!customElements.get("hyperframes-player")) {
          const mod = await import("@hyperframes/player") as HyperframesPlayerModule
          if (typeof mod?.defineCustomElement === "function") {
            mod.defineCustomElement()
          }
        }
        const el = customElements.get("hyperframes-player")
        if (active) {
          setRuntimeReady(Boolean(el))
          setPlayerPresent(Boolean(el))
        }
      } catch (error) {
        console.error("[diagnostic-report] HyperFrames player failed to load:", error)
        if (active) {
          setRuntimeFailed(true)
          toast.error(copy.loadError)
        }
      }
    }
    void loadRuntime()
    return () => {
      active = false
    }
  }, [copy.loadError])

  function targetIframe(): HTMLIFrameElement | null {
    if (window.matchMedia("(max-width: 640px)").matches) return mobileIframeRef.current ?? playerRef.current?.iframeElement ?? iframeRef.current
    return playerRef.current?.iframeElement ?? iframeRef.current
  }

  function timeline(): GsapTimeline | null {
    try {
      const timelines = (targetIframe()?.contentWindow as { __timelines?: Record<string, GsapTimeline> } | null)?.__timelines
      return timelines?.["diagnostic-report-video"] ?? null
    } catch (error) {
      console.error("[diagnostic-report] iframe timeline access failed:", error)
      return null
    }
  }

  function post(command: Record<string, unknown>) {
    targetIframe()?.contentWindow?.postMessage({ source: "diagnostic-report-player", ...command }, "*")
  }

  useEffect(() => {
    const player = playerRef.current
    const sync = () => {
      const tl = timeline()
      if (tl) {
        setPaused(tl.paused())
        setCurrentTime(Number(tl.time() || 0))
        if (Number(tl.duration() || 0) > 0) setDuration(Number(tl.duration()))
        return
      }
      if (player) {
        setPaused(Boolean(player.paused))
        setCurrentTime(Number(player.currentTime || 0))
        if (Number(player.duration || 0) > 0) setDuration(Number(player.duration))
      }
    }
    const interval = window.setInterval(sync, 250)
    player?.addEventListener("ready", sync)
    player?.addEventListener("timeupdate", sync)
    player?.addEventListener("play", sync)
    player?.addEventListener("pause", sync)
    player?.addEventListener("ratechange", sync)
    sync()
    return () => {
      window.clearInterval(interval)
      player?.removeEventListener("ready", sync)
      player?.removeEventListener("timeupdate", sync)
      player?.removeEventListener("play", sync)
      player?.removeEventListener("pause", sync)
      player?.removeEventListener("ratechange", sync)
    }
  }, [runtimeReady, runtimeFailed])

  async function togglePlayback() {
    try {
      const player = playerRef.current
      const tl = timeline()
      if (tl) {
        if (tl.paused()) {
          tl.play()
          post({ type: "play" })
          if (player) await player.play()
          setPaused(false)
        } else {
          tl.pause()
          post({ type: "pause" })
          if (player) player.pause()
          setPaused(true)
        }
        return
      }
      if (player) {
        if (player.paused) await player.play()
        else player.pause()
        setPaused(Boolean(player.paused))
      }
    } catch (error) {
      console.error("[diagnostic-report] play toggle failed:", error)
      toast.error(copy.loadError)
    }
  }

  function seekTo(time: number, shouldPlay = false) {
    const next = Math.max(0, Math.min(duration, time))
    const player = playerRef.current
    const tl = timeline()
    if (tl) {
      tl.time(next)
      if (shouldPlay) tl.play()
      post({ type: "seek", time: next })
      if (shouldPlay) post({ type: "play" })
      if (shouldPlay) setPaused(false)
    }
    if (player) {
      player.seek(next)
      if (shouldPlay) void player.play()
      setPaused(!shouldPlay)
    }
    setCurrentTime(next)
  }

  function replay() {
    seekTo(0, true)
    post({ type: "replay" })
  }

  function changeSpeed() {
    const index = SPEEDS.indexOf(speed)
    const next = SPEEDS[(index + 1) % SPEEDS.length]
    timeline()?.timeScale(next)
    post({ type: "speed", speed: next })
    if (playerRef.current) playerRef.current.playbackRate = next
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

  const activeChapter = chapterIndex(currentTime)
  const mobileSrc = withVideoParams(src, { mobile: "1", autoplay: "1" })
  const desktopAutoplaySrc = withVideoParams(src, { autoplay: "1" })

  return (
    <div ref={frameRef} data-diagnostic-hf-root data-hf-speed={speed} data-mobile-video="responsive" className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 shadow-lg">
      <iframe ref={mobileIframeRef} src={mobileSrc} className="mx-auto block aspect-[9/16] max-h-[78vh] w-full max-w-[430px] bg-zinc-950 sm:hidden" title={lang === "ja" ? "診断動画" : "Diagnostic video"} allow="autoplay; fullscreen; picture-in-picture" />
      <div className="hidden sm:block">
      {runtimeReady && playerPresent && !runtimeFailed ? createElement("hyperframes-player", {
        ref: playerRef,
        src,
        controls: "",
        autoplay: "",
        muted: "",
        playsinline: "",
        width: "1920",
        height: "1080",
        "playback-rate": String(speed),
        "speed-presets": SPEEDS.join(","),
        className: "block w-full aspect-video bg-zinc-950",
        style: { width: "100%", aspectRatio: "16 / 9", display: "block" },
      } as Record<string, unknown>) : (
        <iframe ref={iframeRef} src={desktopAutoplaySrc} className="block w-full aspect-video bg-zinc-950" title={lang === "ja" ? "診断動画" : "Diagnostic video"} allow="autoplay; fullscreen; picture-in-picture" />
      )}
      </div>

      <div className="relative z-20 rounded-xl border border-white/15 bg-zinc-950 px-2 py-2 text-white shadow-2xl sm:absolute sm:inset-x-3 sm:top-3 sm:rounded-2xl sm:bg-zinc-950/78 sm:px-4 sm:py-3 sm:backdrop-blur">
        <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-300 sm:mb-2 sm:text-[11px] sm:tracking-[0.18em]">
          <span>{copy.chapters}</span>
          <span className="truncate text-sky-200">{copy.now}: <span data-hf-active-chapter>{lang === "ja" ? CHAPTERS[activeChapter].ja : CHAPTERS[activeChapter].en}</span></span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:gap-2 sm:overflow-visible sm:pb-0">
          {CHAPTERS.map((chapter, index) => {
            const active = index === activeChapter
            const label = lang === "ja" ? chapter.ja : chapter.en
            return (
              <button key={chapter.key} type="button" data-chapter-start={chapter.start} data-chapter-label={label} onClick={() => seekTo(chapter.start, true)} aria-label={`${label}${lang === "ja" ? "へスキップ" : " skip"}`} className={["grid min-w-[84px] gap-0.5 rounded-lg border px-2 py-1.5 text-left transition sm:min-w-0 sm:gap-1 sm:rounded-xl sm:py-2", active ? "border-sky-300 bg-sky-300 text-zinc-950" : "border-white/10 bg-white/8 text-zinc-200 hover:border-sky-200 hover:bg-white/16"].join(" ")}>
                <span className="truncate text-[9px] font-black uppercase tracking-[0.1em] opacity-70 sm:text-[10px] sm:tracking-[0.12em]">{formatTime(chapter.start)}</span>
                <span className="truncate text-[11px] font-black sm:text-sm">{label}</span>
                <span className={active ? "h-1 rounded-full bg-zinc-950" : "h-1 rounded-full bg-white/18"} />
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative z-20 flex flex-col gap-3 rounded-xl border border-white/15 bg-zinc-950 px-3 py-3 text-white shadow-2xl sm:absolute sm:inset-x-3 sm:bottom-3 sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-3 sm:rounded-2xl sm:bg-zinc-950/88 sm:px-4 sm:py-3 sm:backdrop-blur">
        <div className="relative z-30 flex items-center gap-2">
          <button type="button" data-hf-control="toggle" onClick={togglePlayback} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-950 transition hover:bg-sky-100" aria-label={paused ? copy.play : copy.pause} title={paused ? copy.play : copy.pause}>
            {paused ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />}
          </button>
          <button type="button" data-hf-control="replay" onClick={replay} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition hover:bg-white/14" aria-label={copy.replay} title={copy.replay}>
            <RotateCcw size={17} aria-hidden />
          </button>
        </div>
        <label className="relative z-10 grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-[11px] font-semibold text-zinc-300 sm:text-xs">
          <span data-hf-current-time>{formatTime(currentTime)}</span>
          <input type="range" min={0} max={Math.max(1, duration)} step={0.1} value={Math.min(currentTime, duration)} data-hf-control="timeline" onChange={(event) => seekTo(Number(event.currentTarget.value))} className="h-2 w-full accent-sky-400" aria-label={copy.timeline} />
          <span data-hf-duration>{formatTime(duration)}</span>
        </label>
        <div className="relative z-30 flex items-center justify-end gap-2">
          <button type="button" data-hf-control="speed" onClick={changeSpeed} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 text-sm font-bold text-white transition hover:bg-white/14" aria-label={copy.speed} title={copy.speed}>
            <Gauge size={16} aria-hidden /> <span data-hf-speed-label>{speed}x</span>
          </button>
          <button type="button" data-hf-control="fullscreen" onClick={openFullscreen} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/8 text-sm font-bold text-white transition hover:bg-white/14 sm:w-auto sm:px-3" aria-label={copy.fullscreen} title={copy.fullscreen}>
            <Maximize2 size={16} aria-hidden /> <span className="hidden sm:inline">{copy.fullscreen}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
