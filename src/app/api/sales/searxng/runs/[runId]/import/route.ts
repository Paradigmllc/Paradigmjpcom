import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { importSearxngRunToLeadBatch } from "@/lib/sales/searxng-source"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

interface Body {
  limit?: number | null
  min_score?: number | null
  enrich?: boolean
  max_outreach_ready?: number | null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { runId } = await params
  let body: Body = {}
  try {
    body = (await req.json()) as Body
  } catch (error) {
    console.warn("[sales-searxng-import] empty or invalid JSON body:", error)
  }

  const result = await importSearxngRunToLeadBatch({
    runId,
    limit: body.limit,
    minScore: body.min_score,
    enrich: body.enrich,
    maxOutreachReady: body.max_outreach_ready,
  })
  return NextResponse.json(result, { status: result.ok ? 200 : 503 })
}
