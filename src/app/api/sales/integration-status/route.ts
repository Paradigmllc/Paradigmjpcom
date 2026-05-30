import { NextRequest, NextResponse } from "next/server"
import { authorizePayloadAdminRequest, authorizeWebhookRequest } from "@/lib/admin-auth"
import { getSalesIntegrationStatus, saveSalesIntegrationStatus } from "@/lib/sales/integration-registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

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
    const liveBalance = req.nextUrl.searchParams.get("live") === "1"
    const integrations = await getSalesIntegrationStatus({ liveBalance })
    if (liveBalance) await saveSalesIntegrationStatus(integrations)
    return NextResponse.json({ ok: true, liveBalance, integrations })
  } catch (error) {
    console.error("[sales-integration-status] failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "integration status failed" },
      { status: 500 },
    )
  }
}
