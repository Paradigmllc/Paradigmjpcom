import { randomUUID } from "node:crypto"
import { after, NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { dispatchDemoBatchDrain } from "@/lib/sales/demo-batch-drain"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { mapWithConcurrency } from "@/lib/sales/demo-batch-wave"
import { queueListCandidateDemoForCompany, queuePortalListCandidatesDemo } from "@/lib/sales/demo-list-candidate"
import type { SalesCompany } from "@/lib/sales/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const requestSchema = z.object({
  candidateIds: z.array(z.uuid()).min(1).max(300).optional(),
  companyIds: z.array(z.uuid()).min(1).max(300).optional(),
  locale: z.enum(["ja", "en"]).default("ja"),
}).refine((value) => Boolean(value.candidateIds?.length || value.companyIds?.length), { message: "candidateIds または companyIds が必要です" })

export async function POST(request: NextRequest) {
  if (!(await isSalesApiAuthorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const parsed = requestSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 })
  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase unavailable", sendingEnabled: false }, { status: 503 })

  const waveId = randomUUID()
  if (parsed.data.candidateIds?.length) {
    try {
      const results = await queuePortalListCandidatesDemo(parsed.data.candidateIds, parsed.data.locale, "list_candidate_generated_visual", waveId)
      const queued = results.filter((result) => result.ok && result.status === "queued").length
      const reused = results.filter((result) => result.ok && result.reused).length
      const accepted = queued + reused
      const drainId = randomUUID()
      if (queued > 0) {
        after(async () => {
          const dispatched = await dispatchDemoBatchDrain({ drainId })
          if (!dispatched.ok) console.error("[list-candidate-demo] automatic drain failed:", dispatched.error)
        })
      }
      return NextResponse.json({
        ok: accepted === results.length,
        waveId,
        drainId,
        requested: results.length,
        queued,
        reused,
        rejected: results.length - accepted,
        results,
        sendingEnabled: false,
        sourcePolicy: "list_candidate_generated_visual",
      }, { status: accepted > 0 ? 202 : 422, headers: { "Cache-Control": "private, no-store" } })
    } catch (error) {
      console.error("[list-candidate-demo] portal candidate resolution failed:", error)
      return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "候補の会社紐付けに失敗しました", sendingEnabled: false }, { status: 500 })
    }
  }

  try {
    const { data, error } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("*")
      .in("id", parsed.data.companyIds ?? [])
    if (error) throw new Error(error.message)
    const companyById = new Map(((data ?? []) as SalesCompany[]).map((company) => [company.id, company]))
    const results = await mapWithConcurrency(parsed.data.companyIds ?? [], 8, async (companyId) => {
      const company = companyById.get(companyId)
      if (!company) return { ok: false, companyId, companyName: "", error: "company not found" }
      try {
        return await queueListCandidateDemoForCompany(company, parsed.data.locale, "list_candidate_generated_visual", waveId)
      } catch (error) {
        console.error(`[list-candidate-demo] ${companyId} queue failed:`, error)
        return { ok: false, companyId, companyName: company.company_name, error: error instanceof Error ? error.message : "queue failed" }
      }
    })
    const queued = results.filter((result) => result.ok && result.status === "queued").length
    const reused = results.filter((result) => result.ok && result.reused).length
    const accepted = queued + reused
    const drainId = randomUUID()
    if (queued > 0) {
      after(async () => {
        const dispatched = await dispatchDemoBatchDrain({ drainId })
        if (!dispatched.ok) console.error("[list-candidate-demo] automatic drain failed:", dispatched.error)
      })
    }
    return NextResponse.json({
      ok: accepted === results.length,
      waveId,
      drainId,
      requested: results.length,
      queued,
      reused,
      rejected: results.length - accepted,
      results,
      sendingEnabled: false,
      sourcePolicy: "list_candidate_generated_visual",
    }, {
      status: accepted > 0 ? 202 : 422,
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    console.error("[list-candidate-demo] batch failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "DEMO生成キュー投入に失敗しました", sendingEnabled: false }, { status: 500 })
  }
}
