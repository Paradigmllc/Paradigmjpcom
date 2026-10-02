import { getServiceSalesSupabase } from "@/lib/supabase";
import {
  catalogDetailsSchema,
  catalogInputSchema,
  draftBlockers,
  type CatalogInput,
  type CatalogRecord,
} from "./catalog";
import { createCatalogDraft } from "./catalog-shopify";
function db() {
  const value = getServiceSalesSupabase();
  if (!value) throw new Error("商品DBが未設定です");
  return value;
}
function record(row: Record<string, unknown>): CatalogRecord {
  return {
    id: String(row.id),
    revision: String(row.updated_at),
    sku: String(row.sku),
    name: String(row.name),
    category: row.category as CatalogInput["category"],
    priceUsd: Number(row.price_usd),
    procurementCostJpy: Number(row.procurement_cost_jpy),
    domesticShippingJpy: Number(row.domestic_shipping_jpy),
    weightGrams: Number(row.weight_grams),
    details: catalogDetailsSchema.parse(row.catalog_data ?? {}),
    status: String(row.status),
    shopifyProductId:
      typeof row.shopify_product_id === "string"
        ? row.shopify_product_id
        : null,
    supplierUrl: typeof row.supplier_url === "string" ? row.supplier_url : null,
  };
}
export async function getCatalog() {
  const result = await db()
    .from("shopify_ops_products")
    .select("*")
    .order("sort_order")
    .order("created_at")
    .limit(200);
  if (result.error) throw new Error("商品データを取得できません");
  return (result.data ?? []).map(record);
}
export async function saveCatalog(input: CatalogInput, actor: string) {
  if (!actor) throw new Error("操作主体が未確認です");
  const value = catalogInputSchema.parse(input);
  const payload = {
    sku: value.sku,
    name: value.name,
    category: value.category,
    price_usd: value.priceUsd,
    procurement_cost_jpy: value.procurementCostJpy,
    domestic_shipping_jpy: value.domesticShippingJpy,
    weight_grams: value.weightGrams,
    catalog_data: value.details,
    catalog_updated_by: actor,
    updated_at: new Date().toISOString(),
  };
  const result = value.revision
    ? await db()
        .from("shopify_ops_products")
        .update(payload)
        .eq("id", value.id)
        .eq("updated_at", value.revision)
        .select("*")
        .maybeSingle()
    : await db()
        .from("shopify_ops_products")
        .insert({
          id: value.id,
          ...payload,
          status: "candidate",
          inventory_on_hand: 0,
        })
        .select("*")
        .single();
  if (result.error?.code === "23505")
    throw new Error("同じSKUまたは商品が存在します。再読み込みしてください");
  if (result.error) throw new Error("商品を保存できません");
  if (!result.data)
    throw new Error("別の操作で商品が更新されました。再読み込みしてください");
  return record(result.data);
}
export async function exportCatalogDraft(id: string, actor: string) {
  if (!actor) throw new Error("操作主体が未確認です");
  const result = await db()
    .from("shopify_ops_products")
    .select("*")
    .eq("id", id)
    .single();
  if (result.error || !result.data) throw new Error("商品が見つかりません");
  const product = record(result.data);
  if (product.shopifyProductId)
    return { id: product.shopifyProductId, existing: true };
  const blockers = draftBlockers(product);
  if (blockers.length)
    throw new Error(`下書きに必要な情報: ${blockers.join("、")}`);
  const draft = await createCatalogDraft(product);
  const saved = await db()
    .from("shopify_ops_products")
    .update({
      shopify_product_id: draft.id,
      shopify_handle: draft.handle,
      catalog_updated_by: actor,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("updated_at", product.revision)
    .select("id");
  if (saved.error || !saved.data?.length)
    throw new Error(
      "Shopify下書きは作成済みですが紐付けできません。再読み込み後に再実行すると既存下書きを復旧します",
    );
  return { id: draft.id, existing: false };
}
