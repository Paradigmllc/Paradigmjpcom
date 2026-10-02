import { createHash, randomUUID } from "node:crypto";
import { shopifyGraphql } from "../shopify-admin";
import { normalizeEvent } from "./model";
import { persistEvent } from "./store";
// One bounded page per request; the UI exposes and follows the returned cursor.
export async function reconcileProducts(cursor: string | null, actor: string) {
  if (!actor) throw new Error("操作主体が未確認です");
  const result = await shopifyGraphql<{
    products: {
      nodes: {
        legacyResourceId: string;
        title: string;
        handle: string;
        status: string;
        updatedAt: string;
      }[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>(
    `query($cursor:String){products(first:50,after:$cursor){nodes{legacyResourceId title handle status updatedAt}pageInfo{hasNextPage endCursor}}}`,
    { cursor },
  );
  for (const p of result.products.nodes) {
    const data = {
      id: p.legacyResourceId,
      title: p.title,
      handle: p.handle,
      status: p.status.toLowerCase(),
      updated_at: p.updatedAt,
    };
    await persistEvent(
      randomUUID(),
      "reconcile/products",
      createHash("sha256").update(JSON.stringify(data)).digest("hex"),
      normalizeEvent("products/update", data, p.updatedAt),
      actor,
    );
  }
  return {
    count: result.products.nodes.length,
    cursor: result.products.pageInfo.hasNextPage
      ? result.products.pageInfo.endCursor
      : null,
  };
}
