import { operationsDb } from "../operations/store";
import { performDailyTask } from "./tasks";
import type { DailyJob, JobKind } from "./model";
export async function getDailyJobs() {
  const { data, error } = await operationsDb()
    .from("sericia_daily_jobs")
    .select(
      "kind,state,cursor,due_at,started_at,completed_at,last_success_at,attempts,summary,error_message",
    )
    .order("kind");
  if (error) throw new Error("日々の実行状況を取得できません");
  return (data ?? []) as DailyJob[];
}
export async function runDailyJob(kind: JobKind, actor: string) {
  if (!actor) throw new Error("操作主体が未確認です");
  const db = operationsDb();
  const claim = await db.rpc("sericia_claim_job", {
    p_kind: kind,
    p_actor: actor,
  });
  if (claim.error) throw new Error("実行ロックを取得できません");
  const job = claim.data?.[0] as (DailyJob & { lease_id: string }) | undefined;
  if (!job)
    return {
      state: "skipped",
      message: "次回予定時刻前、または別の処理が実行中です",
    };
  let patch: Record<string, unknown>;
  try {
    const result = await performDailyTask(kind, job.cursor, actor);
    const done = new Date().toISOString();
    patch = {
      state: result.state,
      cursor: result.cursor,
      summary: result.summary,
      error_message: result.message,
      completed_at: done,
      ...(result.state === "succeeded" && !result.cursor
        ? { last_success_at: done }
        : {}),
      due_at: new Date(
        Date.now() +
          (result.cursor
            ? 60_000
            : kind === "social"
              ? 60 * 60_000
              : 30 * 60_000),
      ).toISOString(),
    };
  } catch (error) {
    console.error("[sericia-daily] task failed", {
      kind,
      error: error instanceof Error ? error.name : "unknown",
    });
    patch = {
      state: "failed",
      error_message:
        "接続先または保存処理に失敗しました。権限・接続状態を確認してください",
      completed_at: new Date().toISOString(),
      due_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    };
  }
  const saved = await db
    .from("sericia_daily_jobs")
    .update({
      ...patch,
      lease_id: null,
      lease_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("kind", kind)
    .eq("lease_id", job.lease_id)
    .select("kind,state,summary,error_message")
    .single();
  if (saved.error)
    throw new Error(
      "実行結果の確定に失敗しました。再実行前に履歴を確認してください",
    );
  return saved.data;
}

export async function getDailyHistory() {
  const { data, error } = await operationsDb()
    .from("sericia_daily_runs")
    .select("id,kind,state,started_at,completed_at,summary,error_message")
    .order("started_at", { ascending: false })
    .limit(30);
  if (error) throw new Error("実行履歴を取得できません");
  return data ?? [];
}
