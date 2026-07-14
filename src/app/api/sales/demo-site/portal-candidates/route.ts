import { randomUUID } from "node:crypto"
import { after } from "next/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { demoSourceManifestSchema } from "@/lib/sales/demo-source-policy"
import { dispatchDemoBatchDrain } from "@/lib/sales/demo-batch-drain"
import { INDUSTRIES } from "@/lib/sales/types"
import {
  approvePortalCandidateForDemo,
  ingestPortalCandidateUrls,
  listPortalCandidates,
  readPortalSnapshot,
} from "@/lib/sales/portal-sources/service"
import { PORTAL_SOURCES } from "@/lib/sales/portal-sources/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const SourceSchema = z.enum(PORTAL_SOURCES)
const ImportSchema = z.object({
  source: SourceSchema,
  urls: z.array(z.url().startsWith("https://")).min(1).max(100),
})
const AssetSchema = demoSourceManifestSchema.shape.assets.element
const ApproveSchema = z.object({
  candidateId: z.uuid(),
  industry: z.enum(INDUSTRIES),
  prefecture: z.string().max(80).optional(),
  assets: z.array(AssetSchema).min(3).max(20),
})

async function notifyPortalResult(title: string, message: string, idempotencyKey: string): Promise<void> {
  try {
    const { notifyBothChannels } = await import("@/lib/notify")
    const result = await notifyBothChannels("sales", {
      title,
      message,
      link: "/ja/admin/demo-assets",
      type: "portal_demo_source",
      idempotencyKey,
    })
    if (!result.ok) console.error("[portal-candidates] notification incomplete:", result)
  } catch (error) {
    console.error("[portal-candidates] notification failed:", error)
  }
}

export async function GET(request: NextRequest) {
  if (!(await isSalesApiAuthorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  try {
    const sourceValue = request.nextUrl.searchParams.get("source")
    const source = sourceValue ? SourceSchema.safeParse(sourceValue) : null
    if (source && !source.success) return NextResponse.json({ ok: false, error: "Invalid portal source" }, { status: 400 })
    const candidates = await listPortalCandidates(source?.data, 100)
    return NextResponse.json({
      ok: true,
      candidates: candidates.flatMap((candidate) => {
        const snapshot = readPortalSnapshot(candidate)
        return snapshot ? [{
          id: candidate.id,
          status: candidate.status,
          opportunityScore: candidate.score?.opportunityScore ?? 0,
          source: snapshot.source,
          listingUrl: snapshot.listingUrl,
          companyName: snapshot.companyName,
          category: snapshot.category,
          description: snapshot.description,
          address: snapshot.address,
          prefecture: snapshot.prefecture,
          websiteUrl: snapshot.websiteUrl,
          contactUrl: snapshot.contactUrl,
          images: snapshot.images,
          suggestedIndustry: snapshot.suggestedIndustry,
          reviewStatus: snapshot.status,
          lastSeenAt: candidate.lastSeenAt,
        }] : []
      }),
      sendingEnabled: false,
    }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    console.error("[portal-candidates] list failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "候補取得に失敗しました" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await isSalesApiAuthorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  try {
    const parsed = ImportSchema.safeParse(await request.json())
    if (!parsed.success) {
      console.error("[portal-candidates] invalid import:", parsed.error)
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 })
    }
    const result = await ingestPortalCandidateUrls(parsed.data.source, [...new Set(parsed.data.urls)])
    if (result.imported > 0) {
      await notifyPortalResult(
        "ポータル候補を収集",
        `${parsed.data.source}: ${result.imported}件保存 / ${result.failed}件失敗 / 送信なし`,
        `portal-import:${parsed.data.source}:${new Date().toISOString().slice(0, 13)}`,
      )
    }
    return NextResponse.json({ ...result, sendingEnabled: false }, { status: result.ok ? 200 : 422 })
  } catch (error) {
    console.error("[portal-candidates] import failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "ポータル取得に失敗しました" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!(await isSalesApiAuthorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  try {
    const parsed = ApproveSchema.safeParse(await request.json())
    if (!parsed.success) {
      console.error("[portal-candidates] invalid approval:", parsed.error)
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 })
    }
    const result = await approvePortalCandidateForDemo(parsed.data)
    if (!result.ok) return NextResponse.json({ ...result, sendingEnabled: false }, { status: 422 })
    const drainId = randomUUID()
    if (!result.reused) {
      after(async () => {
        const dispatched = await dispatchDemoBatchDrain({ drainId })
        if (!dispatched.ok) console.error("[portal-candidates] automatic demo drain failed:", dispatched.error)
      })
    }
    await notifyPortalResult(
      "ポータル候補をDEMO生成へ追加",
      `${result.companyName ?? parsed.data.candidateId} / 素材${parsed.data.assets.length}件 / 送信なし`,
      `portal-demo:${parsed.data.candidateId}:${result.jobId ?? "reused"}`,
    )
    return NextResponse.json({ ...result, automated: !result.reused, drainId }, { status: 202, headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    console.error("[portal-candidates] approval failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "DEMOキュー投入に失敗しました", sendingEnabled: false }, { status: 500 })
  }
}
