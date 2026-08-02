import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { ZodError } from "zod"

export function petMovieErrorResponse(error: unknown, context: string): NextResponse {
  if (error instanceof ZodError) {
    console.warn(`[pet-life-movie] ${context}: invalid request`, error.issues)
    return NextResponse.json(
      { ok: false, error: "入力内容を確認してください。" },
      { status: 400 },
    )
  }
  if (error instanceof Error && error.message === "INVALID_JSON") {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }
  const errorId = randomUUID()
  console.error(`[pet-life-movie] ${context} (${errorId})`, error)
  return NextResponse.json(
    { ok: false, error: "Service temporarily unavailable. Please try again.", errorId },
    { status: 500 },
  )
}

export function siteBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.PARADIGMJP_BASE_URL
  return (configured?.trim() || "https://paradigmjp.com").replace(/\/+$/, "")
}

