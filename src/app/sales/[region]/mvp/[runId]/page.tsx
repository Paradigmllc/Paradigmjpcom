/**
 * /sales/[region]/mvp/[runId] — 1 run の詳細 trace.
 */

"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

interface RunDetail {
  ok: boolean;
  run: {
    id: string;
    lead_id: string;
    region: string;
    language: string;
    status: string;
    step: string | null;
    template_id: string | null;
    cms_content_block_id: string | null;
    report_canonical_url: string | null;
    report_url_verified_at: string | null;
    report_http_status: number | null;
    report_verify_attempts: number;
    form_url: string | null;
    form_message_body: string | null;
    form_violation_verdict: string | null;
    form_violation_reason: string | null;
    slack_thread_ts: string | null;
    form_submit_started_at: string | null;
    form_submit_completed_at: string | null;
    form_pre_screenshot_url: string | null;
    form_post_screenshot_url: string | null;
    retry_count: number;
    error_log: Array<{ step: string; error: string; ts: string }>;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
  };
  lead: { id: string; company_name: string; domain: string; country_code: string; contact_form_url: string | null } | null;
  cms_content_block: { id: string; slug: string; title: string; schema_version: string; canonical_url: string; created_at: string } | null;
}

export default function MvpRunDetailPage() {
  const params = useParams<{ region: string; runId: string }>();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["mvp-run", params.runId],
    queryFn: async (): Promise<RunDetail> => {
      const res = await fetch(`/api/mvp/runs/${params.runId}`);
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      return await res.json();
    },
    refetchInterval: 3_000,
  });

  if (isLoading) return <div className="p-8">読み込み中...</div>;
  if (error || !data?.ok) return <div className="p-8 text-red-600">エラー: {String(error ?? "load failed")}</div>;

  const { run, lead, cms_content_block } = data;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <nav className="text-sm">
        <Link href={`/sales/${params.region}/mvp`} className="text-blue-600 hover:underline">← 監視ダッシュボード</Link>
      </nav>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{lead?.company_name ?? run.lead_id}</h1>
        <div className="text-sm text-gray-600 font-mono">
          run_id: {run.id} / lead_id: {run.lead_id} / status: <span className="font-bold">{run.status}</span>
        </div>
        <button onClick={() => refetch()} className="px-3 py-1 text-sm border rounded hover:bg-gray-50">再読込</button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="基本情報">
          <Field label="region" value={run.region} />
          <Field label="language" value={run.language} />
          <Field label="domain" value={lead?.domain ?? "—"} />
          <Field label="country" value={lead?.country_code ?? "—"} />
        </Card>

        <Card title="step trace">
          <Field label="現在 step" value={run.step ?? "—"} />
          <Field label="作成" value={new Date(run.created_at).toLocaleString("ja-JP")} />
          <Field label="更新" value={new Date(run.updated_at).toLocaleString("ja-JP")} />
          <Field label="完了" value={run.completed_at ? new Date(run.completed_at).toLocaleString("ja-JP") : "—"} />
          <Field label="retry" value={String(run.retry_count)} />
        </Card>

        <Card title="report 生成結果">
          <Field label="template_id" value={run.template_id ?? "—"} />
          <Field label="cms_content_block_id" value={run.cms_content_block_id ?? "—"} />
          {cms_content_block && (
            <>
              <Field label="schema_version" value={cms_content_block.schema_version} />
              <Field label="slug" value={cms_content_block.slug} />
              <Field label="title" value={cms_content_block.title} />
            </>
          )}
          {run.report_canonical_url && (
            <div className="mt-2">
              <a href={run.report_canonical_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {run.report_canonical_url} ↗
              </a>
            </div>
          )}
          <Field label="HTTP status" value={String(run.report_http_status ?? "—")} />
          <Field label="verify attempts" value={String(run.report_verify_attempts)} />
          <Field label="verified at" value={run.report_url_verified_at ? new Date(run.report_url_verified_at).toLocaleString("ja-JP") : "—"} />
        </Card>

        <Card title="form 送信結果">
          <Field label="form URL" value={run.form_url ?? lead?.contact_form_url ?? "—"} />
          <Field label="violation 判定" value={run.form_violation_verdict ?? "—"} />
          {run.form_violation_reason && <Field label="判定理由" value={run.form_violation_reason} />}
          {run.slack_thread_ts && <Field label="Slack thread" value={run.slack_thread_ts} />}
          <Field label="送信開始" value={run.form_submit_started_at ? new Date(run.form_submit_started_at).toLocaleString("ja-JP") : "—"} />
          <Field label="送信完了" value={run.form_submit_completed_at ? new Date(run.form_submit_completed_at).toLocaleString("ja-JP") : "—"} />
        </Card>

        {run.form_message_body && (
          <Card title="生成本文" className="md:col-span-2">
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded border">{run.form_message_body}</pre>
          </Card>
        )}

        {(run.form_pre_screenshot_url || run.form_post_screenshot_url) && (
          <Card title="Playwright screenshots" className="md:col-span-2">
            <div className="grid grid-cols-2 gap-2">
              {run.form_pre_screenshot_url && (
                <div>
                  <div className="text-xs mb-1">pre</div>
                  <a href={run.form_pre_screenshot_url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={run.form_pre_screenshot_url} alt="pre" className="border rounded" />
                  </a>
                </div>
              )}
              {run.form_post_screenshot_url && (
                <div>
                  <div className="text-xs mb-1">post</div>
                  <a href={run.form_post_screenshot_url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={run.form_post_screenshot_url} alt="post" className="border rounded" />
                  </a>
                </div>
              )}
            </div>
          </Card>
        )}

        {Array.isArray(run.error_log) && run.error_log.length > 0 && (
          <Card title="エラーログ" className="md:col-span-2">
            <ul className="space-y-2 text-sm">
              {run.error_log.map((e, i) => (
                <li key={i} className="border-l-4 border-red-300 bg-red-50 p-2">
                  <div className="text-xs font-mono text-gray-600">{new Date(e.ts).toLocaleString("ja-JP")} — {e.step}</div>
                  <div>{e.error}</div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`border rounded p-4 ${className ?? ""}`}>
      <h2 className="font-semibold mb-2">{title}</h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
