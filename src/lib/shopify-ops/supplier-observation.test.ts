import { describe, expect, it } from "vitest";
import { parseSupplierPage, validateSupplierUrl } from "./supplier-observation";
import { observedAvailability } from "./supplier-freshness";
const url = "https://maker.thebase.in/items/123";
const page = (offers: unknown) =>
  `<link rel="canonical" href="${url}"><script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "A", offers })}</script>`;
const offer = {
  "@type": "Offer",
  availability: "https://schema.org/InStock",
  price: "1200",
  priceCurrency: "JPY",
};
describe("supplier public observation", () => {
  it("rejects private destinations, credentials and arbitrary product redirects", () => {
    for (const input of [
      "http://maker.thebase.in/items/123",
      "https://127.0.0.1/items/123",
      "https://maker.thebase.in.evil.com/items/123",
      "https://user:secret@maker.thebase.in/items/123",
      "https://maker.thebase.in/",
      "https://maker.thebase.in/items/123?url=http://localhost",
    ])
      expect(() => validateSupplierUrl(input)).toThrow();
  });
  it("recognizes platform product URLs without arbitrary host access", () =>
    expect(validateSupplierUrl(url).href).toBe(url));
  it("does not infer available inventory from HTTP200 or add-to-cart words", () =>
    expect(
      parseSupplierPage("<h1>Error</h1><p>Add to cart</p>", url).state,
    ).toBe("unknown"));
  it("records a priced single product observation without inventing quantity", () =>
    expect(parseSupplierPage(page(offer), url)).toMatchObject({
      state: "available",
      priceJpy: 1200,
    }));
  it("does not treat preorder as stock or aggregate variants as selected stock", () => {
    expect(
      parseSupplierPage(
        page({ ...offer, availability: "https://schema.org/PreOrder" }),
        url,
      ).state,
    ).toBe("unknown");
    expect(parseSupplierPage(page([offer, offer]), url).state).toBe("unknown");
  });
  it("recognizes sold-out and rejects a mismatched product page", () => {
    expect(
      parseSupplierPage(
        page({ ...offer, availability: "https://schema.org/OutOfStock" }),
        url,
      ).state,
    ).toBe("sold_out");
    expect(
      parseSupplierPage(page(offer).replace("/items/123", "/items/999"), url)
        .state,
    ).toBe("unknown");
  });
  it("expires old, malformed and future observations", () => {
    const now = Date.now();
    for (const date of [
      new Date(now - 31 * 60000).toISOString(),
      "invalid",
      new Date(now + 1000).toISOString(),
    ])
      expect(
        observedAvailability(parseSupplierPage(page(offer), url, date), now),
      ).toBe("stale");
  });
});
