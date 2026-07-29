import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const origin = process.env.VIDEO_FACTORY_INTERNAL_URL?.trim() || "http://127.0.0.1:8080"
  try {
    const response = await fetch(new URL("/health", origin), {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return NextResponse.json(
      { ready: true, service: "video-factory" },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[video-factory-ready] internal service unavailable:", error)
    return NextResponse.json(
      { ready: false, service: "video-factory" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    )
  }
}
