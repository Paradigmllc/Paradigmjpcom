import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorizeSalesApiRequest } from "@/lib/sales/api-auth"
import { authorizeOutboundAttempt } from "@/lib/sales/outreach/global-suppression"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  companyId: z.string().uuid(),
  channel: z.string().trim().min(2).max(80),
  recipient: z.string().trim().min(2).max(2000),
  message: z.string().min(1).max(100_000),
  dryRun: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  const auth = await authorizeSalesApiRequest(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const parsed = schema.safeParse(await req.json().catch((error) => {
    console.error("[outreach-guard] invalid JSON:", error)
    return null
  }))
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid outbound guard input", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
  const guard = await authorizeOutboundAttempt(parsed.data)
  return NextResponse.json({ ok: guard.allowed, guard }, { status: guard.allowed ? 200 : 409 })
}
