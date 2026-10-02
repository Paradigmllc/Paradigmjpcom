import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  shopifyGraphql: vi.fn(),
  getSocialConnectorStatuses: vi.fn(),
  publishSocialPost: vi.fn(),
  socialProductReady: vi.fn(),
  socialCaption: vi.fn(),
}));
vi.mock("./shopify-admin", () => mocks);
vi.mock("./social-publisher", () => mocks);
vi.mock("./social-policy", () => mocks);
vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: vi.fn() }));
import { publishDuePosts } from "./social-delivery";
const row = {
  id: "post-1",
  product_id: "product-1",
  platform: "pinterest",
  media_url: "https://example.com/photo.jpg",
  caption: "Verified caption",
  updated_at: "2026-10-02T00:00:00Z",
};
function database(finishFails = false) {
  let claimed = false;
  const updates: unknown[] = [];
  const rpc = vi.fn(async (name: string) => {
    if (name === "sericia_claim_social") {
      if (claimed) return { data: null, error: null };
      claimed = true;
      return { data: "claim-1", error: null };
    }
    return {
      data: !finishFails,
      error: finishFails ? { message: "db failure" } : null,
    };
  });
  const from = vi.fn((table: string) => {
    let writing = false;
    const chain: Record<string, unknown> = {
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({
          data: writing
            ? null
            : table === "shopify_ops_products"
              ? [
                  {
                    id: "product-1",
                    shopify_product_id: "123",
                    primary_image_url: row.media_url,
                  },
                ]
              : [row],
          error: null,
        }).then(resolve),
    };
    for (const key of [
      "select",
      "eq",
      "not",
      "is",
      "lte",
      "in",
      "order",
      "limit",
    ])
      chain[key] = () => chain;
    chain.update = (patch: unknown) => {
      writing = true;
      updates.push(patch);
      return chain;
    };
    return chain;
  });
  return {
    db: { from, rpc } as unknown as Parameters<typeof publishDuePosts>[0],
    rpc,
    updates,
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSocialConnectorStatuses.mockReturnValue([
    { platform: "pinterest", configured: true },
  ]);
  mocks.socialProductReady.mockReturnValue(true);
  mocks.shopifyGraphql.mockResolvedValue({
    product: {
      status: "ACTIVE",
      totalInventory: 1,
      onlineStoreUrl: "https://sericia.com/products/item",
    },
  });
  mocks.publishSocialPost.mockResolvedValue({
    externalPostId: "actual-1",
    postUrl: null,
  });
});
it("atomic claim prevents two runners from publishing the same post", async () => {
  const { db } = database();
  await Promise.all([publishDuePosts(db), publishDuePosts(db)]);
  expect(mocks.publishSocialPost).toHaveBeenCalledTimes(1);
});
it("rechecks live stock before claiming or posting", async () => {
  mocks.shopifyGraphql.mockResolvedValue({
    product: {
      status: "ACTIVE",
      totalInventory: 0,
      onlineStoreUrl: "https://sericia.com/products/item",
    },
  });
  const { db, rpc, updates } = database();
  expect(await publishDuePosts(db)).toMatchObject({ failed: 1 });
  expect(rpc).not.toHaveBeenCalled();
  expect(mocks.publishSocialPost).not.toHaveBeenCalled();
  expect(updates).toContainEqual(
    expect.objectContaining({ status: "blocked" }),
  );
});
it("does not resend after provider success and receipt save failure", async () => {
  const { db, updates } = database(true);
  await publishDuePosts(db);
  await publishDuePosts(db);
  expect(mocks.publishSocialPost).toHaveBeenCalledTimes(1);
  expect(updates).toContainEqual(
    expect.objectContaining({ state: "uncertain" }),
  );
});
it("stops on missing connectors without attempting a post", async () => {
  mocks.getSocialConnectorStatuses.mockReturnValue([]);
  const { db, rpc } = database();
  expect(await publishDuePosts(db)).toMatchObject({ waiting: 1 });
  expect(rpc).not.toHaveBeenCalled();
});
it("checks that the approved content version still matches at claim", async () => {
  const { db, rpc } = database();
  await publishDuePosts(db);
  expect(rpc).toHaveBeenCalledWith(
    "sericia_claim_social",
    expect.objectContaining({ p_expected_updated: row.updated_at }),
  );
});
