/**
 * lib/youtube/formats/types.ts — チャンネル形式の契約と共通シーンIR
 *
 * 設計原則:
 *   - 形式(アニメ風、漫画風、キャラ解説…)は「型」ではなく「データ」。
 *     新形式の追加は definitions/ に1ファイル置くだけで済ませる。
 *   - 台本層の出力は VideoScript に固定し、レンダラーだけ差し替える。
 *     同じ台本を manim にも HyperFrames にも ComfyUI にも流せるようにする。
 *   - 収益化剥奪を防ぐ品質条件は形式ごとに宣言し、公開前ゲートで機械検査する。
 *
 * なぜレンダラーとシーン種別だけは閉じた union なのか:
 *   形式はデータだが、レンダラーは実装(アダプタ)を伴う。アダプタの無い値を
 *   受け付けても実行時に落ちるだけなので、ここは型で塞ぐほうが正しい。
 */

/* ───── レンダラー ───── */

/** アダプタ実装が存在するレンダラーだけを列挙する。 */
export type RendererId =
  | "manim"
  | "hyperframes"
  | "remotion"
  | "comfyui"
  | "openmontage"
  | "ffmpeg"

export interface RendererBinding {
  renderer: RendererId
  /** レンダラー固有の設定。アダプタ側で検証する。 */
  options: Record<string, unknown>
}

/* ───── 共通シーンIR ───── */

/** シーンの見た目をどう作るか。レンダラーアダプタが解釈する。 */
export type SceneVisualKind =
  | "manim"
  | "html"
  | "image"
  | "video"
  | "screen"
  | "portrait"

export interface SceneVisual {
  kind: SceneVisualKind
  /** kind ごとの仕様。manim ならシーンクラス名、html ならコンポジションIDなど。 */
  spec: Record<string, unknown>
}

/** 主張の根拠。未検証の断定を防ぐために台本と一緒に持ち回る。 */
export interface SourceRef {
  claim: string
  url: string
  retrievedAt: string
}

export interface Scene {
  id: string
  startSec: number
  durationSec: number
  /** 読み上げるナレーション。空文字は無音シーンを意味する。 */
  narration: string
  /** 画面に焼き込むテキスト。タイトル/サムネとの整合チェックに使う。 */
  onScreenText: string[]
  visual: SceneVisual
  sources: SourceRef[]
}

/**
 * このチャンネル固有の付加価値。
 * YouTube の inauthentic content 判定を避ける中核なので、台本ごとに必須で宣言させる。
 */
export type OriginalValueKind =
  | "original_analysis"
  | "original_data"
  | "original_visualization"
  | "expert_commentary"
  | "synthesis_of_sources"

export interface OriginalValue {
  kind: OriginalValueKind
  /** 何が固有なのかを一文で述べる。 */
  statement: string
  /** その固有性が実際に現れるシーン。存在しないIDを書けばゲートで落ちる。 */
  evidenceSceneIds: string[]
}

/**
 * 合成メディアの開示。
 * YouTube の開示義務は「現実の人物・出来事に見える合成」に対して発生するため、
 * 生成の有無と現実性を分けて持つ。
 */
export interface SyntheticDisclosure {
  syntheticVoice: boolean
  syntheticVisuals: boolean
  realisticPersonOrEvent: boolean
  disclosureText: string | null
}

/** 台本層の出力。これが全レンダラーの共通入力になる。 */
export interface VideoScript {
  formatId: string
  channelId: string
  title: string
  description: string
  tags: string[]
  /** サムネイルに載せる文字。台本に無い誇張が入っていないかを検査する。 */
  thumbnailText: string[]
  hook: string
  scenes: Scene[]
  originalValue: OriginalValue
  synthetic: SyntheticDisclosure
}

/* ───── 品質契約 ───── */

/**
 * 形式ごとの品質条件。公開前ゲートがこの数値で機械判定する。
 * 「良い動画かどうか」ではなく「収益化を失わない条件を満たすか」を測る。
 */
