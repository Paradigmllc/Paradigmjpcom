import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getSourceAcquisitionSummary } from "@/lib/sales/source-acquisition"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const summary = await getSourceAcquisitionSummary()
    return NextResponse.json({ ok: true, summary })
  } catch (error) {
    console.error("[sales-source-acquisition] GET failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Source acquisition summary failed" },
      { status: 500 },
    )
  }
}
