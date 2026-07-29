import { NextRequest, NextResponse } from "next/server"
import {
  authorizePayloadAdminRequest,
  createAdminApiSessionToken,
} from "@/lib/admin-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function safeWorkRedirect(value: string | null): string {
  if (!value) return "/work"
  if (!value.startsWith("/work") || value.startsWith("//")) return "/work"
  return value
}

function relativeRedirect(location: string): NextResponse {
  return new NextResponse(null, {
    status: 307,
    headers: {
      "Cache-Control": "no-store",
      Location: location,
    },
  })
}

function isHttpsRequest(req: NextRequest): boolean {
  const forwardedProto = req.headers.get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase()
  return forwardedProto === "https" || req.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production"
}

export async function GET(req: NextRequest) {
  const redirectTarget = safeWorkRedirect(req.nextUrl.searchParams.get("redirect"))
  const auth = await authorizePayloadAdminRequest({
    headers: req.headers,
    legacyToken: req.cookies.get("paradigm_admin_token")?.value,
  })

  if (!auth.ok) {
    const params = new URLSearchParams({ redirect: redirectTarget })
    return relativeRedirect(`/admin/login?${params.toString()}`)
  }

  const token = createAdminApiSessionToken()
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "管理者APIセッションを発行できません。ADMIN_SESSION_SECRET、ADMIN_PASSWORD、またはPAYLOAD_SECRETを確認してください。" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    )
  }

  // Never build this redirect from req.url. Behind Coolify/Traefik, req.url can
  // legitimately contain the internal listener (for example 0.0.0.0:3000).
  // A relative Location header keeps the browser on the public host that it
  // actually requested and prevents redirects to an unreachable container URL.
  const response = relativeRedirect(redirectTarget)
  response.cookies.set("paradigm_work_api_token", token, {
    httpOnly: true,
    secure: isHttpsRequest(req),
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60,
  })
  return response
}
