import { NextRequest, NextResponse } from "next/server"
import {
  proxyVideoFactoryRequest,
  safeVideoFactorySegments,
} from "@/lib/video-factory-internal-proxy"
import { relativeRedirect } from "@/lib/relative-redirect"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

const PUBLIC_BASE = "/video-factory-console/"

type RouteContext = { params: Promise<{ path?: string[] }> }

async function handler(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  if (request.nextUrl.pathname === "/video-factory-console") {
    return relativeRedirect(PUBLIC_BASE, 307)
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
    {
      consoleEntry: suffix === "" || suffix === "index.html",
      consolePublicBase: PUBLIC_BASE,
      loginRedirectPath: PUBLIC_BASE,
    },
  )
}

export const GET = handler
export const HEAD = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
