import { beforeEach, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ query: vi.fn(), persist: vi.fn() }));
vi.mock("../shopify-admin", () => ({ shopifyGraphql: m.query }));
vi.mock("./store", () => ({ persistEvent: m.persist }));
import { reconcileProducts } from "./reconcile";
import { reconcileOrders } from "./reconcile-orders";
beforeEach(() => {
  vi.clearAllMocks();
  m.persist.mockResolvedValue("applied");
});
it("continues a product cursor and persists source versions without changing Shopify", async () => {
  m.query.mockResolvedValue({
    products: {
      nodes: [
        {
          legacyResourceId: "1",
          title: "Tea",
          handle: "tea",
          status: "DRAFT",
          updatedAt: "2026-10-02T00:00:00Z",
        },
      ],
      pageInfo: { hasNextPage: true, endCursor: "next" },
    },
  });
  expect(await reconcileProducts("current", "payload:1")).toEqual({
    count: 1,
    cursor: "next",
  });
  expect(m.query.mock.calls[0][1]).toEqual({ cursor: "current" });
  expect(m.persist.mock.calls[0][3]).toMatchObject({
    kind: "product",
    data: { status: "draft" },
  });
});
it("does not report completion on a persistence error", async () => {
  m.query.mockResolvedValue({
    products: {
      nodes: [
        {
          legacyResourceId: "1",
          title: "Tea",
          handle: "tea",
          status: "DRAFT",
          updatedAt: "2026-10-02T00:00:00Z",
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  });
  m.persist.mockRejectedValue(new Error("DB unavailable"));
  await expect(reconcileProducts(null, "payload:1")).rejects.toThrow(
    "DB unavailable",
  );
});
it("reconciles partial orders and independently confirmed delivery", async () => {
  m.query.mockResolvedValue({
    orders: {
      nodes: [
        {
          legacyResourceId: "1",
          name: "#1",
          updatedAt: "2026-10-02T00:00:00Z",
          cancelledAt: null,
          displayFinancialStatus: "PAID",
          displayFulfillmentStatus: "PARTIALLY_FULFILLED",
          lineItems: {
            nodes: [
              { id: "gid://shopify/LineItem/22", sku: "TEA", quantity: 2 },
            ],
            pageInfo: { hasNextPage: false },
          },
          fulfillments: [
            {
              legacyResourceId: "3",
              updatedAt: "2026-10-02T01:00:00Z",
              status: "SUCCESS",
              displayStatus: "DELIVERED",
              trackingInfo: [],
            },
          ],
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  });
  await reconcileOrders(null, "payload:1");
  expect(m.persist.mock.calls[0][3].data.fulfillment_status).toBe("partial");
  expect(m.persist.mock.calls[1][3].data.shipment_status).toBe("delivered");
});
it("does not silently truncate large order contents", async () => {
  m.query.mockResolvedValue({
    orders: {
      nodes: [
        { lineItems: { pageInfo: { hasNextPage: true } }, fulfillments: [] },
      ],
      pageInfo: { hasNextPage: false },
    },
  });
  await expect(reconcileOrders(null, "payload:1")).rejects.toThrow("取得上限");
  expect(m.persist).not.toHaveBeenCalled();
});
