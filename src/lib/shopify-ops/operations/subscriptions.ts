import { shopifyGraphql } from "../shopify-admin";
const topics = [
  ["PRODUCTS_CREATE", "read_products"],
  ["PRODUCTS_UPDATE", "read_products"],
  ["PRODUCTS_DELETE", "read_products"],
  ["INVENTORY_LEVELS_UPDATE", "read_inventory"],
  ["ORDERS_CREATE", "read_orders"],
  ["ORDERS_UPDATED", "read_orders"],
  ["ORDERS_CANCELLED", "read_orders"],
  ["FULFILLMENTS_CREATE", "read_orders"],
  ["FULFILLMENTS_UPDATE", "read_orders"],
] as const;
export async function subscriptionStatus() {
  const origin = new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://paradigmjp.com",
  );
  if (origin.protocol !== "https:")
    throw new Error("Webhook公開先はHTTPSが必要です");
  const uri = new URL("/api/shopify-ops/events", origin).href;
  const access = await shopifyGraphql<{
    currentAppInstallation: { accessScopes: { handle: string }[] };
  }>(`query { currentAppInstallation { accessScopes { handle } } }`);
  const scopes = new Set(
    access.currentAppInstallation.accessScopes.flatMap((s) => [
      s.handle,
      s.handle.replace(/^write_/, "read_"),
    ]),
  );
  const subscriptions: { topic: string; uri: string }[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 20; page++) {
    const result: {
      webhookSubscriptions: {
        nodes: { topic: string; uri: string }[];
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
    } = await shopifyGraphql(
      `query($cursor:String){webhookSubscriptions(first:100,after:$cursor){nodes{topic uri}pageInfo{hasNextPage endCursor}}}`,
      { cursor },
    );
    subscriptions.push(...result.webhookSubscriptions.nodes);
    if (!result.webhookSubscriptions.pageInfo.hasNextPage)
      return {
        uri,
        topics: topics.map(([topic, scope]) => ({
          topic,
          permitted: scopes.has(scope),
          subscribed: subscriptions.some(
            (s) => s.topic === topic && s.uri === uri,
          ),
        })),
      };
    cursor = result.webhookSubscriptions.pageInfo.endCursor;
  }
  throw new Error("購読一覧が多すぎます。Shopifyで確認してください");
}
export async function connectSubscriptions(actor: string) {
  if (!actor || !process.env.SHOPIFY_CLIENT_SECRET)
    throw new Error("操作主体またはWebhook署名設定が未確認です");
  const status = await subscriptionStatus();
  const results: { topic: string; state: string }[] = [];
  for (const topic of status.topics) {
    if (!topic.permitted || topic.subscribed) {
      results.push({
        topic: topic.topic,
        state: topic.subscribed ? "connected" : "scope_required",
      });
      continue;
    }
    const result = await shopifyGraphql<{
      webhookSubscriptionCreate: {
        webhookSubscription: { id: string } | null;
        userErrors: { message: string }[];
      };
    }>(
      `mutation($topic:WebhookSubscriptionTopic!,$input:WebhookSubscriptionInput!){webhookSubscriptionCreate(topic:$topic,webhookSubscription:$input){webhookSubscription{id}userErrors{message}}}`,
      { topic: topic.topic, input: { uri: status.uri, format: "JSON" } },
    );
    if (
      result.webhookSubscriptionCreate.userErrors.length ||
      !result.webhookSubscriptionCreate.webhookSubscription
    )
      throw new Error(
        `${topic.topic}の購読に失敗しました。接続状況を再確認してください`,
      );
    results.push({ topic: topic.topic, state: "connected" });
  }
  return results;
}
