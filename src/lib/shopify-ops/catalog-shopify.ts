import {
  shopifyGraphql,
  upsertShopifyProduct,
  ensureShopifyCollection,
} from "./shopify-admin";
import {
  catalogDescription,
  catalogMetafields,
  type CatalogRecord,
} from "./catalog";
export async function createCatalogDraft(product: CatalogRecord) {
  const handle = `sericia-${product.id}`;
  const marker = `sericia-catalog:${product.id}`;
  const existing = await shopifyGraphql<{
    shop: { currencyCode: string };
    products: {
      nodes: Array<{
        id: string;
        handle: string;
        status: string;
        tags: string[];
      }>;
    };
  }>(
    `
    query CatalogDraftLookup($query:String!) { shop { currencyCode } products(first:2,query:$query) { nodes { id handle status tags } } }
  `,
    { query: `handle:${handle}` },
  );
  const found = existing.products.nodes.find((p) => p.handle === handle);
  if (found) {
    if (!found.tags.includes(marker))
      throw new Error("同じハンドルの別商品があります。自動上書きしません");
    return found; // Recover the original draft without overwriting subsequent Shopify edits.
  }
  const currency = existing.shop.currencyCode;
  const price =
    currency === "JPY"
      ? product.details.listingPriceJpy
      : currency === "USD"
        ? product.priceUsd
        : 0;
  if (price <= 0)
    throw new Error(
      `ストア基本通貨 ${currency} の販売価格が未設定、または未対応です`,
    );
  const collectionId = await ensureShopifyCollection(
    product.category,
    product.category,
  );
  const metafields = catalogMetafields(product.details);
  return upsertShopifyProduct(
    {
      title: product.details.titleEn,
      handle,
      status: "DRAFT",
      descriptionHtml: catalogDescription(product.details),
      productType: product.category,
      collections: [collectionId],
      tags: [marker, "sericia-review-required", product.category],
      ...(product.details.maker ? { vendor: product.details.maker } : {}),
      ...(metafields.length ? { metafields } : {}),
      productOptions: [
        { name: "Title", position: 1, values: [{ name: "Default Title" }] },
      ],
      variants: [
        {
          optionValues: [{ optionName: "Title", name: "Default Title" }],
          price: String(price),
          inventoryPolicy: "DENY",
          inventoryItem: {
            sku: product.sku,
            tracked: true,
            requiresShipping: true,
            ...(product.weightGrams > 0
              ? {
                  measurement: {
                    weight: { value: product.weightGrams, unit: "GRAMS" },
                  },
                }
              : {}),
          },
        },
      ],
    },
    handle,
  );
}
