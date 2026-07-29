import { NextResponse } from "next/server"

const INTERNAL_ORIGIN_HOSTS = new Set(["0.0.0.0", "127.0.0.1", "localhost"])

export function relativeRedirect(location: string, status = 307): NextResponse {
  if (!location.startsWith("/") || location.startsWith("//")) {
    throw new Error(`Relative redirect must use a same-origin path: ${location}`)
  }
  return new NextResponse(null, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Location: location,
    },
  })
}

export function normalizeSameOriginLocation(location: string | null): string | null {
  if (!location) return null
  if (location.startsWith("/") && !location.startsWith("//")) return location

  let parsed: URL
  try {
    parsed = new URL(location)
  } catch {
    return null
  }
  if (!INTERNAL_ORIGIN_HOSTS.has(parsed.hostname)) return null
  return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/"
}
