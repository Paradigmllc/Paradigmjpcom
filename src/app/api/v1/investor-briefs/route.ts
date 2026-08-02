import { NextRequest, NextResponse } from "next/server"
import { recordContentAccess } from "@/lib/content-commerce/catalog"
import { captureException } from "@/lib/error-monitor"
import { listInvestorBriefs } from "@/lib/investor-briefs/repository"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PUBLIC_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
  "Content-Language": "en",
  Vary: "Accept",
} as const

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit({ ip, key: "investor-brief-catalog", max: 120, windowMs: 60_000 })
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many investor brief requests." } },
      {
        status: 429,
        headers: {
          ...PUBLIC_HEADERS,
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1_000)),
        },
      },
    )
  }

  try {
    const briefs = await listInvestorBriefs()
    await recordContentAccess({
      locale: "en",
      accessChannel: "catalog",
      outcome: "served",
      httpStatus: 200,
      clientIp: ip,
      userAgent: request.headers.get("user-agent"),
      metadata: { contentType: "investor_brief", count: briefs.length },
    })

    return NextResponse.json(
      {
        data: briefs,
        meta: {
          locale: "en",
          contentType: "investor_brief",
          accessModel: "free",
          count: briefs.length,
          schemaVersion: "1.0",
        },
        links: {
          self: "/api/v1/investor-briefs",
          collection: "/en/japan-opportunities/invest",
          contentCatalog: "/api/v1/content?locale=en&type=investor_brief",
        },
      },
      { headers: PUBLIC_HEADERS },
    )
  } catch (error) {
    console.error("[investor-briefs-api] catalog failed:", error)
    await captureException(error, { source: "/api/v1/investor-briefs", severity: "error" })
    await recordContentAccess({
      locale: "en",
      accessChannel: "catalog",
      outcome: "error",
      httpStatus: 503,
      clientIp: ip,
      userAgent: request.headers.get("user-agent"),
      metadata: { contentType: "investor_brief" },
    })
    return NextResponse.json(
      { error: { code: "INVESTOR_BRIEFS_UNAVAILABLE", message: "Investor briefs are temporarily unavailable." } },
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
