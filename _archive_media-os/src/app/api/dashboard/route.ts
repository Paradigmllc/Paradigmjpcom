import { NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/media-os/auth";
import { getDashboardSnapshot } from "@/lib/media-os/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, data: getDashboardSnapshot() });
  } catch (error) {
    console.error("[media-os-dashboard] load failed", error);
    return NextResponse.json({ ok: false, error: "Dashboard data could not be loaded" }, { status: 500 });
  }
}
