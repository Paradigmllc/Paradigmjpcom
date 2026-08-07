/**
 * lib/youtube/script/patterns/common.ts — 全パターン共通のプロンプト部品
 *
 * 要点: 公開前ゲートが機械判定する条件を、そのままプロンプトの制約として書き下す。
 *       ゲートとプロンプトが食い違うと自己修復ループが無駄に回るため、
 *       閾値は形式定義から生成し、二重管理しない。
 */

import type { ScriptPatternContext } from "../types"
import { speechRateFor } from "../types"

/** 品質契約から、モデルに守らせる制約文を生成する。 */
export function buildQualityRules(context: ScriptPatternContext): string {
  const { format } = context
  const { quality, script } = format
  const rate = speechRateFor(format.locale)
  const targetChars = Math.round((script.targetSec / 60) * rate)

  // シーンあたりの文字数を明示する。
  // 実測(qwen2.5:14b)では合計文字数だけを指示しても390文字前後しか書かず、
  // 密度不足の指摘を差し戻しても改善しなかった。合計値は分割の指針にならないため、
  // 1シーンあたりの下限という具体的な単位に落として指示する。
  const midSceneCount = Math.round((script.sceneRange[0] + script.sceneRange[1]) / 2)
  const perSceneChars = Math.round(targetChars / midSceneCount)

  const lines = [
    `- シーン数は ${script.sceneRange[0]}〜${script.sceneRange[1]} 本にする。`,
    `- **各シーンの narration は ${perSceneChars} 文字以上書く。** これは厳守。一文や箇条書きで済ませない。`,
    `- 目安として ${midSceneCount} シーン × ${perSceneChars} 文字 = 合計 ${targetChars} 文字(目標尺 ${script.targetSec} 秒 / 話速 毎分${rate}文字)。`,
    `- 情報密度を落とさない。毎分${quality.minNarrationCharsPerMinute}文字を下回る薄い内容にしない。`,
    `- 短く要約するのではなく、根拠、背景、反対意見、含意を各シーンで展開して字数を満たす。`,
    `- 直近作と構成を変える。シーン数と各シーンの長さの配分を前回と同じにしない。`,
    `- 直近作と同じ言い回しや同じ導入を使わない。`,
  ]

  if (quality.requireSourceForClaims) {
    lines.push(
      `- 次の種類の断定には必ず sourceUrls を付ける: ${quality.bannedClaimTypes.join(", ")}。`,
      `- 根拠が無い数値、統計、法令の日付、医療効果、投資リターン、最上級表現は書かない。推測で数字を作らない。`,
      `- 使える根拠は入力の sources に含まれるURLだけ。URLを創作しない。`,
    )
  }

  if (quality.requireOriginalValue) {
    lines.push(
      `- originalValue に、このチャンネル固有の付加価値を一文で書く。要約や引用の寄せ集めは付加価値ではない。`,
      `- originalValue.evidenceSceneIndexes に、その付加価値が実際に現れるシーンの位置(0始まり)を書く。`,
    )
  }

  lines.push(
    `- thumbnailText に書く文言は、必ず本編のナレーションか onScreenText に実在させる。本編に無い煽り文句を書かない。`,
    `- タイトルは内容と一致させる。誇張しない。`,
  )

  return lines.join("\n")
}

/** ドラフトのJSON形式を指定する。normalize 側が受け取れる形に固定する。 */
export function buildOutputContract(): string {
  return [
    "出力はJSONのみ。前後に説明文やコードフェンスを付けない。形式は次のとおり。",
    "{",
    '  "title": string,',
    '  "description": string,',
    '  "tags": string[],',
    '  "thumbnailText": string[],',
    '  "hook": string,',
    '  "originalValue": { "kind": "original_analysis" | "original_data" | "original_visualization" | "expert_commentary" | "synthesis_of_sources", "statement": string, "evidenceSceneIndexes": number[] },',
    '  "scenes": [ { "narration": string, "onScreenText": string[], "visualSpec": object, "sourceUrls": string[] } ]',
    "}",
    "durationSec は書かなくてよい。ナレーション長から自動計算する。",
  ].join("\n")
}

