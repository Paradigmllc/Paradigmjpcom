"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"

type LocaleVariant = "en" | "ja"

export type VisualContextSlide = {
  title: string
  body: string
  alt: string
}

export type VisualContextCopy = {
  eyebrow: string
  title: string
  desc: string
  slides: VisualContextSlide[]
  previous: string
  next: string
  slideLabel: string
  disclosure: string
}

const IMAGES = [
  {
    src: "/visuals/operator-context-person.jpg",
    credit: "Pexels · RDNE Stock project",
  },
  {
    src: "/visuals/operator-context-team.jpg",
    credit: "Pexels · Mizuno K",
  },
  {
    src: "/visuals/operator-context-whiteboard.jpg",
    credit: "Pexels · Thirdman",
  },
] as const

function useSlideIndex(api: CarouselApi | undefined) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!api) return

    const updateCurrent = () => setCurrent(api.selectedScrollSnap())
    updateCurrent()
    api.on("select", updateCurrent)
    api.on("reInit", updateCurrent)

    return () => {
      api.off("select", updateCurrent)
      api.off("reInit", updateCurrent)
    }
  }, [api])

  return current
}

export default function JapanEntryVisualContext({
  locale,
  copy,
}: {
  locale: LocaleVariant
  copy: VisualContextCopy
}) {
  const [api, setApi] = useState<CarouselApi>()
  const current = useSlideIndex(api)
  const slides = copy.slides.length > 0 ? copy.slides : []

  if (slides.length === 0) return null

  const goToSlide = (index: number) => api?.scrollTo(index)

  return (
    <section
      className="relative overflow-hidden border-y border-zinc-200 bg-white px-5 py-16 sm:px-8 sm:py-20 lg:px-12"
      aria-labelledby="visual-context-title"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{copy.eyebrow}</p>
          <h2 id="visual-context-title" className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-zinc-950 sm:text-5xl">
            {copy.title}
          </h2>
          <p className="mt-5 text-sm leading-7 text-zinc-600 sm:text-base">{copy.desc}</p>
          <p className="mt-6 text-xs leading-6 text-zinc-500">{copy.disclosure}</p>
        </div>

        <Carousel
          setApi={setApi}
          opts={{ loop: true, align: "start" }}
          className="group rounded-3xl border border-zinc-200 bg-zinc-50 p-2 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.55)] sm:p-3"
          aria-label={locale === "ja" ? "運用の雰囲気スライダー" : "Operating context slider"}
        >
          <CarouselContent className="-ml-0">
            {slides.map((slide, index) => {
              const image = IMAGES[index % IMAGES.length]
              return (
                <CarouselItem key={`${slide.title}-${index}`} className="pl-0">
                  <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                    <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100">
                      <Image
                        src={image.src}
                        alt={slide.alt}
                        fill
                        priority={index === 0}
                        sizes="(max-width: 1024px) 100vw, 58vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                      />
                      <span className="absolute bottom-3 right-3 rounded-full bg-zinc-950/75 px-2.5 py-1 text-[10px] font-medium tracking-wide text-white backdrop-blur-sm">
                        {image.credit}
                      </span>
                    </div>
                    <div className="p-5 sm:p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                        {copy.slideLabel.replace("{current}", String(index + 1)).replace("{total}", String(slides.length))}
                      </p>
                      <h3 className="mt-3 text-xl font-semibold tracking-tight text-zinc-950">{slide.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-zinc-600">{slide.body}</p>
                    </div>
                  </article>
                </CarouselItem>
              )
            })}
          </CarouselContent>

          <CarouselPrevious
            aria-label={copy.previous}
            className="left-4 top-[42%] h-10 w-10 border-zinc-200 bg-white/95 text-zinc-950 opacity-0 shadow-md transition-opacity group-hover:opacity-100 focus-visible:opacity-100 sm:left-6"
          />
          <CarouselNext
            aria-label={copy.next}
            className="right-4 top-[42%] h-10 w-10 border-zinc-200 bg-white/95 text-zinc-950 opacity-0 shadow-md transition-opacity group-hover:opacity-100 focus-visible:opacity-100 sm:right-6"
          />

          <div className="mt-4 flex items-center justify-center gap-2" role="tablist" aria-label={copy.slideLabel}>
            {slides.map((slide, index) => (
              <button
                key={`dot-${slide.title}-${index}`}
                type="button"
                role="tab"
                aria-label={copy.slideLabel.replace("{current}", String(index + 1)).replace("{total}", String(slides.length))}
                aria-selected={current === index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
                  current === index ? "w-7 bg-blue-700" : "w-2 bg-zinc-300 hover:bg-zinc-500",
                )}
              />
            ))}
          </div>
        </Carousel>
      </div>
    </section>
  )
}
