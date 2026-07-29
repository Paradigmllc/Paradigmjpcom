import { NextRequest, NextResponse } from "next/server"
import {
  proxyVideoFactoryRequest,
  safeVideoFactorySegments,
} from "@/lib/video-factory-internal-proxy"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

type RouteContext = { params: Promise<{ path?: string[] }> }

async function handler(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  if (request.nextUrl.pathname === "/console") {
    return NextResponse.redirect(new URL("/console/", request.url), 308)
  }
  let segments: string[]
  try {
    segments = safeVideoFactorySegments((await context.params).path)
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 })
  }
  const suffix = segments.length > 0 ? segments.join("/") : ""
  return proxyVideoFactoryRequest(
    request,
    suffix ? `/console/${suffix}` : "/console/",
    { consoleEntry: suffix === "" || suffix === "index.html" },
  )
}

export const GET = handler
export const HEAD = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
