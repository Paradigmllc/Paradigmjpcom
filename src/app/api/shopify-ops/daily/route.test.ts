import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  authorizeWebhookRequest: vi.fn(),
  authorizePayloadAdminRequest: vi.fn(),
  getDailyJobs: vi.fn(),
  getDailyHistory: vi.fn(),
  runDailyJob: vi.fn(),
}));
vi.mock("@/lib/admin-auth", () => mocks);
vi.mock("@/lib/shopify-ops/daily/service", () => mocks);
import { GET, POST } from "./route";
function request(kind = "inventory", origin = "https://paradigmjp.com") {
  return new NextRequest("http://localhost:3000/api/shopify-ops/daily", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ kind, actor: "spoofed" }),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.authorizeWebhookRequest.mockReturnValue({ ok: false });
  mocks.authorizePayloadAdminRequest.mockResolvedValue({ ok: false });
});
it("rejects anonymous access before data reads and job execution", async () => {
  expect((await GET(request())).status).toBe(401);
  expect((await POST(request())).status).toBe(401);
  expect(mocks.runDailyJob).not.toHaveBeenCalled();
});
it("rejects viewers and cross-origin writes", async () => {
  mocks.authorizePayloadAdminRequest.mockResolvedValue({
    ok: true,
    userId: "42",
    userRole: "viewer",
  });
  expect((await POST(request())).status).toBe(401);
  mocks.authorizePayloadAdminRequest.mockResolvedValue({
    ok: true,
    userId: "42",
    userRole: "admin",
  });
  expect(
    (await POST(request("inventory", "https://evil.example"))).status,
  ).toBe(403);
});
it("uses authenticated actor and validates kinds", async () => {
  mocks.authorizePayloadAdminRequest.mockResolvedValue({
    ok: true,
    userId: "42",
    userRole: "admin",
  });
  mocks.runDailyJob.mockResolvedValue({ state: "succeeded" });
  expect((await POST(request())).status).toBe(200);
  expect(mocks.runDailyJob).toHaveBeenCalledWith("inventory", "payload:42");
  expect((await POST(request("buy-everything"))).status).toBe(400);
});
it("accepts registered system credentials without a browser origin", async () => {
  mocks.authorizeWebhookRequest.mockReturnValue({ ok: true });
  mocks.runDailyJob.mockResolvedValue({ state: "blocked" });
  expect((await POST(request("social", ""))).status).toBe(200);
  expect(mocks.runDailyJob).toHaveBeenCalledWith(
    "social",
    "system:daily-operations",
  );
});
it("returns history and hides internal connection details on failure", async () => {
  mocks.authorizeWebhookRequest.mockReturnValue({ ok: true });
  mocks.getDailyJobs.mockResolvedValue([]);
  mocks.getDailyHistory.mockResolvedValue([]);
  expect(await (await GET(request())).json()).toEqual({
    ok: true,
    jobs: [],
    history: [],
  });
  mocks.getDailyJobs.mockRejectedValue(new Error("private detail"));
  const r = await GET(request());
  expect(r.status).toBe(503);
  expect(await r.text()).not.toContain("private detail");
});
