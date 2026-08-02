import { NextResponse } from "next/server"
import { revokeQuoteRecoverySession } from "@/lib/quote-recovery/auth"
import { quoteRecoveryMutationAllowed } from "@/lib/quote-recovery/http"

export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!quoteRecoveryMutationAllowed(request)) return NextResponse.json({ ok: false, error: "Invalid request origin" }, { status: 403 })
  await revokeQuoteRecoverySession()
  return NextResponse.json({ ok: true })
}
