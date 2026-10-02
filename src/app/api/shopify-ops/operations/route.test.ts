import { NextRequest } from "next/server";
import { beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  get: vi.fn(),
  connect: vi.fn(),
  status: vi.fn(),
  reconcile: vi.fn(),
}));
vi.mock("@/lib/admin-auth", () => ({ authorizePayloadAdminRequest: m.auth }));
vi.mock("@/lib/shopify-ops/operations/store", () => ({ getOperations: m.get }));
vi.mock("@/lib/shopify-ops/operations/subscriptions", () => ({
  connectSubscriptions: m.connect,
  subscriptionStatus: m.status,
}));
vi.mock("@/lib/shopify-ops/operations/reconcile", () => ({
  reconcileProducts: m.reconcile,
}));
import { GET, POST } from "./route";
const request = (origin = "https://paradigmjp.com") =>
  new NextRequest("https://paradigmjp.com/api/shopify-ops/operations", {
    method: "POST",
    headers: { origin },
    body: JSON.stringify({ action: "connect" }),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://paradigmjp.com");
  m.auth.mockResolvedValue({ ok: true, userId: 1, userRole: "admin" });
  m.get.mockResolvedValue({});
  m.connect.mockResolvedValue([]);
});
describe("operations authorization", () => {
  it("rejects unidentified sessions", async () => {
    m.auth.mockResolvedValue({ ok: true });
    expect((await GET(request())).status).toBe(401);
    expect(m.get).not.toHaveBeenCalled();
  });
  it("rejects viewer mutations", async () => {
    m.auth.mockResolvedValue({ ok: true, userId: 1, userRole: "viewer" });
    expect((await POST(request())).status).toBe(401);
    expect(m.connect).not.toHaveBeenCalled();
  });
  it("rejects foreign origin", async () => {
    expect((await POST(request("https://evil.example"))).status).toBe(403);
    expect(m.connect).not.toHaveBeenCalled();
  });
  it("records identified actor for subscription changes", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(m.connect).toHaveBeenCalledWith("payload:1");
  });
});
