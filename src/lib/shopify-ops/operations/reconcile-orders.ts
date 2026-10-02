import { createHash, randomUUID } from "node:crypto";
import { shopifyGraphql } from "../shopify-admin";
import { normalizeEvent, type EventTopic } from "./model";
import { persistEvent } from "./store";
type Order = {
  legacyResourceId: string;
  name: string;
  updatedAt: string;
  cancelledAt: string | null;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string;
  lineItems: {
    nodes: { id: string; sku: string | null; quantity: number }[];
    pageInfo: { hasNextPage: boolean };
  };
  fulfillments: Fulfillment[];
};
type Fulfillment = {
  legacyResourceId: string;
  updatedAt: string;
  status: string;
  displayStatus: string | null;
  trackingInfo: { company: string | null; number: string | null }[];
};
async function save(
  topic: EventTopic,
  data: Record<string, unknown>,
  actor: string,
) {
  await persistEvent(
    randomUUID(),
    `reconcile/${topic}`,
    createHash("sha256").update(JSON.stringify(data)).digest("hex"),
    normalizeEvent(topic, data, String(data.updated_at)),
    actor,
  );
}
export async function reconcileOrders(cursor: string | null, actor: string) {
  if (!actor) throw new Error("操作主体が未確認です");
  const result = await shopifyGraphql<{
    orders: {
      nodes: Order[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>(
    `query($cursor:String){orders(first:2,after:$cursor,sortKey:UPDATED_AT,reverse:true){nodes{legacyResourceId name updatedAt cancelledAt displayFinancialStatus displayFulfillmentStatus lineItems(first:250){nodes{id sku quantity}pageInfo{hasNextPage}} fulfillments(first:100){legacyResourceId updatedAt status displayStatus trackingInfo{company number}}}pageInfo{hasNextPage endCursor}}}`,
    { cursor },
  );
  for (const order of result.orders.nodes) {
    if (
      order.lineItems.pageInfo.hasNextPage ||
      order.fulfillments.length >= 100
    )
      throw new Error(
        "大口注文の明細はShopifyで確認してください。取得上限のため再同期を完了していません",
      );
    const state = order.displayFulfillmentStatus.toLowerCase();
    await save(
      "orders/updated",
      {
        id: order.legacyResourceId,
        name: order.name,
        updated_at: order.updatedAt,
        cancelled_at: order.cancelledAt,
        financial_status: order.displayFinancialStatus?.toLowerCase() ?? null,
        fulfillment_status:
          state === "fulfilled"
            ? "fulfilled"
            : state === "partially_fulfilled"
              ? "partial"
              : null,
        line_items: order.lineItems.nodes.map((item) => ({
          id: item.id.split("/").at(-1),
          sku: item.sku,
          quantity: item.quantity,
        })),
      },
      actor,
    );
    for (const f of order.fulfillments) {
      await save(
        "fulfillments/update",
        {
          id: f.legacyResourceId,
          order_id: order.legacyResourceId,
          updated_at: f.updatedAt,
          status: f.status.toLowerCase(),
          shipment_status: f.displayStatus?.toLowerCase() ?? null,
          tracking_company: f.trackingInfo[0]?.company ?? null,
          tracking_numbers: f.trackingInfo.flatMap((t) =>
            t.number ? [t.number] : [],
          ),
        },
        actor,
      );
    }
  }
  return {
    count: result.orders.nodes.length,
    cursor: result.orders.pageInfo.hasNextPage
      ? result.orders.pageInfo.endCursor
      : null,
  };
}
