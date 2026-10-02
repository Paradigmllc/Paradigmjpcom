import { describe, it, expect } from "vitest";
import {
  catalogDetailsSchema,
  catalogInputSchema,
  catalogDescription,
  catalogMetafields,
  draftBlockers,
  type CatalogRecord,
} from "./catalog";
const product: CatalogRecord = {
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
    titleEn: "Shizuoka Sencha",
    description: "Green tea from Shizuoka in a 100g pack.",
    evidence: "INTERNAL ONLY",
  }),
  status: "candidate",
  shopifyProductId: null,
  supplierUrl: "https://ochaogino.thebase.in/items/84428547",
};
describe("catalog drafts", () => {
  it("escapes supplier text rather than executing it", () =>
    expect(
      catalogDescription({
        ...product.details,
        description: "<script>alert(1)</script>\n\nA & B",
      }),
    ).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p><p>A &amp; B</p>"));
  it("does not export internal evidence or invent unknown facts", () => {
    expect(catalogDescription(product.details)).not.toContain("INTERNAL");
    expect(catalogMetafields(product.details)).toEqual([]);
  });
  it("blocks incomplete drafts but does not pretend draft readiness is sale readiness", () => {
    expect(draftBlockers(product)).toEqual([]);
    expect(
      draftBlockers({ ...product, priceUsd: 0, supplierUrl: null }),
    ).toHaveLength(2);
  });
  it("rejects malformed SKU, negative prices and nonfinite weight", () => {
    expect(
      catalogInputSchema.safeParse({ ...product, sku: "<bad>" }).success,
    ).toBe(false);
    expect(
      catalogInputSchema.safeParse({ ...product, priceUsd: -1 }).success,
    ).toBe(false);
    expect(
      catalogInputSchema.safeParse({ ...product, weightGrams: Infinity })
        .success,
    ).toBe(false);
  });
});
