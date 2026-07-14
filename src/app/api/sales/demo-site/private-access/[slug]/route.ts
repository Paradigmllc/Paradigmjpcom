import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import {
  activateTemporaryUnlistedDemo,
  getDemoPrivateAccess,
  revokeTemporaryUnlistedDemo,
} from "@/lib/sales/demo-private-access"
import { demoSiteUrl } from "@/lib/sales/routing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const assetSchema = z.object({
  id: z.string().min(1).max(120),
  kind: z.enum(["logo", "image", "video"]),
  sourceUrl: z.url().startsWith("https://"),
  ownerLabel: z.string().min(1).max(200),
  sourceAccount: z.string().min(1).max(500),
  useBasis: z.enum(["consented", "licensed", "official_embed", "private_proposal", "generated", "blocked"]),
  officialSource: z.boolean(),
  peopleVisible: z.boolean(),
  watermarkVisible: z.boolean(),
  alt: z.string().min(1).max(240),
  notes: z.string().max(500).optional(),
})

const activateSchema = z.object({
  ttlDays: z.number().int().min(1).max(7),
  locale: z.enum(["ja", "en"]).default("ja"),
  assets: z.array(assetSchema).min(1).max(20),
})

async function authorized(request: NextRequest) {
  return isSalesApiAuthorized(request)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await authorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  try {
    const { slug } = await params
    const access = await getDemoPrivateAccess(slug)
    if (!access) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true, access }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    console.error("[demo-private-access] GET failed:", error)
    return NextResponse.json({ ok: false, error: "取得に失敗しました" }, { status: 503 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await authorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  try {
    const body = activateSchema.safeParse(await request.json())
    if (!body.success) return NextResponse.json({ ok: false, error: body.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 })
    const { slug } = await params
    const result = await activateTemporaryUnlistedDemo({ slug, ttlDays: body.data.ttlDays, assets: body.data.assets })
    const origin = process.env.NODE_ENV === "production" ? demoSiteUrl() : request.nextUrl.origin
    const previewUrl = `${origin}/${encodeURIComponent(result.urlSlug)}`
    return NextResponse.json({ ok: true, previewUrl, expiresAt: result.expiresAt, review: result.review }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    console.error("[demo-private-access] POST failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "発行に失敗しました" }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await authorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  try {
    const { slug } = await params
    const revoked = await revokeTemporaryUnlistedDemo(slug)
    return NextResponse.json({ ok: revoked })
  } catch (error) {
    console.error("[demo-private-access] DELETE failed:", error)
    return NextResponse.json({ ok: false, error: "失効に失敗しました" }, { status: 503 })
  }
}
