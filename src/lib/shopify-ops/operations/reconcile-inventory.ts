import { createHash, randomUUID } from "node:crypto";
import { shopifyGraphql } from "../shopify-admin";
import { normalizeEvent } from "./model";
import { persistEvent } from "./store";
type Page = { hasNextPage: boolean; endCursor: string | null };
type Item = {
  id: string;
  inventoryLevels: {
    nodes: {
      updatedAt: string;
      location: { id: string };
      quantities: { name: string; quantity: number }[];
    }[];
    pageInfo: Page;
  };
};
export async function reconcileInventory(cursor: string | null, actor: string) {
  if (!actor) throw new Error("操作主体が未確認です");
  const result = await shopifyGraphql<{
    inventoryItems: { nodes: Item[]; pageInfo: Page };
  }>(
    `query($cursor:String){inventoryItems(first:5,after:$cursor){nodes{id inventoryLevels(first:50){nodes{updatedAt location{id} quantities(names:["available"]){name quantity}}pageInfo{hasNextPage endCursor}}}pageInfo{hasNextPage endCursor}}}`,
    { cursor },
  );
  let levels = 0;
  for (const item of result.inventoryItems.nodes) {
    if (item.inventoryLevels.pageInfo.hasNextPage)
      throw new Error(
        "50を超える在庫ロケーションがあります。Shopifyで確認してください",
      );
    for (const level of item.inventoryLevels.nodes) {
      const data = {
        inventory_item_id: item.id.split("/").at(-1),
        location_id: level.location.id.split("/").at(-1),
        available:
          level.quantities.find((q) => q.name === "available")?.quantity ??
          null,
        updated_at: level.updatedAt,
      };
      await persistEvent(
        randomUUID(),
        "reconcile/inventory",
        createHash("sha256").update(JSON.stringify(data)).digest("hex"),
        normalizeEvent("inventory_levels/update", data, level.updatedAt),
        actor,
      );
      levels++;
    }
  }
  return {
    count: result.inventoryItems.nodes.length,
    levels,
    cursor: result.inventoryItems.pageInfo.hasNextPage
      ? result.inventoryItems.pageInfo.endCursor
      : null,
  };
}
