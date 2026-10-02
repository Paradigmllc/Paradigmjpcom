import { beforeEach, describe, it, expect, vi } from "vitest";
import { catalogDetailsSchema, type CatalogRecord } from "./catalog";
const { query, upsert } = vi.hoisted(() => ({
  query: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("./shopify-admin", () => ({
  shopifyGraphql: query,
  upsertShopifyProduct: upsert,
  ensureShopifyCollection: vi.fn().mockResolvedValue("gid://shopify/Collection/1"),
}));
import { createCatalogDraft } from "./catalog-shopify";
const p: CatalogRecord = {
  id: "2c66592f-98f0-48d3-89b3-7f2c1953fe10",
  revision: null,
  sku: "SRC-TEA",
  name: "Tea",
  category: "tea",
  priceUsd: 24,
  procurementCostJpy: 756,
  domesticShippingJpy: 400,
  weightGrams: 0,
  details: catalogDetailsSchema.parse({
    titleEn: "Sencha",
    description: "Factual product information",
    evidence: "secret research",
  }),
  status: "candidate",
  shopifyProductId: null,
  supplierUrl: "https://example.com",
};
beforeEach(() => {
  vi.clearAllMocks();
  query.mockResolvedValue({
    shop: { currencyCode: "USD" },
    products: { nodes: [] },
  });
  upsert.mockResolvedValue({ id: "gid://shopify/Product/1" });
});
describe("Shopify draft creation", () => {
  it("creates only a draft with tracked stock, deny overselling and no assumed quantities", async () => {
    await createCatalogDraft(p);
    const input = upsert.mock.calls[0][0];
    expect(input.status).toBe("DRAFT");
    expect(input.variants[0].inventoryPolicy).toBe("DENY");
    expect(input.variants[0].inventoryItem.tracked).toBe(true);
    expect(JSON.stringify(input)).not.toMatch(
      /secret research|inventoryQuantities|countryCodeOfOrigin/,
    );
  });
  it("rejects missing store-currency prices before creating any product", async () => {
    query.mockResolvedValue({
      shop: { currencyCode: "JPY" },
      products: { nodes: [] },
    });
    await expect(createCatalogDraft(p)).rejects.toThrow("JPY");
    expect(upsert).not.toHaveBeenCalled();
  });
  it("recovers an existing owned product without changing its edits or status", async () => {
    const found = {
      id: "gid://shopify/Product/1",
      handle: `sericia-${p.id}`,
      status: "ACTIVE",
      tags: [`sericia-catalog:${p.id}`],
    };
    query.mockResolvedValue({
      shop: { currencyCode: "USD" },
      products: { nodes: [found] },
    });
    expect(await createCatalogDraft(p)).toEqual(found);
    expect(upsert).not.toHaveBeenCalled();
  });
  it("uses explicit JPY pricing for a JPY store", async () => {
    query.mockResolvedValue({
      shop: { currencyCode: "JPY" },
      products: { nodes: [] },
    });
    await createCatalogDraft({
      ...p,
      details: { ...p.details, listingPriceJpy: 2700 },
    });
    expect(upsert.mock.calls[0][0].variants[0].price).toBe("2700");
  });
  it("never overwrites a foreign handle collision", async () => {
    query.mockResolvedValue({
      shop: { currencyCode: "USD" },
      products: { nodes: [{ handle: `sericia-${p.id}`, tags: [] }] },
    });
    await expect(createCatalogDraft(p)).rejects.toThrow("別商品");
    expect(upsert).not.toHaveBeenCalled();
  });
});
