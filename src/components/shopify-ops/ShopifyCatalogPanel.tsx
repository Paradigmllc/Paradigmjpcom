"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  catalogDetailsSchema,
  draftBlockers,
  type CatalogInput,
  type CatalogRecord,
} from "@/lib/shopify-ops/catalog";
import { ShopifyCatalogEditor } from "./ShopifyCatalogEditor";
export function ShopifyCatalogPanel() {
  const [products, setProducts] = useState<CatalogRecord[]>([]);
  const [editing, setEditing] = useState<CatalogRecord | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/shopify-ops/catalog", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error ?? "読込失敗");
      setProducts(data.products);
      setError(null);
    } catch (error) {
      console.error("[catalog-ui]", error);
      setError("商品一覧を読み込めません。再試行してください");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 30000);
    return () => clearInterval(timer);
  }, [load]);
  async function action(body: unknown, message: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/shopify-ops/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error ?? "処理失敗");
      toast.success(message);
      setEditing(null);
      await load();
    } catch (error) {
      console.error("[catalog-ui]", error);
      toast.error(
        error instanceof Error ? error.message : "処理に失敗しました",
      );
    } finally {
      setBusy(false);
    }
  }
  function create() {
    const id = crypto.randomUUID();
    setEditing({
      id,
      revision: null,
      sku: `SRC-${id.slice(0, 8).toUpperCase()}`,
      name: "",
      category: "gifts",
      priceUsd: 0,
      procurementCostJpy: 0,
      domesticShippingJpy: 0,
      weightGrams: 0,
      details: catalogDetailsSchema.parse({}),
      status: "candidate",
      shopifyProductId: null,
      supplierUrl: null,
    });
  }
  const visible = products.filter((p) =>
    `${p.name} ${p.sku} ${p.details.titleEn} ${p.category}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold">商品カタログ</h2>
          <p className="mt-1 text-sm text-zinc-600">
            商品情報 → 仕入先登録 → Shopify下書き →
            掲載前確認。下書きは非公開・在庫0で作成します。
          </p>
        </div>
        <button
          onClick={create}
          disabled={busy || loading || !!error}
          className="shrink-0 rounded-lg bg-zinc-950 px-4 py-2 text-white disabled:opacity-50"
        >
          商品候補を追加
        </button>
      </header>
      {editing && (
        <ShopifyCatalogEditor
          key={`${editing.id}-${editing.revision}`}
          product={editing}
          busy={busy}
          onSave={(product: CatalogInput) =>
            action({ action: "save", product }, "商品情報を保存しました")
          }
          onCancel={() => setEditing(null)}
        />
      )}
      <label className="block text-sm">
        商品を検索
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 sm:max-w-lg"
          placeholder="商品名・SKU・カテゴリ"
        />
      </label>
      {loading ? (
        <p role="status">商品を読み込み中…</p>
      ) : error ? (
        <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">
          {error}
          <button
            className="ml-3 underline"
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            再試行
          </button>
        </div>
      ) : (
        <>
          {!visible.length && (
            <p className="rounded-xl border border-dashed p-8 text-center">
              {products.length
                ? "検索条件に合う商品がありません"
                : "商品候補を追加してください"}
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visible.slice((page - 1) * 24, page * 24).map((p) => {
              const blockers = draftBlockers(p);
              return (
                <article
                  key={p.id}
                  className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5"
                >
                  <p className="text-xs text-zinc-500">
                    {p.sku} · {p.category}
                  </p>
                  <h3 className="mt-2 font-bold">{p.name}</h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    {p.details.titleEn || "英語名未登録"}
                  </p>
                  <dl className="my-4 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-zinc-500">Shopify価格 JPY</dt>
                      <dd>
                        {p.details.listingPriceJpy > 0
                          ? `¥${p.details.listingPriceJpy.toLocaleString()}`
                          : "未設定"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">仕入価格 JPY</dt>
                      <dd>
                        {p.procurementCostJpy > 0
                          ? `¥${p.procurementCostJpy.toLocaleString()}`
                          : "未設定"}
                      </dd>
                    </div>
                  </dl>
                  {!p.shopifyProductId && (
                    <p className="mb-4 text-xs leading-relaxed text-amber-800">
                      {blockers.length
                        ? `下書き作成に必要：${blockers.join("、")}`
                        : "下書き作成可能。掲載可否は別途確認します。"}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2">
                    <button
                      disabled={busy}
                      onClick={() => setEditing(p)}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      商品情報を編集
                    </button>
                    {p.shopifyProductId ? (
                      <a
                        href={`https://admin.shopify.com/store/g2d5th-zr/products/${p.shopifyProductId.split("/").at(-1)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border px-3 py-2 text-sm"
                      >
                        Shopifyで確認・編集
                      </a>
                    ) : (
                      <button
                        disabled={busy || blockers.length > 0}
                        onClick={() =>
                          void action(
                            { action: "draft", id: p.id },
                            "Shopify下書きを作成・紐付けしました",
                          )
                        }
                        className="rounded-lg bg-emerald-950 px-3 py-2 text-sm text-white disabled:opacity-40"
                      >
                        {busy ? "処理中…" : "Shopify下書きを作成"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {visible.length > 24 && (
            <nav
              aria-label="商品一覧ページ"
              className="flex items-center gap-4"
            >
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                前へ
              </button>
              <span>
                {page} / {Math.ceil(visible.length / 24)}
              </span>
              <button
                disabled={page * 24 >= visible.length}
                onClick={() => setPage((p) => p + 1)}
              >
                次へ
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
