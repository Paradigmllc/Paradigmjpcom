import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { ingestLeadSourceConfig } from "@/lib/sales/lead-source-records"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(req: NextRequest, context: { params: Promise<{ sourceId: string }> }) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const { sourceId } = await context.params
    if (!z.string().uuid().safeParse(sourceId).success) return NextResponse.json({ ok: false, error: "Invalid source ID" }, { status: 400 })
    const result = await ingestLeadSourceConfig(sourceId)
    try {
      const { notifyBothChannels } = await import("@/lib/notify")
      await notifyBothChannels("sales", {
        title: "候補収集元の取込完了",
        message: `証拠付き企業${result.accepted}件を保存、形式不備${result.rejected}件。Twenty同期・文面生成・送信は未実行です。`,
        link: "/ja/admin/lead-factory",
        type: "lead_source_ingested",
      })
    } catch (error) {
      console.error("[lead-source-ingest] notification failed:", error)
    }
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("[lead-source-ingest] failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Lead source ingestion failed" }, { status: 500 })
  }
}
