import { evaluateProductPublicationGate } from "./product-readiness";
import { catalogDetailsSchema } from "./catalog";
export type SocialProduct = Record<string, unknown>;
export function socialProductReady(row: SocialProduct) {
  const details = catalogDetailsSchema.safeParse(row.catalog_data ?? {});
  return (
    !!details.success &&
    !!details.data.titleEn &&
    evaluateProductPublicationGate({
      status: String(row.status),
      inventoryOnHand: Number(row.inventory_on_hand),
      photoReady: Number(row.photo_ready),
      shopifyHandle:
        typeof row.shopify_handle === "string" ? row.shopify_handle : null,
      supplierUrl:
        typeof row.supplier_url === "string" ? row.supplier_url : null,
      primaryImageUrl:
        typeof row.primary_image_url === "string"
          ? row.primary_image_url
          : null,
      originCountryCode:
        typeof row.origin_country_code === "string"
          ? row.origin_country_code
          : null,
      hsCode: typeof row.hs_code === "string" ? row.hs_code : null,
      fulfillmentDays: Number(row.fulfillment_days),
      supplierVerified: row.supplier_verified === true,
      sampleVerified: row.sample_verified === true,
      imageRightsVerified: row.image_rights_verified === true,
      complianceVerified: row.compliance_verified === true,
      fulfillmentVerified: row.fulfillment_verified === true,
    }).ready
  );
}
export function socialCaption(
  row: SocialProduct,
  platform: "instagram" | "pinterest",
  destination: string,
  campaign?: string,
) {
  const details = catalogDetailsSchema.parse(row.catalog_data ?? {});
  if (!details.titleEn) throw new Error("英語の商品名が必要です");
  const url = socialDestination(destination, platform, campaign);
  // Price and delivery promises must come from the actual storefront, not USD planning hypotheses.
  return `${details.titleEn} — selected by SERICIA.\n\nExplore materials, dimensions, current pricing and delivery options on the product page.\n\n${url}\n\n#SERICIA #JapaneseDesign${row.origin_country_code === "JP" ? " #MadeInJapan" : ""}`;
}

export function socialDestination(
  destination: string,
  platform: "instagram" | "pinterest",
  campaign?: string,
) {
  const url = new URL(destination);
  url.searchParams.set("utm_source", platform);
  url.searchParams.set("utm_medium", "organic_social");
  if (campaign) url.searchParams.set("utm_campaign", campaign);
  return url.href;
}
