import { getServiceSalesSupabase } from "@/lib/supabase";
import { DB_TABLES } from "@/lib/sales/db-tables";
import { shopifyGraphql } from "./shopify-admin";
import {
  getSocialConnectorStatuses,
  publishSocialPost,
} from "./social-publisher";
import {
  socialProductReady,
  socialCaption,
  socialDestination,
} from "./social-policy";
type Db = NonNullable<ReturnType<typeof getServiceSalesSupabase>>;
type Row = Record<string, unknown>;
export async function publishDuePosts(db: Db) {
  const queue = await db
    .from(DB_TABLES.SHOPIFY_OPS_CONTENT_ITEMS)
    .select("*")
    .eq("status", "scheduled")
    .not("approved_at", "is", null)
    .is("external_post_id", null)
    .lte("scheduled_for", new Date().toISOString())
    .in("platform", ["instagram", "pinterest"])
    .order("scheduled_for")
    .limit(3);
  if (queue.error) throw new Error("SNS公開キューを取得できません");
  const rows = (queue.data ?? []) as Row[];
  const ids = rows
    .map((r) => r.product_id)
    .filter((v): v is string => typeof v === "string");
  const products = ids.length
    ? await db.from(DB_TABLES.SHOPIFY_OPS_PRODUCTS).select("*").in("id", ids)
    : { data: [], error: null };
  if (products.error) throw new Error("投稿商品の再検証に失敗しました");
  const byId = new Map(((products.data ?? []) as Row[]).map((p) => [p.id, p]));
  const connectors = getSocialConnectorStatuses();
  let published = 0,
    failed = 0,
    waiting = 0;
  for (const row of rows) {
    const platform = row.platform === "instagram" ? "instagram" : "pinterest";
    if (!connectors.find((c) => c.platform === platform)?.configured) {
      waiting++;
      continue;
    }
    let claim: string | null = null;
    try {
      const product = byId.get(row.product_id);
      if (!product || !socialProductReady(product))
        throw new Error("商品・在庫・画像権利の公開条件を満たしていません");
      const numeric = String(product.shopify_product_id ?? "").replace(
        "gid://shopify/Product/",
        "",
      );
      if (!/^\d+$/.test(numeric)) throw new Error("Shopify商品IDが未確認です");
      const actual = await shopifyGraphql<{
        product: {
          status: string;
          totalInventory: number;
          onlineStoreUrl: string | null;
        } | null;
      }>(
        "query($id:ID!){product(id:$id){status totalInventory onlineStoreUrl}}",
        { id: `gid://shopify/Product/${numeric}` },
      );
      if (
        !actual.product ||
        actual.product.status !== "ACTIVE" ||
        actual.product.totalInventory <= 0 ||
        !actual.product.onlineStoreUrl
      )
        throw new Error("Shopifyで販売中・在庫ありの商品ではありません");
      if (row.media_url !== product.primary_image_url)
        throw new Error("予約時の画像が更新されています。再確認してください");
      const caption = row.auto_generated
        ? socialCaption(
            product,
            platform,
            actual.product.onlineStoreUrl,
            String(row.utm_campaign ?? ""),
          )
        : String(row.caption ?? "");
      if (!caption || typeof row.media_url !== "string")
        throw new Error("投稿素材が不足しています");
      const claimed = await db.rpc("sericia_claim_social", {
        p_content: row.id,
        p_expected_updated: row.updated_at,
        p_actor: "system:daily-social",
      });
      if (claimed.error) throw new Error("公開の重複防止記録を保存できません");
      if (!claimed.data) continue;
      claim = String(claimed.data);
      const receipt = await publishSocialPost({
        platform,
        caption,
        mediaUrl: row.media_url,
        destinationUrl: socialDestination(
          actual.product.onlineStoreUrl,
          platform,
          String(row.utm_campaign ?? ""),
        ),
      });
      const saved = await db.rpc("sericia_finish_social", {
        p_claim: claim,
        p_external: receipt.externalPostId,
        p_url: receipt.postUrl,
      });
      if (saved.error || saved.data !== true)
        throw new Error("公開結果の保存が未確認です");
      published++;
    } catch (error) {
      console.error("[social-delivery] held delivery", {
        contentId: row.id,
        phase: claim ? "receipt" : "preflight",
      });
      failed++;
      if (claim) {
        const saved = await db
          .from("sericia_social_deliveries")
          .update({
            state: "uncertain",
            error_code: "provider_or_receipt_unconfirmed",
            completed_at: new Date().toISOString(),
          })
          .eq("claim_id", claim)
          .eq("state", "claimed");
        if (saved.error)
          throw new Error("公開結果未確認の記録を保存できません");
      } else {
        const saved = await db
          .from(DB_TABLES.SHOPIFY_OPS_CONTENT_ITEMS)
          .update({
            status: "blocked",
            error_message:
              error instanceof Error
                ? error.message.slice(0, 300)
                : "投稿前確認に失敗しました",
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id)
          .eq("status", "scheduled");
        if (saved.error) throw new Error("公開停止理由を保存できません");
      }
    }
  }
  return { published, failed, waiting };
}
