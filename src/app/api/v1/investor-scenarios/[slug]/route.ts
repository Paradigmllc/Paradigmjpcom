import { NextRequest, NextResponse } from "next/server"
import { isSafeContentSlug, recordContentAccess } from "@/lib/content-commerce/catalog"
import { captureException } from "@/lib/error-monitor"
import { getInvestorScenario, investorScenarioToMarkdown } from "@/lib/investor-scenarios/repository"
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
  const rateLimit = checkRateLimit({ ip, key: "investor-scenario-detail", max: 120, windowMs: 60_000 })
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many investor scenario requests." } },
      { status: 429, headers: { ...PUBLIC_HEADERS, "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1_000)) } },
    )
  }

  if (!isSafeContentSlug(slug)) {
    return NextResponse.json(
      { error: { code: "INVALID_SLUG", message: "The investor scenario slug is invalid." } },
      { status: 400, headers: PUBLIC_HEADERS },
    )
  }

  try {
    const scenario = await getInvestorScenario(slug)
    if (!scenario) {
      await recordContentAccess({
        productSlug: slug,
        locale: "en",
        accessChannel: "public_api",
        outcome: "not_found",
        httpStatus: 404,
        clientIp: ip,
        userAgent: request.headers.get("user-agent"),
        metadata: { contentType: "investor_metro_scenario" },
      })
      return NextResponse.json(
        { error: { code: "INVESTOR_SCENARIO_NOT_FOUND", message: "No published investor scenario matched this slug." } },
        { status: 404, headers: PUBLIC_HEADERS },
      )
    }

    const wantsMarkdown = request.nextUrl.searchParams.get("format") === "markdown"
      || request.headers.get("accept")?.includes("text/markdown")
    await recordContentAccess({
      productSlug: scenario.slug,
      locale: "en",
      accessChannel: "public_api",
      outcome: "served",
      httpStatus: 200,
      clientIp: ip,
      userAgent: request.headers.get("user-agent"),
      metadata: { contentType: "investor_metro_scenario", format: wantsMarkdown ? "markdown" : "json" },
    })

    if (wantsMarkdown) {
      return new NextResponse(investorScenarioToMarkdown(scenario), {
        headers: { ...PUBLIC_HEADERS, "Content-Type": "text/markdown; charset=utf-8" },
      })
    }

    return NextResponse.json(
      {
        data: scenario,
        meta: { locale: "en", contentType: "investor_metro_scenario", accessModel: "free", schemaVersion: "1.0" },
        links: {
          self: scenario.endpoint,
          markdown: `${scenario.endpoint}?format=markdown`,
          canonical: `https://paradigmjp.com${scenario.pageUrl}`,
          marketBrief: scenario.payload.marketPageUrl,
        },
      },
      { headers: PUBLIC_HEADERS },
    )
  } catch (error) {
    console.error(`[investor-scenarios-api/${slug}] failed:`, error)
    await captureException(error, { source: "/api/v1/investor-scenarios/[slug]", severity: "error" })
    await recordContentAccess({
      productSlug: slug,
      locale: "en",
      accessChannel: "public_api",
      outcome: "error",
      httpStatus: 503,
      clientIp: ip,
      userAgent: request.headers.get("user-agent"),
      metadata: { contentType: "investor_metro_scenario" },
    })
    return NextResponse.json(
      { error: { code: "INVESTOR_SCENARIO_UNAVAILABLE", message: "The investor scenario is temporarily unavailable." } },
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
