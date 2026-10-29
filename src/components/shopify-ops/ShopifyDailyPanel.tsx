"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  businessCoverage,
  jobLabels,
  jobNeedsAttention,
  type DailyJob,
  type JobKind,
} from "@/lib/shopify-ops/daily/model";
type Run = {
  id: string;
  kind: JobKind;
  state: DailyJob["state"];
  started_at: string;
  error_message: string | null;
};
const states = {
  pending: "未実行",
  running: "実行中",
  succeeded: "取得成功",
  blocked: "接続・確認待ち",
  failed: "処理失敗",
};
export function ShopifyDailyPanel() {
  const [history, setHistory] = useState<Run[]>([]);
  const [jobs, setJobs] = useState<DailyJob[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState<JobKind | null>(null),
    [actionError, setActionError] = useState("");
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/shopify-ops/daily", { cache: "no-store" });
      const b = await r.json();
      if (!r.ok || !b.ok) throw new Error(b.error ?? "取得失敗");
      setJobs(b.jobs);
      setHistory(b.history ?? []);
      setError("");
    } catch (e) {
      console.error("[daily-ui] read failed", e);
      setError("日々の実行状況を取得できません");
    }
  }, []);
  useEffect(() => {
    void load();
    const t = setInterval(() => {
      if (!document.hidden) void load();
    }, 15000);
    return () => clearInterval(t);
  }, [load]);
  async function run(kind: JobKind) {
    setBusy(kind);
    setActionError("");
    try {
      const r = await fetch("/api/shopify-ops/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const b = await r.json();
      if (!r.ok || !b.ok) throw new Error(b.error ?? "処理失敗");
      if (["failed", "blocked"].includes(b.result.state)) {
        const message =
          b.result.error_message ?? "接続先・実行結果の確認が必要です";
        setActionError(message);
        toast.warning(message);
      } else
        toast.success(
          b.result.state === "skipped"
            ? b.result.message
            : "実行結果を保存しました",
        );
      await load();
    } catch (e) {
      console.error("[daily-ui] action failed", e);
      const m = e instanceof Error ? e.message : "処理失敗";
      setActionError(m);
      toast.error(m);
    } finally {
      setBusy(null);
    }
  }
  const issues = jobs?.filter((j) => jobNeedsAttention(j)).length ?? 0;
  return (
    <section aria-label="日々の自動運用" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">日々の自動運用</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Shopify通知に加え、定期照合で取りこぼしを回復します。画面は15秒ごとに更新。
          </p>
        </div>
        <div
          role="status"
          className="rounded-xl bg-amber-50 p-3 text-amber-900"
        >
          要対応 {issues}件
        </div>
      </div>
      <p className="rounded-xl border bg-white p-4 text-sm">
        定期起動は15分間隔の予定ですが遅延する場合があります。再取得が途中なら次の実行で続きを取得。仕入先の数量同期、買付・倉庫・SNSの実接続はそれぞれの契約と認証が必要です。
      </p>
      {(error || actionError) && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-900">
          {error || actionError}
          <button onClick={() => void load()} className="ml-3 underline">
            再読み込み
          </button>
        </div>
      )}
      {!jobs && !error && <p role="status">実行状況を読み込み中…</p>}
      {jobs?.length === 0 && (
        <p>実行設定がありません。DBの設定を確認してください。</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {jobs?.map((job) => (
          <article key={job.kind} className="rounded-xl border bg-white p-4">
            <h3 className="font-bold">{jobLabels[job.kind]}</h3>
            <p className="mt-2 text-sm">
              {states[job.state]}
              {job.cursor ? "／続きあり" : ""}
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              最終正常終了：
              {job.last_success_at
                ? new Date(job.last_success_at).toLocaleString("ja-JP")
                : "未確認"}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              次回予定：{new Date(job.due_at).toLocaleString("ja-JP")}
            </p>
            {jobNeedsAttention(job) && (
              <p className="mt-2 text-sm text-amber-900">
                {job.error_message ??
                  "実行が遅延しています。スケジューラ・接続先を確認してください。"}
              </p>
            )}
            <button
              aria-label={`${jobLabels[job.kind]}を実行`}
              disabled={busy !== null}
              onClick={() => void run(job.kind)}
              className="mt-4 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
            >
              {busy === job.kind ? "実行中…" : "予定済み処理を実行"}
            </button>
          </article>
        ))}
      </div>
      <h3 className="text-lg font-bold">直近の実行履歴</h3>
      {history.length === 0 ? (
        <p className="text-sm text-zinc-600">実行履歴はまだありません。</p>
      ) : (
        <div className="max-h-80 overflow-auto rounded-xl border bg-white">
          <ul className="divide-y">
            {history.map((run) => (
              <li key={run.id} className="p-3 text-sm">
                <span className="font-semibold">{jobLabels[run.kind]}</span> —{" "}
                {states[run.state]}
                <time className="ml-2 text-xs text-zinc-600">
                  {new Date(run.started_at).toLocaleString("ja-JP")}
                </time>
                {run.error_message && (
                  <p className="mt-1 text-amber-900">{run.error_message}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <h3 className="text-lg font-bold">実務運用の接続状況</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
        {businessCoverage.map((c) => (
          <article key={c.label} className="rounded-xl border bg-white p-4">
            <h4 className="font-semibold">{c.label}</h4>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              {c.detail}
            </p>
            <a
              className="mt-3 inline-block text-sm underline"
              href={`?tab=${c.tab}`}
            >
              詳細・対応画面
            </a>
          </article>
        ))}
      </div>
      <p className="text-xs text-zinc-600">
        SNS公開結果が不明な場合は重複防止のため停止します。画像・本文の生成は、投稿完了・納品完了・販売開始を意味しません。
      </p>
    </section>
  );
}
