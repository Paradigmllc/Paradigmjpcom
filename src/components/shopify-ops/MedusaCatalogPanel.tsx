"use client";
import { useCallback, useEffect, useState } from "react";
import { MedusaChanges } from "./MedusaChanges";
import { toast } from "sonner";
import type { MedusaCatalog } from "@/lib/medusa-ops/catalog";

export function MedusaCatalogPanel() {
  const [kind, setKind] = useState<"products" | "inventory">("products");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<MedusaCatalog | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async (signal: AbortSignal) => {
    setBusy(true); setError(""); setData(null);
    try {
      const response = await fetch(`/api/medusa-ops?kind=${kind}&offset=${offset}`, { cache: "no-store", signal });
      const value = await response.json();
      if (!response.ok || !value.ok) throw new Error(value.error ?? "取得に失敗しました");
      if (!signal.aborted) setData(value.catalog);
    } catch (cause) {
      if (signal.aborted) return;
      console.error("[medusa-ops] load failed", cause);
      const message = cause instanceof Error ? cause.message : "取得に失敗しました";
      setError(message); toast.error(message);
    } finally { if (!signal.aborted) setBusy(false); }
  }, [kind, offset]);
  const [revision, setRevision] = useState(0);
  const handleChange = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, revision]);
  const button = "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50";
  return <section aria-label="Medusaの商品・在庫" className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
      <div><h2 className="text-xl font-bold">Medusaの商品・在庫</h2>
        <p className="mt-2 text-sm text-zinc-600">移行先DBの現在値を取得します。公開ストアの切替や在庫の書換えは行いません。</p></div>
      <button aria-label="Medusaデータを再取得" className={button} disabled={busy} onClick={() => setRevision(v => v + 1)}>再取得</button>
    </div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      倉庫・仕入先の実在庫との連携は未接続です。入庫予定数は販売在庫に含めません。予約を差し引いた数量も販売チャネルごとの販売可能数とは異なります。
    </div>
    <div className="flex gap-2">{(["products", "inventory"] as const).map(value =>
      <button key={value} className={button} aria-pressed={kind === value} onClick={() => { setKind(value); setOffset(0); }}>{value === "products" ? "商品" : "在庫品目"}</button>)}</div>
    {busy && <p role="status">Medusaから取得しています…</p>}
    {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">{error}</p>}
    {data && !data.configured && <p className="rounded-xl border bg-white p-5">Medusa管理APIは未接続です。管理者がサーバーの接続URLと専用APIキーを設定すると取得できます。</p>}
    {data?.configured && <>
      <p className="text-sm text-zinc-600">全{data.count}件 ／ 取得日時 {new Date(data.fetchedAt).toLocaleString("ja-JP")}（Medusa取得値）</p>
      {!data.rows.length && <p className="rounded-xl border bg-white p-5">このページに登録データはありません。</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.kind === "products" ? data.rows.map(row => <article className="min-w-0 rounded-xl border bg-white p-4" key={row.id}>
          <h3 className="break-words font-semibold">{row.title}</h3>
          <p className="mt-2 text-sm">状態: {({draft:"下書き",published:"公開",proposed:"提案中",rejected:"却下"} as Record<string,string>)[row.status] ?? row.status}</p>
          <p className="mt-1 break-all text-xs text-zinc-600">{row.id}</p>
        </article>) : data.rows.map(row => <article className="min-w-0 rounded-xl border bg-white p-4" key={row.id}>
          <h3 className="break-words font-semibold">{row.title || row.sku || row.id}</h3>
          <p className="mt-1 break-all text-xs text-zinc-600">SKU: {row.sku || "未設定"}</p>
          {!row.location_levels.length && <p className="mt-2 text-sm">在庫拠点未登録（数量未確認）</p>}
          {row.location_levels.map(level => <dl className="mt-3 border-t pt-2 text-sm" key={level.id}>
            <dt className="break-all text-xs text-zinc-600">拠点 {level.location_id}</dt>
            <dd>登録在庫 {level.stocked_quantity} ／ 予約 {level.reserved_quantity}</dd>
            <dd>予約差引 {level.stocked_quantity - level.reserved_quantity} ／ 入庫予定 {level.incoming_quantity}</dd>
          </dl>)}
        </article>)}
      </div>
      <div className="flex gap-2"><button className={button} disabled={busy || offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>前の50件</button>
        <button className={button} disabled={busy || data.nextOffset === null} onClick={() => { if (data.nextOffset !== null) setOffset(data.nextOffset); }}>次の50件</button></div>
    </>}
    <MedusaChanges onChange={handleChange} />
  </section>;
}
