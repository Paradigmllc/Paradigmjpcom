import { z } from "zod";
export const eventTopics = [
  "products/create",
  "products/update",
  "products/delete",
  "inventory_levels/update",
  "orders/create",
  "orders/updated",
  "orders/cancelled",
  "fulfillments/create",
  "fulfillments/update",
] as const;
export type EventTopic = (typeof eventTopics)[number];
export type EntityKind = "product" | "inventory" | "order" | "fulfillment";
const id = z
  .union([
    z.string().regex(/^\d+$/),
    z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  ])
  .transform(String);
const timestamp = z.string().datetime({ offset: true });
const text = z.string().max(500);
const nullableText = text.nullish();
const header = z.object({ id, updated_at: timestamp });
const product = header.extend({ title: text, handle: text, status: text });
const order = header.extend({
  name: text,
  financial_status: nullableText,
  fulfillment_status: nullableText,
  cancelled_at: timestamp.nullish(),
  line_items: z
    .array(
      z.object({
        id,
        sku: nullableText,
        quantity: z.number().int().nonnegative(),
      }),
    )
    .max(10000),
});
const fulfillment = header.extend({
  order_id: id,
  status: text,
  shipment_status: nullableText,
  tracking_company: nullableText,
  tracking_numbers: z.array(text).max(100).optional(),
});
const inventory = z.object({
  inventory_item_id: id,
  location_id: id,
  available: z.number().int().nullable(),
  updated_at: timestamp,
});
export interface SnapshotInput {
  kind: EntityKind;
  entityId: string;
  sourceUpdatedAt: string;
  data: Record<string, unknown>;
  deleted: boolean;
}
export function normalizeEvent(
  topic: EventTopic,
  payload: unknown,
  triggeredAt: string,
): SnapshotInput {
  if (topic === "products/delete") {
    const value = z.object({ id }).parse(payload);
    return {
      kind: "product",
      entityId: value.id,
      sourceUpdatedAt: timestamp.parse(triggeredAt),
      data: { id: value.id, status: "deleted" },
      deleted: true,
    };
  }
  const value = topic.startsWith("products/")
    ? product.parse(payload)
    : topic.startsWith("orders/")
      ? order.parse(payload)
      : topic.startsWith("fulfillments/")
        ? fulfillment.parse(payload)
        : inventory.parse(payload);
  const kind: EntityKind = topic.startsWith("products/")
    ? "product"
    : topic.startsWith("orders/")
      ? "order"
      : topic.startsWith("fulfillments/")
        ? "fulfillment"
        : "inventory";
  const entityId =
    "id" in value
      ? value.id
      : `${value.inventory_item_id}:${value.location_id}`;
  // Zod strips customer addresses, email, phone, notes and every unneeded field.
  return {
    kind,
    entityId,
    sourceUpdatedAt: value.updated_at,
    data: value,
    deleted: false,
  };
}
export interface OperationSnapshot {
  kind: EntityKind;
  entity_id: string;
  source_updated_at: string;
  received_at: string;
  deleted: boolean;
  data: Record<string, unknown>;
}
export interface OperationEvent {
  delivery_id: string;
  topic: string;
  outcome: string;
  received_at: string;
  error_code: string | null;
}
export interface OperationDashboard {
  snapshots: OperationSnapshot[];
  events: OperationEvent[];
  hasMore: boolean;
  shop: string;
  webhookConfigured: boolean;
  warehouseConfigured: boolean;
}
export function operationalStatus(row: OperationSnapshot): string {
  if (row.deleted) return "削除済み";
  if (row.kind === "inventory")
    return row.data.available === null
      ? "数量未確認"
      : `販売可能数 ${row.data.available}`;
  if (row.kind === "product")
    return (
      (
        { draft: "下書き", active: "公開中", archived: "アーカイブ" } as Record<
          string,
          string
        >
      )[String(row.data.status).toLowerCase()] ?? String(row.data.status)
    );
  if (row.kind === "fulfillment")
    return row.data.shipment_status === "delivered"
      ? "配達完了"
      : row.data.status === "success"
        ? "出荷登録済み（配達未確認）"
        : `配送状況: ${row.data.status}`;
  if (row.data.cancelled_at) return "キャンセル済み";
  if (row.data.fulfillment_status === "fulfilled")
    return "出荷登録済み（配達未確認）";
  if (row.data.fulfillment_status === "partial") return "一部出荷";
  if (
    row.data.financial_status === "refunded" ||
    row.data.financial_status === "voided"
  )
    return "返金・取消／出荷対象外";
  return row.data.financial_status === "paid"
    ? "支払済み・未出荷"
    : "支払確認待ち";
}
