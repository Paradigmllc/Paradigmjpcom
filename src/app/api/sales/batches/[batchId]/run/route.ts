import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { qualifyLeadBatch } from "@/lib/sales/lead-qualification"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

interface Body {
  limit?: number
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { batchId } = await params
  let body: Body = {}
  try {
    body = (await req.json()) as Body
  } catch (error) {
    console.warn("[sales-batch-run] empty or invalid JSON body:", error)
  }

  const limit = Math.max(1, Math.min(Number(body.limit ?? 500), 2000))
  const result = await qualifyLeadBatch(batchId, limit)
  return NextResponse.json(result, { status: result.ok ? 200 : 503 })
}
