import "server-only";
import { z } from "zod";

export const catalogQuery = z.object({
  kind: z.enum(["products", "inventory"]).default("products"),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
}).strict();
const text = z.string().max(1000);
const date = z.string().datetime({ offset: true });
const product = z.object({ id: text, title: text, handle: text.nullable(), status: text, updated_at: date });
const inventory = z.object({
  id: text, title: text.nullable(), sku: text.nullable(), updated_at: date,
  location_levels: z.array(z.object({
    id: text, location_id: text,
    stocked_quantity: z.number().finite(), reserved_quantity: z.number().finite(),
    incoming_quantity: z.number().finite(),
  })).max(1000),
});
const page = { count: z.number().int().nonnegative(), offset: z.number().int().nonnegative(), limit: z.number().int().positive() };
export type CatalogQuery = z.infer<typeof catalogQuery>;
export type MedusaCatalog =
  | { configured: false }
  | { configured: true; fetchedAt: string; count: number; offset: number; nextOffset: number | null } & (
    | { kind: "products"; rows: z.infer<typeof product>[] }
    | { kind: "inventory"; rows: z.infer<typeof inventory>[] }
  );

export async function getMedusaCatalog(input: CatalogQuery): Promise<MedusaCatalog> {
  const base = process.env.SERICIA_MEDUSA_ADMIN_URL?.trim();
  const key = process.env.SERICIA_MEDUSA_SECRET_API_KEY?.trim();
  if (!base && !key) return { configured: false };
  if (!base || !key) throw new Error("Medusa接続設定が不足しています");
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error("Medusa接続URLの設定が不正です");
  }
  // URL comes only from server configuration; callers cannot select upstream hosts or paths.
  url.pathname = input.kind === "products" ? "/admin/products" : "/admin/inventory-items";
  url.searchParams.set("offset", String(input.offset));
  url.searchParams.set("limit", "50");
  url.searchParams.set("order", "id");
  url.searchParams.set("fields", input.kind === "products"
    ? "id,title,handle,status,updated_at"
    : "id,title,sku,updated_at,*location_levels");
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${key}` }, cache: "no-store", redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Medusa取得失敗 (HTTP ${response.status})`);
  const body: unknown = await response.json();
  const result = input.kind === "products"
    ? z.object({ ...page, products: z.array(product).max(50) }).parse(body)
    : z.object({ ...page, inventory_items: z.array(inventory).max(50) }).parse(body);
  const rows = "products" in result ? result.products : result.inventory_items;
  if (result.offset !== input.offset || result.limit !== 50 || (!rows.length && result.count > input.offset)) {
    throw new Error("Medusaのページ情報が不整合です");
  }
  const common = { configured: true as const, fetchedAt: new Date().toISOString(), count: result.count,
    offset: input.offset, nextOffset: input.offset + rows.length < result.count ? input.offset + rows.length : null };
  return "products" in result
    ? { ...common, kind: "products", rows: result.products }
    : { ...common, kind: "inventory", rows: result.inventory_items };
}
