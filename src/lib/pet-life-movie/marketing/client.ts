"use client"

import type { PetMarketingEventName, PetMarketingLocale } from "./types"

const ANONYMOUS_ID_KEY = "pet_movie_marketing_anon_id"
const ATTRIBUTION_KEY = "pet_movie_marketing_attribution"

type StoredAttribution = {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
}

function anonymousId(): string {
  const existing = window.localStorage.getItem(ANONYMOUS_ID_KEY)
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing
  const created = crypto.randomUUID()
  window.localStorage.setItem(ANONYMOUS_ID_KEY, created)
  return created
}

function currentAttribution(): StoredAttribution {
  const params = new URLSearchParams(window.location.search)
  const fromUrl: StoredAttribution = {
    utmSource: params.get("utm_source")?.slice(0, 100) || undefined,
    utmMedium: params.get("utm_medium")?.slice(0, 100) || undefined,
    utmCampaign: params.get("utm_campaign")?.slice(0, 150) || undefined,
    utmContent: params.get("utm_content")?.slice(0, 150) || undefined,
  }
  if (Object.values(fromUrl).some(Boolean)) {
    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(fromUrl))
    return fromUrl
  }
  try {
    const stored: unknown = JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_KEY) ?? "{}")
    return stored && typeof stored === "object" ? stored as StoredAttribution : {}
  } catch (error) {
    console.warn("[pet-marketing] stored attribution could not be parsed", error)
    return {}
  }
}

export function trackPetMarketingEvent(
  eventName: PetMarketingEventName,
  locale: PetMarketingLocale,
): void {
  if (typeof window === "undefined") return
  const attribution = currentAttribution()
  void fetch("/api/pet-life-movie/marketing/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      eventName,
      anonymousId: anonymousId(),
      locale,
      path: `${window.location.pathname}${window.location.search}`.slice(0, 300),
      referrer: document.referrer || undefined,
      ...attribution,
    }),
  }).then((response) => {
    if (!response.ok) console.warn(`[pet-marketing] ${eventName} tracking returned ${response.status}`)
  }).catch((error: unknown) => {
    console.warn(`[pet-marketing] ${eventName} tracking failed`, error)
  })
}
