"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { SupplierObservation } from "@/lib/shopify-ops/supplier-observation";
import { observedAvailability } from "@/lib/shopify-ops/supplier-freshness";
import type { ShopifyOpsProduct } from "@/lib/shopify-ops/types";

type Source = {
  product_id: string;
  source_url: string;
  observation: SupplierObservation | null;
  checked_at: string | null;
};
const labels = {
  available: "購入可能表示（数量未確認）",
  sold_out: "売り切れ表示",
  unknown: "未確認",
  blocked: "取得制限",
  stale: "情報が古い",
};
export function ShopifySupplierPanel({
  products,
}: {
  products: ShopifyOpsProduct[];
}) {
  const [sources, setSources] = useState<Source[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  async function reload() {
    try {
      const r = await fetch("/api/shopify-ops/suppliers", {
        cache: "no-store",
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error ?? "取得失敗");
      setSources(d.sources);
      setError(null);
    } catch (e) {
      console.error("[supplier-panel]", e);
      setError(e instanceof Error ? e.message : "取得失敗");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void reload();
    const timer = setInterval(() => void reload(), 30000);
    return () => clearInterval(timer);
  }, []);
  async function mutate(input: Record<string, string>) {
    setBusy(true);
    try {
      const r = await fetch("/api/shopify-ops/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error ?? "更新失敗");
      toast.success("仕入先情報を更新しました");
      await reload();
    } catch (e) {
      console.error("[supplier-panel]", e);
      toast.error(e instanceof Error ? e.message : "更新失敗");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-6" aria-busy={busy || loading}>
      <div className="rounded-2xl border bg-white p-4 sm:p-6 lg:p-8">
        <h2 className="text-xl font-bold">外部仕入先の監視</h2>
        <p className="mt-2 text-sm text-zinc-600">
          BASE・STORES・Creema・minneの商品URLを登録します。公開ページの販売状態を確認し、在庫数量や仕入れ成功とは区別します。30分より古い情報は利用できません。定期確認は30分間隔の実行予定で、遅延する場合があります。一度に古いものから最大10件を確認します。
        </p>
        <p className="mt-2 text-sm font-semibold text-amber-800">
          現在は監視のみ。自動買付・Shopify在庫の自動増加・倉庫出荷は行いません。
        </p>
      </div>
      {error && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}
          <button
            aria-label="仕入先を再読込"
            onClick={() => void reload()}
            className="ml-4 underline"
          >
            再読込
          </button>
        </div>
      )}
      <form
        className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void mutate({
            action: "save",
            productId: String(data.get("productId")),
            sourceUrl: String(data.get("sourceUrl")),
          });
        }}
      >
        <label className="text-sm">
          商品
          <select
            required
            name="productId"
            aria-label="対象商品"
            className="mt-2 w-full rounded border p-3"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} · {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          仕入先の商品URL
          <input
            required
            name="sourceUrl"
            type="url"
            maxLength={600}
            placeholder="https://shop.thebase.in/items/..."
            className="mt-2 w-full rounded border p-3"
          />
        </label>
        <button
          disabled={busy || !products.length}
          aria-label="仕入先URLを保存"
          className="self-end rounded bg-zinc-900 px-4 py-3 text-sm text-white disabled:opacity-50"
        >
          {busy ? "処理中…" : "保存（変更時は確認状態をリセット）"}
        </button>
      </form>
      {loading ? (
        <p role="status">仕入先を読み込み中…</p>
      ) : sources.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8">
          監視対象はまだありません。商品URLを登録すると確認できます。
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sources.map((s) => {
            const p = products.find((p) => p.id === s.product_id);
            return (
              <article
                key={s.product_id}
                className="rounded-xl border bg-white p-5"
              >
                <h3 className="font-bold">{p?.name ?? s.product_id}</h3>
                <p className="mt-2 text-sm">
                  {labels[observedAvailability(s.observation)]}
                </p>
                <p className="mt-2 text-xs text-zinc-600">
                  {s.observation?.evidence ?? "まだ確認していません"}
                </p>
                <p className="mt-2 text-xs">
                  確認日時：
                  {s.checked_at
                    ? new Date(s.checked_at).toLocaleString("ja-JP")
                    : "未確認"}
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={s.source_url}
                    className="text-sm underline"
                  >
                    仕入先で確認
                  </a>
                  <button
                    disabled={busy}
                    aria-label={`${p?.sku ?? "商品"}の販売状態を確認`}
                    onClick={() =>
                      void mutate({
                        action: "refresh",
                        productId: s.product_id,
                      })
                    }
                    className="rounded border px-3 py-2 text-sm disabled:opacity-50"
                  >
                    今すぐ確認
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <div className="rounded-xl border bg-white p-5">
        <h2 className="font-bold">倉庫・出荷連携</h2>
        <p className="mt-2 text-sm">
          以前の候補：ロケーションズ（通過型）、オープンロジ（保管型）。契約先・入庫先・SKU識別・検品条件・配送先・API資格情報の確定後に接続します。未接続の段階では出荷済みに進めません。
        </p>
      </div>
    </section>
  );
}
