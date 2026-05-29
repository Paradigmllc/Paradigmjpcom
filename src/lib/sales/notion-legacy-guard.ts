import { NextResponse } from "next/server"

export function isNotionLegacySyncEnabled(): boolean {
  return process.env.NOTION_LEGACY_SYNC_ENABLED === "true"
}

export function notionLegacyDisabledResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "Notion legacy sync is disabled. Supabase OSS is the Sales OS SSOT; use Notion only for customer-facing workspaces.",
    },
    { status: 410 },
  )
}
