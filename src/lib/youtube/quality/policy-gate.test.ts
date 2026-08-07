import { describe, expect, it } from "vitest"

import { requireFormat } from "../formats/registry"
import type { Scene, VideoScript } from "../formats/types"
import { runPolicyGate } from "./policy-gate"

const FORMAT = requireFormat("manim-explainer-ja")

/** 語彙を完全に分けた3つの題材。互いの文字3-gramがほぼ重ならないようにしてある。 */
const POOLS = {
  a: "計算の順序を入れ替えると結果が変わる場面をここで確認します。",
  b: "地図の投影方法によって面積の見え方は大きく変わります。",
  c: "音の高さは振動の速さで決まり、倍音の重なりが音色を作ります。",
} as const

type PoolKey = keyof typeof POOLS

interface BuildOptions {
  pool?: PoolKey
  title?: string
  sceneCount?: number
  sceneDurationSec?: number
  narrationRepeat?: number
  thumbnailText?: string[]
  extraScene?: Partial<Scene>
  synthetic?: Partial<VideoScript["synthetic"]>
  evidenceSceneIds?: string[]
}

/** 品質契約を満たす台本を組み立てる。テストごとに1箇所だけ壊して検証する。 */
function buildScript(options: BuildOptions = {}): VideoScript {
  const {
    pool = "a",
    sceneCount = 8,
    sceneDurationSec = 60,
    narrationRepeat = 14,
    extraScene,
  } = options

  const sentence = POOLS[pool]
  const scenes: Scene[] = Array.from({ length: sceneCount }, (_, index) => ({
    id: `s${index + 1}`,
    startSec: index * sceneDurationSec,
    durationSec: sceneDurationSec,
    narration: `第${index + 1}節。${sentence.repeat(narrationRepeat)}`,
    onScreenText: [sentence.slice(0, 12)],
    visual: { kind: "manim", spec: { sceneClass: `Section${index + 1}` } },
    sources: [],
  }))

  if (extraScene) {
    scenes[0] = { ...scenes[0], ...extraScene }
  }

  return {
    formatId: FORMAT.id,
    channelId: "ch-test",
    title: options.title ?? sentence.slice(0, 16),
    description: sentence,
    tags: ["解説"],
    thumbnailText: options.thumbnailText ?? [sentence.slice(0, 8)],
    hook: sentence,
    scenes,
    originalValue: {
      kind: "original_visualization",
      statement: "既存の解説にない図解で誤解の起点を可視化する。",
      evidenceSceneIds: options.evidenceSceneIds ?? ["s1"],
    },
    synthetic: {
      syntheticVoice: true,
      syntheticVisuals: false,
      realisticPersonOrEvent: false,
      disclosureText: null,
      ...options.synthetic,
    },
  }
}

function codes(result: ReturnType<typeof runPolicyGate>): string[] {
  return result.findings.map((finding) => finding.code)
}

describe("runPolicyGate — 正常系", () => {
  it("契約を満たす台本は通る", () => {
    const result = runPolicyGate(buildScript(), FORMAT, [])
    expect(result.findings).toEqual([])
    expect(result.ok).toBe(true)
  })

  it("題材が違えば直近作があっても通る", () => {
    const result = runPolicyGate(buildScript({ pool: "b" }), FORMAT, [buildScript({ pool: "a" })])
    expect(result.ok).toBe(true)
  })
})

describe("runPolicyGate — 反復性", () => {
  it("直近作と酷似した台本をブロックする", () => {
    const result = runPolicyGate(buildScript({ pool: "a" }), FORMAT, [buildScript({ pool: "a" })])
    expect(codes(result)).toContain("repetition.script_similar")
    expect(result.ok).toBe(false)
  })

  it("題材を変えても構成が同一のまま続けばブロックする", () => {
    // manim-explainer-ja は同一構成の許容連続本数が2本。
    const result = runPolicyGate(buildScript({ pool: "c" }), FORMAT, [
      buildScript({ pool: "a" }),
      buildScript({ pool: "b" }),
    ])
    expect(codes(result)).toContain("repetition.structure_streak")
    expect(result.ok).toBe(false)
  })

  it("構成が変われば連続はリセットされる", () => {
    const result = runPolicyGate(buildScript({ pool: "c" }), FORMAT, [
      buildScript({ pool: "a", sceneCount: 12, sceneDurationSec: 40 }),
      buildScript({ pool: "b" }),
    ])
    expect(codes(result)).not.toContain("repetition.structure_streak")
  })
})

