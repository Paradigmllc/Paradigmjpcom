import { beforeEach, describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";
const mock = vi.hoisted(() => ({ persist: vi.fn(), failure: vi.fn() }));
vi.mock("@/lib/shopify-ops/operations/store", () => ({
  persistEvent: mock.persist,
  recordEventFailure: mock.failure,
  storeDomain: () => "test.myshopify.com",
}));
import { POST } from "./route";
const id = "95584484-0b71-4e6c-84e0-dcf05ea26ae9";
function request(payload: unknown, extra: Record<string, string> = {}) {
  const body = JSON.stringify(payload);
  return new Request("https://example.com/api/shopify-ops/events", {
    method: "POST",
    body,
    headers: {
      "x-shopify-hmac-sha256": createHmac("sha256", "secret")
        .update(body)
        .digest("base64"),
      "x-shopify-shop-domain": "test.myshopify.com",
      "x-shopify-topic": "products/update",
      "x-shopify-webhook-id": id,
      ...extra,
    },
  });
}
const product = {
  id: 1,
  title: "Tea",
  handle: "tea",
  status: "draft",
  updated_at: "2026-10-02T00:00:00Z",
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SHOPIFY_CLIENT_SECRET", "secret");
  mock.persist.mockResolvedValue("applied");
  mock.failure.mockResolvedValue(undefined);
});
describe("webhook delivery", () => {
  it("persists before acknowledging", async () => {
    const response = await POST(request(product));
    expect(response.status).toBe(200);
    expect(mock.persist).toHaveBeenCalledWith(
      id,
      "products/update",
      expect.any(String),
      expect.objectContaining({ entityId: "1" }),
      "shopify:webhook",
    );
  });
  it("rejects a bad signature without writing", async () => {
    expect(
      (await POST(request(product, { "x-shopify-hmac-sha256": "bad" }))).status,
    ).toBe(401);
    expect(mock.persist).not.toHaveBeenCalled();
  });
  it("rejects another shop even with a valid signature", async () => {
    expect(
      (
        await POST(
          request(product, { "x-shopify-shop-domain": "other.myshopify.com" }),
        )
      ).status,
    ).toBe(403);
    expect(mock.persist).not.toHaveBeenCalled();
  });
  it("returns retryable failure if persistence fails", async () => {
    mock.persist.mockRejectedValue(new Error("DB unavailable"));
    expect((await POST(request(product))).status).toBe(503);
  });
  it("logs validation failures without storing the original payload", async () => {
    expect((await POST(request({ id: 1, email: "private" }))).status).toBe(422);
    expect(mock.failure).toHaveBeenCalledWith(
      id,
      "products/update",
      expect.any(String),
    );
    expect(mock.persist).not.toHaveBeenCalled();
  });
  it("rejects invalid delivery IDs", async () => {
    expect(
      (await POST(request(product, { "x-shopify-webhook-id": "bad" }))).status,
    ).toBe(400);
  });
  it("acknowledges duplicate deliveries", async () => {
    mock.persist.mockResolvedValue("duplicate");
    expect((await POST(request(product))).status).toBe(200);
  });
});
