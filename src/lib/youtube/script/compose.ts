/**
 * lib/youtube/script/compose.ts — 逐次生成による台本の組み立て
 *
 * なぜ逐次にするか:
 *   実測(qwen2.5:14b / RTX A4000)では、目標1400文字の台本を一括生成させると
 *   390〜490文字で頭打ちになり、密度不足の指摘を3回差し戻しても改善しなかった。
 *   「合計1400文字」という指示は生成の実行単位にならず、モデルは各シーンを
 *   自分が適切だと思う長さで書いて終える。
 *
 *   そこで生成を2段階に分ける。
 *     1. 構成案: メタ情報と各シーンの役割だけ。出力が短いので崩れない。
 *     2. シーン本文: 1回1シーン。そのシーンの下限文字数を直接指示する。
 *
 *   1回あたりの要求量が小さくなるため、同じモデルでも必要な分量に届く。
 */

import type { ChannelFormat } from "../formats/types"
import { composeMetadataPrompt, composeOutlinePrompt, composeScenePrompt } from "./patterns/common"
import type {
  DraftGenerator,
  SceneDraft,
  ScriptDraft,
  ScriptOutline,
  ScriptPattern,
  ScriptPatternContext,
} from "./types"
import { speechRateFor } from "./types"

export interface ComposeInput {
  context: ScriptPatternContext
  pattern: ScriptPattern
  generate: DraftGenerator
}

export interface ComposeResult {
  ok: boolean
  draft?: ScriptDraft
  errorMessage?: string
  /** 何回 LLM を呼んだか。コストと所要時間の把握に使う。 */
  calls: number
  /** 落とした情報。黙って捨てない。 */
  warnings: string[]
}

/**
 * 指示した文字数に対する実際の出力の割合。
 * qwen2.5:14b の実測では 200文字を要求して 150文字前後(約75%)しか書かなかった。
 * 指示値どおりに配分すると合計が下限を1%割る、という状態が再現したため、
 * 目減り分を見込んで多めに要求する。
 */
const UNDERSHOOT_COMPENSATION = 1.35

/** シーン1本に要求する文字数を、目標尺とシーン数から決める。 */
export function minCharsPerScene(format: ChannelFormat, sceneCount: number): number {
  const rate = speechRateFor(format.locale)
  const targetChars = (format.script.targetSec / 60) * rate
  // 密度検査は目標尺で測るので、下限ぎりぎりではなく目標値そのものを配る。
  const perScene = targetChars / Math.max(1, sceneCount)
  return Math.max(60, Math.round(perScene * UNDERSHOOT_COMPENSATION))
}

/** サムネイルに載せる語句の上限。 */
const MAX_THUMBNAIL_PHRASES = 3

/** サムネ文言として使える長さの範囲。長すぎる文は画面に載らない。 */
const THUMBNAIL_MIN_CHARS = 2
const THUMBNAIL_MAX_CHARS = 14

/**
 * 画面表示テキストからサムネ文言を選ぶ。
 * onScreenText は本文の一部なので、ここから選べばメタデータ整合検査を必ず満たす。
 */
export function deriveThumbnailText(scenes: Array<{ onScreenText?: string[] }>): string[] {
  const seen = new Set<string>()
  const candidates: string[] = []

  for (const scene of scenes) {
    for (const text of scene.onScreenText ?? []) {
      const trimmed = text.trim()
      if (trimmed.length < THUMBNAIL_MIN_CHARS || trimmed.length > THUMBNAIL_MAX_CHARS) continue
      if (seen.has(trimmed)) continue
      seen.add(trimmed)
      candidates.push(trimmed)
    }
  }

  // 前半のシーンほど動画の主題を表しているため、出現順のまま先頭から採る。
  return candidates.slice(0, MAX_THUMBNAIL_PHRASES)
}

function asOutline(value: unknown): ScriptOutline {
  const outline = value as ScriptOutline
  if (!outline || typeof outline !== "object") throw new Error("構成案がオブジェクトではありません。")
  if (!Array.isArray(outline.scenes) || outline.scenes.length === 0) {
    throw new Error("構成案に scenes がありません。")
  }
  return outline
}

/**
 * 構成案を作り、シーンごとに本文を生成して1本のドラフトに束ねる。
 *
 * 途中のシーン生成が失敗した場合は、そのシーンを落として続行する。
 * 全滅しない限りドラフトを返し、不足はゲートに判定させる。
 */
