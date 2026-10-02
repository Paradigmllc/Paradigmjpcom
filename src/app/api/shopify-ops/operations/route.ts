import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizePayloadAdminRequest } from "@/lib/admin-auth";
import { getOperations } from "@/lib/shopify-ops/operations/store";
import {
  connectSubscriptions,
  subscriptionStatus,
} from "@/lib/shopify-ops/operations/subscriptions";
import { reconcileInventory } from "@/lib/shopify-ops/operations/reconcile-inventory";
import { reconcileOrders } from "@/lib/shopify-ops/operations/reconcile-orders";
import { reconcileProducts } from "@/lib/shopify-ops/operations/reconcile";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function actor(request: NextRequest, write = false) {
  const auth = await authorizePayloadAdminRequest({ headers: request.headers });
  return auth.ok &&
    auth.userId &&
    (!write || ["admin", "editor"].includes(auth.userRole ?? ""))
    ? `payload:${auth.userId}`
    : null;
}
export async function GET(request: NextRequest) {
  if (!(await actor(request)))
    return json({ ok: false, error: "Unauthorized" }, 401);
  try {
    return json({ ok: true, dashboard: await getOperations() });
  } catch (error) {
    console.error("[operations] read failed", error);
    return json({ ok: false, error: "運用状況を取得できません" }, 503);
  }
}
const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status") }),
  z.object({ action: z.literal("connect") }),
  z.object({
    action: z.enum(["reconcile", "reconcileOrders", "reconcileInventory"]),
    cursor: z.string().max(2000).nullable(),
  }),
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
    const input = action.parse(await request.json());
    const result =
      input.action === "status"
        ? await subscriptionStatus()
        : input.action === "connect"
          ? await connectSubscriptions(user)
          : input.action === "reconcileInventory"
            ? await reconcileInventory(input.cursor, user)
            : input.action === "reconcileOrders"
              ? await reconcileOrders(input.cursor, user)
              : await reconcileProducts(input.cursor, user);
    return json({ ok: true, result });
  } catch (error) {
    console.error(
      "[operations] action failed",
      error instanceof Error ? error.message : "unknown",
    );
    return json(
      {
        ok: false,
        error:
          error instanceof z.ZodError
            ? "入力を確認してください"
            : error instanceof Error
              ? error.message
              : "処理に失敗しました",
      },
      error instanceof z.ZodError ? 400 : 503,
    );
  }
}
