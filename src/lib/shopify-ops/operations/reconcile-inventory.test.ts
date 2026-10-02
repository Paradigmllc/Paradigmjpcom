import { beforeEach, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ query: vi.fn(), persist: vi.fn() }));
vi.mock("../shopify-admin", () => ({ shopifyGraphql: m.query }));
vi.mock("./store", () => ({ persistEvent: m.persist }));
import { reconcileInventory } from "./reconcile-inventory";
beforeEach(() => {
  vi.clearAllMocks();
  m.persist.mockResolvedValue("applied");
});
it("persists available rather than incoming stock at the exact location", async () => {
  m.query.mockResolvedValue({
    inventoryItems: {
      nodes: [
        {
          id: "gid://shopify/InventoryItem/11",
          inventoryLevels: {
            nodes: [
              {
                updatedAt: "2026-10-02T00:00:00Z",
                location: { id: "gid://shopify/Location/22" },
                quantities: [
                  { name: "incoming", quantity: 100 },
                  { name: "available", quantity: 0 },
                ],
              },
            ],
            pageInfo: { hasNextPage: false },
          },
        },
      ],
      pageInfo: { hasNextPage: true, endCursor: "next" },
    },
  });
  expect(await reconcileInventory(null, "payload:1")).toEqual({
    count: 1,
    levels: 1,
    cursor: "next",
  });
  expect(m.persist.mock.calls[0][3]).toMatchObject({
    entityId: "11:22",
    data: { available: 0 },
  });
});
it("does not call a truncated location list complete", async () => {
  m.query.mockResolvedValue({
    inventoryItems: {
      nodes: [{ inventoryLevels: { pageInfo: { hasNextPage: true } } }],
      pageInfo: { hasNextPage: false },
    },
  });
  await expect(reconcileInventory(null, "payload:1")).rejects.toThrow(
    "ロケーション",
  );
  expect(m.persist).not.toHaveBeenCalled();
});
