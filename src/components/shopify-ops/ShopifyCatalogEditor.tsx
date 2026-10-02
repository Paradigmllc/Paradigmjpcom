"use client";
import type { FormEvent } from "react";
import {
  CATALOG_CATEGORIES,
  catalogDetailsSchema,
  type CatalogInput,
  type CatalogRecord,
} from "@/lib/shopify-ops/catalog";
const field =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm";
const labels = {
  tea: "お茶",
  textiles: "布小物",
  accessories: "アクセサリー",
  stationery: "紙・文具",
  craft: "工芸",
  gifts: "ギフト",
};
export function ShopifyCatalogEditor({
  product,
  busy,
  onSave,
  onCancel,
}: {
  product: CatalogRecord;
  busy: boolean;
  onSave: (value: CatalogInput) => Promise<void>;
  onCancel: () => void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "");
    const details = catalogDetailsSchema.parse(
      Object.fromEntries(
        Object.keys(catalogDetailsSchema.shape).map((k) => [k, value(k)]),
      ),
    );
    await onSave({
      ...product,
      sku: value("sku"),
      name: value("name"),
      category: value("category") as CatalogInput["category"],
      priceUsd: Number(value("priceUsd")),
      procurementCostJpy: Number(value("procurementCostJpy")),
      domesticShippingJpy: Number(value("domesticShippingJpy")),
      weightGrams: Number(value("weightGrams")),
      details,
    });
  }
  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 lg:p-8"
    >
      <h2 className="text-xl font-bold">
        {product.revision ? "商品情報を編集" : "商品候補を追加"}
      </h2>
      <p className="my-3 text-sm text-zinc-600">
        事実が未確認の項目は空欄・0で保存できます。保存だけでは公開・在庫増加・仕入れ発注は行いません。Shopifyに作成済みの下書きはShopify側で編集します。
      </p>
      <fieldset
        disabled={busy}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label className="text-sm">
          管理用商品名
          <input
            className={field}
            name="name"
            defaultValue={product.name}
            required
            maxLength={180}
          />
        </label>
        <label className="text-sm">
          SKU
          <input
            className={field}
            name="sku"
            defaultValue={product.sku}
            required
            pattern="[A-Z0-9][A-Z0-9_-]{2,63}"
          />
        </label>
        <label className="text-sm">
          分類
          <select
            className={field}
            name="category"
            defaultValue={
              CATALOG_CATEGORIES.includes(product.category)
                ? product.category
                : "gifts"
            }
          >
            {CATALOG_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {labels[c]}
              </option>
            ))}
          </select>
        </label>
        {(
          [
            [
              "priceUsd",
              "参考販売価格 USD（採算仮説）",
              product.priceUsd,
              100000,
              "0.01",
            ],
            [
              "procurementCostJpy",
              "仕入価格 JPY",
              product.procurementCostJpy,
              10000000,
              "1",
            ],
            [
              "domesticShippingJpy",
              "国内送料 JPY",
              product.domesticShippingJpy,
              1000000,
              "1",
            ],
            [
              "weightGrams",
              "商品重量 g（梱包重量は別途確認）",
              product.weightGrams,
              100000,
              "1",
            ],
          ] as const
        ).map(([key, label, value, max, step]) => (
          <label key={key} className="text-sm">
            {label}
            <input
              className={field}
              type="number"
              min={0}
              max={max}
              step={step}
              name={key}
              defaultValue={value}
              required
            />
          </label>
        ))}
        <label className="text-sm">
          Shopify販売価格 JPY
          <input
            className={field}
            type="number"
            min={0}
            max={10000000}
            step="1"
            name="listingPriceJpy"
            defaultValue={product.details.listingPriceJpy}
            required
          />
        </label>
        <label className="text-sm sm:col-span-2">
          英語の商品名
          <input
            className={field}
            name="titleEn"
            defaultValue={product.details.titleEn}
            maxLength={180}
          />
        </label>
        <label className="text-sm">
          ブランド・作り手
          <input
            className={field}
            name="maker"
            defaultValue={product.details.maker}
            maxLength={160}
          />
        </label>
        {(
          [
            ["description", "英語の商品説明"],
            ["materials", "素材"],
            ["dimensions", "寸法・内容量"],
            ["care", "お手入れ"],
            ["ingredients", "原材料（食品）"],
            ["allergens", "アレルゲン（食品）"],
            ["storage", "保管方法・賞味期限の案内"],
            ["evidence", "出典・確認事項（内部用／Shopifyには送信しません）"],
          ] as const
        ).map(([key, label]) => (
          <label
            key={key}
            className={`text-sm ${key === "description" || key === "evidence" ? "sm:col-span-2 lg:col-span-3" : ""}`}
          >
            {label}
            <textarea
              className={field}
              name={key}
              rows={key === "description" ? 5 : 3}
              maxLength={4000}
              defaultValue={product.details[key]}
            />
          </label>
        ))}
      </fieldset>
      <div className="mt-5 flex gap-3">
        <button
          disabled={busy}
          className="rounded-lg bg-zinc-950 px-5 py-2 text-white disabled:opacity-50"
        >
          {busy ? "保存中…" : "保存する"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-lg border px-4 py-2"
        >
          閉じる
        </button>
      </div>
    </form>
  );
}
