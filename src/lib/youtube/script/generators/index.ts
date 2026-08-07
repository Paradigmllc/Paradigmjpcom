/**
 * lib/youtube/script/generators/index.ts — 生成器の選択
 *
 * 既定は OSS LLM。Dify Cloud は明示的に選んだときだけ使う。
 * 自チャンネル向けの台本は顧客向け成果物ではないうえ、公開前ゲートが
 * 品質と主張の根拠を機械検査するため、Dify のワークフロー管理に依存する必要がない。
 */

import { optionalEnv } from "@/lib/sales/japan-readiness-utils"
import type { DraftGenerator } from "../types"
import { difyDraftGenerator } from "./dify"
import { createOpenAiCompatibleGenerator, getOssLlmConfig } from "./openai-compatible"

export { difyDraftGenerator } from "./dify"
export {
  createOpenAiCompatibleGenerator,
  getOssLlmConfig,
  parseDraftJson,
  type OssLlmConfig,
} from "./openai-compatible"

export type ScriptLlmProvider = "oss" | "dify"

export function getScriptLlmProvider(): ScriptLlmProvider {
  return optionalEnv("YOUTUBE_SCRIPT_LLM") === "dify" ? "dify" : "oss"
}

export function resolveDraftGenerator(): DraftGenerator {
  return getScriptLlmProvider() === "dify"
    ? difyDraftGenerator
    : createOpenAiCompatibleGenerator(getOssLlmConfig())
}
