import { getServiceSalesSupabase } from "@/lib/supabase";
import {
  observeSupplierPage,
  validateSupplierUrl,
  type SupplierObservation,
} from "./supplier-observation";

function database() {
  const db = getServiceSalesSupabase();
  if (!db) throw new Error("仕入先監視DBが未設定です");
  return db;
}
export async function getSupplierObservations(limit = 200) {
  const { data, error } = await database()
    .from("shopify_supplier_observations")
    .select("product_id,source_url,observation,checked_at,updated_at")
    .order("checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw new Error(`仕入先の状態を取得できません: ${error.message}`);
  return data ?? [];
}
export async function saveSupplierSource(
  productId: string,
  sourceUrl: string,
  actor: string,
) {
  if (!actor) throw new Error("操作主体が未確認です");
  const url = validateSupplierUrl(sourceUrl);
  const db = database();
  const product = await db
    .from("shopify_ops_products")
    .select("id")
    .eq("id", productId)
    .single();
  if (product.error || !product.data)
    throw new Error("対象商品が見つかりません");
  const result = await db.from("shopify_supplier_observations").upsert(
    {
      product_id: productId,
      source_url: url.href,
      observation: null,
      checked_at: null,
      updated_by: actor,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "product_id" },
  );
  if (result.error)
    throw new Error(`仕入先を保存できません: ${result.error.message}`);
}
export async function refreshSupplierSource(
  productId: string,
  actor: string,
): Promise<SupplierObservation> {
  if (!actor) throw new Error("操作主体が未確認です");
  const db = database();
  const { data, error } = await db
    .from("shopify_supplier_observations")
    .select("source_url,updated_at")
    .eq("product_id", productId)
    .single();
  if (error || !data) throw new Error("仕入先URLを先に登録してください");
  const observation = await observeSupplierPage(data.source_url);
  const result = await db
    .from("shopify_supplier_observations")
    .update({
      observation,
      checked_at: observation.checkedAt,
      updated_by: actor,
      updated_at: new Date().toISOString(),
    })
    .eq("product_id", productId)
    .eq("source_url", data.source_url)
    .eq("updated_at", data.updated_at)
    .select("product_id");
  if (result.error)
    throw new Error(`監視結果を保存できません: ${result.error.message}`);
  if (!result.data?.length)
    throw new Error("別の操作で仕入先が更新されました。再読込してください");
  return observation;
}
export async function refreshAllSupplierSources() {
  const sources = await getSupplierObservations(10);
  const results = [];
  let failures = 0;
  for (const source of sources) {
    if (
      source.checked_at &&
      Date.now() - Date.parse(source.checked_at) < 5 * 60_000
    )
      continue;
    try {
      results.push(
        await refreshSupplierSource(
          source.product_id,
          "system:supplier-monitor",
        ),
      );
    } catch (error) {
      console.error("[supplier-monitor] refresh failed", error);
      failures += 1;
      results.push({
        state: "unknown",
        evidence: error instanceof Error ? error.message : "監視失敗",
      });
    }
  }
  if (failures)
    throw new Error(`${failures}件の監視結果を保存できませんでした`);
  return results;
}
