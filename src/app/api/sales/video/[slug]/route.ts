import { type NextRequest, NextResponse } from "next/server"

const R2_PUBLIC_BASE = "https://pub-ac30eb86a32747f1a27e304aa9c6f95a.r2.dev"

interface Props { params: Promise<{ slug: string }> }

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest, { params }: Props) {
  const { slug } = await params
  if (!slug?.includes(".")) return NextResponse.json({ error: "invalid slug" }, { status: 400 })

  // Extract variant + locale from slug (e.g., "japan_entry/ja.mp4" → videos/demo/japan_entry/ja/diagnostic-japan_entry.mp4)
  const key = `videos/demo/${slug.replace(".mp4", "")}/diagnostic-${slug.replace("/", "-").replace(".mp4", "")}.mp4`
  
  try {
    const res = await fetch(`${R2_PUBLIC_BASE}/${key}`, {
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return NextResponse.json({ error: "video not found" }, { status: 404 })

    const headers = new Headers()
    headers.set("Content-Type", "video/mp4")
    headers.set("Accept-Ranges", "bytes")
    headers.set("Cache-Control", "public, max-age=3600")

    return new NextResponse(res.body, { status: 200, headers })
  } catch {
    return NextResponse.json({ error: "proxy error" }, { status: 502 })
  }
}
