import { NextResponse } from "next/server"
import { ZodError } from "zod"

export function petMovieErrorResponse(error: unknown, context: string): NextResponse {
  console.error(`[pet-life-movie] ${context}`, error)
  if (error instanceof ZodError) {
    return NextResponse.json(
      { ok: false, error: "入力内容を確認してください。", issues: error.issues },
      { status: 400 },
    )
  }
  if (error instanceof Error && error.message === "INVALID_JSON") {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }
  return NextResponse.json(
    { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
    { status: 500 },
  )
}

export function siteBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.PARADIGMJP_BASE_URL
  return (configured?.trim() || "https://paradigmjp.com").replace(/\/+$/, "")
}

