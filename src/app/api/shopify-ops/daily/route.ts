import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizePayloadAdminRequest,
  authorizeWebhookRequest,
} from "@/lib/admin-auth";
import { jobKinds } from "@/lib/shopify-ops/daily/model";
import {
  getDailyJobs,
  getDailyHistory,
  runDailyJob,
} from "@/lib/shopify-ops/daily/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function actor(request: NextRequest, write = false) {
  if (authorizeWebhookRequest(request.headers).ok)
    return "system:daily-operations";
  const user = await authorizePayloadAdminRequest({ headers: request.headers });
  return user.ok &&
    user.userId &&
    (!write || ["admin", "editor"].includes(user.userRole ?? ""))
    ? `payload:${user.userId}`
    : null;
}
export async function GET(request: NextRequest) {
  if (!(await actor(request)))
    return json({ ok: false, error: "Unauthorized" }, 401);
  try {
    const [jobs, history] = await Promise.all([
      getDailyJobs(),
      getDailyHistory(),
    ]);
    return json({ ok: true, jobs, history });
  } catch (error) {
    console.error("[daily-api] read failed", error);
    return json({ ok: false, error: "実行状況を読み込めません" }, 503);
  }
}
export async function POST(request: NextRequest) {
  const user = await actor(request, true);
  if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
  if (
    !authorizeWebhookRequest(request.headers).ok &&
    request.headers.get("origin") !==
      new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://paradigmjp.com")
        .origin
  )
    return json({ ok: false, error: "Invalid origin" }, 403);
  try {
    const input = z
      .object({ kind: z.enum(jobKinds) })
      .parse(await request.json());
    return json({ ok: true, result: await runDailyJob(input.kind, user) });
  } catch (error) {
    console.error("[daily-api] action failed", error);
    return json(
      { ok: false, error: "入力・接続・実行履歴を確認してください" },
      error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 503,
    );
  }
}
