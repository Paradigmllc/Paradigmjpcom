import { NextRequest, NextResponse } from "next/server"
import {
  authorizePayloadAdminRequest,
  authorizeWebhookRequest,
} from "@/lib/admin-auth"
import { getSalesDashboardData } from "@/lib/sales/dashboard"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const webhookAuth = authorizeWebhookRequest(req.headers)
  if (webhookAuth.ok) return true

  const adminAuth = await authorizePayloadAdminRequest({
    headers: req.headers,
    legacyToken: req.cookies.get("paradigm_admin_token")?.value,
  })
  return adminAuth.ok
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const dashboard = await getSalesDashboardData({
      reportLocale: req.nextUrl.searchParams.get("report_locale") ?? req.nextUrl.searchParams.get("locale"),
    })
    return NextResponse.json({ ok: true, dashboard })
  } catch (e) {
    console.error("[sales-dashboard-api] failed", e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown dashboard error" },
      { status: 500 },
    )
  }
}
