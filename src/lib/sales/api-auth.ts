import { NextRequest } from "next/server"
import {
  authorizePayloadAdminRequest,
  authorizeWebhookRequest,
  verifyAdminSessionToken,
} from "@/lib/admin-auth"

export async function isSalesApiAuthorized(req: NextRequest): Promise<boolean> {
  const webhookAuth = authorizeWebhookRequest(req.headers)
  if (webhookAuth.ok) return true

  const workApiToken = req.cookies.get("paradigm_work_api_token")?.value
  if (verifyAdminSessionToken(workApiToken)) return true

  const adminAuth = await authorizePayloadAdminRequest({
    headers: req.headers,
    legacyToken: req.cookies.get("paradigm_admin_token")?.value,
  })

  return adminAuth.ok
}
