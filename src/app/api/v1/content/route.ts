import { NextRequest, NextResponse } from "next/server"
import { captureException } from "@/lib/error-monitor"
import { listInvestorBriefs } from "@/lib/investor-briefs/repository"
import { listInvestorScenarios } from "@/lib/investor-scenarios/repository"
import {
  listPremiumProducts,
  listPublicArticles,
  normalizeContentLocale,
  recordContentAccess,
  type ContentCatalogItem,
} from "@/lib/content-commerce/catalog"
import { resolveX402Configuration } from "@/lib/content-commerce/x402"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const RESPONSE_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  Vary: "Accept",
} as const

function matchesType(item: ContentCatalogItem, requestedType: string | null): boolean {
  return !requestedType || requestedType === "all" || item.contentType === requestedType
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit({ ip, key: "content-api-catalog", max: 120, windowMs: 60_000 })
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many catalog requests." } },
      {
        status: 429,
        headers: {
          ...RESPONSE_HEADERS,
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1_000)),
        },
      },
    )
  }

  const locale = normalizeContentLocale(request.nextUrl.searchParams.get("locale"))
  const requestedType = request.nextUrl.searchParams.get("type")
  const [articleResult, premiumResult, investorResult, scenarioResult] = await Promise.allSettled([
    listPublicArticles(locale),
    listPremiumProducts(locale),
    locale === "en" ? listInvestorBriefs() : Promise.resolve([]),
    locale === "en" ? listInvestorScenarios({ limit: 1_000 }) : Promise.resolve({ items: [], total: 0, limit: 1_000, offset: 0 }),
  ])

  const warnings: Array<{ code: string; message: string }> = []
  let articles: ContentCatalogItem[] = []
  let premium: ContentCatalogItem[] = []
  let investorBriefs: ContentCatalogItem[] = []
  let investorScenarios: ContentCatalogItem[] = []

  if (articleResult.status === "fulfilled") {
    articles = articleResult.value
  } else {
    console.error("[content-api] public article catalog failed:", articleResult.reason)
    await captureException(articleResult.reason, { source: "/api/v1/content", severity: "warning" })
    warnings.push({ code: "PUBLIC_CATALOG_UNAVAILABLE", message: "Public article metadata is temporarily unavailable." })
  }

  if (premiumResult.status === "fulfilled") {
    premium = premiumResult.value
  } else {
    console.error("[content-api] premium catalog failed:", premiumResult.reason)
    await captureException(premiumResult.reason, { source: "/api/v1/content", severity: "warning" })
    warnings.push({ code: "PREMIUM_CATALOG_UNAVAILABLE", message: "Premium content metadata is temporarily unavailable." })
  }

  if (investorResult.status === "fulfilled") {
    investorBriefs = investorResult.value.map((brief) => ({
      slug: brief.slug,
      locale: "en",
      title: brief.title,
      summary: brief.summary,
      contentType: "investor_brief",
      accessModel: "free",
      price: null,
      network: null,
      preview: brief.preview,
      sourceUrl: `https://paradigmjp.com${brief.pageUrl}`,
      license: brief.license,
      version: brief.version,
      publishedAt: brief.publishedAt,
      updatedAt: brief.updatedAt,
      endpoint: brief.endpoint,
    }))
  } else {
    console.error("[content-api] investor brief catalog failed:", investorResult.reason)
    await captureException(investorResult.reason, { source: "/api/v1/content", severity: "warning" })
    warnings.push({ code: "INVESTOR_BRIEF_CATALOG_UNAVAILABLE", message: "Investor brief metadata is temporarily unavailable." })
  }

  if (scenarioResult.status === "fulfilled") {
    investorScenarios = scenarioResult.value.items.map((scenario) => ({
      slug: scenario.slug,
      locale: "en",
      title: scenario.title,
      summary: scenario.summary,
      contentType: "investor_metro_scenario",
      accessModel: "free",
      price: null,
      network: null,
      preview: scenario.preview,
      sourceUrl: `https://paradigmjp.com${scenario.pageUrl}`,
      license: "Paradigm API Terms; attribution required. Not investment, legal, tax, brokerage or financial advice.",
      version: 1,
      publishedAt: scenario.publishedAt,
      updatedAt: scenario.updatedAt,
      endpoint: scenario.endpoint,
    }))
  } else {
    console.error("[content-api] investor scenario catalog failed:", scenarioResult.reason)
    await captureException(scenarioResult.reason, { source: "/api/v1/content", severity: "warning" })
    warnings.push({ code: "INVESTOR_SCENARIO_CATALOG_UNAVAILABLE", message: "Investor scenario metadata is temporarily unavailable." })
  }

  if (
    articleResult.status === "rejected"
    && premiumResult.status === "rejected"
    && investorResult.status === "rejected"
    && scenarioResult.status === "rejected"
  ) {
    await recordContentAccess({
      locale,
      accessChannel: "catalog",
      outcome: "unavailable",
      httpStatus: 503,
      clientIp: ip,
      userAgent: request.headers.get("user-agent"),
      metadata: { requestedType },
    })
    return NextResponse.json(
      { error: { code: "CONTENT_CATALOG_UNAVAILABLE", message: "The content catalog is temporarily unavailable." }, warnings },
      { status: 503, headers: { ...RESPONSE_HEADERS, "Cache-Control": "no-store" } },
    )
  }

  const items = [...premium, ...investorBriefs, ...investorScenarios, ...articles].filter((item) => matchesType(item, requestedType))
  const x402 = resolveX402Configuration()
  await recordContentAccess({
    locale,
    accessChannel: "catalog",
    outcome: "served",
    httpStatus: 200,
    clientIp: ip,
    userAgent: request.headers.get("user-agent"),
    metadata: { count: items.length, requestedType, partial: warnings.length > 0 },
  })

  return NextResponse.json(
    {
      data: items,
      meta: {
        locale,
        count: items.length,
        partial: warnings.length > 0,
        x402: x402.ok
          ? { status: "configured", protocolVersion: 2, network: x402.config.network, currency: "USDC" }
          : { status: "setup_required", protocolVersion: 2, network: null, currency: "USDC" },
      },
      links: {
        self: `/api/v1/content?locale=${locale}${requestedType ? `&type=${encodeURIComponent(requestedType)}` : ""}`,
        documentation: `/${locale}/japan-opportunities/api`,
      },
      ...(warnings.length > 0 ? { warnings } : {}),
    },
    { headers: RESPONSE_HEADERS },
  )
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Accept, Content-Type, PAYMENT-SIGNATURE",
      "Access-Control-Max-Age": "86400",
    },
  })
}
