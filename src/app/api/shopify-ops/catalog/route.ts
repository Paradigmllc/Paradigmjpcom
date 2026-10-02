import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizePayloadAdminRequest } from "@/lib/admin-auth";
import { catalogInputSchema } from "@/lib/shopify-ops/catalog";
import {
  exportCatalogDraft,
  getCatalog,
  saveCatalog,
} from "@/lib/shopify-ops/catalog-service";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;
async function actor(request: NextRequest, writing = false) {
  const auth = await authorizePayloadAdminRequest({ headers: request.headers });
  return auth.ok &&
    auth.userId &&
    (!writing || ["admin", "editor"].includes(auth.userRole ?? ""))
    ? `payload:${auth.userId}`
    : null;
}
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: NextRequest) {
  if (!(await actor(request)))
    return json({ ok: false, error: "Unauthorized" }, 401);
  try {
    return json({ ok: true, products: await getCatalog() });
  } catch (error) {
    console.error("[catalog] read failed", error);
    return json({ ok: false, error: "商品データを取得できません" }, 503);
  }
}
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), product: catalogInputSchema }),
  z.object({ action: z.literal("draft"), id: z.string().uuid() }),
]);
export async function POST(request: NextRequest) {
  const user = await actor(request, true);
  if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
  if (
    request.headers.get("origin") !==
    new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://paradigmjp.com").origin
  )
    return json({ ok: false, error: "Invalid origin" }, 403);
  try {
    const input = actionSchema.parse(await request.json());
    const result =
      input.action === "save"
        ? await saveCatalog(input.product, user)
        : await exportCatalogDraft(input.id, user);
    return json({ ok: true, result });
  } catch (error) {
    console.error("[catalog] action failed", error);
    return json(
      {
        ok: false,
        error:
          error instanceof z.ZodError || error instanceof SyntaxError
            ? "入力内容を確認してください"
            : error instanceof Error
              ? error.message
              : "商品処理に失敗しました",
      },
      error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 409,
    );
  }
}