/**
 * 事実材料としての関連見出しと、その扱い方の制約を組み立てる。
 *
 * リサーチ層は記事本文を取得しない(Google News はパブリッシャーへ遷移せず、
 * JS依存の中間ページを返すため現実的に取得できない)。したがってモデルに渡せる
 * 事実は見出しだけになる。この制約を明示しないと、モデルは知識から具体的な
 * 数値や被害規模を補ってしまい、ゲートの claims.unsourced で弾かれ続ける。
 */
export function buildMaterialRules(context: ScriptPatternContext): string {
  const headlines = context.idea.contextHeadlines ?? []
  if (headlines.length === 0) return ""

  const lines = headlines
    .slice(0, 15)
    .map((headline) => `  - ${headline.title}${headline.source ? ` (${headline.source})` : ""}`)

  return [
    "事実として使える材料は、次の見出しがすべてです。記事本文は取得していません。",
    ...lines,
    "",
    "材料の扱い方:",
    "- 上の見出しに書かれていない具体的な数値、被害規模、固有名詞、日付を書かない。知識から補わない。",
    "- 複数の媒体が共通して書いている点は確度が高い。そこを軸に構成する。",
    "- 一社しか書いていない点は「一部報道では」と限定して扱う。",
    "- 見出しだけでは分からないことは、分からないと明示する。埋めない。",
    "- sourceUrls には、その主張を実際に報じた媒体のURLを選ぶ。別媒体のURLを流用しない。",
    "  入力の sources に見出しごとのURLが入っているので、claim を照合して選ぶこと。",
  ].join("\n")
}

/** 直近作と前回のゲート指摘を制約として差し込む。 */
export function buildContextRules(context: ScriptPatternContext): string {
  const parts: string[] = []

  if (context.recentTitles.length > 0) {
    parts.push(
      ["直近に公開した動画のタイトル。これらと題材も構成も重ならないようにする。", ...context.recentTitles.map((title) => `  - ${title}`)].join("\n"),
    )
  }

  if (context.repairNotes.length > 0) {
    parts.push(
      ["前回の出力は公開前検査で却下された。次の指摘をすべて解消すること。", ...context.repairNotes.map((note) => `  - ${note}`)].join("\n"),
    )
  }

  return parts.join("\n\n")
}

function languageLine(context: ScriptPatternContext): string {
  return `言語: ${context.format.locale === "ja" ? "日本語" : "English"}`
}

/** パターン固有の役割定義と共通制約を組み立てる(一括生成用)。 */
export function composeSystemPrompt(
  context: ScriptPatternContext,
  role: string,
  structure: string,
): string {
  const sections = [
    role,
    languageLine(context),
    `構成: ${structure}`,
    "",
    buildMaterialRules(context),
    "",
    "制約:",
    buildQualityRules(context),
    buildContextRules(context),
    "",
    buildOutputContract(),
  ].filter((section) => section.length > 0)

  return sections.join("\n")
}

/* ───── 逐次生成用のプロンプト ───── */

/**
 * 構成案を作らせるプロンプト。
 * 本文は書かせない。骨格だけなので出力が短く、小さいモデルでも崩れない。
 */
export function composeOutlinePrompt(
  context: ScriptPatternContext,
  role: string,
  structure: string,
): string {
  const { script } = context.format
  const mid = Math.round((script.sceneRange[0] + script.sceneRange[1]) / 2)

  return [
    role,
    languageLine(context),
    `構成: ${structure}`,
    "",
    "いまは構成案だけを作ります。ナレーション本文は書きません。",
    `シーンは ${script.sceneRange[0]}〜${script.sceneRange[1]} 本、${mid} 本前後を目安にしてください。`,
    "各シーンには purpose(そのシーンで何を言うか)を一文で書きます。",
    "",
    buildMaterialRules(context),
    "",
    "制約:",
    "- thumbnailText に書く文言は、後で本編に必ず登場させられるものにする。抽象的な煽り文句を書かない。",
    "- タイトルは内容と一致させる。誇張しない。",
    "- originalValue は、このチャンネル固有の付加価値を一文で書く。要約や引用の寄せ集めは付加価値ではない。",
    "- originalValue.evidenceSceneIndexes には、その付加価値が現れるシーンの位置(0始まり)を書く。",
    "- 各シーンの sourceUrls には、そのシーンで使う根拠URLを入力の sources から選ぶ。創作しない。",
    buildContextRules(context),
    "",
    "出力はJSONのみ。前後に説明文やコードフェンスを付けない。形式は次のとおり。",
    "{",
    '  "title": string,',
    '  "description": string,',
    '  "tags": string[],',
    '  "thumbnailText": string[],',
    '  "hook": string,',
    '  "originalValue": { "kind": "original_analysis" | "original_data" | "original_visualization" | "expert_commentary" | "synthesis_of_sources", "statement": string, "evidenceSceneIndexes": number[] },',
    '  "scenes": [ { "purpose": string, "sourceUrls": string[] } ]',
    "}",
  ]
    .filter((section) => section.length > 0)
    .join("\n")
}

