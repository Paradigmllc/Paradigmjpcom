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

const SPEEDS = [1, 1.25, 1.5, 2] as const

function formatTime(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0
  const minutes = Math.floor(safe / 60)
  const seconds = Math.floor(safe % 60).toString().padStart(2, "0")
  return `${minutes}:${seconds}`
}

export default function ReportHyperFramesPlayer({
  src,
  lang,
}: {
  src: string
  lang: ReportLang
}) {
  const playerRef = useRef<HyperframesPlayerElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [playerLoadFailed, setPlayerLoadFailed] = useState(false)
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
    loadError: lang === "ja" ? "動画プレイヤーの読み込みに失敗しました" : "Video player failed to load",
  }

  useEffect(() => {
    let active = true
    import("@hyperframes/player").catch((error: unknown) => {
      console.error("[diagnostic-report] HyperFrames player failed to load:", error)
      if (active) {
        setPlayerLoadFailed(true)
        toast.error(copy.loadError)
      }
    })
    return () => {
      active = false
    }
  }, [copy.loadError])

  useEffect(() => {
    if (playerLoadFailed) return
    const player = playerRef.current
    if (!player) return

    const syncState = () => {
      setReady(Boolean(player.ready))
      setPaused(Boolean(player.paused))
      setCurrentTime(Number(player.currentTime || 0))
      const nextDuration = Number(player.duration || 0)
      if (nextDuration > 0) setDuration(nextDuration)
    }
    const handleError = (event: Event) => {
      console.error("[diagnostic-report] HyperFrames playback error:", event)
      toast.error(copy.loadError)
    }

    player.addEventListener("ready", syncState)
    player.addEventListener("timeupdate", syncState)
    player.addEventListener("play", syncState)
    player.addEventListener("pause", syncState)
    player.addEventListener("ended", syncState)
    player.addEventListener("error", handleError)

    const interval = window.setInterval(syncState, 250)
    syncState()
    return () => {
      window.clearInterval(interval)
      player.removeEventListener("ready", syncState)
      player.removeEventListener("timeupdate", syncState)
      player.removeEventListener("play", syncState)
      player.removeEventListener("pause", syncState)
      player.removeEventListener("ended", syncState)
      player.removeEventListener("error", handleError)
    }
  }, [copy.loadError, playerLoadFailed])

  async function togglePlayback() {
    const player = playerRef.current
    if (!player) return
    try {
      if (player.paused) {
        await player.play()
      } else {
        player.pause()
      }
    } catch (error) {
      console.error("[diagnostic-report] play toggle failed:", error)
      toast.error(copy.loadError)
    }
  }

  function seekTo(value: number) {
    const player = playerRef.current
    if (!player) return
    player.seek(value)
    setCurrentTime(value)
  }

  function replay() {
    const player = playerRef.current
    if (!player) return
    player.seek(0)
    void player.play()
  }

  function changeSpeed() {
    const player = playerRef.current
    if (!player) return
    const currentIndex = SPEEDS.indexOf(speed)
    const next = SPEEDS[(currentIndex + 1) % SPEEDS.length]
    player.playbackRate = next
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

  return (
    <div ref={frameRef} className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 shadow-lg">
      {playerLoadFailed ? (
        <iframe
          src={`${src}?autoplay=1`}
          className="block w-full aspect-video bg-zinc-950"
          title={lang === "ja" ? "60秒診断動画" : "60-second diagnostic video"}
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
        class: "block w-full aspect-video bg-zinc-950",
        style: { width: "100%", aspectRatio: "16 / 9", display: "block" },
      } as Record<string, unknown>)}

      <div className="grid gap-3 border-t border-white/10 bg-zinc-950 px-3 py-3 text-white sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlayback}
            disabled={!ready && !playerLoadFailed}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-950 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={paused ? copy.play : copy.pause}
            title={paused ? copy.play : copy.pause}
          >
            {paused ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />}
          </button>
          <button
            type="button"
            onClick={replay}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition hover:bg-white/14"
            aria-label={copy.replay}
            title={copy.replay}
          >
            <RotateCcw size={17} aria-hidden />
          </button>
        </div>

        <label className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-xs font-semibold text-zinc-300">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(1, duration)}
            step={0.1}
            value={Math.min(currentTime, duration)}
            onChange={(event) => seekTo(Number(event.currentTarget.value))}
            className="h-2 w-full accent-sky-400"
            aria-label={copy.timeline}
          />
          <span>{formatTime(duration)}</span>
        </label>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={changeSpeed}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 text-sm font-bold text-white transition hover:bg-white/14"
            aria-label={copy.speed}
            title={copy.speed}
          >
            <Gauge size={16} aria-hidden />
            {speed}x
          </button>
          <button
            type="button"
            onClick={openFullscreen}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 text-sm font-bold text-white transition hover:bg-white/14"
            aria-label={copy.fullscreen}
            title={copy.fullscreen}
          >
            <Maximize2 size={16} aria-hidden />
            {copy.fullscreen}
          </button>
        </div>
      </div>
    </div>
  )
}
