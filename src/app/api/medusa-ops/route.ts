import { NextRequest, NextResponse } from "next/server";
import { authorizePayloadAdminRequest } from "@/lib/admin-auth";
import { catalogQuery, getMedusaCatalog } from "@/lib/medusa-ops/catalog";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const json = (value: unknown, status = 200) => NextResponse.json(value, {
  status, headers: { "Cache-Control": "private, no-store" },
});
export async function GET(request: NextRequest) {
  const auth = await authorizePayloadAdminRequest({ headers: request.headers });
  if (!auth.ok || !auth.userId || !["admin", "editor"].includes(auth.userRole ?? "")) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }
  const parsed = catalogQuery.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return json({ ok: false, error: "取得条件を確認してください" }, 400);
  try {
    return json({ ok: true, catalog: await getMedusaCatalog(parsed.data) });
  } catch {
    // Upstream exceptions can include private URLs or payloads; keep them out of logs and responses.
    console.error("[medusa-ops] catalog retrieval failed");
    return json({ ok: false, error: "Medusaのデータを取得できません。接続設定と稼働状況を確認してください" }, 503);
  }
}
