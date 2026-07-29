"use client"

import Image from "next/image"
import { usePathname } from "next/navigation"
import { motion, useReducedMotion } from "framer-motion"
import { Film, Layers3, Play, Route } from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { resolveMarketingVisualProfile, type MarketingVisualProfile } from "./marketing-visual-content"

function CompactInformationMap({ profile }: { profile: MarketingVisualProfile }) {
  const slide = profile.slides[0]

  return (
    <section
      className="border-y border-paradigm-line bg-paradigm-paper px-5 py-14 sm:px-8 sm:py-16"
      aria-labelledby="information-map-title"
      data-marketing-visuals="compact"
    >
      <div className="mx-auto grid max-w-[1180px] gap-8 md:grid-cols-[0.72fr_1.28fr] md:items-center lg:gap-14">
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-paradigm-line bg-white">
          <Image src={slide.src} alt={slide.alt} fill sizes="(max-width: 768px) 100vw, 42vw" className="object-cover" />
        </div>
        <div>
          <p className="paradigm-eyebrow text-paradigm-accent">{profile.eyebrow}</p>
          <h2 id="information-map-title" className="mt-4 max-w-2xl font-display text-3xl leading-tight text-paradigm-ink sm:text-4xl">
            {profile.title}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-paradigm-ink-soft">{profile.description}</p>
          <ol className="mt-7 grid gap-3 sm:grid-cols-3">
            {profile.process.map((row) => (
              <li key={row.phase} className="rounded-xl border border-paradigm-line bg-white p-4">
                <p className="text-xs font-semibold text-paradigm-accent">{row.phase}</p>
                <p className="mt-2 text-sm font-medium text-paradigm-ink">{row.focus}</p>
                <p className="mt-1 text-xs leading-5 text-paradigm-ink-mute">{row.output}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function VisualCarousel({ profile }: { profile: MarketingVisualProfile }) {
  return (
    <Carousel
      opts={{ align: "start", loop: true }}
      className="group"
      aria-label={profile.carouselLabel}
      data-testid="marketing-visual-carousel"
    >
      <CarouselContent className="-ml-4">
        {profile.slides.map((slide, index) => (
          <CarouselItem key={slide.src} className="basis-[88%] pl-4 sm:basis-[62%] lg:basis-[46%]">
            <article className="overflow-hidden rounded-2xl border border-paradigm-line bg-white">
              <div className="relative aspect-[16/10] overflow-hidden bg-paradigm-surface">
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  sizes="(max-width: 640px) 88vw, (max-width: 1024px) 60vw, 40vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
                <span className="absolute left-4 top-4 rounded-full bg-paradigm-ink/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                  {String(index + 1).padStart(2, "0")} / {String(profile.slides.length).padStart(2, "0")}
                </span>
              </div>
              <div className="min-h-44 p-5 sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-paradigm-accent">{slide.label}</p>
                <h3 className="mt-3 font-display text-xl leading-tight text-paradigm-ink sm:text-2xl">{slide.title}</h3>
                <p className="mt-3 text-sm leading-7 text-paradigm-ink-soft">{slide.body}</p>
              </div>
            </article>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious
        aria-label={profile.previousLabel}
        className="left-3 top-[39%] h-11 w-11 border-paradigm-line bg-white/95 text-paradigm-ink shadow-lg sm:left-5"
      />
      <CarouselNext
        aria-label={profile.nextLabel}
        className="right-3 top-[39%] h-11 w-11 border-paradigm-line bg-white/95 text-paradigm-ink shadow-lg sm:right-5"
      />
    </Carousel>
  )
}

function Showreel({ profile }: { profile: MarketingVisualProfile }) {
  const label = profile.locale === "ja" ? "Paradigmの制作・実行システム ショーリール" : "Paradigm delivery system showreel"
  const note = profile.locale === "ja" ? "12秒 / 音声なし / 再生操作対応" : "12 sec / silent / playback controls"

  return (
    <div className="overflow-hidden rounded-2xl border border-paradigm-line bg-paradigm-ink p-2 shadow-[0_28px_80px_-45px_rgba(15,17,21,0.8)]">
      <div className="relative overflow-hidden rounded-xl bg-paradigm-ink">
        <video
          className="aspect-video w-full object-cover"
          controls
          muted
          loop
          playsInline
          preload="metadata"
          poster="/visuals/brand/execution-studio.webp"
          aria-label={label}
          data-testid="marketing-showreel"
        >
          <source src="/visuals/brand/paradigm-showreel.mp4" type="video/mp4" />
        </video>
        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full bg-paradigm-ink/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-white backdrop-blur-sm">
          <Play className="h-3 w-3 fill-current" aria-hidden />
          Showreel
        </div>
      </div>
      <p className="px-3 py-3 text-[11px] text-white/65">{note}</p>
    </div>
  )
}

function ProcessTable({ profile }: { profile: MarketingVisualProfile }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-paradigm-line bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-paradigm-line px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Route className="h-4 w-4 text-paradigm-accent" aria-hidden />
          <h3 className="text-sm font-semibold text-paradigm-ink">{profile.tableCaption}</h3>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-paradigm-ink-mute">
          {profile.process.length} phases
        </span>
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-left" data-testid="marketing-process-table">
          <caption className="sr-only">{profile.tableCaption}</caption>
          <thead>
            <tr className="bg-paradigm-surface text-[10px] uppercase tracking-[0.13em] text-paradigm-ink-mute">
              {profile.tableHeaders.map((header) => (
                <th key={header} scope="col" className="border-b border-paradigm-line px-5 py-3 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profile.process.map((row) => (
              <tr key={row.phase} className="border-b border-paradigm-line last:border-b-0">
                <th scope="row" className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-paradigm-ink">
                  {row.phase}
                </th>
                <td className="px-5 py-4 text-sm text-paradigm-ink-soft">{row.focus}</td>
                <td className="px-5 py-4 text-sm text-paradigm-ink-soft">{row.output}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ol className="divide-y divide-paradigm-line sm:hidden">
        {profile.process.map((row) => (
          <li key={row.phase} className="p-5">
            <p className="text-xs font-semibold text-paradigm-accent">{row.phase}</p>
            <p className="mt-2 text-sm font-medium text-paradigm-ink">{row.focus}</p>
            <p className="mt-1 text-sm text-paradigm-ink-mute">{row.output}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function MarketingVisualShowcase() {
  const pathname = usePathname()
  const profile = resolveMarketingVisualProfile(pathname)
  const reducedMotion = useReducedMotion()
  if (!profile) return null
  if (profile.compact) return <CompactInformationMap profile={profile} />

  return (
    <section
      className="relative overflow-hidden border-y border-paradigm-line bg-paradigm-surface px-5 py-20 sm:px-8 sm:py-24 lg:px-10"
      aria-labelledby="marketing-visual-showcase-title"
      data-marketing-visuals={profile.kind}
    >
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(15,17,21,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,17,21,.045)_1px,transparent_1px)] [background-size:64px_64px]" />
      <motion.div
        className="relative mx-auto max-w-[1180px]"
        initial={reducedMotion ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <div className="flex items-center gap-3 text-paradigm-accent">
              {profile.kind === "video" ? <Film className="h-4 w-4" aria-hidden /> : <Layers3 className="h-4 w-4" aria-hidden />}
              <p className="paradigm-eyebrow">{profile.eyebrow}</p>
            </div>
            <h2 id="marketing-visual-showcase-title" className="mt-5 max-w-3xl font-display text-4xl leading-[1.08] text-paradigm-ink sm:text-5xl">
              {profile.title}
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-8 text-paradigm-ink-soft sm:text-base">{profile.description}</p>
        </div>

        <div className="mt-10">{profile.showVideo ? <Showreel profile={profile} /> : <VisualCarousel profile={profile} />}</div>
        {profile.showVideo && <div className="mt-10"><VisualCarousel profile={profile} /></div>}
        <div className="mt-10"><ProcessTable profile={profile} /></div>
      </motion.div>
    </section>
  )
}
