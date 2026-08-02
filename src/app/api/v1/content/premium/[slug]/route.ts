import { randomUUID } from "node:crypto"
import { declareDiscoveryExtension } from "@x402/extensions/bazaar"
import { withX402, type RouteConfig } from "@x402/next"
import { NextRequest, NextResponse } from "next/server"
import {
  getPremiumProduct,
  hashPaymentReference,
  isSafeContentSlug,
  normalizeContentLocale,
  recordContentAccess,
} from "@/lib/content-commerce/catalog"
import { getX402Runtime } from "@/lib/content-commerce/x402"
import { captureException } from "@/lib/error-monitor"
import { notifyBothChannels } from "@/lib/notify"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ slug: string }>
}

const PREMIUM_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
  "Cache-Control": "private, no-store",
  Vary: "Accept, PAYMENT-SIGNATURE",
} as const

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { slug } = await params
  const locale = normalizeContentLocale(request.nextUrl.searchParams.get("locale"))
  const ip = getClientIp(request)
  const requestId = randomUUID()
  const rateLimit = checkRateLimit({ ip, key: "content-api-premium", max: 40, windowMs: 60_000 })

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many premium content requests." } },
      {
        status: 429,
        headers: {
          ...PREMIUM_HEADERS,
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1_000)),
        },
      },
    )
  }

  if (!isSafeContentSlug(slug)) {
    return NextResponse.json(
      { error: { code: "INVALID_SLUG", message: "The content slug is invalid." } },
      { status: 400, headers: PREMIUM_HEADERS },
    )
  }

  try {
    const product = await getPremiumProduct(slug, locale)
    if (!product) {
      await recordContentAccess({
        requestId,
        productSlug: slug,
        locale,
        accessChannel: "x402",
        outcome: "not_found",
        httpStatus: 404,
        clientIp: ip,
        userAgent: request.headers.get("user-agent"),
      })
      return NextResponse.json(
        { error: { code: "CONTENT_NOT_FOUND", message: "No premium product matched this slug and locale." } },
        { status: 404, headers: PREMIUM_HEADERS },
      )
    }

    if (product.accessModel !== "x402" || !product.price) {
      console.error(`[content-api/premium/${slug}] product is not configured for x402`)
      return NextResponse.json(
        { error: { code: "INVALID_ACCESS_MODEL", message: "This product is not available through x402." } },
        { status: 409, headers: PREMIUM_HEADERS },
      )
    }

    const x402 = await getX402Runtime()
    if (!x402.ok) {
      console.error(`[content-api/premium/${slug}] ${x402.code}: ${x402.message}`)
      await recordContentAccess({
        requestId,
        productId: product.id,
        productSlug: slug,
        locale,
        accessChannel: "x402",
        outcome: "unavailable",
        httpStatus: 503,
        priceUsdc: Number(product.price.amount),
        network: product.network,
        clientIp: ip,
        userAgent: request.headers.get("user-agent"),
        metadata: { configurationCode: x402.code },
      })
      return NextResponse.json(
        {
          error: {
            code: x402.code,
            message: "x402 settlement is not available yet. The free catalog remains online.",
          },
        },
        { status: 503, headers: PREMIUM_HEADERS },
      )
    }

    if (process.env.NODE_ENV === "production" && product.network !== x402.config.network) {
      throw new Error(`Product network ${product.network} does not match runtime network ${x402.config.network}.`)
    }

    const routeConfig: RouteConfig = {
      accepts: {
        scheme: "exact",
        price: `$${product.price.amount}`,
        network: x402.config.network,
        payTo: x402.config.payTo,
      },
      description: product.summary,
      mimeType: "application/json",
      extensions: {
        ...declareDiscoveryExtension({
          pathParams: { slug },
          pathParamsSchema: {
            properties: { slug: { type: "string", description: "Premium content product slug" } },
            required: ["slug"],
          },
          input: { locale },
          inputSchema: {
            properties: { locale: { type: "string", enum: ["ja", "en"] } },
          },
          output: {
            example: { data: { slug, locale, payload: product.preview } },
            schema: {
              type: "object",
              properties: {
                data: { type: "object" },
                meta: { type: "object" },
              },
              required: ["data", "meta"],
            },
          },
        }),
      },
    }

    const protectedHandler = withX402(
      async () => NextResponse.json(
        {
          data: {
            slug: product.slug,
            locale: product.locale,
            title: product.title,
            summary: product.summary,
            contentType: product.contentType,
            version: product.version,
            publishedAt: product.publishedAt,
            updatedAt: product.updatedAt,
            sourceUrl: product.sourceUrl,
            license: product.license,
            payload: product.payload,
          },
          meta: {
            requestId,
            accessModel: "x402",
            price: product.price,
            network: x402.config.network,
          },
        },
        { headers: PREMIUM_HEADERS },
      ),
      routeConfig,
      x402.server,
    )

    const response = await protectedHandler(request)
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Expose-Headers", "PAYMENT-REQUIRED, PAYMENT-RESPONSE")
    response.headers.set("Cache-Control", "private, no-store")
    const paymentResponse = response.headers.get("PAYMENT-RESPONSE")
    const paymentReference = hashPaymentReference(paymentResponse)
    const paid = response.status >= 200 && response.status < 300 && Boolean(paymentResponse)
    const outcome = paid ? "paid" : response.status === 402 ? "payment_required" : "error"

    await recordContentAccess({
      requestId,
      productId: product.id,
      productSlug: product.slug,
      locale,
      accessChannel: "x402",
      outcome,
      httpStatus: response.status,
      priceUsdc: Number(product.price.amount),
      network: x402.config.network,
      paymentReference,
      clientIp: ip,
      userAgent: request.headers.get("user-agent"),
      metadata: { paymentResponsePresent: Boolean(paymentResponse), protocolVersion: 2 },
    })

    if (paid) {
      try {
        const notification = await notifyBothChannels(
          `x402 content sale: ${product.title} (${product.price.amount} USDC)`,
          {
            title: `x402 content sale / ${product.slug}`,
            message: `${product.price.amount} USDC on ${x402.config.network}; request ${requestId}`,
            link: `https://paradigmjp.com/${locale}/japan-opportunities/api`,
            type: "x402_content_sale",
            region: "global",
            priority: 85,
            idempotencyKey: paymentReference ?? requestId,
          },
        )
        if (!notification.ok) {
          console.error("[content-api] paid-access notification was only partially delivered:", notification)
        }
      } catch (notificationError) {
        console.error("[content-api] paid-access notification threw after settlement:", notificationError)
        await captureException(notificationError, {
          source: "/api/v1/content/premium/[slug]/notification",
          severity: "warning",
        })
      }
    }

    return response
  } catch (error) {
    console.error(`[content-api/premium/${slug}] failed:`, error)
    await captureException(error, { source: "/api/v1/content/premium/[slug]", severity: "error" })
    await recordContentAccess({
      requestId,
      productSlug: slug,
      locale,
      accessChannel: "x402",
      outcome: "error",
      httpStatus: 503,
      clientIp: ip,
      userAgent: request.headers.get("user-agent"),
    })
    return NextResponse.json(
      { error: { code: "PREMIUM_CONTENT_UNAVAILABLE", message: "Premium content is temporarily unavailable." } },
      { status: 503, headers: PREMIUM_HEADERS },
    )
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Accept, Content-Type, PAYMENT-SIGNATURE",
      "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
      "Access-Control-Max-Age": "86400",
    },
  })
}
