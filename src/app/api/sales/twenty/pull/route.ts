import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { pullTwentyCompaniesToSupabase } from "@/lib/sales/twenty-pull"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

interface Body {
  limit?: number
  auto_run_pipeline?: boolean
  dispatch_pipeline?: boolean
  require_video?: boolean
  auto_sync_external_studios?: boolean
  dry_run?: boolean
}

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: Body = {}
  try {
    body = (await req.json()) as Body
  } catch (error) {
    console.warn("[sales-twenty-pull] empty or invalid JSON body:", error)
  }

  const result = await pullTwentyCompaniesToSupabase(body.limit ?? 200, {
    autoRunPipeline: body.auto_run_pipeline !== false,
    dispatchPipeline: body.dispatch_pipeline,
    requireVideo: body.require_video,
    autoSyncExternalStudios: body.auto_sync_external_studios,
    requestedBy: "twenty_pull_api",
    dryRun: body.dry_run === true,
  })
  const status = result.ok ? 200 : result.configured ? 502 : 503
  return NextResponse.json(result, { status })
}
