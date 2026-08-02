import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorizeSalesApiRequest } from "@/lib/sales/api-auth"
import { runJapanOperatorAutomation } from "@/lib/sales/japan-operator-automation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const schema = z.object({ sourceRuns: z.boolean().default(true), outboxLimit: z.number().int().min(1).max(100).default(25) })

export async function POST(req: NextRequest) {
  const auth = await authorizeSalesApiRequest(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  if (!["admin", "commercial_lead", "automation"].includes(auth.principal.role)) return NextResponse.json({ ok: false, error: "Automation role required" }, { status: 403 })
  const parsed = schema.safeParse(await req.json().catch((error) => { console.error("[japan-operator-automation] invalid JSON:", error); return {} }))
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid automation input" }, { status: 400 })
  try {
    return NextResponse.json({ ok: true, result: await runJapanOperatorAutomation(parsed.data) })
  } catch (error) {
    console.error("[japan-operator-automation] run failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Automation failed" }, { status: 500 })
  }
}
