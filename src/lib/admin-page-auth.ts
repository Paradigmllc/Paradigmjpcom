import "server-only"

import { cookies, headers } from "next/headers"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"

export async function isCurrentRequestAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const requestHeaders = await headers()
  const auth = await authorizePayloadAdminRequest({
    headers: new Headers(requestHeaders),
    legacyToken: cookieStore.get("paradigm_admin_token")?.value,
  })
  return auth.ok
}
