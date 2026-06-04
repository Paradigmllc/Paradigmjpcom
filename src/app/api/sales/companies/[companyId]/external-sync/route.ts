import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import {
  syncCompanyAcrossSalesTools,
  type ExternalStudioTarget,
} from "@/lib/sales/external-studio-sync"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 90

const TARGETS = ["twenty", "directus", "keystatic"] as const

function normalizeTargets(value: unknown): ExternalStudioTarget[] | undefined {
  if (!Array.isArray(value)) return undefined
  const selected = value.filter((item): item is ExternalStudioTarget =>
    typeof item === "string" && (TARGETS as readonly string[]).includes(item),
  )
  return selected.length > 0 ? selected : undefined
}

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

  try {
    const body = (await req.json().catch((error: unknown) => {
      console.error("[sales-external-sync] invalid JSON body:", error)
      return {}
    })) as { targets?: unknown }
    const result = await syncCompanyAcrossSalesTools(companyId, normalizeTargets(body.targets))
    return NextResponse.json(result)
  } catch (error) {
    console.error("[sales-external-sync] failed:", error)
    const message = error instanceof Error ? error.message : "external studio sync failed"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
