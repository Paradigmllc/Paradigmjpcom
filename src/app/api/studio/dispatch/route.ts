import { NextResponse } from "next/server"

export async function POST() {
  console.warn("[studio/dispatch] retired prototype endpoint was called")
  return NextResponse.json(
    {
      ok: false,
      error: "Studio dispatch API is retired; public Japan Entry applications use the contact flow.",
    },
    { status: 410 },
  )
}
