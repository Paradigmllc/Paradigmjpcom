/**
 * lib/youtube/render/hyperframes.ts — VideoScript を HyperFrames コンポジションに変換する
 *
 * 初版の失敗と、それに対する対処:
 *   1. visualSpec を捨てて onScreenText だけを描いていた
 *      → layouts.ts で構造化データを解釈し、timeline / columns / stat / quote を描き分ける
 *   2. 1シーン=1静止画面だった(46秒間まったく動かないシーンがあった)
 *      → 項目を順番に出す「ビート」を入れ、シーン内でも画面が変化し続けるようにする
 *   3. 字幕が無かった
 *      → TTS の発話区間から同期字幕を組む。無音再生でも内容が伝わる
 *   4. 動きが入場フェードだけだった
 *      → 背景を全編にわたってゆっくり動かし、進捗バーで残り時間を示す
 *
 * 変わらない方針:
 *   - シーンの尺は台本の見積もりではなく合成音声の実測値を使う
 *   - モデルが出したURLは映像に取り込まない
 */

import type { VideoScript } from "../formats/types"
import type { SceneAudio } from "./tts"
import { buildCaptionCues, offsetCues, resolveCueOverlaps, type CaptionCue } from "./captions"
import { diversifyLayouts, normalizeLayout, type LayoutItem, type SceneLayout } from "./layouts"

const TRANSITION_SEC = 0.6
const OUTRO_SEC = 0.9

/** 音声トラックの開始番号。シーンごとに別トラックへ置き、丸め誤差の重なりを防ぐ。 */
const AUDIO_TRACK_BASE = 5

/** 字幕トラック。キューは時間が重ならないので1本で足りる。 */
const CAPTION_TRACK = 40

export interface CompositionOptions {
  width?: number
  height?: number
  audioDirName?: string
  channelLabel?: string
}

