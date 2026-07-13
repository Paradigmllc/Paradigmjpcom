import { NextRequest, NextResponse } from "next/server"
import { previewCookieName, verifyDemoPreviewToken } from "@/lib/sales/demo-private-access"
import { demoSiteUrl } from "@/lib/sales/routing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const token = request.nextUrl.searchParams.get("token") ?? ""
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ja"
  const verification = await verifyDemoPreviewToken(slug, token)
  if (!verification.ok || !verification.expiresAt) {
    return NextResponse.json({ ok: false, error: "このプレビューURLは無効または期限切れです" }, { status: 401 })
  }

  const productionOrigin = demoSiteUrl()
  const requestHost = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? ""
  if (process.env.NODE_ENV === "production" && requestHost !== new URL(productionOrigin).hostname.toLowerCase()) {
    const canonicalEntry = new URL(`/api/demo-preview/${encodeURIComponent(slug)}`, productionOrigin)
    canonicalEntry.searchParams.set("token", token)
    canonicalEntry.searchParams.set("locale", locale)
    const canonicalResponse = NextResponse.redirect(canonicalEntry, 307)
    canonicalResponse.headers.set("Cache-Control", "private, no-store")
    return canonicalResponse
  }

  const origin = process.env.NODE_ENV === "production" ? productionOrigin : request.nextUrl.origin
  const response = NextResponse.redirect(new URL(`/${locale}/${encodeURIComponent(slug)}`, origin))
  response.cookies.set(previewCookieName(slug), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/${locale}/${encodeURIComponent(slug)}`,
    expires: new Date(verification.expiresAt),
  })
  response.headers.set("Cache-Control", "private, no-store")
  return response
}
