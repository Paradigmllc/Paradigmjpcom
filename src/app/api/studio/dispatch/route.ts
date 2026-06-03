import { NextResponse } from "next/server"

export async function POST() {
  console.warn("[studio/dispatch] retired prototype endpoint was called")
  return NextResponse.json(
    {
      ok: false,
      error: "旧Studio dispatch APIは廃止済みです。Revenue OSの動画制作ラインAPIを使用してください。",
      replacement: "/api/sales/video-pipeline/jobs",
    },
    { status: 410 },
  )
}
