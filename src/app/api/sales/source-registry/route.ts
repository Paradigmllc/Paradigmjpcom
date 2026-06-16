import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import {
  listRevenueSourceRegistry,
  summarizeRevenueSourceRegistry,
} from "@/lib/sales/source-registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const items = listRevenueSourceRegistry()
    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      summary: summarizeRevenueSourceRegistry(items),
      sources: items,
    })
  } catch (error) {
    console.error("[sales-source-registry] failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "source registry failed" },
      { status: 500 },
    )
  }
}
