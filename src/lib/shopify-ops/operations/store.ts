import { getServiceSalesSupabase } from "@/lib/supabase";
import type { OperationDashboard, SnapshotInput } from "./model";
export function operationsDb() {
  const db = getServiceSalesSupabase();
  if (!db) throw new Error("運用DBが未設定です");
  return db;
}
export function storeDomain() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.replace(/^https:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();
  if (!domain || !/^[a-z0-9-]+\.myshopify\.com$/.test(domain))
    throw new Error("Shopifyストアが未設定です");
  return domain;
}
export async function persistEvent(
  deliveryId: string,
  topic: string,
  hash: string,
  input: SnapshotInput,
  actor: string,
) {
  if (!actor) throw new Error("操作主体が未確認です");
  const { data, error } = await operationsDb().rpc("sericia_ingest_event", {
    p_shop: storeDomain(),
    p_delivery: deliveryId,
    p_topic: topic,
    p_hash: hash,
    p_kind: input.kind,
    p_entity: input.entityId,
    p_version: input.sourceUpdatedAt,
    p_data: input.data,
    p_deleted: input.deleted,
    p_actor: actor,
  });
  if (error) {
    console.error("[sericia-events] persistence failed", { code: error.code });
    throw new Error("同期結果を保存できません");
  }
  return String(data);
}
export async function recordEventFailure(
  deliveryId: string,
  topic: string,
  hash: string,
) {
  const { error } = await operationsDb()
    .from("sericia_operation_events")
    .upsert(
      {
        shop: storeDomain(),
        delivery_id: deliveryId,
        topic,
        body_hash: hash,
        outcome: "invalid",
        error_code: "payload_validation_failed",
        actor: "shopify:webhook",
      },
      { onConflict: "shop,delivery_id", ignoreDuplicates: true },
    );
  if (error) {
    console.error("[sericia-events] failure persistence failed", {
      code: error.code,
    });
    throw new Error("受信エラーを保存できません");
  }
}
export async function getOperations(): Promise<OperationDashboard> {
  const db = operationsDb(),
    shop = storeDomain();
  const [snapshots, events] = await Promise.all([
    db
      .from("sericia_operation_snapshots")
      .select("kind,entity_id,source_updated_at,received_at,deleted,data")
      .eq("shop", shop)
      .order("received_at", { ascending: false })
      .limit(201),
    db
      .from("sericia_operation_events")
      .select("delivery_id,topic,outcome,received_at,error_code")
      .eq("shop", shop)
      .order("received_at", { ascending: false })
      .limit(50),
  ]);
  if (snapshots.error || events.error)
    throw new Error("同期状況を読み込めません");
  return {
    snapshots: (snapshots.data ?? []).slice(
      0,
      200,
    ) as OperationDashboard["snapshots"],
    events: (events.data ?? []) as OperationDashboard["events"],
    hasMore: (snapshots.data?.length ?? 0) > 200,
    shop,
    webhookConfigured: !!process.env.SHOPIFY_CLIENT_SECRET,
    warehouseConfigured: !!process.env.OPENLOGI_API_TOKEN,
  };
}
