import "server-only"

import { timingSafeEqual } from "node:crypto"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"

function safeSecretEqual(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  if (receivedBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(receivedBuffer, expectedBuffer)
}

/**
 * Authorize a server-side operator request without exposing service keys.
 * Script callers use x-admin-secret; browser operators may use Payload auth.
 */
export async function isAuthorizedOperatorRequest(req: Request): Promise<boolean> {
  const configuredSecret = process.env.ADMIN_SCRIPT_SECRET?.trim()
  const receivedSecret = req.headers.get("x-admin-secret")?.trim()
  if (configuredSecret && receivedSecret && safeSecretEqual(receivedSecret, configuredSecret)) {
    return true
  }

  const payloadAuth = await authorizePayloadAdminRequest({
    headers: new Headers(req.headers),
    legacyToken: req.headers.get("x-admin-password"),
    allowLegacyPassword: true,
  })
  return payloadAuth.ok
}

