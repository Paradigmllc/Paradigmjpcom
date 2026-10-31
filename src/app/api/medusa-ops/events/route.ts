import { readBoundedBody } from "@/lib/shopify-ops/operations/signature";
import { changeEvent, saveChange, verifyEventSignature } from "@/lib/medusa-ops/events";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const secret = process.env.SERICIA_MEDUSA_EVENT_SECRET;
  if (!secret || secret.length < 32) return new Response("Not configured", { status: 503 });
  let body: Buffer;
  try { body = await readBoundedBody(request, 4096); }
  catch { console.error("[medusa-events] body rejected"); return new Response("Invalid body", { status: 413 }); }
  if (!verifyEventSignature(body, request.headers.get("x-sericia-timestamp"), request.headers.get("x-sericia-signature"), secret)) return new Response("Unauthorized", { status: 401 });
  let event;
  try { event = changeEvent.parse(JSON.parse(body.toString("utf8"))); }
  catch { console.error("[medusa-events] payload rejected"); return new Response("Invalid event", { status: 400 }); }
  try { return Response.json({ ok: true, ...await saveChange(event) }); }
  catch { console.error("[medusa-events] persistence failed"); return new Response("Retry later", { status: 503 }); }
}