export interface FormatQualityContract {
  minSceneCount: number
  maxSceneCount: number
  targetDurationSec: number
  durationToleranceSec: number
  /** 情報密度の下限。1分あたりのナレーション文字数。薄い量産を防ぐ。 */
  minNarrationCharsPerMinute: number
  /** 直近作との台本類似度の上限 (0-1)。超えるとテンプレ量産とみなす。 */
  maxScriptSimilarityToRecent: number
  /** 直近作とのタイトル類似度の上限 (0-1)。 */
  maxTitleSimilarityToRecent: number
  /** 類似度を比較する直近本数。 */
  recentComparisonWindow: number
  /** 構成(シーン数と尺配分)が何本連続で同一なら反復とみなすか。 */
  maxIdenticalStructureStreak: number
  requireSourceForClaims: boolean
  requireOriginalValue: boolean
  /** 一次ソース無しでは断定を許さない主張の種類。 */
  bannedClaimTypes: string[]
}

/* ───── 形式定義 ───── */

export type ResearchSourceId =
  | "youtube_data_api"
  | "youtube_scraper"
  /** Hacker News (Algolia)。無認証・無料。英語の技術系先行指標。 */
  | "hackernews"
  /** Reddit。2026-08 時点で匿名JSONは403。OAuth アプリ登録が必要。 */
  | "reddit"
  /** Google News RSS など。無認証で日本語も取れる。 */
  | "rss"
  | "vidiq"

export interface FormatResearch {
  sources: ResearchSourceId[]
  /** 既定の検索語。ソース別の指定が無い場合に使う。 */
  seedQueries: string[]
  /**
   * ソース別の検索語。
   * YouTube 検索はタイトル的な言い回し("what nobody tells you")が効くが、
   * Hacker News や Google News では題材そのものを渡さないと当たらない。
   * 実測でこの差が出たため、ソースごとに上書きできるようにしてある。
   */
  sourceQueries?: Partial<Record<ResearchSourceId, string[]>>
  /** 競合として継続観測するチャンネル (UC... / @handle)。 */
  watchChannels: string[]
}

/** 指定ソースに使う検索語を決める。個別指定が無ければ既定にフォールバックする。 */
export function queriesForSource(research: FormatResearch, source: ResearchSourceId): string[] {
  const specific = research.sourceQueries?.[source]
  return specific && specific.length > 0 ? specific : research.seedQueries
}

export interface FormatScript {
  /** 台本プロンプトのパターンID。script/patterns/ に対応する。 */
  patternId: string
  /** 物語構成。閉じた union にせず、形式ごとに自由に定義させる。 */
  framework: string
  targetSec: number
  sceneRange: [number, number]
}

export interface FormatLora {
  name: string
  strength: number
}

/**
 * 映像生成の設定。
 * checkpoint と loras を形式から注入できるようにしてあるのが要点で、
 * 既存 comfyui-workflows.ts が flux-dev をベタ書きしている問題をここで解く。
 */
export interface FormatVisual {
  engine: "none" | "comfyui"
  checkpoint?: string
  /**
   * 出力が現実の人物・出来事に見えるか。
   * YouTube の合成メディア開示義務はここが true の場合にだけ発生するため、
   * 推測ではなく形式の作者に宣言させる。アニメ調や図解は false。
   */
  realisticDepiction?: boolean
  loras?: FormatLora[]
  /** IP-Adapter の参照画像。シリーズ全体で画風を固定するために使う。 */
  styleRef?: string
  character?: {
    faceRef?: string
    /** 静止画キャラを LivePortrait で喋らせるか。 */
    livePortrait?: boolean
  }
}

export interface FormatVoice {
  engine: "edge_tts" | "voice_pro" | "none"
  voiceId: string
  /** ボイスクローンの参照音声。チャンネル固有の声を作るために使う。 */
  cloneRef?: string
}

/** GPU 予算。形式ごとに上限を宣言し、超える見込みならジョブを弾く。 */
export interface FormatCost {
  gpuAllowed: boolean
  maxGpuMinutes: number
  maxUsdPerVideo: number
}

export interface ChannelFormat {
  id: string
  label: string
  locale: string
  aspect: "16:9" | "9:16"
  /** このチャンネルで何を検証するか。実験の目的を必須で書かせる。 */
  hypothesis: string
  research: FormatResearch
  script: FormatScript
  render: {
    primary: RendererBinding
    fallback?: RendererBinding
  }
  visual: FormatVisual
  voice: FormatVoice
  quality: FormatQualityContract
  cost: FormatCost
}
