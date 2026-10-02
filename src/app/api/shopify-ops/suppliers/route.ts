import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizePayloadAdminRequest,
  authorizeWebhookRequest,
} from "@/lib/admin-auth";
import {
  getSupplierObservations,
  refreshAllSupplierSources,
  refreshSupplierSource,
  saveSupplierSource,
} from "@/lib/shopify-ops/supplier-service";
export const maxDuration = 180;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function actor(request: NextRequest, writing = false) {
  if (authorizeWebhookRequest(request.headers).ok)
    return "system:supplier-monitor";
  const auth = await authorizePayloadAdminRequest({
    headers: request.headers,
  });
  const permitted =
    !writing || auth.userRole === "admin" || auth.userRole === "editor";
  return auth.ok && auth.userId && permitted ? `payload:${auth.userId}` : null;
}
export async function GET(request: NextRequest) {
  if (!(await actor(request)))
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  try {
    return NextResponse.json(
      { ok: true, sources: await getSupplierObservations() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[supplier-api] read failed", error);
    return NextResponse.json(
      { ok: false, error: "仕入先データを取得できません" },
      { status: 503 },
    );
  }
}
const inputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    productId: z.string().uuid(),
    sourceUrl: z.string().url().max(600),
  }),
  z.object({ action: z.literal("refresh"), productId: z.string().uuid() }),
  z.object({ action: z.literal("refresh_all") }),
]);
export async function POST(request: NextRequest) {
  const user = await actor(request, true);
  if (!user)
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  if (
    !authorizeWebhookRequest(request.headers).ok &&
    request.headers.get("origin") !==
      new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://paradigmjp.com")
        .origin
  )
    return NextResponse.json(
      { ok: false, error: "Invalid origin" },
      { status: 403 },
    );
  try {
    const input = inputSchema.parse(await request.json());
    const result =
      input.action === "save"
        ? await saveSupplierSource(input.productId, input.sourceUrl, user)
        : input.action === "refresh"
          ? await refreshSupplierSource(input.productId, user)
          : await refreshAllSupplierSources(user);
    return NextResponse.json(
      { ok: true, result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[supplier-api] action failed", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof z.ZodError || error instanceof SyntaxError
            ? "入力内容を確認してください"
            : "仕入先の処理に失敗しました。URLと接続状態を確認して再試行してください",
      },
      {
        status:
          error instanceof z.ZodError || error instanceof SyntaxError
            ? 400
            : 503,
      },
    );
  }
}
