import { NextRequest, NextResponse } from "next/server"
import { buildGeneratedDemoVisualSvg } from "@/lib/sales/demo-generated-visual"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string; index: string }> },
) {
  const { slug: rawSlug, index: rawIndex } = await context.params
  let slug = rawSlug
  try {
    slug = decodeURIComponent(rawSlug)
  } catch (error) {
    console.error("[demo-visuals] invalid slug encoding:", error)
  }
  const index = Number(rawIndex)
  if (!slug.trim() || !Number.isInteger(index) || index < 1 || index > 6) {
    return NextResponse.json({ ok: false, error: "invalid generated visual" }, { status: 400 })
  }
  const industry = request.nextUrl.searchParams.get("industry")
  const label = request.nextUrl.searchParams.get("label")
  const svg = buildGeneratedDemoVisualSvg({ slug, industry, variant: index, label })
  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Keep a short edge lifetime: the generator is shared by every existing
      // demo, so a visual-quality fix must reach old URLs without regenerating
      // hundreds of database rows.
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Demo-Visual-Version": "2026-07-18-visuals-2",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  })
}
