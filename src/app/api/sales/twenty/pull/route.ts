import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { pullTwentyCompaniesToSupabase } from "@/lib/sales/twenty-sync"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

interface Body {
  limit?: number
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

  const result = await pullTwentyCompaniesToSupabase(body.limit ?? 200)
  const status = result.ok ? 200 : result.configured ? 502 : 503
  return NextResponse.json(result, { status })
}
