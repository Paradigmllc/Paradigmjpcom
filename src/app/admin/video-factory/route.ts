import { NextRequest, NextResponse } from "next/server"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { relativeRedirect } from "@/lib/relative-redirect"

const LEGACY_ADMIN_COOKIE = "paradigm_admin_token"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizePayloadAdminRequest({
    headers: new Headers(request.headers),
    legacyToken: request.cookies.get(LEGACY_ADMIN_COOKIE)?.value,
  })

  if (!auth.ok) {
    return relativeRedirect(
      "/admin/login?redirect=%2Fadmin%2Fvideo-factory",
    )
  }

  // A raw relative Location header is intentional. Next's server-component
  // redirect() can resolve a relative path against Coolify's internal listener
  // (for example 0.0.0.0:3000), which must never be sent to the browser.
  return relativeRedirect("/console/")
}

export const HEAD = GET
