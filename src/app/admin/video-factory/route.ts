import { NextRequest, NextResponse } from "next/server"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { relativeRedirect } from "@/lib/relative-redirect"

const LEGACY_ADMIN_COOKIE = "paradigm_admin_token"
const CONSOLE_PATH = "/video-factory-console"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizePayloadAdminRequest({
    headers: new Headers(request.headers),
    legacyToken: request.cookies.get(LEGACY_ADMIN_COOKIE)?.value,
  })

  if (!auth.ok) {
    return relativeRedirect(
      "/admin/login?redirect=%2Fvideo-factory-console",
    )
  }

  // Use a fresh, cache-safe public path rather than the historic /console/
  // route. Chrome can retain a previously issued permanent redirect even after
  // the origin is fixed, so this alias lets operators enter immediately.
  return relativeRedirect(CONSOLE_PATH)
}

export const HEAD = GET
