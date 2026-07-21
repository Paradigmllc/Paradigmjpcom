import "server-only"

import { callDeepSeek } from "@/lib/deepseek"

export interface ManualWorkBatchPreflightResult {
  ok: boolean
  error?: string
  usedModel?: string
}

/**
 * Prevents a large durable batch from being accepted when the generation
 * provider is unavailable or out of balance. The probe is intentionally tiny;
 * full company analysis still happens only inside the durable queue.
 */
export async function preflightManualWorkBatch(): Promise<ManualWorkBatchPreflightResult> {
  const response = await callDeepSeek([
    { role: "system", content: "Return exactly READY." },
    { role: "user", content: "READY" },
  ], {
    temperature: 0,
    maxTokens: 4,
    timeoutMs: 15_000,
  })

  if (!response.ok || !response.text?.trim()) {
    return {
      ok: false,
      error: response.error ?? "DeepSeek APIの事前接続確認に失敗しました",
    }
  }

  return { ok: true, usedModel: response.usedModel }
}
