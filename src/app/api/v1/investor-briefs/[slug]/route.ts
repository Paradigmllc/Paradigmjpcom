import { NextRequest, NextResponse } from "next/server"
import {
  isSafeContentSlug,
  recordContentAccess,
} from "@/lib/content-commerce/catalog"
import { captureException } from "@/lib/error-monitor"
import {
  getInvestorBrief,
  investorBriefToMarkdown,
} from "@/lib/investor-briefs/repository"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PUBLIC_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
  "Content-Language": "en",
  Vary: "Accept",
} as const

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { slug } = await params
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit({ ip, key: "investor-brief-detail", max: 120, windowMs: 60_000 })
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

  if (!isSafeContentSlug(slug)) {
    return NextResponse.json(
      { error: { code: "INVALID_SLUG", message: "The investor brief slug is invalid." } },
      { status: 400, headers: PUBLIC_HEADERS },
    )
  }

  try {
    const brief = await getInvestorBrief(slug)
    if (!brief) {
      await recordContentAccess({
        productSlug: slug,
        locale: "en",
        accessChannel: "public_api",
        outcome: "not_found",
        httpStatus: 404,
        clientIp: ip,
        userAgent: request.headers.get("user-agent"),
        metadata: { contentType: "investor_brief" },
      })
      return NextResponse.json(
        { error: { code: "INVESTOR_BRIEF_NOT_FOUND", message: "No published investor brief matched this slug." } },
        { status: 404, headers: PUBLIC_HEADERS },
      )
    }

    const wantsMarkdown = request.nextUrl.searchParams.get("format") === "markdown"
      || request.headers.get("accept")?.includes("text/markdown")
    await recordContentAccess({
      productId: brief.id,
      productSlug: brief.slug,
      locale: "en",
      accessChannel: "public_api",
      outcome: "served",
      httpStatus: 200,
      clientIp: ip,
      userAgent: request.headers.get("user-agent"),
      metadata: { contentType: "investor_brief", format: wantsMarkdown ? "markdown" : "json" },
    })

    if (wantsMarkdown) {
      return new NextResponse(investorBriefToMarkdown(brief), {
        headers: { ...PUBLIC_HEADERS, "Content-Type": "text/markdown; charset=utf-8" },
      })
    }

    return NextResponse.json(
      {
        data: brief,
        meta: { locale: "en", contentType: "investor_brief", accessModel: "free", schemaVersion: "1.0" },
        links: {
          self: `/api/v1/investor-briefs/${brief.slug}`,
          markdown: `/api/v1/investor-briefs/${brief.slug}?format=markdown`,
          canonical: `https://paradigmjp.com${brief.pageUrl}`,
        },
      },
      { headers: PUBLIC_HEADERS },
    )
  } catch (error) {
    console.error(`[investor-briefs-api/${slug}] failed:`, error)
    await captureException(error, { source: "/api/v1/investor-briefs/[slug]", severity: "error" })
    await recordContentAccess({
      productSlug: slug,
      locale: "en",
      accessChannel: "public_api",
      outcome: "error",
      httpStatus: 503,
      clientIp: ip,
      userAgent: request.headers.get("user-agent"),
      metadata: { contentType: "investor_brief" },
    })
    return NextResponse.json(
      { error: { code: "INVESTOR_BRIEF_UNAVAILABLE", message: "The investor brief is temporarily unavailable." } },
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
