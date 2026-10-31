import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { operationsDb } from "@/lib/shopify-ops/operations/store";
import { notifyBothChannels } from "@/lib/notify";
export const changeEvent = z.object({
  topic: z.enum(["product.created", "product.updated", "product.deleted", "inventory-item.created", "inventory-item.updated", "inventory-item.deleted", "inventory-level.created", "inventory-level.updated", "inventory-level.deleted"]),
  entityId: z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/),
  occurredAt: z.string().datetime({ offset: true }),
}).strict();
export function verifyEventSignature(body: Buffer, timestamp: string | null, signature: string | null, secret: string, now = Date.now()) {
  if (secret.length < 32 || !timestamp || !/^\d{13}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 300_000 || !signature || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(timestamp + ".").update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export async function saveChange(event: z.infer<typeof changeEvent>) {
  // Stable identity survives delivery retries; these are invalidation notices, not stock quantities.
  const id = createHash("sha256").update(JSON.stringify([event.topic, event.entityId, event.occurredAt])).digest("hex");
  const db = operationsDb();
  const saved = await db.from("sericia_medusa_events").upsert({ id, topic: event.topic, entity_id: event.entityId, occurred_at: event.occurredAt }, { onConflict: "id", ignoreDuplicates: true }).select("id");
  if (saved.error) throw new Error("event_persistence_failed");
  if (!saved.data?.length) return { duplicate: true };
  let notified = false;
  try {
    const notification = await notifyBothChannels("sales", { title: "SERICIA Medusa更新", message: `${event.topic}: ${event.entityId}`, link: "/ja/admin/shopify?tab=medusa", type: "sericia_medusa_change", idempotencyKey: `sericia-medusa-${id}` });
    notified = notification.ok;
  } catch { console.error("[medusa-events] notification failed"); }
  if (!notified) {
    console.error("[medusa-events] notification incomplete");
    const result = await db.from("sericia_medusa_events").update({ notification_error: true }).eq("id", id);
    if (result.error) throw new Error("notification_status_save_failed");
  }
  return { duplicate: false };
}
export async function readChanges() {
  const { data, error } = await operationsDb().from("sericia_medusa_events")
    .select("id,topic,entity_id,occurred_at,received_at,notification_error").order("received_at", { ascending: false }).limit(30);
  if (error) throw new Error("event_history_unavailable");
  return data ?? [];
}
