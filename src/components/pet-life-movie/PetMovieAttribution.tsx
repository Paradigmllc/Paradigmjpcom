"use client"

import { useEffect } from "react"
import { trackPetMarketingEvent } from "@/lib/pet-life-movie/marketing/client"
import type { PetMarketingEventName, PetMarketingLocale } from "@/lib/pet-life-movie/marketing/types"

export default function PetMovieAttribution({ locale }: { locale: PetMarketingLocale }) {
  useEffect(() => {
    trackPetMarketingEvent("page_view", locale)
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-pet-movie-event]")
        : null
      const eventName = target?.dataset.petMovieEvent as PetMarketingEventName | undefined
      if (eventName) trackPetMarketingEvent(eventName, locale)
    }
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [locale])

  return null
}
