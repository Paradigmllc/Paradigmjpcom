import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { runEnrichmentJobs } from "@/lib/sales/enrichment-jobs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

async function readLimit(req: NextRequest): Promise<number> {
  if (req.method === "GET") {
    const value = Number(req.nextUrl.searchParams.get("limit") ?? "3")
    return Number.isFinite(value) ? value : 3
  }

  try {
    const body = (await req.json()) as { limit?: unknown }
    const value = typeof body.limit === "number" ? body.limit : Number(body.limit ?? 3)
    return Number.isFinite(value) ? value : 3
  } catch (e) {
    console.warn("[sales-enrichment-run] body parse skipped:", e)
    return 3
  }
}

async function handle(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const limit = Math.max(1, Math.min(await readLimit(req), 10))
  const result = await runEnrichmentJobs(limit)
  return NextResponse.json(result, { status: result.ok ? 200 : 207 })
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
