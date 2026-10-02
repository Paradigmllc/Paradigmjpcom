import { z } from "zod";

export const CATALOG_CATEGORIES = [
  "tea",
  "textiles",
  "accessories",
  "stationery",
  "craft",
  "gifts",
] as const;
const text = z.string().trim().max(4000).default("");
export const catalogDetailsSchema = z.object({
  listingPriceJpy: z.coerce.number().int().min(0).max(10000000).default(0),
  titleEn: z.string().trim().max(180).default(""),
  description: text,
  materials: text,
  dimensions: text,
  care: text,
  ingredients: text,
  allergens: text,
  storage: text,
  maker: z.string().trim().max(160).default(""),
  evidence: text,
});
export type CatalogDetails = z.infer<typeof catalogDetailsSchema>;
export const catalogInputSchema = z.object({
  id: z.string().uuid(),
  revision: z.string().datetime({ offset: true }).nullable(),
  sku: z
    .string()
    .trim()
    .regex(/^[A-Z0-9][A-Z0-9_-]{2,63}$/),
  name: z.string().trim().min(2).max(180),
  category: z.enum(CATALOG_CATEGORIES),
  priceUsd: z.coerce.number().finite().min(0).max(100000),
  procurementCostJpy: z.coerce.number().int().min(0).max(10000000),
  domesticShippingJpy: z.coerce.number().int().min(0).max(1000000),
  weightGrams: z.coerce.number().int().min(0).max(100000),
  details: catalogDetailsSchema,
});
export type CatalogInput = z.infer<typeof catalogInputSchema>;
export type CatalogRecord = CatalogInput & {
  status: string;
  shopifyProductId: string | null;
  supplierUrl: string | null;
};
export function draftBlockers(product: CatalogRecord) {
  return [
    !product.details.titleEn && "英語の商品名",
    product.details.description.length < 20 &&
      "事実に基づく英語説明（20文字以上）",
    !product.supplierUrl && "仕入先の商品URL",
    product.priceUsd <= 0 &&
      product.details.listingPriceJpy <= 0 &&
      "販売価格（JPYまたはUSD）",
  ].filter((v): v is string => typeof v === "string");
}
export function escapeCatalogHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function catalogDescription(details: CatalogDetails) {
  return details.description
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((p) => `<p>${escapeCatalogHtml(p).replaceAll("\n", "<br>")}</p>`)
    .join("");
}
export function catalogMetafields(details: CatalogDetails) {
  return Object.entries({
    materials_care: [details.materials, details.care]
      .filter(Boolean)
      .join("\n\n"),
    dimensions: details.dimensions,
    ingredients: details.ingredients,
    allergens: details.allergens,
    storage: details.storage,
  })
    .filter(([, value]) => value)
    .map(([key, value]) => ({
      namespace: "sericia",
      key,
      type: "multi_line_text_field",
      value,
    }));
}
