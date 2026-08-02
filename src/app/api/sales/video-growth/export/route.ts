import { NextRequest, NextResponse } from "next/server"
import { authorizeSalesApiRequest, type OperatorRole } from "@/lib/sales/api-auth"
import { videoGrowthDashboardToCsv } from "@/lib/video-growth/export"
import { getVideoGrowthDashboard } from "@/lib/video-growth/repository"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const EXPORT_ROLES: OperatorRole[] = ["admin", "commercial_lead", "finance", "delivery"]

export async function GET(req: NextRequest) {
  const auth = await authorizeSalesApiRequest(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  if (!EXPORT_ROLES.includes(auth.principal.role)) {
    return NextResponse.json({ ok: false, error: "CSV出力権限がありません" }, { status: 403 })
  }
  try {
    const dashboard = await getVideoGrowthDashboard()
    const date = new Date().toISOString().slice(0, 10)
    return new NextResponse(videoGrowthDashboardToCsv(dashboard), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="video-growth-operations-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[video-growth-export] export failed:", error)
    return NextResponse.json({ ok: false, error: "商用運用CSVを出力できませんでした" }, { status: 500 })
  }
}
