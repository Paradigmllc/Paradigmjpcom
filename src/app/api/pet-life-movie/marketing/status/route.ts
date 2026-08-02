import { NextRequest, NextResponse } from "next/server"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { getPetMarketingDashboard } from "@/lib/pet-life-movie/marketing/repository"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await authorizePayloadAdminRequest({
    headers: request.headers,
    legacyToken: request.cookies.get("paradigm_admin_token")?.value,
  })
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    const dashboard = await getPetMarketingDashboard()
    return NextResponse.json(
      { ok: true, dashboard },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[pet-marketing-status] dashboard failed", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Marketing status failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    )
  }
}
