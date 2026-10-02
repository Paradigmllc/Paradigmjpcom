import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorizeWebhookRequest: vi.fn(),
  authorizePayloadAdminRequest: vi.fn(),
  getSupplierObservations: vi.fn(),
  saveSupplierSource: vi.fn(),
  refreshSupplierSource: vi.fn(),
  refreshAllSupplierSources: vi.fn(),
}));
vi.mock("@/lib/admin-auth", () => mocks);
vi.mock("@/lib/shopify-ops/supplier-service", () => mocks);
import { GET, POST } from "./route";
const id = "d416ed90-36d9-4c12-abc1-036bd77df5d1";
function request(body: unknown, origin = "https://paradigmjp.com") {
  return new NextRequest("https://paradigmjp.com/api/shopify-ops/suppliers", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}
describe("supplier API authorization and errors", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.authorizeWebhookRequest.mockReturnValue({ ok: false });
    mocks.authorizePayloadAdminRequest.mockResolvedValue({ ok: false });
  });
  it("denies anonymous reads and mutations before database access", async () => {
    expect((await GET(request({}))).status).toBe(401);
    expect(
      (await POST(request({ action: "refresh", productId: id }))).status,
    ).toBe(401);
    expect(mocks.getSupplierObservations).not.toHaveBeenCalled();
    expect(mocks.refreshSupplierSource).not.toHaveBeenCalled();
  });
  it("requires an identifiable admin and rejects cross-origin mutation", async () => {
    mocks.authorizePayloadAdminRequest.mockResolvedValue({ ok: true });
    expect((await POST(request({}))).status).toBe(401);
    mocks.authorizePayloadAdminRequest.mockResolvedValue({
      ok: true,
      userId: "admin-1",
    });
    expect(
      (
        await POST(
          request(
            { action: "refresh", productId: id },
            "https://other.example",
          ),
        )
      ).status,
    ).toBe(403);
    expect(mocks.refreshSupplierSource).not.toHaveBeenCalled();
  });
  it("records the authenticated actor rather than a caller-supplied actor", async () => {
    mocks.authorizePayloadAdminRequest.mockResolvedValue({
      ok: true,
      userId: "admin-1",
    });
    const response = await POST(
      request({
        action: "save",
        productId: id,
        sourceUrl: "https://maker.thebase.in/items/123",
        actor: "admin-2",
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.saveSupplierSource).toHaveBeenCalledWith(
      id,
      "https://maker.thebase.in/items/123",
      "payload:admin-1",
    );
  });
  it("validates IDs before calling services", async () => {
    mocks.authorizeWebhookRequest.mockReturnValue({ ok: true });
    expect(
      (await POST(request({ action: "refresh", productId: "invalid" }))).status,
    ).toBe(400);
    expect(mocks.refreshSupplierSource).not.toHaveBeenCalled();
  });
  it("reports database failures without exposing database details", async () => {
    mocks.authorizeWebhookRequest.mockReturnValue({ ok: true });
    mocks.getSupplierObservations.mockRejectedValue(
      new Error("private connection detail"),
    );
    const response = await GET(request({}));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private connection detail");
  });
});
