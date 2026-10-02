import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  normalizeEvent,
  operationalStatus,
  type OperationSnapshot,
} from "./model";
import { verifyShopifySignature, readBoundedBody } from "./signature";
const time = "2026-10-02T12:00:00Z";
describe("operational event boundary", () => {
  it("retains order operations and strips personal and unneeded fields", () => {
    const result = normalizeEvent(
      "orders/updated",
      {
        id: 42,
        updated_at: time,
        name: "#1042",
        financial_status: "paid",
        fulfillment_status: null,
        line_items: [
          {
            id: 1,
            sku: "TEA",
            quantity: 2,
            properties: [{ name: "personal", value: "secret" }],
          },
        ],
        customer: { email: "private@example.com" },
        shipping_address: { address1: "private" },
        phone: "private",
      },
      time,
    );
    expect(result.kind).toBe("order");
    expect(result.entityId).toBe("42");
    expect(JSON.stringify(result)).not.toMatch(/private|secret|properties/);
    expect(result.data.line_items).toEqual([
      { id: "1", sku: "TEA", quantity: 2 },
    ]);
  });
  it("does not guess timestamps or unsafe numeric IDs", () => {
    expect(() =>
      normalizeEvent(
        "products/update",
        { id: 1, title: "Tea", handle: "tea", status: "draft" },
        time,
      ),
    ).toThrow();
    expect(() =>
      normalizeEvent(
        "products/delete",
        { id: Number.MAX_SAFE_INTEGER + 1 },
        time,
      ),
    ).toThrow();
  });
  it("keeps inventory null unknown and distinguishes locations", () => {
    const input = {
      inventory_item_id: "123",
      location_id: "456",
      available: null,
      updated_at: time,
    };
    const result = normalizeEvent("inventory_levels/update", input, time);
    expect(result.entityId).toBe("123:456");
    expect(result.data.available).toBeNull();
  });
  it("requires a provider timestamp for deletion tombstones", () => {
    expect(() => normalizeEvent("products/delete", { id: 1 }, "")).toThrow();
    expect(normalizeEvent("products/delete", { id: 1 }, time).deleted).toBe(
      true,
    );
  });
  it("never infers warehouse inspection or delivery from fulfillment success", () => {
    const row: OperationSnapshot = {
      kind: "fulfillment",
      entity_id: "2",
      source_updated_at: time,
      received_at: time,
      deleted: false,
      data: { status: "success", shipment_status: null },
    };
    expect(operationalStatus(row)).toContain("配達未確認");
    expect(
      operationalStatus({
        ...row,
        data: { status: "success", shipment_status: "delivered" },
      }),
    ).toBe("配達完了");
  });
  it("does not treat refunded orders as awaiting shipment", () => {
    const row: OperationSnapshot = {
      kind: "order",
      entity_id: "1",
      source_updated_at: time,
      received_at: time,
      deleted: false,
      data: { financial_status: "refunded" },
    };
    expect(operationalStatus(row)).toContain("出荷対象外");
  });
});
describe("Shopify signature and request limits", () => {
  it("uses the exact raw bytes and rejects tampering, wrong secrets and malformed headers", () => {
    const body = Buffer.from('{"id":1}');
    const signature = createHmac("sha256", "secret")
      .update(body)
      .digest("base64");
    expect(verifyShopifySignature(body, signature, "secret")).toBe(true);
    expect(
      verifyShopifySignature(Buffer.from('{ "id":1}'), signature, "secret"),
    ).toBe(false);
    expect(verifyShopifySignature(body, signature, "wrong")).toBe(false);
    expect(verifyShopifySignature(body, "bad", "secret")).toBe(false);
    expect(verifyShopifySignature(body, signature, "")).toBe(false);
  });
  it("bounds chunked bodies even without a content length", async () => {
    await expect(
      readBoundedBody(
        new Request("https://example.com", { method: "POST", body: "abcdef" }),
        5,
      ),
    ).rejects.toThrow("body_too_large");
  });
});
