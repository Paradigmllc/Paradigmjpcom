import { NextResponse } from "next/server";
import { isProductionAuthConfigured, isStudioEnabled } from "@/lib/media-os/auth";
import { getDashboardSnapshot } from "@/lib/media-os/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = getDashboardSnapshot();
    const configured = isStudioEnabled() && isProductionAuthConfigured();
    return NextResponse.json(
      {
        ok: configured,
        service: "youtube-media-os",
        release: process.env.MEDIA_OS_RELEASE_FINGERPRINT?.trim() || "development",
        database: "ready",
        channels: snapshot.channels.length,
      },
      { status: configured ? 200 : 503 },
    );
  } catch (error) {
    console.error("[media-os-health] database check failed", error);
    return NextResponse.json(
      { ok: false, service: "youtube-media-os", database: "unavailable" },
      { status: 503 },
    );
  }
}
