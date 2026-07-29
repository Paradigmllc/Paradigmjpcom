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

export async function GET(req: NextRequest) {
  const redirectTarget = safeWorkRedirect(req.nextUrl.searchParams.get("redirect"))
  const auth = await authorizePayloadAdminRequest({
    headers: req.headers,
    legacyToken: req.cookies.get("paradigm_admin_token")?.value,
  })

  if (!auth.ok) {
    const login = new URL("/admin/login", req.url)
    login.searchParams.set("redirect", redirectTarget)
    return NextResponse.redirect(login)
  }

  const token = createAdminApiSessionToken()
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "管理者APIセッションを発行できません。ADMIN_SESSION_SECRET、ADMIN_PASSWORD、またはPAYLOAD_SECRETを確認してください。" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    )
  }

  const response = NextResponse.redirect(new URL(redirectTarget, req.url))
  response.headers.set("Cache-Control", "no-store")
  response.cookies.set("paradigm_work_api_token", token, {
    httpOnly: true,
    secure: req.nextUrl.protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60,
  })
  return response
}