export interface CompositionResult {
  html: string
  totalDurationSec: number
  timeline: Array<{ sceneId: string; startSec: number; durationSec: number; layout: SceneLayout }>
  captionCount: number
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function buildTimeline(
  script: VideoScript,
  audios: SceneAudio[],
): Array<{ sceneId: string; startSec: number; durationSec: number }> {
  const byScene = new Map(audios.map((audio) => [audio.sceneId, audio]))
  const timeline: Array<{ sceneId: string; startSec: number; durationSec: number }> = []
  let cursor = 0

  for (const scene of script.scenes) {
    const audio = byScene.get(scene.id)
    const durationSec = round2(audio ? audio.actualDurationSec : scene.durationSec)
    timeline.push({ sceneId: scene.id, startSec: round2(cursor), durationSec })
    cursor = round2(cursor + durationSec)
  }

  return timeline
}

/* ───── レイアウトごとのマークアップ ───── */

function renderItems(sceneId: string, layout: SceneLayout, items: LayoutItem[]): string {
  const visible = items.slice(0, layout === "columns" ? 3 : 5)

  if (layout === "columns") {
    return [
      `      <div class="columns">`,
      ...visible.map(
        (item, index) =>
          `        <div class="col" data-beat="${index}">` +
          (item.marker ? `<span class="col-marker">${escapeHtml(item.marker)}</span>` : "") +
          `<p class="col-body">${escapeHtml(item.body)}</p></div>`,
      ),
      `      </div>`,
    ].join("\n")
  }

  if (layout === "stat") {
    const [lead, ...rest] = visible
    return [
      `      <div class="stat">`,
      `        <p class="stat-value" data-beat="0">${escapeHtml(lead?.marker || lead?.body || "")}</p>`,
      lead?.marker && lead?.body
        ? `        <p class="stat-label" data-beat="1">${escapeHtml(lead.body)}</p>`
        : "",
      ...rest.map(
        (item, index) =>
          `        <p class="stat-note" data-beat="${index + 2}">${escapeHtml(item.body)}</p>`,
      ),
      `      </div>`,
    ]
      .filter((row) => row.length > 0)
      .join("\n")
  }

  if (layout === "quote") {
    const [lead] = visible
    return [
      `      <blockquote class="quote" data-beat="0">${escapeHtml(lead?.body ?? "")}</blockquote>`,
      lead?.marker ? `      <p class="quote-source" data-beat="1">${escapeHtml(lead.marker)}</p>` : "",
    ]
      .filter((row) => row.length > 0)
      .join("\n")
  }

  if (layout === "timeline") {
    return [
      `      <ol class="tl">`,
      ...visible.map(
        (item, index) =>
          `        <li class="tl-item" data-beat="${index}">` +
          `<span class="tl-dot"></span>` +
          (item.marker ? `<span class="tl-marker">${escapeHtml(item.marker)}</span>` : "") +
          `<span class="tl-body">${escapeHtml(item.body)}</span></li>`,
      ),
      `      </ol>`,
    ].join("\n")
  }

  // headline
  return visible
    .map(
      (item, index) =>
        `      <p class="line line-${index}" data-beat="${index}">${escapeHtml(item.body)}</p>`,
    )
    .join("\n")
}

/* ───── 本体 ───── */

export function buildComposition(
  script: VideoScript,
  audios: SceneAudio[],
  options: CompositionOptions = {},
): CompositionResult {
  const width = options.width ?? 1920
  const height = options.height ?? 1080
  const audioDir = options.audioDirName ?? "audio"
  const channelLabel = options.channelLabel ?? script.channelId

  const baseTimeline = buildTimeline(script, audios)
  const audioByScene = new Map(audios.map((audio) => [audio.sceneId, audio]))
  const lastIndex = baseTimeline.length - 1
  const totalDurationSec = round2(
    (baseTimeline[lastIndex]?.startSec ?? 0) + (baseTimeline[lastIndex]?.durationSec ?? 0) + OUTRO_SEC,
  )

  // レイアウトを先に決め、同じものが連続しないよう散らす。
  const rawLayouts = script.scenes.map(
    (scene) => normalizeLayout(scene.visual.spec, scene.onScreenText).layout,
  )
  const layouts = diversifyLayouts(rawLayouts)
  const normalized = script.scenes.map((scene, index) => ({
    ...normalizeLayout(scene.visual.spec, scene.onScreenText),
    layout: layouts[index],
  }))

  const timeline = baseTimeline.map((entry, index) => ({ ...entry, layout: layouts[index] }))

  /* ───── 字幕 ───── */
  // シーンごとに組んだあと、連結後の全体でもう一度重なりを解消する。
  // シーン境界は別々に計算されるため、ここを通さないと数十ミリ秒の重なりが残る。
  const captions: CaptionCue[] = resolveCueOverlaps(
    script.scenes.flatMap((scene, index) => {
      const audio = audioByScene.get(scene.id)
      // segments は声によっては取れない。字幕なしで成立させる。
      const segments = audio?.segments ?? []
      if (segments.length === 0) return []
      return offsetCues(buildCaptionCues(segments), baseTimeline[index].startSec)
    }),
  )

  /* ───── クリップ ───── */
  const sceneClips = script.scenes
    .map((scene, index) => {
      const entry = baseTimeline[index]
      const isLast = index === lastIndex
      const clipDuration = round2(entry.durationSec + (isLast ? OUTRO_SEC : TRANSITION_SEC))
      const track = 1 + (index % 2)
      const { layout, items } = normalized[index]
      const heading = scene.onScreenText[0] ?? items[0]?.body ?? ""

      return [
        `    <div id="${scene.id}" class="scene clip layout-${layout}" data-start="${entry.startSec}" data-duration="${clipDuration}" data-track-index="${track}" style="z-index:${10 + index}">`,
        `      <div class="scene-head">`,
        `        <span class="index">${String(index + 1).padStart(2, "0")} / ${String(timeline.length).padStart(2, "0")}</span>`,
        layout !== "headline" && heading
          ? `        <h2 class="heading">${escapeHtml(heading)}</h2>`
          : "",
        `      </div>`,
        `      <div class="scene-body">`,
        renderItems(scene.id, layout, items),
        `      </div>`,
        scene.sources.length > 0
          ? `      <p class="sources">出典 ${scene.sources.length}件</p>`
          : "",
        `    </div>`,
      ]
        .filter((row) => row.length > 0)
        .join("\n")
    })
    .join("\n")

  const audioClips = script.scenes
    .map((scene, index) => {
      if (!audioByScene.has(scene.id)) return ""
      const entry = baseTimeline[index]
      return `    <audio id="a-${scene.id}" class="clip" data-start="${entry.startSec}" data-duration="${entry.durationSec}" data-track-index="${AUDIO_TRACK_BASE + index}" src="${audioDir}/${scene.id}.mp3" data-volume="1"></audio>`
    })
    .filter(Boolean)
    .join("\n")

  // 字幕はクリップとして置き、表示制御をフレームワークに任せる。
  const captionClips = captions
    .map(
      (cue, index) =>
        `    <div id="cap-${index}" class="caption clip" data-start="${cue.startSec}" data-duration="${cue.durationSec}" data-track-index="${CAPTION_TRACK}"><span>${escapeHtml(cue.text)}</span></div>`,
    )
    .join("\n")

  /* ───── タイムライン ───── */
  const tweens = script.scenes
    .map((scene, index) => {
      const at = baseTimeline[index].startSec
      const duration = baseTimeline[index].durationSec
      const { items } = normalized[index]
      const beatCount = Math.max(1, Math.min(items.length, 5))
      // 項目を尺の前半70%に散らして出す。静止時間を作らないための配分。
      const beatSpan = (duration * 0.7) / beatCount

      const rows: string[] = []
      if (index > 0) {
        rows.push(
          `  tl.from("#${scene.id}", { opacity: 0, duration: ${TRANSITION_SEC}, ease: "sine.inOut" }, ${at});`,
        )
      }
      rows.push(
        `  tl.from("#${scene.id} .index", { y: -18, opacity: 0, duration: 0.45, ease: "power3.out" }, ${round2(at + 0.15)});`,
      )
      // 見出し要素はマークアップ側と同じ条件でしか出ない。
      // 条件がずれると存在しないセレクタを動かそうとして警告になる。
      const hasHeading = normalized[index].layout !== "headline" && Boolean(scene.onScreenText[0])
      if (hasHeading) {
        rows.push(
          `  tl.from("#${scene.id} .heading", { y: 34, opacity: 0, duration: 0.6, ease: "power2.out" }, ${round2(at + 0.25)});`,
        )
      }
      for (let beat = 0; beat < beatCount; beat += 1) {
        const beatAt = round2(at + 0.55 + beat * beatSpan)
        rows.push(
          `  tl.from("#${scene.id} [data-beat='${beat}']", { y: 30, opacity: 0, duration: 0.55, ease: "expo.out" }, ${beatAt});`,
        )
      }
      if (scene.sources.length > 0) {
        rows.push(
          `  tl.from("#${scene.id} .sources", { opacity: 0, duration: 0.5, ease: "sine.out" }, ${round2(at + 0.9)});`,
        )
      }
      return rows.join("\n")
    })
    .join("\n")

  const captionTweens = captions
    .map(
      (cue, index) =>
        `  tl.from("#cap-${index}", { y: 14, opacity: 0, duration: 0.22, ease: "power2.out" }, ${cue.startSec});`,
    )
    .join("\n")

  const lastScene = script.scenes[lastIndex]
  const outroAt = round2(
    (baseTimeline[lastIndex]?.startSec ?? 0) + (baseTimeline[lastIndex]?.durationSec ?? 0),
  )
  const outro = lastScene
    ? `  tl.to("#${lastScene.id}", { opacity: 0, duration: ${OUTRO_SEC}, ease: "sine.in" }, ${outroAt});`
    : ""

  const html = `<!DOCTYPE html>
<html lang="${script.formatId.endsWith("-ja") ? "ja" : "en"}">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(script.title)}</title>
</head>
<body>
<div data-composition-id="root" data-width="${width}" data-height="${height}" data-start="0" data-duration="${totalDurationSec}" data-track-index="0">
  <div class="bg-drift" aria-hidden="true"></div>
${sceneClips}
${captionClips}
${audioClips}
  <div class="channel">${escapeHtml(channelLabel)}</div>
  <div class="progress"><div class="progress-fill"></div></div>

  <style>
    [data-composition-id="root"] {
      width: 100%; height: 100%;
      background: #0B1120;
      font-family: "Noto Sans JP", sans-serif;
      overflow: hidden;
    }
    /* 全編を通してゆっくり動く背景。静止画に見えないようにする。 */
    [data-composition-id="root"] .bg-drift {
      position: absolute; inset: -20%;
      background:
        radial-gradient(46% 40% at 20% 22%, rgba(232, 163, 61, 0.22) 0%, rgba(11,17,32,0) 70%),
        radial-gradient(40% 36% at 78% 70%, rgba(84, 132, 214, 0.20) 0%, rgba(11,17,32,0) 72%);
      z-index: 1;
    }
    [data-composition-id="root"] .scene {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; justify-content: center;
      padding: 96px 140px 190px;
      box-sizing: border-box;
    }
    [data-composition-id="root"] .scene-head { margin-bottom: 34px; }
    [data-composition-id="root"] .index {
      display: block;
      font-size: 27px; font-weight: 700; letter-spacing: 0.24em;
      color: #E8A33D; font-variant-numeric: tabular-nums;
    }
    [data-composition-id="root"] .heading {
      margin: 14px 0 0;
      font-size: 74px; font-weight: 700; line-height: 1.26;
      color: #F5F1E8; max-width: 1560px;
    }
    [data-composition-id="root"] .line {
      margin: 0 0 18px;
      font-size: 88px; font-weight: 700; line-height: 1.26;
      color: #F5F1E8; max-width: 1520px;
    }
    [data-composition-id="root"] .line-1,
    [data-composition-id="root"] .line-2 { font-size: 54px; font-weight: 500; color: #C6CEDC; }

    /* timeline */
    [data-composition-id="root"] .tl { list-style: none; margin: 0; padding: 0 0 0 42px; position: relative; }
    [data-composition-id="root"] .tl::before {
      content: ""; position: absolute; left: 10px; top: 12px; bottom: 12px;
      width: 3px; background: linear-gradient(180deg, #E8A33D 0%, rgba(232,163,61,0.12) 100%);
    }
    [data-composition-id="root"] .tl-item {
      position: relative; display: flex; align-items: baseline; gap: 24px;
      margin-bottom: 30px;
    }
    [data-composition-id="root"] .tl-dot {
      position: absolute; left: -40px; top: 16px;
      width: 17px; height: 17px; border-radius: 50%;
      background: #E8A33D; box-shadow: 0 0 0 7px rgba(232,163,61,0.16);
    }
    [data-composition-id="root"] .tl-marker {
      flex: 0 0 auto; min-width: 210px;
      font-size: 34px; font-weight: 700; color: #E8A33D;
      font-variant-numeric: tabular-nums; letter-spacing: 0.02em;
    }
    [data-composition-id="root"] .tl-body {
      font-size: 42px; font-weight: 500; line-height: 1.4; color: #F5F1E8;
    }

    /* columns */
    [data-composition-id="root"] .columns { display: flex; gap: 40px; align-items: stretch; }
    [data-composition-id="root"] .col {
      flex: 1; padding: 40px 38px;
      border-radius: 20px;
      background: rgba(245, 241, 232, 0.05);
      border-left: 5px solid #E8A33D;
    }
    [data-composition-id="root"] .col-marker {
      display: block; margin-bottom: 14px;
      font-size: 28px; font-weight: 700; letter-spacing: 0.08em; color: #E8A33D;
    }
    [data-composition-id="root"] .col-body {
      margin: 0; font-size: 44px; font-weight: 600; line-height: 1.38; color: #F5F1E8;
    }

    /* stat */
    [data-composition-id="root"] .stat-value {
      margin: 0; font-size: 168px; font-weight: 700; line-height: 1;
      color: #E8A33D; font-variant-numeric: tabular-nums; letter-spacing: -0.02em;
    }
    [data-composition-id="root"] .stat-label { margin: 18px 0 0; font-size: 52px; font-weight: 600; color: #F5F1E8; }
    [data-composition-id="root"] .stat-note { margin: 12px 0 0; font-size: 36px; color: #C6CEDC; }

    /* quote */
    [data-composition-id="root"] .quote {
      margin: 0; padding-left: 44px; border-left: 6px solid #E8A33D;
      font-size: 66px; font-weight: 700; line-height: 1.34; color: #F5F1E8; max-width: 1480px;
    }
    [data-composition-id="root"] .quote-source { margin: 24px 0 0 50px; font-size: 34px; color: #8FA0BC; }

    [data-composition-id="root"] .sources {
      position: absolute; left: 140px; bottom: 150px; margin: 0;
      font-size: 26px; letter-spacing: 0.06em; color: #8FA0BC;
    }

    /* 字幕 */
    [data-composition-id="root"] .caption {
      position: absolute; left: 0; right: 0; bottom: 74px;
      display: flex; justify-content: center; z-index: 50;
    }
    [data-composition-id="root"] .caption span {
      display: inline-block; padding: 14px 30px;
      border-radius: 12px;
      background: rgba(6, 10, 20, 0.82);
      font-size: 44px; font-weight: 600; line-height: 1.3; color: #FFFFFF;
      letter-spacing: 0.01em;
    }

    [data-composition-id="root"] .channel {
      position: absolute; left: 140px; bottom: 30px;
      font-size: 24px; letter-spacing: 0.2em; color: #6F7F9B; z-index: 60;
    }
    [data-composition-id="root"] .progress {
      position: absolute; left: 0; right: 0; bottom: 0; height: 5px;
      background: rgba(245, 241, 232, 0.08); z-index: 60;
    }
    [data-composition-id="root"] .progress-fill {
      width: 100%; height: 100%; transform-origin: left center;
      background: linear-gradient(90deg, #E8A33D 0%, #F5C77E 100%);
    }
  </style>

  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });

    // 背景を全編ゆっくり動かす。1本の長いトゥイーンなので無限リピートにしない。
    tl.fromTo(".bg-drift",
      { xPercent: -4, yPercent: -3, scale: 1.04 },
      { xPercent: 4, yPercent: 3, scale: 1.12, duration: ${totalDurationSec}, ease: "none" }, 0);

    // 進捗バー。残り時間が分かると離脱が減る。
    tl.fromTo(".progress-fill",
      { scaleX: 0 }, { scaleX: 1, duration: ${totalDurationSec}, ease: "none" }, 0);

${tweens}
${captionTweens}
${outro}
    window.__timelines["root"] = tl;
  </script>
</div>
</body>
</html>
`

  return { html, totalDurationSec, timeline, captionCount: captions.length }
}
