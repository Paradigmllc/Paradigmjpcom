/**
 * Pipeline metrics — execution tracking and observability.
 *
 * Records every pipeline run with timing, success/failure, and step-level detail.
 * Exposes aggregated metrics for dashboards and alerting.
 *
 * 2026-07-07: Implemented for operational observability.
 */

import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"

export interface PipelineExecutionMetric {
  runId: string
  skill: "lead-discovery" | "diagnosis-output" | "crm-sync" | "outreach-exec"
  status: "started" | "completed" | "failed"
  durationMs: number
  candidatesDiscovered: number
  candidatesDiagnosed: number
  candidatesSynced: number
  errors: string[]
  startedAt: string
  completedAt?: string
}

export interface PipelineMetricsSummary {
  totalRuns: number
  successRate: number
  avgDurationMs: number
  lastRunAt: string | null
  lastErrorAt: string | null
  lastErrorMessage: string | null
  bySkill: Record<string, { runs: number; successRate: number; avgDurationMs: number }>
}

// ─── Record a pipeline execution ───

export async function recordPipelineExecution(
  metric: PipelineExecutionMetric,
): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb) {
    console.error("[pipeline-metrics] Supabase not configured, skipping metric")
    return
  }

  try {
    const { error } = await sb.from(DB_TABLES.SALES_PIPELINE_METRICS).insert({
      run_id: metric.runId,
      skill: metric.skill,
      status: metric.status,
      duration_ms: metric.durationMs,
      candidates_discovered: metric.candidatesDiscovered,
      candidates_diagnosed: metric.candidatesDiagnosed,
      candidates_synced: metric.candidatesSynced,
      errors: metric.errors,
      started_at: metric.startedAt,
      completed_at: metric.completedAt ?? new Date().toISOString(),
    })

    if (error) {
      console.error("[pipeline-metrics] insert failed:", error.message)
    }
  } catch (e) {
    console.error("[pipeline-metrics] record failed:", e instanceof Error ? e.message : String(e))
  }
}

// ─── Query aggregated metrics ───

export async function getPipelineMetricsSummary(
  windowHours = 168, // default: last 7 days
): Promise<PipelineMetricsSummary> {
  const sb = getServiceSalesSupabase()
  if (!sb) {
    return {
      totalRuns: 0, successRate: 1, avgDurationMs: 0,
      lastRunAt: null, lastErrorAt: null, lastErrorMessage: null,
      bySkill: {},
    }
  }

  try {
    const since = new Date(Date.now() - windowHours * 3600_000).toISOString()

    const { data, error } = await sb
      .from(DB_TABLES.SALES_PIPELINE_METRICS)
      .select("skill, status, duration_ms, errors, started_at, completed_at")
      .gte("started_at", since)
      .order("started_at", { ascending: false })

    if (error || !data) {
      console.error("[pipeline-metrics] query failed:", error?.message ?? "no data")
      return {
        totalRuns: 0, successRate: 1, avgDurationMs: 0,
        lastRunAt: null, lastErrorAt: null, lastErrorMessage: null,
        bySkill: {},
      }
    }

    const rows = data as Array<{
      skill: string; status: string; duration_ms: number
      errors: string[]; started_at: string; completed_at: string | null
    }>

    const completed = rows.filter((r) => r.status === "completed")
    const failed = rows.filter((r) => r.status === "failed")
    const lastError = failed[0]

    const bySkill: Record<string, { runs: number; successRate: number; avgDurationMs: number }> = {}
    for (const row of rows) {
      const s = bySkill[row.skill] ?? { runs: 0, successRate: 1, avgDurationMs: 0 }
      s.runs++
      s.avgDurationMs = ((s.avgDurationMs * (s.runs - 1)) + row.duration_ms) / s.runs
      if (row.status === "failed") {
        s.successRate = ((s.successRate * (s.runs - 1)) + 0) / s.runs
      }
      bySkill[row.skill] = s
    }

    return {
      totalRuns: rows.length,
      successRate: rows.length > 0 ? completed.length / rows.length : 1,
      avgDurationMs: completed.length > 0
        ? completed.reduce((sum, r) => sum + r.duration_ms, 0) / completed.length
        : 0,
      lastRunAt: rows[0]?.started_at ?? null,
      lastErrorAt: lastError?.started_at ?? null,
      lastErrorMessage: lastError?.errors?.[0] ?? null,
      bySkill,
    }
  } catch (e) {
    console.error("[pipeline-metrics] summary failed:", e instanceof Error ? e.message : String(e))
    return {
      totalRuns: 0, successRate: 1, avgDurationMs: 0,
      lastRunAt: null, lastErrorAt: null, lastErrorMessage: null,
      bySkill: {},
    }
  }
}
