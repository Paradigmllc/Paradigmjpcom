import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { purgeExpiredPetMovieProjects } from "@/lib/pet-life-movie/retention"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function authorized(request: Request): boolean {
  const expected = process.env.ADMIN_SCRIPT_SECRET?.trim()
  const actual = request.headers.get("x-admin-secret")?.trim()
  if (!expected || !actual) return false
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(actual)
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  try {
    const purged = await purgeExpiredPetMovieProjects()
    return NextResponse.json({ ok: true, purged: purged.length }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("[pet-life-movie] retention cleanup failed", error)
    return NextResponse.json({ ok: false, error: "Retention cleanup failed" }, { status: 500 })
  }
}
