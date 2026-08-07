import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "../../../lib/media-os/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profiles = getDashboardSnapshot().productionProfiles;
    return NextResponse.json({
      ok: true,
      productionReady: profiles.filter((profile) => profile.productionReady).length,
      total: profiles.length,
      profiles,
    });
  } catch (error) {
    console.error("[production-profiles] load failed", error);
    return NextResponse.json({ ok: false, error: "制作プロファイルを読み込めませんでした" }, { status: 500 });
  }
}
