import { expect, it } from "vitest";
import {
  socialCaption,
  socialProductReady,
  socialDestination,
} from "./social-policy";
it("uses verified English copy and omits hypothetical dollar prices", () => {
  const caption = socialCaption(
    {
      name: "仮説商品",
      price_usd: 99,
      catalog_data: { titleEn: "Cotton furoshiki" },
      origin_country_code: "JP",
    },
    "pinterest",
    "https://sericia.com/products/cloth",
  );
  expect(caption).toContain("Cotton furoshiki");
  expect(caption).toContain("utm_source=pinterest");
  expect(caption).not.toContain("$99");
  expect(caption).not.toContain("仮説商品");
  expect(caption).toContain("#MadeInJapan");
});
it("rejects incomplete commercial facts and avoids unverified origin claims", () => {
  expect(socialProductReady({ catalog_data: { titleEn: "Cloth" } })).toBe(
    false,
  );
  expect(
    socialCaption(
      { catalog_data: { titleEn: "Cloth" } },
      "instagram",
      "https://sericia.com/products/cloth",
    ),
  ).not.toContain("#MadeInJapan");
});

it("attributes the actual outbound link to its organic campaign", () => {
  expect(
    socialDestination(
      "https://sericia.com/products/cloth",
      "pinterest",
      "sericia_daily_20261002",
    ),
  ).toBe(
    "https://sericia.com/products/cloth?utm_source=pinterest&utm_medium=organic_social&utm_campaign=sericia_daily_20261002",
  );
});
