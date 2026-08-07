/**
 * lib/youtube/script/generators/dify.ts — Dify Cloud 経由のドラフト生成
 *
 * 顧客向け成果物の生成には DIFY-CLOUD-ONLY 永久ルールが適用されるため、
 * その系統の用途ではこちらを使う。自チャンネルの台本には OSS 生成器で足りる。
 */

import { callDifyJson } from "@/lib/mvp/dify"
import type { DraftGenerator, ScriptDraft } from "../types"

export const difyDraftGenerator: DraftGenerator = async ({ systemPrompt, payload }) => {
  const result = await callDifyJson<ScriptDraft>("videoScriptGenerator", systemPrompt, payload, {
    user: "youtube-script",
    timeoutMs: 120_000,
  })
  if (!result.ok || !result.outputs) {
    return { ok: false, errorMessage: result.errorMessage ?? "Difyが台本を返しませんでした。" }
  }
  return { ok: true, draft: result.outputs }
}
