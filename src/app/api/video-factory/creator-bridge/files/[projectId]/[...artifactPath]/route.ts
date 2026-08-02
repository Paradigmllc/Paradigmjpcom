import { NextResponse } from "next/server"
import {
  authorizeCreatorBridge,
  fetchCreatorArtifact,
  safeCreatorArtifact,
} from "@/lib/video-factory-creator-bridge"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string; artifactPath: string[] }> },
): Promise<NextResponse> {
  if (!authorizeCreatorBridge(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { projectId, artifactPath } = await context.params
    const safePath = safeCreatorArtifact(projectId, artifactPath)
    if (!safePath) return NextResponse.json({ ok: false, error: "Invalid artifact path" }, { status: 422 })
    const upstream = await fetchCreatorArtifact(projectId, safePath)
    const headers = new Headers()
    headers.set("Content-Type", upstream.headers.get("content-type") || "application/octet-stream")
    headers.set("Cache-Control", "private, no-store")
    const contentLength = upstream.headers.get("content-length")
    if (contentLength) headers.set("Content-Length", contentLength)
    return new NextResponse(upstream.body, { status: upstream.status, headers })
  } catch (error) {
    console.error("[creator-bridge-file] upstream failed", error)
    return NextResponse.json({ ok: false, error: "Artifact unavailable" }, { status: 503 })
  }
}
