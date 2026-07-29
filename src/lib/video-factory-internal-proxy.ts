import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"

const INTERNAL_ORIGIN = process.env.VIDEO_FACTORY_INTERNAL_URL?.trim() || "http://127.0.0.1:8080"
const LEGACY_ADMIN_COOKIE = "paradigm_admin_token"
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
])

function internalApiKey(): string | null {
  const value = process.env.VIDEO_FACTORY_INTERNAL_API_KEY
    || process.env.ADMIN_SCRIPT_SECRET
    || process.env.ADMIN_PASSWORD
  return value?.trim() || null
}

function loginRedirect(request: NextRequest): NextResponse {
  const target = new URL("/admin/login", request.url)
  target.searchParams.set("redirect", "/admin/video-factory")
  return NextResponse.redirect(target, 307)
}

function isHtmlNavigation(request: NextRequest): boolean {
  return request.method === "GET"
    && (request.headers.get("accept") || "").includes("text/html")
}

function cleanRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers()
  for (const [name, value] of request.headers.entries()) {
    if (HOP_BY_HOP_HEADERS.has(name.toLowerCase()) || name.toLowerCase() === "cookie") continue
    headers.set(name, value)
  }
  const apiKey = internalApiKey()
  if (apiKey) headers.set("x-api-key", apiKey)
  headers.set("x-forwarded-host", request.headers.get("host") || "paradigmjp.com")
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""))
  return headers
}

function cleanResponseHeaders(source: Headers): Headers {
  const headers = new Headers()
  for (const [name, value] of source.entries()) {
    if (HOP_BY_HOP_HEADERS.has(name.toLowerCase()) || name.toLowerCase() === "content-encoding") continue
    headers.set(name, value)
  }
  headers.delete("content-length")
  headers.set("cache-control", "private, no-store")
  headers.set("x-robots-tag", "noindex, nofollow, noarchive")
  return headers
}

function injectConsoleRuntime(html: string): string {
  if (html.includes("console-run-poll.js")) return html
  return html.replace(
    "</body>",
    '  <script src="/console/console-run-poll.js" defer></script>\n</body>',
  )
}

export async function proxyVideoFactoryRequest(
  request: NextRequest,
  upstreamPath: string,
  options: { consoleEntry?: boolean } = {},
): Promise<NextResponse> {
  const auth = await authorizePayloadAdminRequest({
    headers: new Headers(request.headers),
    legacyToken: request.cookies.get(LEGACY_ADMIN_COOKIE)?.value,
  })
  if (!auth.ok) {
    if (isHtmlNavigation(request)) return loginRedirect(request)
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const upstreamUrl = new URL(upstreamPath, INTERNAL_ORIGIN)
  upstreamUrl.search = request.nextUrl.search
  const method = request.method.toUpperCase()
  const init: RequestInit = {
    method,
    headers: cleanRequestHeaders(request),
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(30 * 60 * 1000),
  }
  if (method !== "GET" && method !== "HEAD") {
    init.body = await request.arrayBuffer()
  }

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, init)
  } catch (error) {
    console.error("[video-factory-proxy] upstream unavailable:", error)
    return NextResponse.json(
      { ok: false, error: "Video Factory is not running" },
      { status: 503 },
    )
  }

  const responseHeaders = cleanResponseHeaders(upstream.headers)
  const contentType = upstream.headers.get("content-type") || ""
  if (options.consoleEntry && contentType.includes("text/html")) {
    const html = injectConsoleRuntime(await upstream.text())
    responseHeaders.set("content-type", "text/html; charset=utf-8")
    return new NextResponse(html, { status: upstream.status, headers: responseHeaders })
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

export function safeVideoFactorySegments(parts: string[] | undefined): string[] {
  const values = parts ?? []
  if (values.some((value) => value === "." || value === ".." || value.includes("\\"))) {
    throw new Error("Invalid Video Factory proxy path")
  }
  return values.map((value) => encodeURIComponent(value))
}
