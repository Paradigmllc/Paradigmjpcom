import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { recordPetMarketingAttribution } from "@/lib/pet-life-movie/marketing/attribution"
import { petMarketingAttributionSchema } from "@/lib/pet-life-movie/marketing/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit({
    ip: getClientIp(request),
    key: "pet-movie-marketing-track",
    max: 90,
    windowMs: 60_000,
  })
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Rate limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          "Cache-Control": "no-store",
        },
      },
    )
  }
  try {
    const input = petMarketingAttributionSchema.parse(await request.json())
    await recordPetMarketingAttribution(input)
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("[pet-marketing-track] event rejected", error)
    return NextResponse.json(
      { ok: false, error: "Invalid marketing event" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    )
  }
}
