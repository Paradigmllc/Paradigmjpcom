"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Pause, PawPrint, Play } from "lucide-react"
import type { PetMovieStoryboard } from "@/lib/pet-life-movie/types"

interface Props {
  storyboard: PetMovieStoryboard
  assetUrls: Record<string, string>
  watermark?: boolean
  className?: string
}

export default function PetMoviePreview({ storyboard, assetUrls, watermark = true, className = "" }: Props) {
  const [sceneIndex, setSceneIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = useReducedMotion()
  const scene = storyboard.scenes[sceneIndex]
  const labels = {
    ja: { empty: "シーンがありません", play: "プレビューを再生", pause: "プレビューを一時停止", scene: "シーン" },
    en: { empty: "No scenes", play: "Play preview", pause: "Pause preview", scene: "Scene" },
    es: { empty: "No hay escenas", play: "Reproducir vista previa", pause: "Pausar vista previa", scene: "Escena" },
    pt: { empty: "Não há cenas", play: "Reproduzir prévia", pause: "Pausar prévia", scene: "Cena" },
  }[storyboard.locale]

  useEffect(() => {
    if (storyboard.scenes.length < 2 || paused || reducedMotion) return
    const timer = window.setInterval(() => {
      setSceneIndex((current) => (current + 1) % storyboard.scenes.length)
    }, Math.max(1, scene?.durationSeconds ?? 2) * 1000)
    return () => window.clearInterval(timer)
  }, [paused, reducedMotion, scene?.durationSeconds, storyboard.scenes.length])

  if (!scene) {
    return <div className={`grid aspect-[9/16] place-items-center bg-paradigm-paper-deep text-paradigm-ink-mute ${className}`}>{labels.empty}</div>
  }
  const src = assetUrls[scene.assetId]
  const imageMotion = scene.motion === "pan_left"
    ? { scale: [1.08, 1.12], x: [10, -10] }
    : scene.motion === "pan_right"
      ? { scale: [1.08, 1.12], x: [-10, 10] }
      : { scale: [1.02, 1.12], x: [0, 0] }

  return (
    <div className={`relative isolate aspect-[9/16] overflow-hidden rounded-[2rem] bg-[#121018] shadow-2xl ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={scene.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55 }}
        >
          {src ? (
            <motion.div className="absolute inset-0" animate={paused || reducedMotion ? undefined : imageMotion} transition={{ duration: scene.durationSeconds, ease: "easeInOut" }}>
              <Image src={src} alt={`${storyboard.title} - ${scene.caption}`} fill sizes="(max-width: 768px) 92vw, 380px" className="object-cover" unoptimized />
            </motion.div>
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-violet-950 to-stone-950 text-white/60">
              <PawPrint className="h-14 w-14" aria-hidden="true" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" />
          <div className="absolute inset-x-0 bottom-0 p-6 pb-10 text-center text-white">
            <p className="text-lg font-semibold leading-relaxed drop-shadow-lg">{scene.caption}</p>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="absolute left-5 top-5 rounded-full bg-black/35 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
        {storyboard.title}
      </div>
      {watermark && (
        <div className="absolute bottom-3 right-4 flex items-center gap-1 text-[10px] font-medium text-white/70">
          <PawPrint className="h-3 w-3" aria-hidden="true" /> Pet Life Movie preview
        </div>
      )}
      {storyboard.scenes.length > 1 && <button type="button" onClick={() => setPaused((value) => !value)} className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label={paused ? labels.play : labels.pause}>{paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}</button>}
      <div className="absolute inset-x-5 top-16 flex gap-1" aria-label={`${labels.scene} ${sceneIndex + 1} / ${storyboard.scenes.length}`}>
        {storyboard.scenes.map((item, index) => (
          <span key={item.id} className={`h-0.5 flex-1 rounded-full ${index <= sceneIndex ? "bg-white" : "bg-white/30"}`} />
        ))}
      </div>
    </div>
  )
}

