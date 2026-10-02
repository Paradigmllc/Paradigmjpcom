import { load } from "cheerio";

export type SupplierObservation = {
  state: "available" | "sold_out" | "unknown" | "blocked";
  checkedAt: string;
  priceJpy: number | null;
  evidence: string;
  sourceUrl: string;
};

export function validateSupplierUrl(value: string): URL {
  const url = new URL(value);
  const allowed =
    /^[a-z0-9-]+\.(thebase\.in|base\.shop|stores\.jp)$/.test(url.hostname) ||
    url.hostname === "www.creema.jp" ||
    url.hostname === "minne.com";
  if (
    url.protocol !== "https:" ||
    !allowed ||
    url.port ||
    url.username ||
    url.password
  )
    throw new Error("対応する仕入先の商品HTTPS URLを指定してください");
  if (!/^\/(items|item)\/[^/]+\/?$/.test(url.pathname))
    throw new Error("ショップトップではなく商品ページを指定してください");
  if (url.search || url.hash)
    throw new Error("商品URLのクエリとフラグメントを除去してください");
  return url;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSupplierPage(
  html: string,
  sourceUrl: string,
  checkedAt = new Date().toISOString(),
): SupplierObservation {
  const $ = load(html);
  const products: Record<string, unknown>[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!record(value)) return;
    if (
      value["@type"] === "Product" ||
      (Array.isArray(value["@type"]) && value["@type"].includes("Product"))
    )
      products.push(value);
    if (value["@graph"]) visit(value["@graph"]);
  };
  let malformed = false;
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      visit(JSON.parse($(element).text()));
    } catch (error) {
      malformed = true;
      console.warn(
        "[supplier-observation] Invalid structured product data",
        error instanceof Error ? error.name : "parse error",
      );
    }
  });
  const unknown = (evidence: string): SupplierObservation => ({
    state: "unknown",
    checkedAt,
    priceJpy: null,
    evidence,
    sourceUrl,
  });
  if (malformed) return unknown("構造化データが不正です。手動確認が必要です");
  if (products.length !== 1)
    return unknown("商品を一意に識別できません。手動確認が必要です");
  const product = products[0];
  const canonical = $('link[rel="canonical"]').attr("href");
  const offers = Array.isArray(product.offers)
    ? product.offers
    : [product.offers];
  if (
    offers.length !== 1 ||
    !record(offers[0]) ||
    offers[0]["@type"] === "AggregateOffer"
  )
    return unknown("バリエーションを一意に確認できません");
  const offer = offers[0];
  const identities = [canonical, product.url, offer.url].filter(
    (value): value is string => typeof value === "string",
  );
  try {
    const expected = new URL(sourceUrl);
    if (
      !identities.length ||
      identities.some((value) => {
        const actual = new URL(value, sourceUrl);
        return (
          actual.origin !== expected.origin ||
          actual.pathname.replace(/\/$/, "") !==
            expected.pathname.replace(/\/$/, "")
        );
      })
    )
      return unknown("商品URLが一致しないか確認できません");
  } catch (error) {
    console.warn(
      "[supplier-observation] Invalid product identity",
      error instanceof Error ? error.name : "URL error",
    );
    return unknown("商品URLを確認できません");
  }
  const availability =
    typeof offer.availability === "string"
      ? offer.availability.replace(/^https?:\/\/schema.org\//, "")
      : "";
  const state =
    availability === "InStock"
      ? "available"
      : ["OutOfStock", "Discontinued", "SoldOut"].includes(availability)
        ? "sold_out"
        : "unknown";
  const price = Number(offer.price);
  return {
    state,
    checkedAt,
    priceJpy:
      offer.priceCurrency === "JPY" &&
      offer.price != null &&
      Number.isFinite(price) &&
      price > 0
        ? price
        : null,
    sourceUrl,
    evidence:
      state === "unknown"
        ? "確定できる在庫情報がありません"
        : "商品ページの構造化データ。数量・購入成功は未確認",
  };
}

export async function observeSupplierPage(
  value: string,
): Promise<SupplierObservation> {
  const url = validateSupplierUrl(value);
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "SERICIA-Catalog-Check/1.0",
        Accept: "text/html",
      },
    });
    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("text/html")
    )
      return {
        state:
          response.status === 403 || response.status === 429
            ? "blocked"
            : "unknown",
        checkedAt,
        priceJpy: null,
        evidence: `取得できません (HTTP ${response.status})。在庫は未確認です`,
        sourceUrl: url.href,
      };
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty response");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      bytes += chunk.byteLength;
      if (bytes > 2_000_000) {
        await reader.cancel();
        throw new Error("商品ページが上限サイズを超えています");
      }
      chunks.push(chunk);
    }
    return parseSupplierPage(
      Buffer.concat(chunks).toString("utf8"),
      url.href,
      checkedAt,
    );
  } catch (error) {
    console.error(
      "[supplier-observation] fetch failed",
      error instanceof Error ? error.name : "unknown error",
    );
    return {
      state: "unknown",
      checkedAt,
      priceJpy: null,
      evidence: "取得失敗。以前の在庫情報は利用できません",
      sourceUrl: url.href,
    };
  }
}
