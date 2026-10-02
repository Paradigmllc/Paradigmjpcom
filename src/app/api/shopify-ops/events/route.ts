import { createHash } from "node:crypto";
import { z } from "zod";
import {
  eventTopics,
  normalizeEvent,
} from "@/lib/shopify-ops/operations/model";
import {
  readBoundedBody,
  verifyShopifySignature,
} from "@/lib/shopify-ops/operations/signature";
import {
  persistEvent,
  recordEventFailure,
  storeDomain,
} from "@/lib/shopify-ops/operations/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });
  let body: Buffer;
  try {
    body = await readBoundedBody(request);
  } catch (error) {
    console.error(
      "[sericia-webhook] rejected body",
      error instanceof Error ? error.message : "read_failed",
    );
    return new Response("Invalid body", { status: 413 });
  }
  if (
    !verifyShopifySignature(
      body,
      request.headers.get("x-shopify-hmac-sha256"),
      secret,
    )
  )
    return new Response("Unauthorized", { status: 401 });
  try {
    if (request.headers.get("x-shopify-shop-domain") !== storeDomain())
      return new Response("Invalid shop", { status: 403 });
    const topic = z
      .enum(eventTopics)
      .safeParse(request.headers.get("x-shopify-topic"));
    const delivery = z
      .string()
      .uuid()
      .safeParse(request.headers.get("x-shopify-webhook-id"));
    if (!topic.success || !delivery.success)
      return new Response("Invalid event headers", { status: 400 });
    const hash = createHash("sha256").update(body).digest("hex");
    let input;
    try {
      input = normalizeEvent(
        topic.data,
        JSON.parse(body.toString("utf8")),
        request.headers.get("x-shopify-triggered-at") ?? "",
      );
    } catch (error) {
      console.error("[sericia-webhook] payload validation failed", {
        deliveryId: delivery.data,
        topic: topic.data,
        validationError: error instanceof z.ZodError,
      });
      await recordEventFailure(delivery.data, topic.data, hash);
      return new Response("Invalid payload", { status: 422 });
    }
    await persistEvent(
      delivery.data,
      topic.data,
      hash,
      input,
      "shopify:webhook",
    );
    return new Response("OK");
  } catch (error) {
    console.error(
      "[sericia-webhook] processing failed",
      error instanceof Error ? error.message : "unknown",
    );
    return new Response("Retry later", { status: 503 });
  }
}
