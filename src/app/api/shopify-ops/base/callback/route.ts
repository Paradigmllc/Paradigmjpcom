import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { notifyBothChannels } from "@/lib/notify"
import { exchangeBaseAuthorizationCode } from "@/lib/shopify-ops/base-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function sameState(expected: string | undefined, received: string | null): boolean {
  if (!expected || !received) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(received)
  return a.length === b.length && timingSafeEqual(a, b)
}

function dashboardUrl(request: NextRequest, result: "connected" | "failed"): URL {
  const url = new URL("/ja/admin/shopify", request.nextUrl.origin)
  url.searchParams.set("base", result)
  return url
}

export async function GET(request: NextRequest) {
  const expectedState = request.cookies.get("sericia_base_oauth_state")?.value
  const receivedState = request.nextUrl.searchParams.get("state")
  const code = request.nextUrl.searchParams.get("code")
  if (!sameState(expectedState, receivedState) || !code) {
    console.error("[base-oauth] callback state or code is invalid")
    return NextResponse.redirect(dashboardUrl(request, "failed"))
  }

  try {
    await exchangeBaseAuthorizationCode(code)
    const notification = await notifyBothChannels("SERICIAのBASEショップ接続が完了しました", {
      title: "SERICIA BASE接続",
      message: "BASE OAuth接続が完了し、商品同期を実行できる状態になりました。",
      link: "/ja/admin/shopify",
      type: "shopify_base_connected",
      region: "global",
      priority: 75,
    })
    if (!notification.ok) console.error("[base-oauth] notification incomplete:", notification)
    const response = NextResponse.redirect(dashboardUrl(request, "connected"))
    response.cookies.delete("sericia_base_oauth_state")
    return response
  } catch (error) {
    console.error("[base-oauth] callback failed:", error)
    const response = NextResponse.redirect(dashboardUrl(request, "failed"))
    response.cookies.delete("sericia_base_oauth_state")
    return response
  }
}
