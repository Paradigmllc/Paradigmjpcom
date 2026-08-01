import { getServiceSalesSupabase } from "@/lib/supabase"
import { notifySlack } from "@/lib/notify"
import { enqueuePipelineReviewTask, executeStep } from "./sales-pipeline-execution"
import { fetchRunWithSteps, summarizeSalesPipelineStatus, updateRun, updateStep } from "./sales-pipeline-helpers"
import type { SalesPipelineRun } from "./sales-pipeline-types"

export async function runSalesPipelineLocally(runId: string): Promise<{ ok: boolean; run?: SalesPipelineRun; error?: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role is not configured" }

  try {
    let run = await fetchRunWithSteps(sb, runId)
    const steps = [...(run.steps ?? [])].sort((a, b) => a.position - b.position)
    for (const step of steps) {
      try {
        await executeStep(sb, run, step)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown pipeline step error"
        console.error(`[sales-pipeline] ${step.step_key} failed:`, error)
        await updateStep(sb, step, { status: step.required ? "failed" : "needs_review", error_message: message })
        if (step.required) break
      }
      run = await fetchRunWithSteps(sb, run.id)
      if (summarizeSalesPipelineStatus(run.steps ?? []) === "waiting_external") break
    }

    const refreshed = await fetchRunWithSteps(sb, run.id)
    const status = summarizeSalesPipelineStatus(refreshed.steps ?? [])
    await updateRun(sb, refreshed.id, {
      status,
      current_step: refreshed.steps?.find((step) => step.status === "queued" || step.status === "running" || step.status === "waiting_external" || step.status === "needs_review")?.step_key ?? null,
      completed_at: status === "completed" || status === "failed" || status === "cancelled" ? new Date().toISOString() : null,
      error_message: refreshed.steps?.find((step) => step.status === "failed")?.error_message ?? null,
      result_payload: {
        step_statuses: Object.fromEntries((refreshed.steps ?? []).map((step) => [step.step_key, step.status])),
      },
    })
    
    if (status === "completed" || status === "failed" || status === "needs_review") {
      const icon = status === "completed" ? "[OK]" : status === "failed" ? "[FAILED]" : "[REVIEW]"
      await notifySlack(`*Sales Pipeline [${status.toUpperCase()}]* ${icon}\nCompany: ${refreshed.sales_companies?.company_name ?? refreshed.company_id}\nRun ID: ${refreshed.id}`)
      
      if (status === "needs_review" || status === "failed") {
        await enqueuePipelineReviewTask(sb, refreshed, {
          reason: `Pipeline finished with status: ${status}`,
          queueType: "analysis",
          priority: status === "failed" ? 100 : 80,
          meta: { review_reason: status === "failed" ? "error_recovery" : "pipeline_review" },
        })
      }
    }

    return { ok: status !== "failed", run: await fetchRunWithSteps(sb, refreshed.id) }
  } catch (error) {
    console.error("[sales-pipeline] local run failed:", error)
    return { ok: false, error: error instanceof Error ? error.message : "Unknown sales pipeline error" }
  }
}
