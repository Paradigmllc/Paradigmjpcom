import { beforeEach, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("../shopify-admin", () => ({ shopifyGraphql: m.query }));
import { subscriptionStatus, connectSubscriptions } from "./subscriptions";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://paradigmjp.com");
  vi.stubEnv("SHOPIFY_CLIENT_SECRET", "secret");
});
it("follows subscription pages and does not call missing permissions connected", async () => {
  m.query
    .mockResolvedValueOnce({
      currentAppInstallation: { accessScopes: [{ handle: "write_products" }] },
    })
    .mockResolvedValueOnce({
      webhookSubscriptions: {
        nodes: [],
        pageInfo: { hasNextPage: true, endCursor: "next" },
      },
    })
    .mockResolvedValueOnce({
      webhookSubscriptions: {
        nodes: [
          {
            topic: "PRODUCTS_UPDATE",
            uri: "https://paradigmjp.com/api/shopify-ops/events",
          },
        ],
        pageInfo: { hasNextPage: false },
      },
    });
  const s = await subscriptionStatus();
  expect(s.topics.find((t) => t.topic === "PRODUCTS_UPDATE")).toMatchObject({
    permitted: true,
    subscribed: true,
  });
  expect(s.topics.find((t) => t.topic === "ORDERS_CREATE")).toMatchObject({
    permitted: false,
    subscribed: false,
  });
  expect(m.query.mock.calls[2][1]).toEqual({ cursor: "next" });
});
it("preserves existing matching subscriptions and never requests unauthorized topics", async () => {
  m.query
    .mockResolvedValueOnce({
      currentAppInstallation: { accessScopes: [{ handle: "read_products" }] },
    })
    .mockResolvedValueOnce({
      webhookSubscriptions: {
        nodes: ["PRODUCTS_CREATE", "PRODUCTS_UPDATE", "PRODUCTS_DELETE"].map(
          (topic) => ({
            topic,
            uri: "https://paradigmjp.com/api/shopify-ops/events",
          }),
        ),
        pageInfo: { hasNextPage: false },
      },
    });
  await connectSubscriptions("payload:1");
  expect(m.query).toHaveBeenCalledTimes(2);
});
it("does not turn a provider registration failure into success", async () => {
  m.query
    .mockResolvedValueOnce({
      currentAppInstallation: { accessScopes: [{ handle: "read_products" }] },
    })
    .mockResolvedValueOnce({
      webhookSubscriptions: { nodes: [], pageInfo: { hasNextPage: false } },
    })
    .mockResolvedValueOnce({
      webhookSubscriptionCreate: {
        webhookSubscription: null,
        userErrors: [{ message: "Denied" }],
      },
    });
  await expect(connectSubscriptions("payload:1")).rejects.toThrow("購読に失敗");
});
