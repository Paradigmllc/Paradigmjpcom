import { NextResponse } from "next/server"
import {
  authorizeCreatorBridge,
  callCreatorFactory,
  creatorBridgeRequestSchema,
} from "@/lib/video-factory-creator-bridge"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.VIDEO_FACTORY_CREATOR_BRIDGE_SECRET?.trim()) {
    console.error("[creator-bridge] bridge secret is not configured")
    return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 })
  }
  if (!authorizeCreatorBridge(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const parsed = creatorBridgeRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid bridge request" }, { status: 422 })
    }
    const upstream = await callCreatorFactory(parsed.data)
    const body = await upstream.text()
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("[creator-bridge] upstream failed", error)
    return NextResponse.json({ ok: false, error: "Video Factory unavailable" }, { status: 503 })
  }
}
