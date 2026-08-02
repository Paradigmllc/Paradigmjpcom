import { NextRequest, NextResponse } from "next/server"
import { captureException } from "@/lib/error-monitor"
import {
  getPublicArticle,
  isSafeContentSlug,
  normalizeContentLocale,
  recordContentAccess,
} from "@/lib/content-commerce/catalog"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PUBLIC_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
  Vary: "Accept",
} as const

interface RouteContext {
  params: Promise<{ slug: string }>
}

function toMarkdown(article: NonNullable<Awaited<ReturnType<typeof getPublicArticle>>>): string {
  const tags = article.tags.length > 0 ? article.tags.join(", ") : ""
  return [
    `# ${article.title}`,
    "",
    article.summary,
    "",
    `- Published: ${article.publishedAt}`,
    `- Category: ${article.category}`,
    `- Tags: ${tags}`,
    `- Source: ${article.sourceUrl}`,
    `- License: ${article.license}`,
    "",
    article.content,
  ].join("\n")
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { slug } = await params
  const locale = normalizeContentLocale(request.nextUrl.searchParams.get("locale"))
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit({ ip, key: "content-api-public", max: 120, windowMs: 60_000 })

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many content requests." } },
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
      { error: { code: "INVALID_SLUG", message: "The content slug is invalid." } },
      { status: 400, headers: PUBLIC_HEADERS },
    )
  }

  try {
    const article = await getPublicArticle(slug, locale)
    if (!article) {
      await recordContentAccess({
        productSlug: slug,
        locale,
        accessChannel: "public_api",
        outcome: "not_found",
        httpStatus: 404,
        clientIp: ip,
        userAgent: request.headers.get("user-agent"),
      })
      return NextResponse.json(
        { error: { code: "CONTENT_NOT_FOUND", message: "No published article matched this slug and locale." } },
        { status: 404, headers: PUBLIC_HEADERS },
      )
    }

    await recordContentAccess({
      productSlug: slug,
      locale,
      accessChannel: "public_api",
      outcome: "served",
      httpStatus: 200,
      clientIp: ip,
      userAgent: request.headers.get("user-agent"),
      metadata: { format: request.nextUrl.searchParams.get("format") ?? "json" },
    })

    const wantsMarkdown = request.nextUrl.searchParams.get("format") === "markdown"
      || request.headers.get("accept")?.includes("text/markdown")
    if (wantsMarkdown) {
      return new NextResponse(toMarkdown(article), {
        headers: { ...PUBLIC_HEADERS, "Content-Type": "text/markdown; charset=utf-8" },
      })
    }

    return NextResponse.json(
      { data: article, meta: { locale, accessModel: "free" } },
      { headers: PUBLIC_HEADERS },
    )
  } catch (error) {
    console.error(`[content-api/public/${slug}] failed:`, error)
    await captureException(error, { source: "/api/v1/content/public/[slug]", severity: "error" })
    await recordContentAccess({
      productSlug: slug,
      locale,
      accessChannel: "public_api",
      outcome: "error",
      httpStatus: 503,
      clientIp: ip,
      userAgent: request.headers.get("user-agent"),
    })
    return NextResponse.json(
      { error: { code: "CONTENT_UNAVAILABLE", message: "The article is temporarily unavailable." } },
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
