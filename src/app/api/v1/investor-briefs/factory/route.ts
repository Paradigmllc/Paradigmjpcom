import { NextRequest, NextResponse } from "next/server"
import { recordContentAccess } from "@/lib/content-commerce/catalog"
import { captureException } from "@/lib/error-monitor"
import { CURATED_INVESTOR_COMPARISONS } from "@/lib/investor-briefs/comparisons"
import {
  calculateInvestorPseoScale,
  INVESTOR_PSEO_QUALITY_GATES,
  NATIONAL_INVESTMENT_THEME_COUNT,
} from "@/lib/investor-briefs/pseo-scale"
import { listInvestorBriefs } from "@/lib/investor-briefs/repository"
import { listInvestorScenarios } from "@/lib/investor-scenarios/repository"
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
  const rateLimit = checkRateLimit({ ip, key: "investor-pseo-factory", max: 120, windowMs: 60_000 })
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many pSEO factory requests." } },
      { status: 429, headers: { ...PUBLIC_HEADERS, "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1_000)) } },
    )
  }

  try {
    const [briefs, scenarios] = await Promise.all([
      listInvestorBriefs(),
      listInvestorScenarios({ limit: 1 }),
    ])
    await recordContentAccess({
      locale: "en",
      accessChannel: "catalog",
      outcome: "served",
      httpStatus: 200,
      clientIp: ip,
      userAgent: request.headers.get("user-agent"),
      metadata: { contentType: "investor_pseo_factory", publishedBriefs: briefs.length, publishedMetroScenarios: scenarios.total },
    })
    return NextResponse.json(
      {
        data: {
          scale: calculateInvestorPseoScale(NATIONAL_INVESTMENT_THEME_COUNT),
          qualityGates: INVESTOR_PSEO_QUALITY_GATES,
          publication: {
            publishedBriefs: briefs.length,
            curatedIndexableComparisons: CURATED_INVESTOR_COMPARISONS.length,
            qualityGatedMetroScenarios: scenarios.total,
            totalIndexableInvestorPages: briefs.length + CURATED_INVESTOR_COMPARISONS.length + scenarios.total,
            candidatePagesAreNotPublishedPages: true,
          },
        },
        meta: { schemaVersion: "1.0", generatedAt: new Date().toISOString() },
        links: {
          briefs: "/api/v1/investor-briefs",
          scenarios: "/api/v1/investor-scenarios",
          collection: "/en/japan-opportunities/invest",
        },
      },
      { headers: PUBLIC_HEADERS },
    )
  } catch (error) {
    console.error("[investor-pseo-factory-api] failed:", error)
    await captureException(error, { source: "/api/v1/investor-briefs/factory", severity: "error" })
    return NextResponse.json(
      { error: { code: "PSEO_FACTORY_UNAVAILABLE", message: "The pSEO factory manifest is temporarily unavailable." } },
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
