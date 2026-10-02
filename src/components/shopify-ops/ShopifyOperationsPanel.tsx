"use client";
import { useCallback, useEffect, useState } from "react";
import { Bell, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  operationalStatus,
  type OperationDashboard,
  type EntityKind,
} from "@/lib/shopify-ops/operations/model";
import { ShopifyOperationsLinks } from "./ShopifyOperationsLinks";
const labels = {
  product: "商品",
  inventory: "在庫",
  order: "注文",
  fulfillment: "発送・配達",
} as const;
type Subscriptions = {
  topics: { topic: string; permitted: boolean; subscribed: boolean }[];
};
export function ShopifyOperationsPanel() {
  const [data, setData] = useState<OperationDashboard | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<EntityKind>("order");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [subscriptions, setSubscriptions] = useState<Subscriptions | null>(
    null,
  );
  const [inventoryCursor, setInventoryCursor] = useState<string | null>(null);
  const [inventoryReconciled, setInventoryReconciled] = useState<number | null>(
    null,
  );
  const [orderCursor, setOrderCursor] = useState<string | null>(null);
  const [ordersReconciled, setOrdersReconciled] = useState<number | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [reconciled, setReconciled] = useState<number | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/shopify-ops/operations", {
        cache: "no-store",
      });
      const value = await response.json();
      if (!response.ok || !value.ok)
        throw new Error(value.error ?? "同期状況を取得できません");
      setData(value.dashboard);
      setError("");
    } catch (cause) {
      console.error("[operations] load failed", cause);
      setError(cause instanceof Error ? cause.message : "通信に失敗しました");
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [load]);
  async function act(
    action:
      | "status"
      | "connect"
      | "reconcile"
      | "reconcileOrders"
      | "reconcileInventory",
  ) {
    setBusy(true);
    try {
      const response = await fetch("/api/shopify-ops/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "reconcile"
            ? { cursor }
            : action === "reconcileInventory"
              ? { cursor: inventoryCursor }
              : action === "reconcileOrders"
                ? { cursor: orderCursor }
                : {}),
        }),
      });
      const value = await response.json();
      if (!response.ok || !value.ok)
        throw new Error(value.error ?? "処理に失敗しました");
      if (action === "status") setSubscriptions(value.result);
      if (action === "connect") {
        setSubscriptions(null);
        toast.success("許可済みの通知を登録しました。接続状況で確認できます");
      }
      if (action === "reconcileInventory") {
        setInventoryCursor(value.result.cursor);
        setInventoryReconciled(
          (n) => (inventoryCursor ? (n ?? 0) : 0) + value.result.count,
        );
        toast.success(`${value.result.count}件のShopify在庫を取得しました`);
      }
      if (action === "reconcileOrders") {
        setOrderCursor(value.result.cursor);
        setOrdersReconciled(
          (n) => (orderCursor ? (n ?? 0) : 0) + value.result.count,
        );
        toast.success(`${value.result.count}件の注文・発送情報を取得しました`);
      }
      if (action === "reconcile") {
        setCursor(value.result.cursor);
        setReconciled((n) => (cursor ? (n ?? 0) : 0) + value.result.count);
        toast.success(`${value.result.count}件をShopifyから再取得しました`);
      }
      await load();
    } catch (cause) {
      console.error("[operations] action failed", cause);
      toast.error(
        cause instanceof Error ? cause.message : "処理に失敗しました",
      );
    } finally {
      setBusy(false);
    }
  }
  const filtered = (data?.snapshots ?? []).filter(
    (row) =>
      row.kind === kind &&
      JSON.stringify(row.data).toLowerCase().includes(query.toLowerCase()),
  );
  const rows = filtered.slice(page * 20, (page + 1) * 20);
  const issues =
    data?.events.filter((event) =>
      ["invalid", "conflict"].includes(event.outcome),
    ) ?? [];
  const button =
    "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50";
  return (
    <section className="space-y-6" aria-label="注文・配送の同期状況">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-xl font-bold">商品・注文・配送の同期</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Shopifyの更新通知を受信して反映。画面は15秒ごとに更新します。
          </p>
        </div>
        <button
          aria-label="同期状況を再読み込み"
          className={button}
          onClick={() => void load()}
        >
          <RefreshCw className="mr-2 inline h-4 w-4" />
          再読み込み
        </button>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900"
        >
          {error}。表示済みの情報は最新でない可能性があります。
        </div>
      )}
      {!data && !error && <p role="status">同期状況を読み込んでいます…</p>}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-sm text-zinc-600">Shopify通知の署名検証設定</p>
              <p className="mt-2 font-bold">
                {data.webhookConfigured
                  ? "設定あり／通知の登録を確認"
                  : "未設定"}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                最終受信{" "}
                {data.events[0]
                  ? new Date(data.events[0].received_at).toLocaleString("ja-JP")
                  : "まだありません"}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-sm text-zinc-600">
                入庫・検品・出荷の倉庫連携
              </p>
              <p className="mt-2 font-bold">
                {data.warehouseConfigured
                  ? "認証設定あり／実接続確認が必要"
                  : "契約先・接続情報の確認待ち"}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Shopifyに出荷登録されても、検品・配達完了とは扱いません。
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="flex items-center gap-2 text-sm text-zinc-600">
                <Bell className="h-4 w-4" />
                直近50受信中の要確認
              </p>
              <p className="mt-2 font-bold">{issues.length}件</p>
              <p className="mt-1 text-xs text-zinc-600">
                形式不一致・同一時刻の競合。下の受信履歴で確認できます。
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
            <h3 className="font-bold">接続と復旧</h3>
            <p className="mt-2 text-sm text-zinc-600">
              商品・在庫・注文・発送通知を登録します。権限のない通知は接続待ちになります。商品を再取得しても販売在庫や公開状態は変更しません。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className={button}
                disabled={busy}
                onClick={() => void act("status")}
              >
                接続状況を確認
              </button>
              <button
                className={button}
                disabled={busy || !data.webhookConfigured}
                onClick={() => void act("connect")}
              >
                更新通知を登録
              </button>
              <button
                className={button}
                disabled={busy}
                onClick={() => void act("reconcile")}
              >
                {cursor ? "残りの商品を取得" : "商品を再取得"}
              </button>
              <button
                className={button}
                disabled={busy}
                onClick={() => void act("reconcileOrders")}
              >
                {orderCursor ? "残りの注文を取得" : "注文・発送を再取得"}
              </button>
              <button
                className={button}
                disabled={busy}
                onClick={() => void act("reconcileInventory")}
              >
                {inventoryCursor ? "残りの在庫を取得" : "Shopify在庫を再取得"}
              </button>
            </div>
            {busy && (
              <p role="status" className="mt-2 text-sm">
                接続先に確認しています…
              </p>
            )}
            {reconciled !== null && (
              <p className="mt-2 text-sm">
                今回の商品取得 {reconciled}件{" "}
                {cursor
                  ? "／続きがあります"
                  : "／取得終了（削除商品は削除通知で反映）"}
              </p>
            )}
            {inventoryReconciled !== null && (
              <p className="mt-2 text-sm">
                在庫品目取得 {inventoryReconciled}件{" "}
                {inventoryCursor ? "／続きがあります" : "／取得終了"}
              </p>
            )}
            {ordersReconciled !== null && (
              <p className="mt-2 text-sm">
                注文取得 {ordersReconciled}件{" "}
                {orderCursor
                  ? "／続きがあります"
                  : "／取得終了（標準権限では直近60日）"}
              </p>
            )}
            {subscriptions && (
              <ul className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
                {subscriptions.topics.map((s) => (
                  <li key={s.topic} className="rounded bg-zinc-50 p-2">
                    {s.topic}:{" "}
                    {s.subscribed
                      ? "登録済み"
                      : s.permitted
                        ? "未登録"
                        : "Shopify権限が必要"}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {Object.entries(labels).map(([id, label]) => (
                  <button
                    key={id}
                    className={button}
                    aria-pressed={kind === id}
                    onClick={() => {
                      setKind(id as EntityKind);
                      setPage(0);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                className="rounded-lg border px-3 py-2 text-sm"
                aria-label="同期情報を検索"
                placeholder="商品名・注文番号・SKU"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <p className="my-3 text-xs text-zinc-600">
              直近200件の同期記録から表示。
              {data.hasMore && "古い記録はShopifyで確認してください。"}
              仕入先在庫・入庫予定数を販売可能在庫へ加算しません。
            </p>
            {!rows.length ? (
              <p className="rounded-lg bg-zinc-50 p-6 text-sm">
                {query
                  ? "検索条件に一致する記録がありません。"
                  : "この種類の受信記録はまだありません。接続状況を確認してください。"}
              </p>
            ) : (
              <ul className="divide-y">
                {rows.map((row) => {
                  const orderId =
                    row.kind === "fulfillment"
                      ? String(row.data.order_id)
                      : row.entity_id;
                  const path =
                    row.kind === "product"
                      ? `products/${row.entity_id}`
                      : row.kind === "inventory"
                        ? "products/inventory"
                        : `orders/${orderId}`;
                  return (
                    <li
                      key={`${row.kind}:${row.entity_id}`}
                      className="flex flex-col justify-between gap-2 py-4 sm:flex-row"
                    >
                      <div>
                        <p className="font-semibold">
                          {String(
                            row.data.title ??
                              row.data.name ??
                              row.data.id ??
                              row.entity_id,
                          )}
                        </p>
                        <p className="mt-1 text-sm">{operationalStatus(row)}</p>
                        <p className="mt-1 text-xs text-zinc-600">
                          元データ更新{" "}
                          {new Date(row.source_updated_at).toLocaleString(
                            "ja-JP",
                          )}
                        </p>
                      </div>
                      <a
                        href={`https://admin.shopify.com/store/${data.shop.replace(".myshopify.com", "")}/${path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold underline"
                      >
                        Shopifyで詳細 ↗
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
            {filtered.length > 20 && (
              <div className="mt-3 flex items-center gap-3">
                <button
                  className={button}
                  disabled={!page}
                  onClick={() => setPage(page - 1)}
                >
                  前へ
                </button>
                <span>
                  {page + 1} / {Math.ceil(filtered.length / 20)}
                </span>
                <button
                  className={button}
                  disabled={(page + 1) * 20 >= filtered.length}
                  onClick={() => setPage(page + 1)}
                >
                  次へ
                </button>
              </div>
            )}
          </div>
          <details className="rounded-xl border border-zinc-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold">
              受信履歴・エラー（直近50件）
            </summary>
            <ul className="mt-3 max-h-80 space-y-2 overflow-auto text-xs">
              {data.events.length ? (
                data.events.map((e) => (
                  <li key={e.delivery_id} className="rounded bg-zinc-50 p-3">
                    {new Date(e.received_at).toLocaleString("ja-JP")} ·{" "}
                    {e.topic} · {e.outcome}
                    {e.error_code && ` · ${e.error_code}`}
                    <br />
                    {e.delivery_id}
                  </li>
                ))
              ) : (
                <li>受信履歴はありません。</li>
              )}
            </ul>
            <p className="mt-3 text-xs text-zinc-600">
              商品競合は商品再取得で復旧できます。注文・配送の要確認は注文・発送の再取得で照合してください。送信失敗はShopifyが再送します。
            </p>
          </details>
        </>
      )}
      <ShopifyOperationsLinks />
    </section>
  );
}
