import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { recordContentAccess } from "@/lib/content-commerce/catalog"
import { captureException } from "@/lib/error-monitor"
import { listInvestorScenarios } from "@/lib/investor-scenarios/repository"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PUBLIC_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
  "Content-Language": "en",
  Vary: "Accept",
} as const

const querySchema = z.object({
  market: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  strategy: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  profile: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit({ ip, key: "investor-scenario-catalog", max: 120, windowMs: 60_000 })
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many investor scenario requests." } },
      { status: 429, headers: { ...PUBLIC_HEADERS, "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1_000)) } },
    )
  }

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_QUERY", message: parsed.error.issues[0]?.message ?? "The query is invalid." } },
      { status: 400, headers: PUBLIC_HEADERS },
    )
  }

  try {
    const result = await listInvestorScenarios({
      marketSlug: parsed.data.market,
      strategySlug: parsed.data.strategy,
      investorProfileSlug: parsed.data.profile,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    })
    await recordContentAccess({
      locale: "en",
      accessChannel: "catalog",
      outcome: "served",
      httpStatus: 200,
      clientIp: ip,
      userAgent: request.headers.get("user-agent"),
      metadata: { contentType: "investor_metro_scenario", count: result.items.length, total: result.total },
    })
    return NextResponse.json(
      {
        data: result.items,
        meta: {
          locale: "en",
          contentType: "investor_metro_scenario",
          accessModel: "free",
          count: result.items.length,
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          schemaVersion: "1.0",
        },
        links: {
          self: request.nextUrl.pathname + request.nextUrl.search,
          collection: "/en/japan-opportunities/invest/markets",
          factory: "/api/v1/investor-briefs/factory",
        },
      },
      { headers: PUBLIC_HEADERS },
    )
  } catch (error) {
    console.error("[investor-scenarios-api] catalog failed:", error)
    await captureException(error, { source: "/api/v1/investor-scenarios", severity: "error" })
    await recordContentAccess({
      locale: "en",
      accessChannel: "catalog",
      outcome: "error",
      httpStatus: 503,
      clientIp: ip,
      userAgent: request.headers.get("user-agent"),
      metadata: { contentType: "investor_metro_scenario" },
    })
    return NextResponse.json(
      { error: { code: "INVESTOR_SCENARIOS_UNAVAILABLE", message: "Investor scenarios are temporarily unavailable." } },
      { status: 503, headers: { ...PUBLIC_HEADERS, "Cache-Control": "no-store" } },
    )
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Accept, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  })
}