describe("runPolicyGate — 主張の根拠", () => {
  it("統計の断定に一次ソースが無ければブロックする", () => {
    const script = buildScript({
      extraScene: { narration: `売上は32%増えました。${POOLS.a.repeat(14)}` },
    })
    const result = runPolicyGate(script, FORMAT, [])
    expect(codes(result)).toContain("claims.unsourced")
    expect(result.ok).toBe(false)
  })

  it("一次ソースが付いていれば通る", () => {
    const script = buildScript({
      extraScene: {
        narration: `売上は32%増えました。${POOLS.a.repeat(14)}`,
        sources: [
          { claim: "売上32%増", url: "https://example.com/report", retrievedAt: "2026-08-01" },
        ],
      },
    })
    expect(runPolicyGate(script, FORMAT, []).ok).toBe(true)
  })

  it("ソースURLが不正ならブロックする", () => {
    const script = buildScript({
      extraScene: {
        narration: `売上は32%増えました。${POOLS.a.repeat(14)}`,
        sources: [{ claim: "売上32%増", url: "社内資料", retrievedAt: "2026-08-01" }],
      },
    })
    expect(codes(runPolicyGate(script, FORMAT, []))).toContain("claims.invalid_source_url")
  })

  it("下げ方向の断定的な相場予測も根拠を要求する", () => {
    // 実データ検証で「株価は確実に下落します」が素通りしたため追加した回帰テスト。
    const script = buildScript({
      extraScene: { narration: `株価は確実に下落します。${POOLS.a.repeat(14)}` },
    })
    expect(codes(runPolicyGate(script, FORMAT, []))).toContain("claims.unsourced")
  })

  it("出典のない権威付けを検出する", () => {
    const script = buildScript({
      extraScene: { narration: `専門家によれば問題があるそうです。${POOLS.a.repeat(14)}` },
    })
    expect(codes(runPolicyGate(script, FORMAT, []))).toContain("claims.unsourced")
  })

  it("誇大な最上級表現も根拠を要求する", () => {
    const script = buildScript({
      extraScene: { narration: `これは世界初の手法です。${POOLS.a.repeat(14)}` },
    })
    expect(codes(runPolicyGate(script, FORMAT, []))).toContain("claims.unsourced")
  })
})

describe("runPolicyGate — メタデータ整合", () => {
  it("本編に無いサムネ文言をブロックする", () => {
    const result = runPolicyGate(buildScript({ thumbnailText: ["衝撃の真実がここに"] }), FORMAT, [])
    expect(codes(result)).toContain("metadata.thumbnail_not_in_body")
    expect(result.ok).toBe(false)
  })

  it("並列表記は区切りごとに判定し、全語が本編にあれば通す", () => {
    // 実データ検証で「覚悟 / 反論 / 愚策」が誤検出された。各語は本編に実在していた。
    const script = buildScript({ thumbnailText: ["計算 / 順序 / 結果"] })
    expect(codes(runPolicyGate(script, FORMAT, []))).not.toContain("metadata.thumbnail_not_in_body")
  })

  it("n-gramサイズ未満の短いサムネ文言も本編にあれば通す", () => {
    // 「覚悟」のような2文字は3-gram集合を作れず、本文の3-gramとは原理的に一致しない。
    // サムネは短い語を使うのが普通なので、ここが壊れていると常に誤検出になる。
    const script = buildScript({ thumbnailText: ["計算"] })
    expect(codes(runPolicyGate(script, FORMAT, []))).not.toContain("metadata.thumbnail_not_in_body")
  })

  it("短くても本編に無ければブロックする", () => {
    const script = buildScript({ thumbnailText: ["陰謀"] })
    expect(codes(runPolicyGate(script, FORMAT, []))).toContain("metadata.thumbnail_not_in_body")
  })

  it("並列表記でも1語でも本編に無ければブロックする", () => {
    const script = buildScript({ thumbnailText: ["計算 / 順序 / 陰謀論"] })
    const result = runPolicyGate(script, FORMAT, [])
    expect(codes(result)).toContain("metadata.thumbnail_not_in_body")
    expect(result.findings.find((f) => f.code === "metadata.thumbnail_not_in_body")?.message).toContain("陰謀論")
  })
})

describe("runPolicyGate — 固有価値", () => {
  it("存在しないシーンを固有価値の根拠にしているとブロックする", () => {
    const result = runPolicyGate(buildScript({ evidenceSceneIds: ["s99"] }), FORMAT, [])
    expect(codes(result)).toContain("original_value.dangling_evidence")
  })

  it("根拠シーンが未指定ならブロックする", () => {
    const result = runPolicyGate(buildScript({ evidenceSceneIds: [] }), FORMAT, [])
    expect(codes(result)).toContain("original_value.no_evidence")
  })
})

describe("runPolicyGate — 情報密度と合成開示", () => {
  it("情報密度が下限を割るとブロックする", () => {
    const result = runPolicyGate(buildScript({ narrationRepeat: 1 }), FORMAT, [])
    expect(codes(result)).toContain("structure.density_low")
    expect(result.ok).toBe(false)
  })

  it("密度は実尺ではなく目標尺で測る", () => {
    // 尺はナレーション長から逆算されるので、実尺で割ると密度は常に話速に一致し
    // 検査が無意味になる。短くて薄い台本が「密度は足りている」と通らないことを固定する。
    const thin = buildScript({ sceneCount: 6, sceneDurationSec: 5, narrationRepeat: 1 })
    const result = runPolicyGate(thin, FORMAT, [])
    expect(result.metrics.narrationCharsPerMinute < FORMAT.quality.minNarrationCharsPerMinute).toBe(true)
    expect(codes(result)).toContain("structure.density_low")
  })

  it("現実の人物に見える合成で開示文が無ければブロックする", () => {
    const script = buildScript({
      synthetic: { syntheticVisuals: true, realisticPersonOrEvent: true, disclosureText: null },
    })
    expect(codes(runPolicyGate(script, FORMAT, []))).toContain("synthetic.disclosure_missing")
  })

  it("開示文があれば通る", () => {
    const script = buildScript({
      synthetic: {
        syntheticVisuals: true,
        realisticPersonOrEvent: true,
        disclosureText: "この動画には合成音声と生成映像が含まれます。",
      },
    })
    expect(runPolicyGate(script, FORMAT, []).ok).toBe(true)
  })
})
