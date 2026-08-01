"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileStack, Play, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  OpportunityBriefJobList,
  OpportunityBriefStatusGrid,
  type ReportJob,
} from "@/components/admin/OpportunityBriefJobList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface RejectedCompany {
  companyId: string;
  companyName: string;
  score: number;
  reasons: string[];
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeJob(value: unknown): ReportJob | null {
  const row = record(value);
  const id = textValue(row.id);
  if (!id) return null;
  const companyRaw = row.sales_companies;
  const company = record(
    Array.isArray(companyRaw) ? companyRaw[0] : companyRaw,
  );
  return {
    id,
    companyId: textValue(row.companyId) ?? textValue(row.company_id) ?? "",
    companyName: textValue(row.companyName) ?? textValue(company.company_name),
    domain: textValue(row.domain) ?? textValue(company.domain),
    status: textValue(row.status) ?? "unknown",
    attempts: numberValue(row.attempts),
    maxAttempts: numberValue(row.maxAttempts ?? row.max_attempts, 3),
    errorMessage: textValue(row.errorMessage) ?? textValue(row.error_message),
    resultPayload: record(row.resultPayload ?? row.result_payload),
    updatedAt:
      textValue(row.updatedAt) ??
      textValue(row.updated_at) ??
      new Date().toISOString(),
  };
}

