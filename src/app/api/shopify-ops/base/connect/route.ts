import { randomBytes } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { createBaseAuthorizeUrl } from "@/lib/shopify-ops/base-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await authorizePayloadAdminRequest({
    headers: request.headers,
    legacyToken: request.cookies.get("paradigm_admin_token")?.value,
  })
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  try {
    const state = randomBytes(32).toString("base64url")
    const response = NextResponse.redirect(createBaseAuthorizeUrl(state))
    response.cookies.set("sericia_base_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/api/shopify-ops/base/callback",
    })
    return response
  } catch (error) {
    console.error("[base-oauth] connect failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "BASE接続を開始できませんでした" }, { status: 500 })
  }
}