export async function composeScriptDraft(input: ComposeInput): Promise<ComposeResult> {
  const { context, pattern, generate } = input
  const { format } = context
  const warnings: string[] = []
  let calls = 0

  /* ───── 1段目: 構成案 ───── */
  calls += 1
  const outlineResult = await generate({
    systemPrompt: composeOutlinePrompt(context, pattern.role, pattern.structure),
    payload: pattern.buildPayload(context),
  })

  if (!outlineResult.ok || !outlineResult.draft) {
    return { ok: false, errorMessage: outlineResult.errorMessage ?? "構成案を生成できませんでした。", calls, warnings }
  }

  let outline: ScriptOutline
  try {
    outline = asOutline(outlineResult.draft)
  } catch (error) {
    return {
      ok: false,
      errorMessage: `構成案の形式が不正です: ${error instanceof Error ? error.message : String(error)}`,
      calls,
      warnings,
    }
  }

  // シーン数を形式の範囲に収める。多すぎる構成案は切り詰める。
  const [minScenes, maxScenes] = format.script.sceneRange
  let plannedScenes = outline.scenes
  if (plannedScenes.length > maxScenes) {
    warnings.push(`構成案のシーン数が${plannedScenes.length}本だったため${maxScenes}本に切り詰めました。`)
    plannedScenes = plannedScenes.slice(0, maxScenes)
  }
  if (plannedScenes.length < minScenes) {
    warnings.push(`構成案のシーン数が${plannedScenes.length}本で下限${minScenes}本を下回っています。`)
  }

  const minChars = minCharsPerScene(format, plannedScenes.length)
  const knownUrls = new Set(context.idea.sources.map((source) => source.url))

  /* ───── 2段目: シーンごとの本文 ───── */
  const scenes: ScriptDraft["scenes"] = []
  let previousNarration: string | null = null

  for (const [index, planned] of plannedScenes.entries()) {
    // 構成案が挙げた根拠URLのうち、実在するものだけをシーンに渡す。
    const sourceUrls = (planned.sourceUrls ?? []).filter((url) => knownUrls.has(url))
    if ((planned.sourceUrls ?? []).length > sourceUrls.length) {
      warnings.push(`構成案のシーン${index + 1}が入力に無いURLを挙げたため除外しました。`)
    }

    calls += 1
    const sceneResult = await generate({
      systemPrompt: composeScenePrompt({
        context,
        role: pattern.role,
        outline: {
          title: outline.title ?? "",
          hook: outline.hook ?? "",
          originalValueStatement: outline.originalValue?.statement ?? "",
        },
        purpose: planned.purpose ?? "",
        index,
        total: plannedScenes.length,
        previousNarration,
        minChars,
        sourceUrls,
      }),
      payload: { purpose: planned.purpose ?? "", sources: context.idea.sources },
    })

    if (!sceneResult.ok || !sceneResult.draft) {
      warnings.push(`シーン${index + 1}の生成に失敗しました: ${sceneResult.errorMessage ?? "不明"}`)
      continue
    }

    const scene = sceneResult.draft as unknown as SceneDraft
    const narration = typeof scene.narration === "string" ? scene.narration.trim() : ""
    if (narration.length === 0) {
      warnings.push(`シーン${index + 1}のナレーションが空でした。`)
      continue
    }

    scenes.push({
      narration,
      onScreenText: Array.isArray(scene.onScreenText) ? scene.onScreenText : [],
      visualSpec: (scene.visualSpec as Record<string, unknown>) ?? {},
      sourceUrls: Array.isArray(scene.sourceUrls) ? scene.sourceUrls : sourceUrls,
    })
    previousNarration = narration
  }

  if (scenes.length === 0) {
    return { ok: false, errorMessage: "本文を1シーンも生成できませんでした。", calls, warnings }
  }

  /* ───── 3段目: 本文を見てからメタ情報を決める ───── */
  // 構成案の段階でサムネを決めると本文に載る保証がない。実測では毎回
  // 本編に存在しない抽象ラベルが出てブロックされた。順序を逆にして解く。
  let meta = {
    title: outline.title ?? "",
    description: outline.description ?? "",
    tags: Array.isArray(outline.tags) ? outline.tags : [],
    thumbnailText: Array.isArray(outline.thumbnailText) ? outline.thumbnailText : [],
  }

  calls += 1
  const metaResult = await generate({
    systemPrompt: composeMetadataPrompt(context, pattern.role, scenes.map((scene) => scene.narration)),
    payload: { topic: context.idea.topic },
  })

  if (metaResult.ok && metaResult.draft) {
    const generated = metaResult.draft as unknown as Partial<typeof meta>
    meta = {
      ...meta,
      title: typeof generated.title === "string" && generated.title.trim() ? generated.title.trim() : meta.title,
      description:
        typeof generated.description === "string" && generated.description.trim()
          ? generated.description.trim()
          : meta.description,
      tags: Array.isArray(generated.tags) && generated.tags.length > 0 ? generated.tags : meta.tags,
    }
  } else {
    warnings.push(`メタ情報の生成に失敗したため構成案の値を使います: ${metaResult.errorMessage ?? "不明"}`)
  }

  // サムネ文言はモデルに作らせない。
  // 「本文に実在する語句を使え」と指示しても、実測では毎回要約した抽象ラベルを返し
  // (「食料品消费税率」のように簡体字が混ざることさえあった)、公開前ゲートで弾かれ続けた。
  // onScreenText は定義上そのまま画面に出る本文の一部なので、そこから採れば必ず一致する。
  // 機械が決められる値をモデルに委ねない、という他の箇所と同じ方針。
  meta.thumbnailText = deriveThumbnailText(scenes)

  const draft: ScriptDraft = {
    title: meta.title,
    description: meta.description,
    tags: meta.tags,
    thumbnailText: meta.thumbnailText,
    hook: outline.hook ?? "",
    originalValue: {
      kind: outline.originalValue?.kind ?? "synthesis_of_sources",
      statement: outline.originalValue?.statement ?? "",
      // シーンを切り詰めた場合に範囲外を指さないよう丸める。
      evidenceSceneIndexes: (outline.originalValue?.evidenceSceneIndexes ?? []).filter(
        (position) => position >= 0 && position < scenes.length,
      ),
    },
    scenes,
  }

  return { ok: true, draft, calls, warnings }
}
