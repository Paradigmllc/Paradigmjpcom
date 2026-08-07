/**
 * lib/youtube/render/captions.ts — ナレーションに同期した字幕を組む
 *
 * なぜ必要か: 日本語YouTubeでは字幕の有無が視聴維持率に直結する。
 * 音声だけの解説動画は無音環境で再生されると内容が伝わらない。
 *
 * タイミングの取り方:
 *   edge-tts の日本語音声は WordBoundary を出さず SentenceBoundary のみを出す。
 *   文の開始時刻は正確なので、それをアンカーにして、長い文だけを
 *   句読点で割り、文字数比例で時間を配分する。
 *   日本語は分かち書きしないので、単語単位より句単位のほうが読みやすい。
 */

/** TTS が返す発話区間。 */
export interface SpeechSegment {
  text: string
  startSec: number
  durationSec: number
}

export interface CaptionCue {
  text: string
  startSec: number
  durationSec: number
}

/** 1キューに載せる最大文字数。これを超えると画面で2行を超えて読みにくくなる。 */
const MAX_CUE_CHARS = 24

/** 短すぎるキューは点滅して読めないので、この秒数を下回らないようにする。 */
const MIN_CUE_SEC = 0.7

/**
 * 句読点で文を分割する。区切り文字は前のかたまりに残す。
 * 「A、B。」→ ["A、", "B。"]
 */
export function splitByPunctuation(text: string): string[] {
  const parts = text.split(/(?<=[、。！？,.!?])/)
  return parts.map((part) => part.trim()).filter((part) => part.length > 0)
}

/**
 * 長すぎるかたまりをさらに詰める。
 * 句読点が無い長文でも1キューに収まる長さまで機械的に割る。
 */
function packChunks(parts: string[], maxChars: number): string[] {
  const chunks: string[] = []
  let buffer = ""

  const flush = () => {
    if (buffer.length > 0) {
      chunks.push(buffer)
      buffer = ""
    }
  }

  for (const part of parts) {
    if (part.length > maxChars) {
      flush()
      for (let i = 0; i < part.length; i += maxChars) {
        chunks.push(part.slice(i, i + maxChars))
      }
      continue
    }
    if (buffer.length + part.length > maxChars) flush()
    buffer += part
  }
  flush()

  return chunks
}

/**
 * 発話区間を字幕キューに変換する。
 *
 * 文の開始時刻は TTS から得た実測値なのでそのまま使い、
 * 文の中での分割だけを文字数比例で割る。
 */
export function buildCaptionCues(
  segments: SpeechSegment[],
  options: { maxChars?: number } = {},
): CaptionCue[] {
  const maxChars = options.maxChars ?? MAX_CUE_CHARS
  const cues: CaptionCue[] = []

  for (const segment of segments) {
    const chunks = packChunks(splitByPunctuation(segment.text), maxChars)
    if (chunks.length === 0) continue

    const totalChars = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    let cursor = segment.startSec

    chunks.forEach((chunk, index) => {
      const share = totalChars > 0 ? chunk.length / totalChars : 1 / chunks.length
      // 最後のかたまりは残り全部を取り、丸め誤差で隙間が空かないようにする。
      const isLast = index === chunks.length - 1
      const end = isLast
        ? segment.startSec + segment.durationSec
        : cursor + segment.durationSec * share
      const durationSec = Math.max(MIN_CUE_SEC, Math.round((end - cursor) * 100) / 100)
      cues.push({ text: chunk, startSec: Math.round(cursor * 100) / 100, durationSec })
      cursor = cursor + durationSec
    })
  }

  return resolveCueOverlaps(cues)
}

/**
 * 隣り合うキューの重なりを解消する。
 * 字幕は1トラックのクリップとして並べるため、重なると配置できない。
 *
 * シーン単位で解消しても、シーンを連結すると境界で重なりが復活する
 * (実測でシーン跨ぎに0.08秒の重なりが出た)。連結後の全体にも必ず掛けること。
 */
export function resolveCueOverlaps(cues: CaptionCue[]): CaptionCue[] {
  const sorted = [...cues].sort((a, b) => a.startSec - b.startSec)
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const end = sorted[i].startSec + sorted[i].durationSec
    const nextStart = sorted[i + 1].startSec
    if (end <= nextStart) continue

    // 切り捨てる。四捨五入だと丸め上げで重なりが復活する(実測で0.08秒の重なりが残った)。
    const gap = Math.floor((nextStart - sorted[i].startSec) * 100) / 100
    // 隙間が最小表示時間より短くても、下限を優先すると再び重なる。隙間側を採る。
    sorted[i].durationSec = Math.max(0.05, gap)
  }
  return sorted
}

/** シーンの開始時刻ぶんキューをずらす。 */
export function offsetCues(cues: CaptionCue[], offsetSec: number): CaptionCue[] {
  return cues.map((cue) => ({
    ...cue,
    startSec: Math.round((cue.startSec + offsetSec) * 100) / 100,
  }))
}
