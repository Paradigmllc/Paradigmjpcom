"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Pause, PawPrint, Play } from "lucide-react"
import { resolvePetMovieTemplate } from "@/lib/pet-life-movie/templates"
import type { PetMovieStoryboard } from "@/lib/pet-life-movie/types"

interface Props {
  storyboard: PetMovieStoryboard
  assetUrls: Record<string, string>
  watermark?: boolean
  className?: string
}

const labels = {
  ja: { empty: "シーンがありません", play: "プレビューを再生", pause: "プレビューを一時停止", scene: "シーン" },
  en: { empty: "No scenes", play: "Play preview", pause: "Pause preview", scene: "Scene" },
  es: { empty: "No hay escenas", play: "Reproducir vista previa", pause: "Pausar vista previa", scene: "Escena" },
  pt: { empty: "Não há cenas", play: "Reproduzir prévia", pause: "Pausar prévia", scene: "Cena" },
} as const

export default function PetMoviePreview({ storyboard, assetUrls, watermark = true, className = "" }: Props) {
  const [sceneIndex, setSceneIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = useReducedMotion()
  const scene = storyboard.scenes[sceneIndex]
  const copy = labels[storyboard.locale]
  const template = resolvePetMovieTemplate(storyboard.templateId)

  useEffect(() => {
    if (storyboard.scenes.length < 2 || paused || reducedMotion) return
    const timer = window.setInterval(() => {
      setSceneIndex((current) => (current + 1) % storyboard.scenes.length)
    }, Math.max(1, scene?.durationSeconds ?? 2) * 1000)
    return () => window.clearInterval(timer)
  }, [paused, reducedMotion, scene?.durationSeconds, storyboard.scenes.length])

  const imageMotion = useMemo(() => {
    if (scene?.motion === "pan_left") return { scale: [1.08, 1.13], x: [12, -12], rotate: [-0.15, 0.1] }
    if (scene?.motion === "pan_right") return { scale: [1.08, 1.13], x: [-12, 12], rotate: [0.15, -0.1] }
    if (scene?.motion === "parallax") return { scale: [1.04, 1.1], y: [8, -8], rotate: [-0.2, 0.2] }
    return { scale: [1.015, 1.11], x: [0, 0], rotate: [0, 0] }
  }, [scene?.motion])

  if (!scene) {
    return <div className={`grid aspect-[9/16] place-items-center bg-[#17131A] text-stone-400 ${className}`}>{copy.empty}</div>
  }
  const src = assetUrls[scene.assetId]
  const playful = template.id === "playful-scrapbook"
  const cinematic = template.id === "cinematic-tribute"
  const transition = template.transition === "paper-reveal"
    ? { clipPath: ["inset(8% 8% 86% 8% round 18px)", "inset(0% 0% 0% 0% round 0px)"], rotate: [-1.4, 0], opacity: [0, 1] }
    : template.transition === "light-leak"
      ? { opacity: [0, 1], filter: ["blur(22px) brightness(1.55)", "blur(0px) brightness(1)"] }
      : { opacity: [0, 1], filter: ["blur(18px)", "blur(0px)"], scale: [1.03, 1] }

  return (
    <div className={`relative isolate aspect-[9/16] overflow-hidden rounded-[2rem] shadow-2xl ${className}`} style={{ backgroundColor: template.canvas }}>
      <AnimatePresence initial={false} mode="sync">
        <motion.section
          key={scene.id}
          className="absolute inset-0 overflow-hidden"
          initial={reducedMotion ? { opacity: 0 } : Object.fromEntries(Object.entries(transition).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]))}
          animate={reducedMotion ? { opacity: 1 } : Object.fromEntries(Object.entries(transition).map(([key, value]) => [key, Array.isArray(value) ? value[1] : value]))}
          exit={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0.15 : template.transitionSeconds, ease: cinematic ? [0.37, 0, 0.2, 1] : [0.16, 1, 0.3, 1] }}
        >
          {src ? (
            <>
              <Image src={src} alt="" fill sizes="(max-width: 768px) 92vw, 380px" className="scale-125 object-cover opacity-60 blur-2xl saturate-75" unoptimized aria-hidden="true" />
              <motion.div className={`absolute overflow-hidden ${playful ? "inset-4 rotate-[-.7deg] border-[7px] border-[#F7F1E8] shadow-2xl" : "inset-0"}`} animate={paused || reducedMotion ? undefined : imageMotion} transition={{ duration: scene.durationSeconds, ease: "linear" }}>
                <Image src={src} alt={`${storyboard.title} — ${scene.caption}`} fill sizes="(max-width: 768px) 92vw, 380px" className={`object-cover ${cinematic ? "saturate-[.86] contrast-[1.04]" : ""}`} unoptimized />
              </motion.div>
            </>
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-[#17131A] text-white/60"><PawPrint className="h-14 w-14" aria-hidden="true" /></div>
          )}
          <div className={`absolute inset-0 ${cinematic ? "bg-[radial-gradient(circle_at_50%_42%,transparent_20%,rgba(23,19,26,.2)_58%,rgba(23,19,26,.9)_100%)]" : "bg-gradient-to-b from-[#17131A]/10 via-transparent to-[#17131A]/80"}`} />
          <div className="absolute inset-x-[9%] top-[9%] h-0.5 origin-left" style={{ backgroundColor: template.accent }} />
          <motion.div initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.24, duration: 0.42 }} className="absolute right-[9%] top-[11%] font-mono text-[10px] font-bold tracking-[.18em] text-[#F7F1E8] drop-shadow-lg">
            {String(sceneIndex + 1).padStart(2, "0")} / {String(storyboard.scenes.length).padStart(2, "0")}
          </motion.div>
          <div className="absolute inset-x-[9%] bottom-[14%] text-[#F7F1E8]">
            <motion.p initial={{ opacity: 0, y: 30, letterSpacing: ".01em" }} animate={{ opacity: 1, y: 0, letterSpacing: "-.02em" }} transition={{ delay: 0.3, duration: 0.68, ease: [0.16, 1, 0.3, 1] }} className={`max-w-[92%] rounded-xl border px-4 py-3 font-serif text-lg font-bold leading-relaxed ${playful ? "border-[#E8A838] bg-[#F7F1E8]/95 text-[#2B202A] shadow-[6px_7px_0_#E8A838]" : "border-white/15 bg-[#17131A]/70 shadow-2xl backdrop-blur-md"}`}>
              {scene.caption}
            </motion.p>
          </div>
        </motion.section>
      </AnimatePresence>

      <div className="absolute left-[9%] top-[11%] max-w-[62%] truncate rounded-full bg-[#17131A]/45 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-[#F7F1E8] backdrop-blur-md">{storyboard.title}</div>
      {watermark && <div className="absolute bottom-3 right-4 flex items-center gap-1 text-[9px] font-medium text-white/70"><PawPrint className="h-3 w-3" aria-hidden="true" /> Pet Life Movie preview</div>}
      {storyboard.scenes.length > 1 && (
        <button type="button" onClick={() => setPaused((value) => !value)} className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-[#17131A]/55 text-white backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label={paused ? copy.play : copy.pause}>
          {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
        </button>
      )}
      <div className="absolute inset-x-5 bottom-8 flex gap-1" aria-label={`${copy.scene} ${sceneIndex + 1} / ${storyboard.scenes.length}`}>
        {storyboard.scenes.map((item, index) => (
          <button key={item.id} type="button" onClick={() => setSceneIndex(index)} aria-label={`${copy.scene} ${index + 1}`} className="h-5 flex-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <span className={`block h-0.5 rounded-full ${index <= sceneIndex ? "bg-white" : "bg-white/30"}`} />
          </button>
        ))}
      </div>
    </div>
  )
}
