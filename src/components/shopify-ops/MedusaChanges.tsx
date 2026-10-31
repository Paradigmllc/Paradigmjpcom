"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
const rowsSchema = z.array(z.object({ id: z.string(), topic: z.string(), entity_id: z.string(), received_at: z.string().datetime({ offset: true }), notification_error: z.boolean() })).max(30);
export function MedusaChanges({ onChange }: { onChange: () => void }) {
  const [rows, setRows] = useState<z.infer<typeof rowsSchema>>([]);
  const [state, setState] = useState("接続中");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let source: EventSource, stopped = false, attempts = 0, timer: ReturnType<typeof setTimeout> | undefined;
    let previous = "";
    const fail = (message: string) => {
      console.error("[medusa-changes]", message); setError(message); setState("切断"); toast.error(message);
    };
    const connect = () => {
      if (stopped) return;
      setState("接続中"); setError("");
      source = new EventSource("/api/medusa-ops/stream");
      source.onmessage = message => {
        try {
          const data = JSON.parse(message.data);
          if (data.type === "connected") { setState("自動更新接続中"); return; }
          if (data.type === "reconnect") { source.close(); timer = setTimeout(connect, 1000); return; }
          if (data.type === "error") throw new Error("変更通知の取得に失敗しました。再接続してください");
          if (data.type !== "changes") throw new Error("変更通知の形式が不正です");
          const next = rowsSchema.parse(data.rows);
          const fingerprint = JSON.stringify(next.map(row => [row.id, row.notification_error]));
          setRows(next);
          if (fingerprint !== previous) { previous = fingerprint; onChange(); }
        } catch { source.close(); fail("変更通知を確認できません。再接続してください"); }
      };
      source.onerror = () => {
        source.close();
        if (stopped) return;
        setState("再接続待ち");
        if (++attempts <= 3) timer = setTimeout(connect, 1000 * 2 ** attempts);
        else fail("自動更新が停止しました。手動再取得または再接続してください");
      };
    };
    connect();
    return () => { stopped = true; clearTimeout(timer); source?.close(); };
  }, [revision, onChange]);
  return <section aria-label="Medusa変更履歴" className="space-y-3 rounded-xl border bg-white p-4 sm:p-5 lg:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">変更通知・履歴</h3>
      <span role="status" className="text-sm text-zinc-600">{state}</span>
      <button aria-label="Medusa自動更新に再接続" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setRevision(v => v + 1)}>再接続</button></div>
    <p className="text-sm text-zinc-600">Medusa内の商品・在庫変更を受信すると表示を更新します。仕入先・倉庫との同期ではありません。</p>
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    {!rows.length && <p className="text-sm text-zinc-600">受信済みの変更通知はありません。</p>}
    <ol className="max-h-64 space-y-2 overflow-y-auto">{rows.map(row => <li key={row.id} className="break-all border-t pt-2 text-xs text-zinc-700">
      {row.topic} ／ {row.entity_id} ／ 受信 {new Date(row.received_at).toLocaleString("ja-JP")}
      {row.notification_error && <p className="mt-1 text-red-800">ベル・Slack通知の一部が失敗しました。</p>}
    </li>)}</ol>
  </section>;
}
