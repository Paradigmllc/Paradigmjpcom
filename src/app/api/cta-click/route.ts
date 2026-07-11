import { NextResponse } from "next/server"

/**
 * Legacy public CTA mutation endpoint.
 *
 * This route used to let an unauthenticated caller promote arbitrary prospects
 * to hot leads and create operator notifications. The public pixel cannot
 * establish identity, so the mutation is intentionally retired. The signed
 * contact flow is the supported conversion path.
 */
export const dynamic = "force-dynamic"

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "This tracking endpoint is retired. Use the authenticated contact flow.",
      code: "legacy_tracking_retired",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  )
}
