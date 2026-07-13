import { NextRequest, NextResponse } from "next/server"
import { previewCookieName, verifyDemoPreviewToken } from "@/lib/sales/demo-private-access"

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

  const response = NextResponse.redirect(new URL(`/${locale}/demo/${encodeURIComponent(slug)}`, request.url))
  response.cookies.set(previewCookieName(slug), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/${locale}/demo/${slug}`,
    expires: new Date(verification.expiresAt),
  })
  response.headers.set("Cache-Control", "private, no-store")
  return response
}
