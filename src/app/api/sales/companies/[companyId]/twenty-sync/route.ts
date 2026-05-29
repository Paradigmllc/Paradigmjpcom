import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { syncCompanyKarteToTwenty } from "@/lib/sales/twenty-sync"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> },
) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { companyId } = await ctx.params
  if (!companyId) {
    return NextResponse.json({ ok: false, error: "companyId required" }, { status: 400 })
  }

  const result = await syncCompanyKarteToTwenty(companyId)
  return NextResponse.json(result, { status: result.ok ? 200 : result.configured ? 502 : 503 })
}