/**
 * 本文が出来たあとにタイトルとサムネ文言を決めるプロンプト。
 *
 * 構成案の段階でサムネを決めると、本文に載る保証がない。実測でも
 * 「高市首相への反論」「社会保障の課題」のような、本編に存在しない
 * 抽象ラベルが毎回生成されてブロックされた。
 * 何を言ったか分かってから見出しを付けるのが正しい順序。
 */
export function composeMetadataPrompt(
  context: ScriptPatternContext,
  role: string,
  narrations: string[],
): string {
  return [
    role,
    languageLine(context),
    "",
    "本文はすでに完成しています。これからタイトルとサムネイル文言を決めます。",
    "完成した本文:",
    ...narrations.map((narration, index) => `[${index + 1}] ${narration}`),
    "",
    "制約:",
    "- thumbnailText の各文言は、上の本文に**そのまま出てくる語句**を使う。本文に無い言葉を作らない。",
    "- 本文から抜き出した短い語句を2〜3個挙げる。要約した抽象ラベルにしない。",
    "- タイトルも本文の語句を使って作る。誇張しない。",
    "- description は本文の内容を1〜2文で述べる。",
    "",
    "出力はJSONのみ。前後に説明文やコードフェンスを付けない。形式は次のとおり。",
    '{ "title": string, "description": string, "tags": string[], "thumbnailText": string[] }',
  ].join("\n")
}

export interface ScenePromptInput {
  context: ScriptPatternContext
  role: string
  outline: { title: string; hook: string; originalValueStatement: string }
  purpose: string
  index: number
  total: number
  /** 直前のシーンのナレーション。流れと重複回避のために見せる。 */
  previousNarration: string | null
  /** このシーンで書くべき最低文字数。 */
  minChars: number
  /** このシーンで使える根拠URL。 */
  sourceUrls: string[]
}

/**
 * 1シーンだけを書かせるプロンプト。
 *
 * 一括生成が失敗する理由は「合計1400文字」が生成の実行単位にならないこと。
 * 1回の出力を1シーンに限定し、そのシーンの下限文字数を直接指示すれば、
 * 同じモデルでも必要な分量を書く。
 */
export function composeScenePrompt(input: ScenePromptInput): string {
  const { context, role, outline, purpose, index, total, previousNarration, minChars, sourceUrls } = input

  return [
    role,
    languageLine(context),
    "",
    `いまは全${total}シーンのうち ${index + 1} 番目のシーンだけを書きます。他のシーンは書きません。`,
    `動画タイトル: ${outline.title}`,
    `冒頭の掴み: ${outline.hook}`,
    `このチャンネルの固有価値: ${outline.originalValueStatement}`,
    "",
    `このシーンの役割: ${purpose}`,
    previousNarration
      ? `直前のシーンのナレーション(重複させず、自然につなげる):\n${previousNarration}`
      : "これが最初のシーンです。",
    "",
    buildMaterialRules(context),
    "",
    "制約:",
    `- narration は ${minChars} 文字以上書く。これは厳守。要約せず、根拠、背景、含意まで展開する。`,
    "- このシーンの役割から外れない。次のシーンの内容を先取りしない。",
    "- 読み上げて不自然な記号、括弧書き、箇条書き記号を入れない。音声合成にそのまま流す。",
    sourceUrls.length > 0
      ? `- このシーンで使える根拠URL:\n${sourceUrls.map((url) => `    ${url}`).join("\n")}`
      : "- このシーンでは根拠URLを使わない。数値や統計の断定を書かない。",
    "",
    "出力はJSONのみ。前後に説明文やコードフェンスを付けない。形式は次のとおり。",
    '{ "narration": string, "onScreenText": string[], "visualSpec": object, "sourceUrls": string[] }',
  ]
    .filter((section) => section.length > 0)
    .join("\n")
}
