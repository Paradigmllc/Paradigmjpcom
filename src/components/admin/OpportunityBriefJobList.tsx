"use client";

import { ExternalLink, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface ReportJob {
  id: string;
  companyId: string;
  companyName: string | null;
  domain: string | null;
  status: string;
  attempts: number;
  maxAttempts: number;
  errorMessage: string | null;
  resultPayload: Record<string, unknown>;
  updatedAt: string;
}

function reportUrl(job: ReportJob): string | null {
  const value = job.resultPayload.canonical_url;
  return typeof value === "string" && value.trim() ? value : null;
}

function statusClass(status: string): string {
  if (status === "completed")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "failed") return "border-red-200 bg-red-50 text-red-800";
  if (status === "running") return "border-blue-200 bg-blue-50 text-blue-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function OpportunityBriefStatusGrid({
  counts,
}: {
  counts: Record<string, number>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatusCard
        label="待機"
        value={counts.queued ?? 0}
        tone="text-amber-700"
      />
      <StatusCard
        label="生成中"
        value={counts.running ?? 0}
        tone="text-blue-700"
      />
      <StatusCard
        label="完了"
        value={counts.completed ?? 0}
        tone="text-emerald-700"
      />
      <StatusCard label="失敗" value={counts.failed ?? 0} tone="text-red-700" />
    </div>
  );
}

export function OpportunityBriefJobList({
  jobs,
  loading,
  loadError,
  busy,
  onRetry,
}: {
  jobs: ReportJob[];
  loading: boolean;
  loadError: string | null;
  busy: boolean;
  onRetry: (jobId: string) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>直近100件</CardTitle>
        <CardDescription>
          ジョブ状態・エラー・生成URLをイベント駆動で更新します。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-8 text-sm text-slate-500">
            ジョブを読み込んでいます…
          </p>
        ) : loadError && jobs.length === 0 ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            {loadError}
          </div>
        ) : jobs.length === 0 ? (
          <p className="py-8 text-sm text-slate-500">
            まだ生成ジョブはありません。
          </p>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {job.companyName ?? job.companyId}
                    </p>
                    <Badge
                      variant="outline"
                      className={statusClass(job.status)}
                    >
                      {job.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {job.domain ?? "domain unavailable"} · 試行 {job.attempts}/
                    {job.maxAttempts} ·{" "}
                    {new Date(job.updatedAt).toLocaleString("ja-JP")}
                  </p>
                  {job.errorMessage && (
                    <p className="mt-2 text-xs leading-5 text-red-700">
                      {job.errorMessage}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {reportUrl(job) && (
                    <a
                      href={reportUrl(job) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-9 items-center rounded-md border border-slate-300 px-3 text-xs font-semibold hover:bg-slate-50"
                    >
                      確認
                      <ExternalLink className="ml-2 h-3.5 w-3.5" />
                    </a>
                  )}
                  {job.status === "failed" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void onRetry(job.id)}
                    >
                      <RotateCcw className="mr-2 h-3.5 w-3.5" />
                      再試行
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className={`mt-2 text-3xl font-semibold ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
