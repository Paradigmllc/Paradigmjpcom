import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 5

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    {
      ok: false,
      error: "Legacy diagnostic video proxy is retired. Use the Japan Entry application flow.",
    },
    {
      status: 410,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  )
}
