import { NextRequest, NextResponse } from "next/server"
import { isSafeContentSlug, recordContentAccess } from "@/lib/content-commerce/catalog"
import { captureException } from "@/lib/error-monitor"
import { buildInvestorBriefComparison } from "@/lib/investor-briefs/comparisons"
import { getInvestorBrief } from "@/lib/investor-briefs/repository"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PUBLIC_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
  "Content-Language": "en",
} as const

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit({ ip, key: "investor-brief-comparison", max: 120, windowMs: 60_000 })
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many investor comparison requests." } },
      { status: 429, headers: { ...PUBLIC_HEADERS, "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1_000)) } },
    )
  }

  const leftSlug = request.nextUrl.searchParams.get("left") ?? ""
  const rightSlug = request.nextUrl.searchParams.get("right") ?? ""
  if (!isSafeContentSlug(leftSlug) || !isSafeContentSlug(rightSlug) || leftSlug === rightSlug) {
    return NextResponse.json(
      { error: { code: "INVALID_COMPARISON", message: "Provide two different valid investor brief slugs." } },
      { status: 400, headers: PUBLIC_HEADERS },
    )
  }

  try {
    const [left, right] = await Promise.all([getInvestorBrief(leftSlug), getInvestorBrief(rightSlug)])
    if (!left || !right) {
      return NextResponse.json(
        { error: { code: "INVESTOR_BRIEF_NOT_FOUND", message: "One or both investor briefs were not found." } },
        { status: 404, headers: PUBLIC_HEADERS },
      )
    }

    const comparison = buildInvestorBriefComparison(left, right)
    await recordContentAccess({
      locale: "en",
      accessChannel: "public_api",
      outcome: "served",
      httpStatus: 200,
      clientIp: ip,
      userAgent: request.headers.get("user-agent"),
      metadata: { contentType: "investor_comparison", left: left.slug, right: right.slug },
    })
    return NextResponse.json(
      {
        data: comparison,
        meta: { locale: "en", contentType: "investor_comparison", accessModel: "free", schemaVersion: "1.0" },
        links: {
          self: `/api/v1/investor-briefs/compare?left=${left.slug}&right=${right.slug}`,
          canonical: comparison.isIndexable
            ? `/en/japan-opportunities/invest/compare/${left.slug}-vs-${right.slug}`
            : null,
        },
      },
      { headers: PUBLIC_HEADERS },
    )
  } catch (error) {
    console.error("[investor-comparison-api] failed:", error)
    await captureException(error, { source: "/api/v1/investor-briefs/compare", severity: "error" })
    return NextResponse.json(
      { error: { code: "INVESTOR_COMPARISON_UNAVAILABLE", message: "The investor comparison is temporarily unavailable." } },
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
