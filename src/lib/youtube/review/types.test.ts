import { describe, expect, it } from "vitest"

import type { Scene, VideoScript } from "../formats/types"
import type { PolicyGateResult } from "../quality/policy-gate"
import {
  actionForDecision,
  allowedNextStatuses,
  buildReviewChecklist,
  canTransition,
  statusForDecision,
  type ReviewVideo,
} from "./types"

function scene(id: string, narration: string, sourceCount: number): Scene {
  return {
    id,
    startSec: 0,
    durationSec: 20,
    narration,
    onScreenText: [],
    visual: { kind: "html", spec: {} },
    sources: Array.from({ length: sourceCount }, (_, i) => ({
      claim: `根拠${i}`,
      url: `https://example.com/${i}`,
      retrievedAt: "2026-08-07",
    })),
  }
}

function video(overrides: Partial<ReviewVideo> = {}): ReviewVideo {
  const script: VideoScript = {
    formatId: "news-trend-ja",
    channelId: "ch",
    title: "T",
    description: "",
    tags: [],
    thumbnailText: [],
    hook: "",
    scenes: [scene("s1", "数値のない説明です。", 1)],
    originalValue: { kind: "original_analysis", statement: "整理", evidenceSceneIds: ["s1"] },
    synthetic: { syntheticVoice: true, syntheticVisuals: false, realisticPersonOrEvent: false, disclosureText: null },
  }
  return {
    id: "v1",
    channelId: null,
    formatId: "news-trend-ja",
    status: "review_required",
    title: "T",
    description: "",
    tags: [],
    thumbnailText: [],
    script,
    gate: { ok: true, findings: [], repetition: {} as never, metrics: {} as never } as PolicyGateResult,
    research: {},
    videoUrl: "https://cdn.example.com/v1.mp4",
    durationSec: 200,
    llmCalls: 9,
    warnings: [],
    reviewerNote: null,
    reviewedBy: null,
    reviewedAt: null,
    publishedAt: null,
    youtubeVideoId: null,
    createdAt: "2026-08-07T00:00:00Z",
    ...overrides,
  }
}

describe("状態遷移", () => {
  it("審査待ちからのみ承認・却下できる", () => {
    expect(canTransition("review_required", "approved")).toBe(true)
    expect(canTransition("review_required", "rejected")).toBe(true)
    expect(canTransition("draft", "approved")).toBe(false)
  })

  it("審査を飛ばして公開できない", () => {
    // ここが崩れると未確認の動画が公開経路に乗る。
    expect(canTransition("review_required", "published")).toBe(false)
    expect(canTransition("draft", "published")).toBe(false)
    expect(canTransition("rejected", "published")).toBe(false)
    expect(canTransition("approved", "published")).toBe(true)
  })

  it("承認後でも公開前なら審査に戻せる", () => {
    expect(canTransition("approved", "review_required")).toBe(true)
  })

  it("公開済みからは戻さない", () => {
    expect(allowedNextStatuses("published")).toEqual([])
  })

  it("却下からは再審査にのみ進める", () => {
    expect(allowedNextStatuses("rejected")).toEqual(["review_required"])
  })

  it("操作を状態と履歴に対応づける", () => {
    expect(statusForDecision("approve")).toBe("approved")
    expect(statusForDecision("reject")).toBe("rejected")
    expect(actionForDecision("approve")).toBe("approved")
  })
})

describe("buildReviewChecklist", () => {
  it("問題が無ければ何も出さない", () => {
    expect(buildReviewChecklist(video())).toEqual([])
  })

  it("根拠の無いシーンを指摘する", () => {
    const v = video()
    v.script.scenes = [scene("s1", "説明です。", 0)]
    expect(buildReviewChecklist(v).join()).toContain("根拠が付いていないシーン")
  })

  it("数値を含むシーンを指摘する", () => {
    // 実測で「10%から8%へ」という出典に無い数値が生成された。
    const v = video()
    v.script.scenes = [scene("s1", "税率を10%から8%に引き下げます。", 1)]
    expect(buildReviewChecklist(v).join()).toContain("数値を含むシーン")
  })

  it("生成時の警告を指摘する", () => {
    expect(buildReviewChecklist(video({ warnings: ["捏造URLを破棄"] })).join()).toContain("生成時の警告")
  })

  it("ゲートの警告を指摘する", () => {
    const v = video({
      gate: {
        ok: true,
        findings: [{ code: "metadata.title_not_in_body", severity: "warn", message: "乖離" }],
        repetition: {} as never,
        metrics: {} as never,
      } as PolicyGateResult,
    })
    expect(buildReviewChecklist(v).join()).toContain("ゲートの警告")
  })

  it("動画が無ければ承認しないよう促す", () => {
    expect(buildReviewChecklist(video({ videoUrl: null })).join()).toContain("映像を見ずに承認しないでください")
  })
})
