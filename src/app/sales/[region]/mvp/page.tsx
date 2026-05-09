/**
 * /sales/[region]/mvp — MVP フロー監視ダッシュボード.
 * AE-10 URL-state supremacy: region は URL から導出. selector UI は持たない.
 * AE-4 data-owner 単一: TanStack Query のみ.
 */

"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

const STATUS_GROUPS = {
  active: ["queued", "report_generating", "report_url_verifying", "report_ready", "form_message_generating", "form_violation_check", "form_pending_approval", "form_submitting"],
  done: ["sent", "replied"],
  failed: ["failed_report", "failed_form_url", "failed_violation", "failed_submit", "dead_letter"],
  skipped: ["skipped"],
} as const;

const STATUS_LABEL: Record<string, string> = {
  queued: "queue 待ち",
  report_generating: "レポート生成中",
  report_url_verifying: "URL 確認中",
  report_ready: "レポート完成",
  form_message_generating: "文面生成中",
  form_violation_check: "規約チェック中",
  form_pending_approval: "Slack 承認待ち",
  form_submitting: "送信中",
  sent: "送信完了",
  replied: "返信あり",
  failed_report: "レポート失敗",
  failed_form_url: "フォーム URL 失敗",
  failed_violation: "規約違反",
  failed_submit: "送信失敗",
  dead_letter: "dead letter",
  skipped: "skip",
};

interface RunRow {
  id: string;
  lead_id: string;
  region: string;
  language: string;
  status: string;
  step: string | null;
  report_canonical_url: string | null;
  report_http_status: number | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export default function MvpDashboardPage() {
  const params = useParams<{ region: string }>();
  const region = params.region;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["mvp-runs", region],
    queryFn: async () => {
      const res = await fetch(`/api/mvp/runs?region=${region}&limit=200`);
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      return (await res.json()) as { ok: boolean; runs: RunRow[]; counts: Record<string, number> };
    },
    refetchInterval: 5_000,
  });

  if (isLoading) return <div className="p-8">読み込み中...</div>;
  if (error || !data?.ok) return <div className="p-8 text-red-600">エラー: {String(error ?? "load failed")}</div>;

  const groups = {
    active: (data.runs ?? []).filter((r) => (STATUS_GROUPS.active as readonly string[]).includes(r.status)),
    done: (data.runs ?? []).filter((r) => (STATUS_GROUPS.done as readonly string[]).includes(r.status)),
    failed: (data.runs ?? []).filter((r) => (STATUS_GROUPS.failed as readonly string[]).includes(r.status)),
    skipped: (data.runs ?? []).filter((r) => (STATUS_GROUPS.skipped as readonly string[]).includes(r.status)),
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">MVP 営業フロー監視 — region: {region}</h1>
        <button onClick={() => refetch()} className="px-3 py-1 border rounded hover:bg-gray-50">
          再読込
        </button>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="進行中" value={groups.active.length} color="blue" />
        <KpiCard label="送信完了" value={groups.done.length} color="green" />
        <KpiCard label="失敗" value={groups.failed.length} color="red" />
        <KpiCard label="skip" value={groups.skipped.length} color="gray" />
      </section>

      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">status 別件数</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {Object.entries(data.counts ?? {}).map(([k, v]) => (
            <div key={k} className="flex justify-between border rounded px-2 py-1">
              <span>{STATUS_LABEL[k] ?? k}</span>
              <span className="font-mono">{v}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border rounded">
        <h2 className="font-semibold p-3 border-b">最新 run (上位 200)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">時刻</th>
                <th className="p-2 text-left">status</th>
                <th className="p-2 text-left">step</th>
                <th className="p-2 text-left">lang</th>
                <th className="p-2 text-left">URL</th>
                <th className="p-2 text-right">HTTP</th>
                <th className="p-2 text-right">retry</th>
                <th className="p-2 text-left">trace</th>
              </tr>
            </thead>
            <tbody>
              {(data.runs ?? []).map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 font-mono text-xs">{new Date(r.updated_at).toLocaleString("ja-JP")}</td>
                  <td className="p-2">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded ${statusClass(r.status)}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="p-2 text-xs text-gray-600">{r.step ?? "—"}</td>
                  <td className="p-2 font-mono text-xs">{r.language}</td>
                  <td className="p-2">
                    {r.report_canonical_url ? (
                      <a href={r.report_canonical_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                        report ↗
                      </a>
                    ) : "—"}
                  </td>
                  <td className="p-2 text-right font-mono text-xs">{r.report_http_status ?? "—"}</td>
                  <td className="p-2 text-right">{r.retry_count}</td>
                  <td className="p-2">
                    <Link href={`/sales/${region}/mvp/${r.id}`} className="text-blue-600 hover:underline text-xs">
                      詳細 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color: "blue" | "green" | "red" | "gray" }) {
  const colorClass = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    gray: "bg-gray-50 text-gray-700 border-gray-200",
  }[color];
  return (
    <div className={`border rounded p-4 ${colorClass}`}>
      <div className="text-sm">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function statusClass(s: string): string {
  if ((STATUS_GROUPS.done as readonly string[]).includes(s)) return "bg-green-100 text-green-800";
  if ((STATUS_GROUPS.failed as readonly string[]).includes(s)) return "bg-red-100 text-red-800";
  if ((STATUS_GROUPS.skipped as readonly string[]).includes(s)) return "bg-gray-200 text-gray-800";
  return "bg-blue-100 text-blue-800";
}