export function OpportunityBriefFactoryConsole() {
  const [companyIds, setCompanyIds] = useState("");
  const [requireCompetitors, setRequireCompetitors] = useState(true);
  const [jobs, setJobs] = useState<ReportJob[]>([]);
  const [rejected, setRejected] = useState<RejectedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState<
    "connecting" | "live" | "degraded"
  >("connecting");
  const [loadError, setLoadError] = useState<string | null>(null);

  const mergeJobs = useCallback((incoming: unknown[]) => {
    const normalized = incoming
      .map(normalizeJob)
      .filter((job): job is ReportJob => job !== null);
    setJobs((current) => {
      const byId = new Map(current.map((job) => [job.id, job]));
      normalized.forEach((job) => byId.set(job.id, job));
      return [...byId.values()]
        .sort(
          (left, right) =>
            Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
        )
        .slice(0, 100);
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const response = await fetch(
        "/api/sales/opportunity-briefs/batch?limit=100",
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        jobs?: unknown[];
        error?: string;
      };
      if (!response.ok || !payload.ok)
        throw new Error(payload.error ?? "生成ジョブを取得できませんでした");
      setJobs(
        (payload.jobs ?? [])
          .map(normalizeJob)
          .filter((job): job is ReportJob => job !== null),
      );
    } catch (error) {
      console.error("[opportunity-brief-factory] refresh failed:", error);
      const message =
        error instanceof Error
          ? error.message
          : "生成ジョブを取得できませんでした";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const events = new EventSource(
      "/api/sales/opportunity-briefs/batch/events",
    );
    events.onopen = () => setConnection("live");
    events.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          jobs?: unknown[];
          message?: string;
        };
        if (payload.type === "error")
          setLoadError(payload.message ?? "Realtime初期化に失敗しました");
        if (payload.type === "warning") setConnection("degraded");
        if (payload.jobs) mergeJobs(payload.jobs);
      } catch (error) {
        console.error(
          "[opportunity-brief-factory] realtime message parse failed:",
          error,
        );
        setConnection("degraded");
      }
    };
    events.onerror = () => setConnection("degraded");
    return () => events.close();
  }, [mergeJobs, refresh]);

  const counts = useMemo(
    () =>
      jobs.reduce<Record<string, number>>((result, job) => {
        result[job.status] = (result[job.status] ?? 0) + 1;
        return result;
      }, {}),
    [jobs],
  );

  async function enqueue() {
    const ids = [
      ...new Set(
        companyIds
          .split(/[\s,]+/)
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];
    if (ids.length === 0)
      return toast.error("Twenty同期済み企業のUUIDを1件以上入力してください");
    if (ids.length > 100) return toast.error("1回の投入上限は100社です");
    setBusy(true);
    try {
      const response = await fetch("/api/sales/opportunity-briefs/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIds: ids, requireCompetitors }),
      });
      const payload = (await response.json()) as {
        queued?: number;
        reused?: number;
        rejected?: RejectedCompany[];
        automaticDrainStarted?: boolean;
        error?: string;
      };
      setRejected(payload.rejected ?? []);
      if (!response.ok)
        throw new Error(payload.error ?? "生成キューへの投入に失敗しました");
      toast.success(
        `${payload.queued ?? 0}社を投入、${payload.reused ?? 0}社は実行中ジョブを再利用。自動生成を開始しました`,
      );
      setCompanyIds("");
      await refresh();
    } catch (error) {
      console.error("[opportunity-brief-factory] enqueue failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "生成キューへの投入に失敗しました",
      );
    } finally {
      setBusy(false);
    }
  }

  async function runNext() {
    setBusy(true);
    try {
      const response = await fetch("/api/sales/opportunity-briefs/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 3 }),
      });
      const payload = (await response.json()) as {
        status?: string;
        processed?: number;
        completed?: number;
        failed?: number;
        errors?: string[];
      };
      if (!response.ok && response.status !== 207)
        throw new Error(
          payload.errors?.[0] ?? "生成処理を開始できませんでした",
        );
      toast.success(
        payload.status === "already_running"
          ? "自動生成は既に稼働中です"
          : `${payload.processed ?? 0}社を処理。残りも自動で継続します`,
      );
      await refresh();
    } catch (error) {
      console.error("[opportunity-brief-factory] run failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "生成処理を開始できませんでした",
      );
    } finally {
      setBusy(false);
    }
  }

  async function retry(jobId: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/sales/opportunity-briefs/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds: [jobId] }),
      });
      const payload = (await response.json()) as {
        retried?: number;
        error?: string;
      };
      if (!response.ok || !payload.retried)
        throw new Error(payload.error ?? "再試行対象へ戻せませんでした");
      toast.success("同じ生成ジョブを再試行キューへ戻しました");
      await refresh();
    } catch (error) {
      console.error("[opportunity-brief-factory] retry failed:", error);
      toast.error(
        error instanceof Error ? error.message : "再試行に失敗しました",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-10 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.24em] text-red-700">
              Japan Entry Report Factory
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Opportunity Brief 量産管理
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              証拠が揃った企業だけを最大100社ずつ投入し、3社並列で最後まで自動生成します。公開URLはTwentyへ同期しますが、フォーム送信は常に無効です。
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              connection === "live"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-amber-300 bg-amber-50 text-amber-800"
            }
          >
            {connection === "live"
              ? "Realtime接続中"
              : connection === "connecting"
                ? "接続中"
                : "Realtime要確認"}
          </Badge>
        </div>

        <OpportunityBriefStatusGrid counts={counts} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileStack className="h-5 w-5" />
              生成対象を投入
            </CardTitle>
            <CardDescription>
              sales_companies.idを改行またはカンマ区切りで入力。公開シグナル、商品情報、サイト監査、競合根拠の品質ゲートを通過した企業のみ受理し、投入後は操作不要で処理を継続します。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={companyIds}
              onChange={(event) => setCompanyIds(event.target.value)}
              rows={7}
              placeholder="00000000-0000-0000-0000-000000000000"
              aria-label="企業UUID一覧"
              className="font-mono text-xs"
            />
            <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={requireCompetitors}
                onChange={(event) =>
                  setRequireCompetitors(event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              根拠URL付き競合分析を必須にする
            </label>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" onClick={enqueue} disabled={busy}>
                <FileStack className="mr-2 h-4 w-4" />
                最大100社をキュー投入
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={runNext}
                disabled={busy}
              >
                <Play className="mr-2 h-4 w-4" />
                自動処理を再開
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void refresh()}
                disabled={busy}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                再読込
              </Button>
            </div>
          </CardContent>
        </Card>

        {rejected.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-lg">
                品質ゲートで停止: {rejected.length}社
              </CardTitle>
              <CardDescription>
                弱いレポートを公開せず、足りない証拠を企業単位で表示します。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {rejected.map((item) => (
                <div
                  key={item.companyId}
                  className="rounded-lg border border-amber-200 bg-white p-4"
                >
                  <p className="font-semibold">
                    {item.companyName}{" "}
                    <span className="text-xs text-slate-500">
                      {item.score}/100
                    </span>
                  </p>
                  <p className="mt-2 text-xs leading-5 text-amber-900">
                    {item.reasons.join(" / ")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <OpportunityBriefJobList
          jobs={jobs}
          loading={loading}
          loadError={loadError}
          busy={busy}
          onRetry={retry}
        />
      </div>
    </main>
  );
}
