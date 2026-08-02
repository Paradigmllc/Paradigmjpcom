import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  return NextResponse.json({
    ok: false,
    error: "Legacy delivery callbacks are disabled. Use the signed Video Factory event route with human final approval and checksum-verified private delivery.",
  }, { status: 410 })
}

