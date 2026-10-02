import { beforeEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const { auth, read, save, draft } = vi.hoisted(() => ({
  auth: vi.fn(),
  read: vi.fn(),
  save: vi.fn(),
  draft: vi.fn(),
}));
vi.mock("@/lib/admin-auth", () => ({ authorizePayloadAdminRequest: auth }));
vi.mock("@/lib/shopify-ops/catalog-service", () => ({
  getCatalog: read,
  saveCatalog: save,
  exportCatalogDraft: draft,
}));
import { GET, POST } from "./route";
const request = (body: unknown, origin = "https://paradigmjp.com") =>
  new NextRequest("https://paradigmjp.com/api/shopify-ops/catalog", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ ok: true, userId: "1", userRole: "admin" });
  read.mockResolvedValue([]);
});
describe("catalog API authorization", () => {
  it("rejects anonymous reads", async () => {
    auth.mockResolvedValue({ ok: false });
    expect(
      (
        await GET(
          new NextRequest("https://paradigmjp.com/api/shopify-ops/catalog"),
        )
      ).status,
    ).toBe(401);
    expect(read).not.toHaveBeenCalled();
  });
  it("rejects unidentified legacy authorization", async () => {
    auth.mockResolvedValue({ ok: true });
    expect(
      (
        await POST(
          request({
            action: "draft",
            id: "2c66592f-98f0-48d3-89b3-7f2c1953fe10",
          }),
        )
      ).status,
    ).toBe(401);
  });
  it("rejects viewer writes and cross origin writes", async () => {
    auth.mockResolvedValue({ ok: true, userId: "1", userRole: "viewer" });
    expect((await POST(request({}))).status).toBe(401);
    auth.mockResolvedValue({ ok: true, userId: "1", userRole: "admin" });
    expect((await POST(request({}, "https://evil.example"))).status).toBe(403);
    expect(save).not.toHaveBeenCalled();
  });
  it("rejects malformed input before writing", async () => {
    expect((await POST(request({ action: "save", product: {} }))).status).toBe(
      400,
    );
    expect(save).not.toHaveBeenCalled();
  });
  it("returns private no-store reads", async () => {
    const r = await GET(
      new NextRequest("https://paradigmjp.com/api/shopify-ops/catalog"),
    );
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
  });
});
